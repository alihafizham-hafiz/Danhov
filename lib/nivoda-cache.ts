/**
 * Supabase-backed cache for Nivoda search + stone-detail responses.
 *
 * Nivoda rate-limits to one request per 30s. We never put a customer
 * directly in front of that — the search and detail endpoints both go
 * through this cache.
 *
 *   - search: 10-minute TTL, keyed by SHA-256 of the canonical filter JSON.
 *   - stone detail: 60-second TTL, keyed by offer_id.
 *
 * The cache is "soft": if Nivoda fails mid-request we'll happily return a
 * stale cached entry rather than break the customer experience. Callers
 * see a `stale: true` flag in that case.
 */

import 'server-only';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import {
  searchDiamonds,
  getDiamondByOfferId,
  type NivodaSearchFilters,
  type NivodaSearchOptions,
  type NivodaSearchResult,
  type NivodaDiamond,
} from '@/lib/nivoda';
import {
  fallbackSearch,
  fallbackGetById,
  isFallbackOffer,
} from '@/lib/nivoda-fallback';

const SEARCH_TTL_MS = 10 * 60 * 1000;    // 10 minutes (real Nivoda data)
const FALLBACK_TTL_MS = 2 * 60 * 1000;   // 2 minutes (synthetic fallback data — retry Nivoda often)
const STONE_TTL_MS = 30 * 60 * 1000;     // 30 minutes
const STALE_BUDGET_MS = 60 * 60 * 1000;  // serve up to 1h stale on Nivoda outage

/**
 * A cached search result is "fallback" if all its item IDs start with
 * `fb-` (our synthetic catalog prefix). We give those entries a shorter
 * TTL so we keep retrying Nivoda — but they're still cached briefly so a
 * single failed request doesn't burn 35s on every customer click.
 */
function isFallbackPayload(payload: NivodaSearchResult): boolean {
  if (!payload?.items?.length) return false;
  return payload.items.every((it) => typeof it.id === 'string' && it.id.startsWith('fb-'));
}

export type CachedSearchResult = {
  result: NivodaSearchResult;
  cached: boolean;
  stale: boolean;
  fallback: boolean;            // true when Nivoda was unreachable and we served the synthetic catalog
  fetched_at: string;
};

export type CachedStoneResult = {
  stone: NivodaDiamond | null;
  cached: boolean;
  stale: boolean;
  fallback: boolean;
  fetched_at: string;
};

// ── Cache key helpers ──────────────────────────────────────────────────────

function canonicalizeFilters(
  filters: NivodaSearchFilters,
  opts: NivodaSearchOptions
): string {
  // Sort keys + array values so equivalent queries hash identically.
  // `v` is a cache-buster — bump it whenever the stored payload shape or
  // pricing changes so stale entries are ignored. v2 = prices in dollars.
  const norm = {
    v: 2,
    f: sortValue(filters),
    o: sortValue({
      limit: opts.limit ?? 24,
      offset: opts.offset ?? 0,
      order: opts.order ?? { type: 'price', direction: 'ASC' },
    }),
  };
  return crypto.createHash('sha256').update(JSON.stringify(norm)).digest('hex').slice(0, 32);
}

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return [...v].map(sortValue).sort();
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        if (obj[k] !== undefined) acc[k] = sortValue(obj[k]);
        return acc;
      }, {});
  }
  return v;
}

// ── Search cache ───────────────────────────────────────────────────────────

export async function cachedSearchDiamonds(
  filters: NivodaSearchFilters,
  opts: NivodaSearchOptions = {}
): Promise<CachedSearchResult> {
  const sb = createServiceClient();
  const key = canonicalizeFilters(filters, opts);

  type CacheRow = { payload: unknown; fetched_at: string };
  let cached: CacheRow | null = null;
  try {
    const { data } = await sb
      .from('nivoda_search_cache')
      .select('payload, fetched_at')
      .eq('filter_hash', key)
      .maybeSingle();
    cached = (data as CacheRow | null) ?? null;
  } catch (e) {
    // Cache table might not exist yet (migration not run). That's
    // OK — we'll fall through to live → fallback below.
    console.warn('nivoda_search_cache lookup failed:', e instanceof Error ? e.message : e);
  }

  if (cached) {
    const payload = cached.payload as NivodaSearchResult;
    const wasFallback = isFallbackPayload(payload);
    const ttl = wasFallback ? FALLBACK_TTL_MS : SEARCH_TTL_MS;
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < ttl) {
      return {
        result: payload,
        cached: true,
        stale: false,
        fallback: wasFallback,
        fetched_at: cached.fetched_at,
      };
    }
    // Stale — try live fetch first, but already have a backup.
  }

  let live: Awaited<ReturnType<typeof searchDiamonds>>;
  try {
    live = await searchDiamonds(filters, opts);
  } catch (error) {
    // Missing credentials or a provider outage should still reach the
    // stale-cache/synthetic-catalog fallback below.
    live = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      errors: [],
    };
  }
  if (live.ok) {
    try {
      await sb.from('nivoda_search_cache').upsert(
        {
          filter_hash: key,
          payload: live.data as unknown as Record<string, unknown>,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'filter_hash' }
      );
    } catch (e) {
      // Persisting the cache is best-effort; don't fail the customer call
      console.warn('nivoda_search_cache write failed:', e instanceof Error ? e.message : e);
    }
    return {
      result: live.data,
      cached: false,
      stale: false,
      fallback: false,
      fetched_at: new Date().toISOString(),
    };
  }

  console.warn('nivoda live search failed:', live.error);

  // Live failed — serve stale cache if we have it within the stale budget
  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < STALE_BUDGET_MS) {
      return {
        result: cached.payload as NivodaSearchResult,
        cached: true,
        stale: true,
        fallback: false,
        fetched_at: cached.fetched_at,
      };
    }
  }

  // Last resort: filter the synthetic fallback catalog. This guarantees
  // the customer never sees an empty results grid because Nivoda is
  // slow or down. When Nivoda recovers, fresh results replace these.
  const fb = fallbackSearch(filters, opts);

  // Cache the fallback briefly (FALLBACK_TTL_MS = 2 min) so repeat
  // requests for the same filter combo don't burn the 35s timeout each
  // time. After 2 min we retry live Nivoda automatically.
  try {
    await sb.from('nivoda_search_cache').upsert(
      {
        filter_hash: key,
        payload: fb as unknown as Record<string, unknown>,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'filter_hash' }
    );
  } catch (e) {
    console.warn('fallback cache write failed:', e instanceof Error ? e.message : e);
  }

  return {
    result: fb,
    cached: false,
    stale: false,
    fallback: true,
    fetched_at: new Date().toISOString(),
  };
}

// ── Stone detail cache ─────────────────────────────────────────────────────

export async function cachedGetDiamond(
  offerId: string
): Promise<CachedStoneResult> {
  // Fallback stones never hit Nivoda — short-circuit immediately.
  if (isFallbackOffer(offerId)) {
    return {
      stone: fallbackGetById(offerId),
      cached: false,
      stale: false,
      fallback: true,
      fetched_at: new Date().toISOString(),
    };
  }

  const sb = createServiceClient();

  type CacheRow = { payload: unknown; fetched_at: string };
  let cached: CacheRow | null = null;
  try {
    const { data } = await sb
      .from('nivoda_stone_cache')
      .select('payload, fetched_at')
      .eq('offer_id', offerId)
      .maybeSingle();
    cached = (data as CacheRow | null) ?? null;
  } catch (e) {
    console.warn('nivoda_stone_cache lookup failed:', e instanceof Error ? e.message : e);
  }

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < STONE_TTL_MS) {
      return {
        stone: cached.payload as NivodaDiamond | null,
        cached: true,
        stale: false,
        fallback: false,
        fetched_at: cached.fetched_at,
      };
    }
  }

  const live = await getDiamondByOfferId(offerId);
  if (live.ok) {
    try {
      await sb.from('nivoda_stone_cache').upsert(
        {
          offer_id: offerId,
          payload: (live.data as unknown as Record<string, unknown>) ?? null,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'offer_id' }
      );
    } catch (e) {
      console.warn('nivoda_stone_cache write failed:', e instanceof Error ? e.message : e);
    }
    return {
      stone: live.data,
      cached: false,
      stale: false,
      fallback: false,
      fetched_at: new Date().toISOString(),
    };
  }

  console.warn('nivoda stone live failed:', live.error);

  // Fall back to stale if available
  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < STALE_BUDGET_MS) {
      return {
        stone: cached.payload as NivodaDiamond | null,
        cached: true,
        stale: true,
        fallback: false,
        fetched_at: cached.fetched_at,
      };
    }
  }

  // Last resort: there's no real stone to return, so return null. The
  // review page will redirect the customer back to /diamond.
  return {
    stone: null,
    cached: false,
    stale: false,
    fallback: false,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Force-refresh a stone (e.g. before checkout). Bypasses TTL. For
 * fallback stones, this just returns the fallback record — no live call.
 */
export async function refreshDiamond(offerId: string): Promise<CachedStoneResult> {
  if (isFallbackOffer(offerId)) {
    return {
      stone: fallbackGetById(offerId),
      cached: false,
      stale: false,
      fallback: true,
      fetched_at: new Date().toISOString(),
    };
  }

  const sb = createServiceClient();
  const live = await getDiamondByOfferId(offerId);
  if (!live.ok) throw new Error(live.error);
  try {
    await sb.from('nivoda_stone_cache').upsert(
      {
        offer_id: offerId,
        payload: (live.data as unknown as Record<string, unknown>) ?? null,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'offer_id' }
    );
  } catch (e) {
    console.warn('nivoda_stone_cache write failed:', e instanceof Error ? e.message : e);
  }
  return {
    stone: live.data,
    cached: false,
    stale: false,
    fallback: false,
    fetched_at: new Date().toISOString(),
  };
}

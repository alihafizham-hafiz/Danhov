/**
 * Nivoda GraphQL client + token manager.
 *
 * Server-only. Never import from client code — the credentials and
 * service-role Supabase client must not leak.
 *
 * Token lifecycle:
 *   - Nivoda tokens last 6 hours. We refresh at 5h50m to avoid hitting a
 *     stale token mid-request.
 *   - Token cached in `nivoda_tokens` (single row, id='default') so
 *     concurrent server invocations share one token.
 *
 * Request lifecycle:
 *   - All requests go through `nivodaRequest()` which auto-refreshes the
 *     token on 401/Unauthenticated and retries once.
 *
 * Endpoints come from env (defaults to staging).
 */

import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';

const STAGING_DIAMOND_URL = 'https://intg-customer-staging.nivodaapi.net/api/diamonds';
const PROD_DIAMOND_URL = 'https://integrations.nivoda.net/api/diamonds';

// Nivoda JWTs actually expire ~1 hour after issue (their docs once said 6h,
// but the live tokens return "jwt expired" well before that). We assume a
// conservative 50-minute lifetime and refresh 10 min early, so a cached
// token is never handed out within the last ~10 min of its real life.
const TOKEN_TTL_MS = 50 * 60 * 1000;              // 50 minutes
const TOKEN_REFRESH_BEFORE_MS = 10 * 60 * 1000;   // refresh 10 min before expiry

// Each individual fetch to Nivoda gets this hard deadline. Nivoda's
// staging endpoint can be genuinely slow on cold calls (their docs warn
// about it), so we budget 35s per request. If it still times out we
// fall back to the synthetic catalog in lib/nivoda-fallback.ts so the
// customer never sees an empty results grid.
const NIVODA_FETCH_TIMEOUT_MS = 35_000;

/** AbortSignal that aborts after `ms`. Same behaviour as AbortSignal.timeout()
 *  but works on Node 18 (Vercel runtime) without the experimental flag. */
function timeoutSignal(ms: number): AbortSignal {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(new Error(`Nivoda request timed out after ${ms}ms`)), ms);
  return ctrl.signal;
}

export const NIVODA_API_URL =
  process.env.NIVODA_API_URL ||
  (process.env.NIVODA_ENV === 'production' ? PROD_DIAMOND_URL : STAGING_DIAMOND_URL);

export const NIVODA_PRO_ENABLED =
  process.env.NIVODA_PRO_ENABLED === 'true' || process.env.NIVODA_PRO_ENABLED === '1';

// ── Types ──────────────────────────────────────────────────────────────────

export type NivodaShape =
  | 'ROUND' | 'OVAL' | 'PRINCESS' | 'CUSHION' | 'EMERALD'
  | 'PEAR' | 'HEART' | 'MARQUISE' | 'RADIANT' | 'ASSCHER';

export type NivodaColor =
  | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'FANCY';

export type NivodaClarity =
  | 'FL' | 'IF' | 'VVS1' | 'VVS2' | 'VS1' | 'VS2' | 'SI1' | 'SI2' | 'SI3' | 'I1';

export type NivodaQuality = 'EX' | 'ID' | 'VG' | 'G' | 'F';

export type NivodaCertLab =
  | 'GIA' | 'IGI' | 'HRD' | 'GCAL' | 'AGS' | 'WISE';

export type NivodaSearchFilters = {
  labgrown?: boolean;
  shapes?: NivodaShape[];
  color?: NivodaColor[];
  clarity?: NivodaClarity[];
  cut?: NivodaQuality[];
  certificate_lab?: NivodaCertLab[];
  sizes?: { from: number; to: number };               // carat
  dollar_value?: { from: number; to: number };        // cents
  availability?: 'AVAILABLE' | 'NOT_AVAILABLE' | 'ON_HOLD' | 'ON_MEMO';
  hide_memo?: boolean;
  has_image?: boolean;
};

export type NivodaSortField = 'price' | 'discount' | 'size' | 'createdAt' | 'none';
export type NivodaSortDirection = 'ASC' | 'DESC';

export type NivodaSearchOptions = {
  limit?: number;     // up to 50
  offset?: number;    // up to 50000 total
  order?: { type: NivodaSortField; direction: NivodaSortDirection };
};

export type NivodaCertificate = {
  lab: string | null;
  certNumber: string | null;
  shape: string | null;
  carats: number | null;
  clarity: string | null;
  color: string | null;
  cut: string | null;
  polish: string | null;
  symmetry: string | null;
  floInt: string | null;
  width: number | null;
  length: number | null;
  depth: number | null;
  depthPercentage: number | null;
  table: number | null;
  pdfUrl: string | null;
};

export type NivodaDiamond = {
  id: string;                  // offer ID — used for create_hold / create_order
  price: number | null;
  markup_price: number | null;
  diamond: {
    id: string | null;
    NivodaStockId: string | null;
    availability: string | null;
    image: string | null;
    video: string | null;
    certificate: NivodaCertificate | null;
  };
};

export type NivodaSearchResult = {
  total_count: number;
  items: NivodaDiamond[];
};

export type NivodaHoldResponse = {
  id: string | null;
  denied: boolean | null;
  until: string | null;
};

export type NivodaOrderResponse = {
  id: string | null;
  status: string | null;
};

// ── Token cache (Supabase-backed for cross-invocation sharing) ─────────────

type TokenRow = { token: string; expires_at: string };

async function readCachedToken(): Promise<TokenRow | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('nivoda_tokens')
    .select('token, expires_at')
    .eq('id', 'default')
    .maybeSingle();
  return (data as TokenRow | null) ?? null;
}

async function writeCachedToken(token: string, expiresAt: Date): Promise<void> {
  const sb = createServiceClient();
  await sb
    .from('nivoda_tokens')
    .upsert(
      { id: 'default', token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
}

async function isTokenFresh(row: TokenRow): Promise<boolean> {
  const expiresAt = new Date(row.expires_at).getTime();
  return expiresAt - Date.now() > TOKEN_REFRESH_BEFORE_MS;
}

/** Delete the cached token so the next request forces a fresh login. */
async function clearCachedToken(): Promise<void> {
  try {
    const sb = createServiceClient();
    await sb.from('nivoda_tokens').delete().eq('id', 'default');
  } catch {
    /* best-effort */
  }
}

/**
 * Fetch a fresh token from Nivoda using the credentials in env. Persists
 * to cache with an expiry derived from `TOKEN_TTL_MS` (Nivoda doesn't
 * return an explicit expiry).
 */
async function refreshToken(): Promise<string> {
  const username = process.env.NIVODA_USERNAME;
  const password = process.env.NIVODA_PASSWORD;
  if (!username || !password) {
    throw new Error('NIVODA_USERNAME / NIVODA_PASSWORD not configured');
  }

  // The authenticate query takes inline string args; we use variables so
  // credentials don't end up in any logs that print the query body.
  const query = `
    query Auth($username: String!, $password: String!) {
      authenticate {
        username_and_password(username: $username, password: $password) {
          token
        }
      }
    }
  `;

  let res: Response;
  try {
    res = await fetch(NIVODA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { username, password } }),
      cache: 'no-store',
      signal: timeoutSignal(NIVODA_FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(/abort|timeout/i.test(msg) ? `Nivoda auth timed out (>${NIVODA_FETCH_TIMEOUT_MS}ms)` : `Nivoda auth fetch failed: ${msg}`);
  }

  if (!res.ok) {
    throw new Error(`Nivoda auth HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: { authenticate?: { username_and_password?: { token?: string } } };
    errors?: { message?: string }[];
  };

  if (json.errors && json.errors.length > 0) {
    throw new Error(`Nivoda auth error: ${json.errors[0]?.message ?? 'unknown'}`);
  }

  const token = json.data?.authenticate?.username_and_password?.token;
  if (!token) throw new Error('Nivoda auth: no token returned');

  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await writeCachedToken(token, expiresAt);
  return token;
}

/**
 * Get a valid token — from cache if fresh, refresh otherwise.
 */
export async function getNivodaToken(): Promise<string> {
  const cached = await readCachedToken();
  if (cached && (await isTokenFresh(cached))) return cached.token;
  return refreshToken();
}

// ── Core request wrapper ───────────────────────────────────────────────────

export type GraphQLError = { message: string; path?: (string | number)[] };

export type NivodaRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errors: GraphQLError[] };

/**
 * Send a GraphQL request to Nivoda with the cached token. Auto-refreshes
 * on Unauthenticated/401 and retries once.
 *
 * The query MUST accept a `$token: String!` variable and wrap the
 * operation in `as(token: $token) { ... }` — that's how Nivoda passes
 * the bearer token.
 */
export async function nivodaRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  opts: { retryOnAuth?: boolean } = { retryOnAuth: true }
): Promise<NivodaRequestResult<T>> {
  let token: string;
  try {
    token = await getNivodaToken();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'token error', errors: [] };
  }

  const body = JSON.stringify({ query, variables: { ...variables, token } });

  let res: Response;
  try {
    res = await fetch(NIVODA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      signal: timeoutSignal(NIVODA_FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: /abort|timeout/i.test(msg)
        ? `Nivoda request timed out (>${NIVODA_FETCH_TIMEOUT_MS}ms)`
        : (msg || 'network error'),
      errors: [],
    };
  }

  if (res.status === 401 && opts.retryOnAuth) {
    // Force refresh and retry once
    try {
      await refreshToken();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'refresh failed', errors: [] };
    }
    return nivodaRequest<T>(query, variables, { retryOnAuth: false });
  }

  if (!res.ok) {
    // Capture the body so we can surface the actual GraphQL parse error
    // (Nivoda returns a JSON envelope with `errors` even on 4xx).
    let bodyDetail = '';
    try {
      const errBody = await res.json();
      const firstMsg = errBody?.errors?.[0]?.message;
      if (firstMsg) bodyDetail = String(firstMsg).slice(0, 240);
    } catch {
      try {
        bodyDetail = (await res.text()).slice(0, 240);
      } catch {
        /* ignore */
      }
    }
    return {
      ok: false,
      error: bodyDetail
        ? `Nivoda HTTP ${res.status}: ${bodyDetail}`
        : `Nivoda HTTP ${res.status}`,
      errors: [],
    };
  }

  const json = (await res.json()) as { data?: T; errors?: GraphQLError[] };

  if (json.errors && json.errors.length > 0) {
    const authError = json.errors.some((e) => {
      const m = (e.message || '').toLowerCase();
      // Nivoda signals an invalid/expired token a few different ways —
      // treat all of them as "refresh and retry".
      return (
        m.includes('unauthenticated') ||
        m.includes('jwt expired') ||
        m.includes('jwt malformed') ||
        m.includes('invalid token') ||
        m.includes('token expired')
      );
    });
    if (authError && opts.retryOnAuth) {
      // The stale token is poisoning the cache — clear it so refresh writes fresh.
      await clearCachedToken();
      try {
        await refreshToken();
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'refresh failed', errors: json.errors };
      }
      return nivodaRequest<T>(query, variables, { retryOnAuth: false });
    }
    return {
      ok: false,
      error: json.errors[0]?.message ?? 'GraphQL error',
      errors: json.errors,
    };
  }

  if (!json.data) {
    return { ok: false, error: 'Nivoda returned no data', errors: [] };
  }
  return { ok: true, data: json.data };
}

// ── Search ─────────────────────────────────────────────────────────────────

/**
 * GraphQL literal serializer. Nivoda's `diamonds_by_query(query: { ... })`
 * argument is an inline input object that mixes enum values (unquoted —
 * `shapes: [ROUND]`) with scalar values (quoted — `availability: AVAILABLE`
 * is enum, but `certNumber: "1234"` would be a string).
 *
 * Rather than guess Nivoda's GraphQL input type names (one wrong guess
 * → "Variable type doesn't exist" → HTTP 400 with no usable error),
 * we inline everything as GraphQL literal source and only pass $token
 * as a variable.
 */

// Whitelisted enum sets — values here are emitted UNQUOTED.
const SHAPE_ENUM = new Set([
  'ROUND', 'OVAL', 'PRINCESS', 'CUSHION', 'EMERALD',
  'PEAR', 'HEART', 'MARQUISE', 'RADIANT', 'ASSCHER',
]);
const COLOR_ENUM = new Set([
  'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
  'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'FANCY',
]);
const CLARITY_ENUM = new Set([
  'FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3',
]);
const QUALITY_ENUM = new Set(['EX', 'ID', 'EIGHTX', 'VG', 'G', 'F', 'P']);
const AVAILABILITY_ENUM = new Set([
  'AVAILABLE', 'NOT_AVAILABLE', 'ON_HOLD', 'ON_MEMO',
]);
const CERT_LAB_ENUM = new Set([
  'GIA', 'IGI', 'HRD', 'GCAL', 'AGS', 'WISE', 'IIDGR', 'SGL', 'EGL',
  'NONE', 'LAB', 'OTHER',
]);

function sanitizeEnum(value: string, allowed: Set<string>): string | null {
  const v = value.toString().toUpperCase().replace(/[^A-Z0-9_]/g, '');
  return allowed.has(v) ? v : null;
}

function sanitizeEnumArray(values: string[], allowed: Set<string>): string[] {
  return values
    .map((v) => sanitizeEnum(v, allowed))
    .filter((v): v is string => v !== null);
}

/**
 * Build the inline GraphQL literal for the `query: { ... }` argument.
 *
 * Type rules per Nivoda's schema:
 *   - shapes:          List of String        — quoted: ["ROUND", "OVAL"]
 *   - color:           List of DiamondColor  — enum (unquoted): [D, E, F]
 *   - clarity:         List of DiamondClarity — enum
 *   - cut:             List of DiamondQuality — enum
 *   - certificate_lab: List of CertificateLab — enum
 *   - availability:    ProductAvailability   — enum
 */
function buildQueryLiteral(filters: NivodaSearchFilters): string {
  const parts: string[] = [];

  // Always-on
  parts.push('search_on_markup_price: true');
  parts.push('hide_memo: true');

  if (filters.labgrown !== undefined) {
    parts.push(`labgrown: ${filters.labgrown}`);
  }
  if (filters.shapes?.length) {
    // shapes is List of String — quote each value
    const cleaned = sanitizeEnumArray(filters.shapes as string[], SHAPE_ENUM);
    if (cleaned.length) {
      parts.push(`shapes: [${cleaned.map((s) => `"${s}"`).join(', ')}]`);
    }
  }
  if (filters.color?.length) {
    const cleaned = sanitizeEnumArray(filters.color as string[], COLOR_ENUM);
    if (cleaned.length) parts.push(`color: [${cleaned.join(', ')}]`);
  }
  if (filters.clarity?.length) {
    const cleaned = sanitizeEnumArray(filters.clarity as string[], CLARITY_ENUM);
    if (cleaned.length) parts.push(`clarity: [${cleaned.join(', ')}]`);
  }
  if (filters.cut?.length) {
    const cleaned = sanitizeEnumArray(filters.cut as string[], QUALITY_ENUM);
    if (cleaned.length) parts.push(`cut: [${cleaned.join(', ')}]`);
  }
  if (filters.certificate_lab?.length) {
    const cleaned = sanitizeEnumArray(filters.certificate_lab as string[], CERT_LAB_ENUM);
    if (cleaned.length) parts.push(`certificate_lab: [${cleaned.join(', ')}]`);
  }
  if (filters.sizes) {
    parts.push(`sizes: { from: ${Number(filters.sizes.from)}, to: ${Number(filters.sizes.to)} }`);
  }
  if (filters.dollar_value) {
    parts.push(
      `dollar_value: { from: ${Math.round(filters.dollar_value.from)}, to: ${Math.round(filters.dollar_value.to)} }`
    );
  }

  const avail = filters.availability ?? 'AVAILABLE';
  const cleanAvail = sanitizeEnum(avail, AVAILABILITY_ENUM);
  if (cleanAvail) parts.push(`availability: ${cleanAvail}`);

  if (filters.has_image !== undefined) {
    parts.push(`has_image: ${filters.has_image}`);
  }

  return `{ ${parts.join(', ')} }`;
}

const SEARCH_FIELDS = `
  total_count
  items {
    id
    price
    markup_price
    diamond {
      id
      NivodaStockId
      availability
      image
      video
      certificate {
        lab
        certNumber
        shape
        carats
        clarity
        color
        cut
        polish
        symmetry
        floInt
        width
        length
        depth
        depthPercentage
        table
        pdfUrl
      }
    }
  }
`;

export async function searchDiamonds(
  filters: NivodaSearchFilters,
  opts: NivodaSearchOptions = {}
): Promise<NivodaRequestResult<NivodaSearchResult>> {
  const limit = Math.min(opts.limit ?? 24, 50);
  const offset = Math.max(0, opts.offset ?? 0);
  const sortType = opts.order?.type ?? 'price';
  const sortDir = opts.order?.direction ?? 'ASC';

  // Whitelist sort values too (they're enums in Nivoda's schema)
  const sortTypeClean = ['price', 'discount', 'size', 'createdAt', 'none'].includes(sortType)
    ? sortType
    : 'price';
  const sortDirClean = sortDir === 'DESC' ? 'DESC' : 'ASC';

  const queryLiteral = buildQueryLiteral(filters);

  const gql = `
    query NivodaSearch($token: String!) {
      as(token: $token) {
        diamonds_by_query(
          query: ${queryLiteral}
          limit: ${limit}
          offset: ${offset}
          order: { type: ${sortTypeClean}, direction: ${sortDirClean} }
        ) {${SEARCH_FIELDS}}
      }
    }
  `;

  const r = await nivodaRequest<{
    as: { diamonds_by_query: NivodaSearchResult };
  }>(gql, {});

  if (!r.ok) return r;
  const data = r.data.as.diamonds_by_query;
  return { ok: true, data: { ...data, items: (data.items ?? []).map(centsToDollars) } };
}

/**
 * Nivoda returns `price` and `markup_price` in CENTS (e.g. a 0.5ct round
 * comes back as 9400 = $94). Convert to whole dollars once, here, so every
 * caller (cards, cart, holds, orders) sees real USD. Idempotent-safe enough
 * for our flow because we only ever normalise freshly-fetched API data.
 */
function centsToDollars(d: NivodaDiamond): NivodaDiamond {
  return {
    ...d,
    price: d.price == null ? d.price : Math.round(d.price) / 100,
    markup_price: d.markup_price == null ? d.markup_price : Math.round(d.markup_price) / 100,
  };
}

// ── Stone detail ───────────────────────────────────────────────────────────

export async function getDiamondByOfferId(
  offerId: string
): Promise<NivodaRequestResult<NivodaDiamond | null>> {
  // Validate offerId — must be safe to inline as a GraphQL string literal.
  const safe = safeId(offerId);
  if (!safe) {
    return { ok: false, error: 'invalid offer id', errors: [] };
  }

  const gql = `
    query NivodaStone($token: String!) {
      as(token: $token) {
        get_diamond_by_id(diamond_id: "${safe}") {
          id
          price
          markup_price
          diamond {
            id
            NivodaStockId
            availability
            image
            video
            certificate {
              lab certNumber shape carats clarity color cut polish symmetry floInt
              width length depth depthPercentage table pdfUrl
            }
          }
        }
      }
    }
  `;

  const r = await nivodaRequest<{ as: { get_diamond_by_id: NivodaDiamond | null } }>(gql, {});
  if (!r.ok) return r;
  const stone = r.data.as.get_diamond_by_id ?? null;
  return { ok: true, data: stone ? centsToDollars(stone) : null };
}

// ── Holds + orders (Pro API) ──────────────────────────────────────────────

function safeId(s: string | undefined | null): string {
  // Nivoda search results return offer ids as type-prefixed composites,
  // e.g. "DIAMOND/c5241ce8-799e-441a-a02d-e2a49c6a6dd3". The lookup/hold/
  // order APIs all expect the bare UUID — the type travels separately as
  // ProductType — so strip the "TYPE/" prefix before sanitizing. Without
  // this, Nivoda rejects the id with "invalid input syntax for type uuid".
  const raw = String(s ?? '');
  const id = raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw;
  return id.replace(/[^A-Za-z0-9-]/g, '');
}
function safeStringLit(s: string | undefined | null): string {
  // Escape backslashes and double-quotes for a GraphQL string literal.
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function createHold(
  offerId: string
): Promise<NivodaRequestResult<NivodaHoldResponse>> {
  if (!NIVODA_PRO_ENABLED) {
    return { ok: false, error: 'Nivoda Pro API not enabled', errors: [] };
  }
  const id = safeId(offerId);
  if (!id) return { ok: false, error: 'invalid offer id', errors: [] };

  const gql = `
    mutation NivodaCreateHold($token: String!) {
      as(token: $token) {
        create_hold(ProductId: "${id}", ProductType: Diamond) {
          id
          denied
          until
        }
      }
    }
  `;
  const r = await nivodaRequest<{ as: { create_hold: NivodaHoldResponse } }>(gql, {});
  if (!r.ok) return r;
  return { ok: true, data: r.data.as.create_hold };
}

export async function cancelHold(
  nivodaHoldId: string
): Promise<NivodaRequestResult<{ id: string | null; status: string | null }>> {
  if (!NIVODA_PRO_ENABLED) {
    return { ok: false, error: 'Nivoda Pro API not enabled', errors: [] };
  }
  const id = safeId(nivodaHoldId);
  if (!id) return { ok: false, error: 'invalid hold id', errors: [] };

  const gql = `
    mutation NivodaCancelHold($token: String!) {
      as(token: $token) {
        cancel_hold(hold_id: "${id}") {
          id
          status
        }
      }
    }
  `;
  const r = await nivodaRequest<{
    as: { cancel_hold: { id: string | null; status: string | null } };
  }>(gql, {});
  if (!r.ok) return r;
  return { ok: true, data: r.data.as.cancel_hold };
}

export async function createOrder(args: {
  offerId: string;
  orderReference?: string;
  destinationId?: string;
}): Promise<NivodaRequestResult<NivodaOrderResponse>> {
  if (!NIVODA_PRO_ENABLED) {
    return { ok: false, error: 'Nivoda Pro API not enabled', errors: [] };
  }
  const offer = safeId(args.offerId);
  if (!offer) return { ok: false, error: 'invalid offer id', errors: [] };
  const ref = args.orderReference ? `"${safeStringLit(args.orderReference)}"` : 'null';
  const dest = args.destinationId ?? process.env.NIVODA_DESTINATION_ID;
  const destArg = dest ? `, destination_id: "${safeId(dest)}"` : '';

  const gql = `
    mutation NivodaCreateOrder($token: String!) {
      as(token: $token) {
        create_order(
          ProductType: "DIAMOND"
          ProductId: "${offer}"
          order_reference: ${ref}
          return: false${destArg}
        ) {
          id
          status
        }
      }
    }
  `;
  const r = await nivodaRequest<{ as: { create_order: NivodaOrderResponse } }>(gql, {});
  if (!r.ok) return r;
  return { ok: true, data: r.data.as.create_order };
}

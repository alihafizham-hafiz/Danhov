/**
 * Pricing engine — Phase 4.
 *
 * Supports platinum (900Pt/100Ir alloy) and all 14k/18k gold alloy variants.
 *
 * Formula per metal variant:
 *   metalWeight    = platinumSpecWeight × DENSITY_RATIO[metal]
 *   metalCostPerG  = goldSpot × purity + alloyCost            (gold)
 *                  = (platSpot × 0.90) + (iridiumSpot × 0.10) (platinum 900Pt/100Ir)
 *   metalCost      = metalWeight × metalCostPerG
 *   castingLabor   = metalWeight × casting_labor_per_gram
 *   labour         = base_labor_usd + diamond_labor_usd
 *   stones         = stones_value_usd  (or auto from stone_groups if null)
 *   rhodium        = per-metal rhodium plating uplift (white gold only)
 *   subTotal       = metalCost + castingLabor + labour + stones + rhodium
 *   total          = roundTo10(subTotal × markup_multiplier)
 *
 * Spot prices:
 *   Gold (XAU)     → GoldAPI /XAU/USD → price_gram_24k (USD per gram, 24k pure)
 *   Platinum (XPT) → GoldAPI /XPT/USD → price per troy oz ÷ 31.1035 = USD/g
 *   Iridium        → metal_prices table (manual update) → default $237/g
 *
 * Gold + platinum cached 2-hour TTL. Iridium read from DB (no expiry — moves slowly).
 */

import { createServiceClient } from '@/lib/supabase/server';
import { computeStoneGroupsBreakdown, type StoneGroup } from '@/lib/stone-math';

const GOLDAPI_BASE   = 'https://www.goldapi.io/api';
const OUNCE_TO_GRAMS = 31.1035;

// Iridium has no standard free API — stored in metal_prices table (manual updates).
// Fallback when no DB row exists: ~$237/g ≈ $7,400/troy oz ÷ 31.1 (Jun 2026 reference).
const IRIDIUM_SPOT_DEFAULT = 237.0;

/** Round a price to the nearest $10 (e.g. $2892 → $2890, $2895 → $2900). */
function roundTo10(n: number): number {
  return Math.round(n / 10) * 10;
}

/**
 * Static fallback spot prices used when GoldAPI is unreachable and the DB
 * cache is empty.  Calibrated to Jun 2026 wholesale rates:
 *   Gold 24k ≈ $98/g  → 14k alloy ≈ $60/g, 18k alloy ≈ $76/g
 *   Platinum ≈ $32/g  → 900Pt/100Ir alloy ≈ $52/g
 */
export const STATIC_SPOTS: AllSpots = {
  gold:     { price_per_gram_usd: 98,                   fetched_at: 'static' },
  platinum: { price_per_gram_usd: 32,                   fetched_at: 'static' },
  iridium:  { price_per_gram_usd: IRIDIUM_SPOT_DEFAULT, fetched_at: 'static' },
};

// ── Metal constants ───────────────────────────────────────────────────────────

/**
 * Density ratio: alloy_density / platinum_density.
 * Studio specs weight in platinum grams; multiply by this ratio to get the
 * actual weight of the same piece made in the chosen alloy.
 *
 * Reference densities (g/cm³):
 *   Platinum 950 : 21.45   (base — ratio = 1.0)
 *   18k Yellow   : 15.50   → 0.7228
 *   18k White    : 14.70   → 0.6853
 *   18k Rose     : 15.20   → 0.7088
 *   14k Yellow   : 13.10   → 0.6108
 *   14k White    : 12.90   → 0.6014
 *   14k Rose     : 13.10   → 0.6108
 */
export const DENSITY_RATIO: Record<string, number> = {
  platinum:     1.0000,
  '18k_yellow': 0.7228,
  '18k_white':  0.6853,
  '18k_rose':   0.7088,
  '14k_yellow': 0.6108,
  '14k_white':  0.6014,
  '14k_rose':   0.6108,
};

// Gold purity (fraction of pure gold in the alloy)
const GOLD_PURITY: Record<string, number> = {
  '18k_yellow': 0.7500,
  '18k_white':  0.7500,
  '18k_rose':   0.7500,
  '14k_yellow': 0.5833,
  '14k_white':  0.5833,
  '14k_rose':   0.5833,
};

// DANHOV uses 900Pt/100Ir alloy: 90% platinum + 10% iridium by weight.
const PT_FRACTION  = 0.90;
const IR_FRACTION  = 0.10;

// Base alloy cost per gram (silver, copper, palladium, etc. in the gold alloy)
const ALLOY_COST_PER_G = 3;

// Rhodium plating uplift for white-gold variants (one-time finishing cost, USD)
export const RHODIUM_UPLIFT: Record<string, number> = {
  '14k_white': 60,
  '18k_white': 80,
};

export const METAL_LABEL: Record<string, string> = {
  platinum:     'Platinum',
  '14k_yellow': '14k Yellow Gold',
  '14k_white':  '14k White Gold',
  '14k_rose':   '14k Rose Gold',
  '18k_yellow': '18k Yellow Gold',
  '18k_white':  '18k White Gold',
  '18k_rose':   '18k Rose Gold',
};

/**
 * Canonical ordered list of all metals DANHOV offers.
 * Every product is available in all of these — platinum is the pricing base,
 * and the other metal prices are derived from it automatically.
 */
export const ALL_METALS = [
  'platinum',
  '14k_yellow', '14k_white', '14k_rose',
  '18k_yellow', '18k_white', '18k_rose',
] as const;

// Legacy alias
export const PURITY_LABEL = METAL_LABEL;

// ── Spot price types and cache layer ─────────────────────────────────────────

export type SpotPrice = {
  price_per_gram_usd: number;
  fetched_at: string;
};

export type AllSpots = {
  gold: SpotPrice;
  platinum: SpotPrice;
  iridium: SpotPrice;
};

async function fetchSpot(
  metalCode: 'XAU' | 'XPT',
  cacheKey: 'gold' | 'platinum',
): Promise<SpotPrice> {
  const client  = createServiceClient();
  const cutoff  = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: cached } = await client
    .from('metal_prices')
    .select('price_per_gram_usd, fetched_at')
    .eq('metal', cacheKey)
    .gte('fetched_at', cutoff)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return {
      price_per_gram_usd: Number(cached.price_per_gram_usd),
      fetched_at: cached.fetched_at as string,
    };
  }

  const token = process.env.GOLDAPI_TOKEN;
  if (!token) throw new Error('GOLDAPI_TOKEN missing');

  const res = await fetch(`${GOLDAPI_BASE}/${metalCode}/USD`, {
    headers: { 'x-access-token': token, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    // Fall back to any stale row rather than failing completely
    const { data: anyOld } = await client
      .from('metal_prices')
      .select('price_per_gram_usd, fetched_at')
      .eq('metal', cacheKey)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anyOld) {
      return {
        price_per_gram_usd: Number(anyOld.price_per_gram_usd),
        fetched_at: anyOld.fetched_at as string,
      };
    }
    throw new Error(`GoldAPI ${metalCode} failed (${res.status}) — no cache available`);
  }

  const payload = (await res.json()) as { price?: number; price_gram_24k?: number };
  const perGram =
    typeof payload.price_gram_24k === 'number'
      ? payload.price_gram_24k
      : (payload.price ?? 0) / OUNCE_TO_GRAMS;

  if (!perGram || perGram <= 0) {
    throw new Error(`GoldAPI ${metalCode} returned an invalid price`);
  }

  await client.from('metal_prices').insert({
    metal:              cacheKey,
    price_per_gram_usd: perGram,
    source:             'goldapi',
  });

  return { price_per_gram_usd: perGram, fetched_at: new Date().toISOString() };
}

export async function getGoldSpot(): Promise<SpotPrice> {
  return fetchSpot('XAU', 'gold');
}

export async function getPlatinumSpot(): Promise<SpotPrice> {
  return fetchSpot('XPT', 'platinum');
}

/**
 * Iridium spot: reads the most-recent row from metal_prices (metal='iridium').
 * Falls back to IRIDIUM_SPOT_DEFAULT when no row exists.
 * Admin updates it by inserting a new row in Supabase or via admin panel.
 */
export async function getIridiumSpot(): Promise<SpotPrice> {
  const client = createServiceClient();
  const { data } = await client
    .from('metal_prices')
    .select('price_per_gram_usd, fetched_at')
    .eq('metal', 'iridium')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    return {
      price_per_gram_usd: Number(data.price_per_gram_usd),
      fetched_at: data.fetched_at as string,
    };
  }
  return {
    price_per_gram_usd: IRIDIUM_SPOT_DEFAULT,
    fetched_at: new Date().toISOString(),
  };
}

/** Fetch gold, platinum, and iridium spots in parallel. */
export async function getAllSpots(): Promise<AllSpots> {
  const [gold, platinum, iridium] = await Promise.all([
    getGoldSpot(),
    getPlatinumSpot(),
    getIridiumSpot(),
  ]);
  return { gold, platinum, iridium };
}

// ── Metal cost helpers (pure, no DB) ─────────────────────────────────────────

/**
 * USD per gram of finished alloy at given spot prices.
 * Platinum uses 900Pt/100Ir: (platSpot × 0.90) + (iridiumSpot × 0.10).
 * iridiumSpot defaults to IRIDIUM_SPOT_DEFAULT when not passed.
 */
export function metalCostPerGram(
  metalKey: string,
  goldSpot: number,
  platSpot: number,
  iridiumSpot: number = IRIDIUM_SPOT_DEFAULT,
): number {
  if (metalKey === 'platinum') {
    return (platSpot * PT_FRACTION) + (iridiumSpot * IR_FRACTION);
  }
  const purity = GOLD_PURITY[metalKey] ?? 0.5833;
  return goldSpot * purity + ALLOY_COST_PER_G;
}

/** Actual physical weight of the piece in `metalKey`, given platinum spec weight. */
export function metalWeightFromPlat(platinumWeightG: number, metalKey: string): number {
  return platinumWeightG * (DENSITY_RATIO[metalKey] ?? 1.0);
}

// ── Pricing inputs / outputs ──────────────────────────────────────────────────

export type PricingInputs = {
  default_metal:           string | null;
  gold_weight_g:           number | null;        // weight spec'd in platinum grams
  base_labor_usd:          number | null;        // setting labour
  diamond_labor_usd?:      number | null;        // centre-diamond setting labour
  casting_labor_per_gram?: number | null;        // per-gram casting/finishing cost
  custom_labor_usd?:       number | null;        // jewellery labor (hand-set by admin)
  stones_value_usd:        number | null;        // override; null → auto from stone_groups
  stone_groups?:           StoneGroup[] | null;  // used when stones_value_usd is null
  commission_rate?:        number | null;        // kept for backward compat; no longer used
  markup_multiplier?:      number | null;        // website price = roundTo10(cost × multiplier)
};

export type PriceBreakdown = {
  total_usd:             number;
  metal_cost_usd:        number;
  metal_with_markup_usd: number;  // legacy alias = metal_cost_usd
  casting_labor_usd:     number;
  labor_usd:             number;
  stones_usd:            number;
  rhodium_uplift_usd:    number;
  commission_usd:        number;
  metal_used:            string;
  metal_label:           string;
  spot_per_gram_usd:     number;
  spot_fetched_at:       string;
};

/**
 * Parse a product's metals array into canonical metal keys.
 * Handles both stored keys ('14k_yellow') and display names ('14k Yellow Gold').
 */
export function availableMetals(metals: string[]): string[] {
  if (!metals || metals.length === 0) return [];
  const ALL_KEYS = new Set(Object.keys(DENSITY_RATIO));
  return metals
    .map((m) => m.toLowerCase().trim().replace(/\s+/g, '_'))
    .filter((m) => ALL_KEYS.has(m));
}

/**
 * Normalize a metal key to its pricing equivalent.
 * DANHOV's pricing policy: color is not a cost factor within a karat tier.
 * All 14k variants price identically to 14k yellow; all 18k to 18k yellow.
 * Rhodium plating is absorbed into overhead, not charged per-piece.
 */
function pricingNormalKey(metal: string): string {
  if (metal.startsWith('14k')) return '14k_yellow';
  if (metal.startsWith('18k')) return '18k_yellow';
  return metal;
}

/**
 * Pure compute — no DB or network.
 * Pass spots from getAllSpots().
 */
export function computePrice(
  p: PricingInputs,
  spots: AllSpots,
  metalChoice?: string | null,
): PriceBreakdown {
  const metalKey =
    metalChoice && DENSITY_RATIO[metalChoice]
      ? metalChoice
      : p.default_metal && DENSITY_RATIO[p.default_metal]
      ? p.default_metal
      : '14k_yellow';

  // Use yellow-normalized key for density + cost calculations so all colors
  // within the same karat tier produce identical prices (matches admin table).
  const priceKey = pricingNormalKey(metalKey);

  const platWeight     = p.gold_weight_g ?? 0;
  const metalWeight    = metalWeightFromPlat(platWeight, priceKey);
  const iridiumPerGram = spots.iridium.price_per_gram_usd;
  const costPerG       = metalCostPerGram(
    priceKey,
    spots.gold.price_per_gram_usd,
    spots.platinum.price_per_gram_usd,
    iridiumPerGram,
  );
  const metalCost    = metalWeight * costPerG;
  const castingLabor = metalWeight * (p.casting_labor_per_gram ?? 0);
  const rhodium      = 0; // color is not a cost factor — matches admin pricing policy
  const labor        = (p.base_labor_usd ?? 0) + (p.diamond_labor_usd ?? 0) + (p.custom_labor_usd ?? 0);

  // Stone cost: use override if set, else auto-compute from stone_groups
  let stones = p.stones_value_usd ?? null;
  if (stones == null) {
    if (Array.isArray(p.stone_groups) && p.stone_groups.length > 0) {
      stones = computeStoneGroupsBreakdown(p.stone_groups).total_stone_price_usd;
    } else {
      stones = 0;
    }
  }

  const subTotal    = metalCost + castingLabor + labor + stones + rhodium;
  // Snap to the nearest standard preset (2 / 3 / 4 / 5). Old DB records may
  // store non-standard values like 2.2 or 3.5 — treat those as 4, matching
  // the behaviour of the admin editor.
  const VALID_MULTIPLIERS = new Set([2, 3, 4, 5]);
  const markup = p.markup_multiplier != null && VALID_MULTIPLIERS.has(p.markup_multiplier)
    ? p.markup_multiplier
    : 4;
  // Round cost to nearest $10 first, then apply markup — so displayed cost × markup = displayed website price.
  const costRounded = roundTo10(subTotal);
  const total       = costRounded * markup;

  const isPlatinum = priceKey === 'platinum';

  return {
    total_usd:             roundTo10(total),
    metal_cost_usd:        Math.round(metalCost * 100) / 100,
    metal_with_markup_usd: Math.round(metalCost),
    casting_labor_usd:     Math.round(castingLabor),
    labor_usd:             labor,
    stones_usd:            Math.round(stones),
    rhodium_uplift_usd:    rhodium,
    commission_usd:        0,
    metal_used:            metalKey,
    metal_label:           METAL_LABEL[metalKey] ?? metalKey,
    spot_per_gram_usd:     Math.round(
      (isPlatinum
        ? spots.platinum.price_per_gram_usd
        : spots.gold.price_per_gram_usd
      ) * 100,
    ) / 100,
    spot_fetched_at: isPlatinum
      ? spots.platinum.fetched_at
      : spots.gold.fetched_at,
  };
}

/** Full pipeline: fetch today's spots and compute one metal variant. */
export async function priceProduct(
  p: PricingInputs,
  metalChoice?: string | null,
): Promise<PriceBreakdown> {
  const spots = await getAllSpots();
  return computePrice(p, spots, metalChoice);
}

/** Compute every available metal option for a product. */
export async function priceAllOptions(
  p: PricingInputs,
  metalsArray: string[],
): Promise<PriceBreakdown[]> {
  const spots   = await getAllSpots();
  const options = availableMetals(metalsArray);
  const keys    = options.length > 0
    ? options
    : p.default_metal && DENSITY_RATIO[p.default_metal]
    ? [p.default_metal]
    : ['14k_yellow'];
  return keys.map((k) => computePrice(p, spots, k));
}

export function formatUsd(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/**
 * Batch-compute default-metal prices for a list of products.
 * Fetches spot prices once (2-hour cache), then runs computePrice for every
 * product that has gold_weight_g or stones_value_usd configured.
 * Returns a map of { sku → total_usd }. Products without pricing data are absent.
 */
export async function computeListingPriceMap(
  products: Array<PricingInputs & { sku: string; metals?: string[] | null }>,
): Promise<Record<string, number>> {
  const priceable = products.filter(
    p => (p.gold_weight_g ?? 0) > 0 || (p.stones_value_usd ?? 0) > 0,
  );
  if (priceable.length === 0) return {};
  try {
    const spots = await getAllSpots();
    const result: Record<string, number> = {};
    for (const p of priceable) {
      try {
        // Prefer platinum for consistent pricing; fall back to default_metal
        const platMetal = p.metals?.find(m => /plat/i.test(m)) ?? null;
        const effectiveMetal = platMetal ?? p.default_metal;
        result[p.sku] = computePrice(p, spots, effectiveMetal).total_usd;
      } catch {
        // skip products that fail individual computation
      }
    }
    return result;
  } catch {
    return {};
  }
}

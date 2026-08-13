/**
 * Stone math helpers for the admin product editor.
 *
 * We auto-fill three fields from the manual inputs (stone_size_mm +
 * stone_count_input):
 *
 *   • carat per stone    — round brilliant approximation
 *   • total carats       — carat per stone × count
 *   • price per carat    — tiered melee/diamond market estimate
 *   • total stone price  — total carats × price per carat
 *
 * The price-per-carat lookup uses an industry-tier table for round
 * brilliants in the SI/VS color range — the same band most DANHOV
 * accent stones fall in. The studio can always override the auto-fill
 * by editing the price/ct number directly.
 */

/**
 * Round brilliant carat weight lookup table — full melee-to-large-center chart.
 * Values verified against industry references (GIA, Serendipity, Harmony Jewels)
 * and DANHOV client quoting standards.
 *
 * Key DANHOV reference points:
 *   6.4 mm = 1.00 ct  |  7.3 mm = 1.50 ct  |  8.1 mm = 2.00 ct
 *   8.8 mm = 2.50 ct  |  9.1 mm = 3.00 ct  |  10.4 mm = 5.00 ct
 */
const ROUND_CARAT_LUT: [mm: number, ct: number][] = [
  [1.0,  0.005],
  [1.1,  0.006],
  [1.2,  0.008],
  [1.3,  0.010],
  [1.4,  0.012],
  [1.5,  0.015],
  [1.6,  0.018],
  [1.7,  0.020],
  [1.8,  0.025],
  [1.9,  0.028],
  [2.0,  0.030],
  [2.1,  0.035],
  [2.2,  0.040],
  [2.3,  0.045],
  [2.4,  0.050],
  [2.5,  0.060],
  [2.6,  0.070],
  [2.7,  0.080],
  [2.8,  0.090],
  [3.0,  0.100],
  [3.2,  0.120],
  [3.5,  0.160],
  [3.8,  0.200],
  [4.1,  0.250],
  [4.5,  0.350],
  [4.8,  0.400],
  [5.0,  0.500],
  [5.2,  0.550],
  [5.5,  0.650],
  [5.8,  0.750],
  [6.0,  0.800],
  [6.2,  0.900],
  [6.4,  1.000],
  [6.6,  1.100],
  [6.7,  1.200],
  [6.9,  1.300],
  [7.1,  1.400],
  [7.3,  1.500],
  [7.5,  1.600],
  [7.6,  1.700],
  [7.7,  1.750],
  [7.9,  1.900],
  [8.1,  2.000],
  [8.3,  2.100],
  [8.4,  2.200],
  [8.5,  2.300],
  [8.6,  2.400],
  [8.8,  2.500],
  [9.0,  2.750],
  [9.1,  3.000],
  [9.4,  3.250],
  [9.6,  3.500],
  [9.8,  4.000],
  [10.2, 4.500],
  [10.4, 5.000],
  [10.8, 5.500],
  [11.0, 6.000],
  [11.4, 6.500],
  [11.7, 7.000],
  [12.0, 7.500],
  [12.2, 8.000],
  [12.5, 8.500],
  [12.8, 9.000],
  [13.0, 9.500],
  [13.3, 10.000],
];

export function caratFromMm(mm: number): number {
  if (!Number.isFinite(mm) || mm <= 0) return 0;
  // Below 1 mm: scale proportionally from the 1 mm anchor
  if (mm < ROUND_CARAT_LUT[0][0]) {
    return ROUND_CARAT_LUT[0][1] * Math.pow(mm / ROUND_CARAT_LUT[0][0], 3);
  }
  // Above 10 mm: extrapolate with GIA cubic formula (accurate at large sizes)
  const last = ROUND_CARAT_LUT[ROUND_CARAT_LUT.length - 1];
  if (mm > last[0]) return 0.0038 * Math.pow(mm, 3);
  // Linear interpolation between bracketing table entries
  for (let i = 1; i < ROUND_CARAT_LUT.length; i++) {
    const [mm0, ct0] = ROUND_CARAT_LUT[i - 1];
    const [mm1, ct1] = ROUND_CARAT_LUT[i];
    if (mm <= mm1) {
      const t = (mm - mm0) / (mm1 - mm0);
      return ct0 + t * (ct1 - ct0);
    }
  }
  return 0.0038 * Math.pow(mm, 3);
}

/**
 * Shape-specific correction factors relative to a round brilliant of the
 * same average diameter.  Different cuts are ground to different depths and
 * girdle shapes, so the same mm footprint yields a different carat weight.
 *
 * Factors calibrated against GIA / EGL reference charts:
 *   Princess  (+15 %): square-cornered deep pavilion
 *   Cushion   (+10 %): similar to princess, slight spread
 *   Radiant   (+18 %): deepest common cut
 *   Asscher   (+15 %): square step-cut, deep
 *   Emerald   (+20 %): rectangular step-cut, significant depth
 *   Oval      (-10 %): similar spread to round, slightly shallower
 *   Pear      (-15 %): tapered girdle reduces volume
 *   Marquise  (-10 %): elliptical, comparable depth to oval
 *   Heart     (-10 %): similar to oval; cleft removes material
 *   Trillion  (-30 %): very shallow; broad table, thin pavilion
 *   Baguette  (-15 %): step-cut rectangle; shallower than round
 */
const SHAPE_CARAT_CORRECTION: Record<string, number> = {
  round:    1.00,
  oval:     0.90,
  princess: 1.15,
  cushion:  1.10,
  emerald:  1.20,
  pear:     0.85,
  marquise: 0.90,
  asscher:  1.15,
  radiant:  1.18,
  heart:    0.90,
  trillion: 0.70,
  baguette: 0.85,
};

/**
 * Carat weight from length × width + shape.  Uses the round-brilliant
 * baseline formula (0.0038 × avg_mm³) scaled by the shape correction.
 */
export function caratFromShape(
  shape: string | null | undefined,
  length_mm: number | null | undefined,
  width_mm: number | null | undefined,
): number {
  const L = Number(length_mm ?? 0);
  const W = Number(width_mm ?? 0);
  if (!L || !W) return 0;
  const avgMm      = (L + W) / 2;
  const correction = SHAPE_CARAT_CORRECTION[shape ?? 'round'] ?? 1.00;
  return caratFromMm(avgMm) * correction;
}

/**
 * Tiered $/ct estimate for round brilliant diamonds in the SI/VS color
 * range — calibrated against recent wholesale price lists. The studio
 * can override this number on the editor if a particular lot was priced
 * differently. Numbers are USD per carat.
 */
// Calibrated to Nivoda's real NATURAL wholesale prices (sampled July 2026,
// F–H / VS–SI / EX–VG, median of 50 stones per size). These are the studio's
// COST per carat; the product markup multiplier is applied on top at retail.
// Previously these numbers were ~2–8× too high (a rough estimate); now they
// track Nivoda natural pricing so accent-stone values match the marketplace.
const PRICE_PER_CT_TIERS: { ct_min: number; price_per_ct_usd: number }[] = [
  { ct_min: 0.000, price_per_ct_usd: 300 },   // < 0.005 ct (under 1 mm) — below Nivoda melee inventory
  { ct_min: 0.005, price_per_ct_usd: 420 },   // ~1 mm
  { ct_min: 0.010, price_per_ct_usd: 500 },   // ~1.4 mm
  { ct_min: 0.030, price_per_ct_usd: 560 },   // ~2 mm
  { ct_min: 0.060, price_per_ct_usd: 580 },   // ~2.5 mm
  { ct_min: 0.100, price_per_ct_usd: 600 },   // ~3 mm  (Nivoda natural ~$572–793/ct)
  { ct_min: 0.150, price_per_ct_usd: 620 },   // ~3.5 mm
  { ct_min: 0.250, price_per_ct_usd: 650 },   // ~4 mm
  { ct_min: 0.400, price_per_ct_usd: 640 },   // ~4.5 mm
  { ct_min: 0.500, price_per_ct_usd: 660 },   // ~5 mm  (Nivoda ~$633/ct)
  { ct_min: 0.750, price_per_ct_usd: 820 },   // ~6 mm  (Nivoda ~$799/ct)
  { ct_min: 1.000, price_per_ct_usd: 1150 },  // ~6.5 mm (Nivoda ~$1113/ct)
  { ct_min: 1.500, price_per_ct_usd: 2350 },  // (Nivoda ~$2354/ct)
  { ct_min: 2.000, price_per_ct_usd: 3950 },  // (Nivoda ~$3928/ct)
  { ct_min: 3.000, price_per_ct_usd: 7500 },
];

export function pricePerCaratFromCt(ct: number): number {
  if (!Number.isFinite(ct) || ct <= 0) return 0;
  let chosen = PRICE_PER_CT_TIERS[0].price_per_ct_usd;
  for (const tier of PRICE_PER_CT_TIERS) {
    if (ct >= tier.ct_min) chosen = tier.price_per_ct_usd;
  }
  return chosen;
}

/**
 * Diamond / stone shapes offered in the studio editor. `slug` is what we
 * persist; `label` is the human label shown in the dropdown.
 */
export const DIAMOND_SHAPES: { slug: string; label: string }[] = [
  { slug: 'round', label: 'Round brilliant' },
  { slug: 'princess', label: 'Princess' },
  { slug: 'cushion', label: 'Cushion' },
  { slug: 'oval', label: 'Oval' },
  { slug: 'emerald', label: 'Emerald' },
  { slug: 'pear', label: 'Pear' },
  { slug: 'marquise', label: 'Marquise' },
  { slug: 'asscher', label: 'Asscher' },
  { slug: 'radiant', label: 'Radiant' },
  { slug: 'heart', label: 'Heart' },
  { slug: 'trillion', label: 'Trillion' },
  { slug: 'baguette', label: 'Baguette' },
  { slug: 'pearl', label: 'Pearl' },
];

/** One spec'd set of stones on a piece.
 *
 * Stones are measured by length × width (mm). `size_mm` stays for
 * backward-compat — it mirrors the effective diameter (average of length
 * and width) and still drives the carat estimate so existing pricing reads
 * keep working. For a round stone, length == width. */
export type StoneGroup = {
  count: number | null;
  size_mm: number | null;       // effective diameter = (length + width) / 2
  length_mm?: number | null;
  width_mm?: number | null;
  shape: string | null;
  carat_each_override?: number | null;
};

/** Effective diameter from a group's length/width (falls back to size_mm). */
export function effectiveSizeMm(g: {
  size_mm?: number | null;
  length_mm?: number | null;
  width_mm?: number | null;
}): number | null {
  const l = g.length_mm ?? null;
  const w = g.width_mm ?? null;
  if (l != null && w != null) return (Number(l) + Number(w)) / 2;
  if (l != null) return Number(l);
  if (w != null) return Number(w);
  return g.size_mm ?? null;
}

export type StoneBreakdown = {
  carat_per_stone: number;
  total_carats: number;
  price_per_carat_usd: number;
  total_stone_price_usd: number;
};

export function computeStoneBreakdown(
  stoneSizeMm: number | null | undefined,
  stoneCount: number | null | undefined,
  shape?: string | null,
  length_mm?: number | null,
  width_mm?: number | null,
): StoneBreakdown {
  const count = Number(stoneCount ?? 0);
  // Use shape-aware formula when shape + at least one dimension is provided
  const hasShapeDims = shape != null && (length_mm != null || width_mm != null);
  const L = length_mm ?? stoneSizeMm;
  const W = width_mm ?? stoneSizeMm;
  const caratPerStone = hasShapeDims
    ? caratFromShape(shape, L, W)
    : caratFromMm(Number(stoneSizeMm ?? 0));
  const totalCarats = caratPerStone * Math.max(0, count);
  const pricePerCarat = pricePerCaratFromCt(caratPerStone);
  const totalStonePrice = totalCarats * pricePerCarat;
  return {
    carat_per_stone: caratPerStone,
    total_carats: totalCarats,
    price_per_carat_usd: pricePerCarat,
    total_stone_price_usd: totalStonePrice,
  };
}

/**
 * Aggregate breakdown across one or more stone groups. Each group is
 * costed independently (its own mm size drives its $/ct tier) and the
 * carats / dollar totals are summed. `price_per_carat_usd` reflects the
 * blended rate (total price ÷ total carats) so the editor can still show
 * a single headline number.
 */
export function computeStoneGroupsBreakdown(
  groups: StoneGroup[] | null | undefined,
): StoneBreakdown {
  const list = Array.isArray(groups) ? groups : [];
  let totalCarats = 0;
  let totalStonePrice = 0;
  for (const g of list) {
    const b = computeStoneBreakdown(
      effectiveSizeMm(g ?? {}),
      g?.count,
      g?.shape,
      g?.length_mm,
      g?.width_mm,
    );
    const caratEach = (g?.carat_each_override != null && g.carat_each_override > 0)
      ? g.carat_each_override
      : b.carat_per_stone;
    const count = Math.max(0, Number(g?.count ?? 0));
    const groupCt = caratEach * count;
    const groupPrice = groupCt * pricePerCaratFromCt(caratEach);
    totalCarats += groupCt;
    totalStonePrice += groupPrice;
  }
  return {
    carat_per_stone: 0,
    total_carats: totalCarats,
    price_per_carat_usd: totalCarats > 0 ? totalStonePrice / totalCarats : 0,
    total_stone_price_usd: totalStonePrice,
  };
}

/**
 * Density ratios: alloy_density / platinum_density (21.45 g/cm³).
 * The studio specs weight in platinum; multiply by this ratio to get the
 * actual weight of the same piece cast in the chosen alloy.
 *
 * Reference densities (g/cm³):
 *   Platinum 950 : 21.45  → ratio 1.0000
 *   18k Yellow   : 15.50  → ratio 0.7228
 *   18k White    : 14.70  → ratio 0.6853
 *   18k Rose     : 15.20  → ratio 0.7088
 *   14k Yellow   : 13.10  → ratio 0.6108
 *   14k White    : 12.90  → ratio 0.6014
 *   14k Rose     : 13.10  → ratio 0.6108
 *
 * Exported so the admin editor can compute live per-metal weights without
 * importing the server-only pricing.ts module.
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

/** Rhodium plating uplift for white-gold variants (mirrors pricing.ts, used in admin UI). */
export const RHODIUM_UPLIFT_DISPLAY: Record<string, number> = {
  '14k_white': 60,
  '18k_white': 80,
};

/** Human-readable metal labels (mirrors pricing.ts, used in admin UI). */
export const METAL_LABEL_DISPLAY: Record<string, string> = {
  platinum:     'Platinum',
  '14k_yellow': '14k Yellow Gold',
  '14k_white':  '14k White Gold',
  '14k_rose':   '14k Rose Gold',
  '18k_yellow': '18k Yellow Gold',
  '18k_white':  '18k White Gold',
  '18k_rose':   '18k Rose Gold',
};

/**
 * Fallback static USD per gram used only when live prices haven't loaded yet.
 * Based on typical US wholesale rates; replaced by live GoldAPI rates once
 * the /api/metal-prices endpoint responds in the admin editor.
 */
export const STATIC_METAL_PRICE_PER_G_USD: Record<string, number> = {
  platinum:     31,
  '18k_yellow': 76,
  '18k_white':  76,
  '18k_rose':   76,
  '14k_yellow': 60,
  '14k_white':  60,
  '14k_rose':   60,
};

export function metalPricePerGram(metal: string | null | undefined): number {
  if (!metal) return STATIC_METAL_PRICE_PER_G_USD.platinum;
  return STATIC_METAL_PRICE_PER_G_USD[metal] ?? STATIC_METAL_PRICE_PER_G_USD.platinum;
}

/** Physical weight of the piece in the chosen metal given its platinum spec weight. */
function weightInChosenMetal(platinumWeightG: number, metal: string | null | undefined): number {
  if (!metal) return platinumWeightG;
  return platinumWeightG * (DENSITY_RATIO[metal] ?? 1.0);
}

export type ProductTotalBreakdown = {
  total_carats: number;
  price_per_carat_usd: number;
  total_stone_price_usd: number;
  metal_weight_g: number;
  metal_price_per_g_usd: number;
  metal_cost_usd: number;
  labour_usd: number;
  total_product_price_usd: number;
};

/**
 * Full all-in product price from the four studio inputs:
 *   weightInPlatinumG · stoneCount · stoneSizeMm · labourUsd
 * + the product's default_metal (so we cost the metal correctly).
 *
 * total_product_price_usd = stone cost + metal cost + labour
 *
 * No markup multiplier — the client's spec is that this is the cost
 * baseline; the storefront price (`price_display`) is set separately.
 */
export function computeProductTotal(args: {
  weightInPlatinumG: number | null | undefined;
  defaultMetal: string | null | undefined;
  // Stones: pass `stoneGroups` for multi-group pieces, or the legacy
  // single `stoneSizeMm` / `stoneCount` pair. Groups win when provided.
  stoneGroups?: StoneGroup[] | null;
  stoneSizeMm?: number | null;
  stoneCount?: number | null;
  // Labour: split into jewellery + diamond. The legacy single `labourUsd`
  // still works and is treated as jewellery labour.
  jewelleryLabourUsd?: number | null;
  diamondLabourUsd?: number | null;
  labourUsd?: number | null;
}): ProductTotalBreakdown {
  const stones =
    args.stoneGroups && args.stoneGroups.length > 0
      ? computeStoneGroupsBreakdown(args.stoneGroups)
      : computeStoneBreakdown(args.stoneSizeMm, args.stoneCount);

  const platinumWeight = Number(args.weightInPlatinumG ?? 0);
  const metalWeight = weightInChosenMetal(platinumWeight, args.defaultMetal);
  const pricePerG = metalPricePerGram(args.defaultMetal);
  const metalCost = Math.max(0, metalWeight) * pricePerG;

  const jewellery = Math.max(0, Number(args.jewelleryLabourUsd ?? args.labourUsd ?? 0));
  const diamond = Math.max(0, Number(args.diamondLabourUsd ?? 0));
  const labour = jewellery + diamond;
  const total = stones.total_stone_price_usd + metalCost + labour;

  return {
    total_carats: stones.total_carats,
    price_per_carat_usd: stones.price_per_carat_usd,
    total_stone_price_usd: stones.total_stone_price_usd,
    metal_weight_g: metalWeight,
    metal_price_per_g_usd: pricePerG,
    metal_cost_usd: metalCost,
    labour_usd: labour,
    total_product_price_usd: total,
  };
}

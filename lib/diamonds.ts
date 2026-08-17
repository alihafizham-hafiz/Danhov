/**
 * Diamond catalog for the Ring Builder.
 *
 * Generates a curated set of natural diamonds covering common shape /
 * color / clarity / carat / cut combinations. Prices follow a simplified
 * Rapaport-style table so they read realistic to a luxury buyer.
 *
 * For production, this should be swapped for a live diamond inventory
 * feed (RapNet, IDEX, Nivoda) — keep the same `Diamond` type and the
 * UI doesn't have to change.
 */

export type DiamondShape =
  | 'Round'
  | 'Oval'
  | 'Cushion'
  | 'Princess'
  | 'Emerald'
  | 'Pear'
  | 'Radiant'
  | 'Heart'
  | 'Marquise'
  | 'Asscher';

export type DiamondColor = 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';
export type DiamondClarity = 'IF' | 'VVS1' | 'VVS2' | 'VS1' | 'VS2' | 'SI1' | 'SI2';
export type DiamondCut = 'Excellent' | 'Very Good' | 'Good';

export type Diamond = {
  id: string;
  shape: DiamondShape;
  carat: number;
  color: DiamondColor;
  clarity: DiamondClarity;
  cut: DiamondCut;
  certification: 'GIA' | 'IGI';
  price_usd: number;
};

export const SHAPES: DiamondShape[] = [
  'Round',
  'Oval',
  'Cushion',
  'Princess',
  'Emerald',
  'Pear',
  'Radiant',
  'Heart',
  'Marquise',
  'Asscher',
];

export const COLORS: DiamondColor[] = ['D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const CLARITIES: DiamondClarity[] = [
  'IF',
  'VVS1',
  'VVS2',
  'VS1',
  'VS2',
  'SI1',
  'SI2',
];
export const CUTS: DiamondCut[] = ['Excellent', 'Very Good', 'Good'];

// ── Pricing model ────────────────────────────────────────────────────────
// Base price per carat (USD) for a 1ct round, GIA-graded. Real-world
// Rapaport tables are far more granular; these are calibrated to land in
// the right ballpark for a luxury shopper.
const COLOR_BASE: Record<DiamondColor, number> = {
  D: 13500,
  E: 11800,
  F: 10500,
  G: 9000,
  H: 7800,
  I: 6500,
  J: 5500,
};
const CLARITY_MULT: Record<DiamondClarity, number> = {
  IF: 1.35,
  VVS1: 1.18,
  VVS2: 1.1,
  VS1: 1.0,
  VS2: 0.93,
  SI1: 0.82,
  SI2: 0.72,
};
const CUT_MULT: Record<DiamondCut, number> = {
  Excellent: 1.0,
  'Very Good': 0.92,
  Good: 0.82,
};
// Fancy shapes typically trade ~10-25% below rounds for the same grade
const SHAPE_MULT: Record<DiamondShape, number> = {
  Round: 1.0,
  Oval: 0.85,
  Cushion: 0.82,
  Princess: 0.78,
  Emerald: 0.82,
  Pear: 0.82,
  Radiant: 0.8,
  Heart: 0.85,
  Marquise: 0.8,
  Asscher: 0.85,
};

/**
 * Pricing scales non-linearly with carat — a 2ct stone is much more
 * than 2× a 1ct of the same grade. Simplified exponent.
 */
function carat_factor(carat: number): number {
  // 0.5ct → 0.42, 1.0ct → 1.0, 1.5ct → 1.85, 2ct → 3.2, 3ct → 5.7
  return Math.pow(carat, 1.55);
}

export function priceDiamond(
  shape: DiamondShape,
  carat: number,
  color: DiamondColor,
  clarity: DiamondClarity,
  cut: DiamondCut
): number {
  const base = COLOR_BASE[color];
  const raw =
    base *
    CLARITY_MULT[clarity] *
    CUT_MULT[cut] *
    SHAPE_MULT[shape] *
    carat_factor(carat);
  // Round to nearest $25 for clean display
  return Math.round(raw / 25) * 25;
}

// ── Catalog generation ───────────────────────────────────────────────────
// Build a curated catalog of ~80 stones covering the popular ranges.
// IDs are stable strings so we can put them in URLs.

function generateCatalog(): Diamond[] {
  const out: Diamond[] = [];
  let seq = 1000;

  for (const shape of SHAPES) {
    // Per shape, generate 7-9 diamonds at varied price points
    const combos: Array<[number, DiamondColor, DiamondClarity, DiamondCut]> = [
      [0.5, 'G', 'VS2', 'Excellent'],
      [0.7, 'F', 'VS1', 'Excellent'],
      [1.0, 'E', 'VVS2', 'Excellent'],
      [1.0, 'H', 'VS2', 'Very Good'],
      [1.25, 'F', 'VS1', 'Excellent'],
      [1.5, 'D', 'VVS1', 'Excellent'],
      [1.5, 'G', 'VS2', 'Excellent'],
      [2.0, 'F', 'VS1', 'Excellent'],
      [2.5, 'E', 'VVS2', 'Excellent'],
      [3.0, 'D', 'IF', 'Excellent'],
    ];
    for (const [carat, color, clarity, cut] of combos) {
      const id = `D-${shape.slice(0, 3).toUpperCase()}-${seq++}`;
      out.push({
        id,
        shape,
        carat,
        color,
        clarity,
        cut,
        certification: 'GIA',
        price_usd: priceDiamond(shape, carat, color, clarity, cut),
      });
    }
  }
  return out;
}

let _catalogCache: Diamond[] | null = null;
export function listDiamonds(): Diamond[] {
  if (!_catalogCache) _catalogCache = generateCatalog();
  return _catalogCache;
}

export function getDiamond(id: string): Diamond | null {
  return listDiamonds().find((d) => d.id === id) ?? null;
}

// ── Filter helpers ───────────────────────────────────────────────────────
export type DiamondFilters = {
  shape?: DiamondShape;
  color?: DiamondColor;
  clarity?: DiamondClarity;
  cut?: DiamondCut;
  carat_min?: number;
  carat_max?: number;
};

export function filterDiamonds(filters: DiamondFilters): Diamond[] {
  return listDiamonds().filter((d) => {
    if (filters.shape && d.shape !== filters.shape) return false;
    if (filters.color && d.color !== filters.color) return false;
    if (filters.clarity && d.clarity !== filters.clarity) return false;
    if (filters.cut && d.cut !== filters.cut) return false;
    if (filters.carat_min !== undefined && d.carat < filters.carat_min) return false;
    if (filters.carat_max !== undefined && d.carat > filters.carat_max) return false;
    return true;
  });
}

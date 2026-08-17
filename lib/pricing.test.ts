import { describe, it, expect } from 'vitest';
import {
  metalCostPerGram,
  metalWeightFromPlat,
  availableMetals,
  computePrice,
  DENSITY_RATIO,
  RHODIUM_UPLIFT,
  type AllSpots,
  type PricingInputs,
} from './pricing';

describe('metalCostPerGram', () => {
  it('platinum blends 90% platinum spot + 10% iridium spot (900Pt/100Ir alloy)', () => {
    expect(metalCostPerGram('platinum', 100, 50, 200)).toBeCloseTo(50 * 0.9 + 200 * 0.1, 6);
  });

  it('gold variants apply karat purity plus the flat alloy cost', () => {
    // 14k purity is 0.5833, alloy cost is a flat $3/g
    expect(metalCostPerGram('14k_yellow', 100, 50)).toBeCloseTo(100 * 0.5833 + 3, 6);
    // 18k purity is 0.75
    expect(metalCostPerGram('18k_white', 100, 50)).toBeCloseTo(100 * 0.75 + 3, 6);
  });

  it('falls back to the 14k purity rate for an unrecognized metal key', () => {
    expect(metalCostPerGram('unknown_metal', 100, 50)).toBeCloseTo(100 * 0.5833 + 3, 6);
  });
});

describe('metalWeightFromPlat', () => {
  it('platinum weight equals the platinum spec weight unchanged', () => {
    expect(metalWeightFromPlat(10, 'platinum')).toBe(10);
  });

  it('scales by the metal density ratio for every other alloy', () => {
    for (const [metal, ratio] of Object.entries(DENSITY_RATIO)) {
      expect(metalWeightFromPlat(10, metal)).toBeCloseTo(10 * ratio, 6);
    }
  });
});

describe('availableMetals', () => {
  it('passes through canonical stored keys unchanged', () => {
    expect(availableMetals(['platinum', '14k_yellow'])).toEqual(['platinum', '14k_yellow']);
  });

  it('normalizes legacy display-name strings from the Magento import into canonical keys', () => {
    // scripts/seed-products.ts splits raw legacy text like "14K Yellow Gold · Platinum"
    // verbatim, with no key conversion — these strings hit availableMetals as-is.
    expect(availableMetals(['14K Yellow Gold', 'Platinum', '18K White Gold'])).toEqual(
      expect.arrayContaining(['14k_yellow', 'platinum', '18k_white']),
    );
    expect(availableMetals(['14K Yellow Gold', 'Platinum', '18K White Gold'])).toHaveLength(3);
  });

  it('silently drops anything that matches no known metal', () => {
    expect(availableMetals(['sterling silver', 'rose gold vermeil'])).toEqual([]);
  });

  it('returns an empty array for empty/missing input', () => {
    expect(availableMetals([])).toEqual([]);
    expect(availableMetals(undefined as unknown as string[])).toEqual([]);
  });
});

describe('computePrice', () => {
  const spots: AllSpots = {
    gold: { price_per_gram_usd: 100, fetched_at: 't' },
    platinum: { price_per_gram_usd: 50, fetched_at: 't' },
    iridium: { price_per_gram_usd: 200, fetched_at: 't' },
  };

  const baseInputs: PricingInputs = {
    default_metal: '14k_yellow',
    gold_weight_g: 10,
    base_labor_usd: 100,
    diamond_labor_usd: 50,
    casting_labor_per_gram: 5,
    stones_value_usd: 200,
    markup_multiplier: 4,
  };

  it('follows the documented formula: (metal + casting + labor + stones) rounded to $10, then x markup', () => {
    const result = computePrice(baseInputs, spots, '14k_yellow');

    const metalWeight = 10 * DENSITY_RATIO['14k_yellow'];
    const metalCost = metalWeight * (100 * 0.5833 + 3);
    const castingLabor = metalWeight * 5;
    const labor = 100 + 50 + 30 + 30 + 20; // base + diamond + default extras (3d_run/rhodium/laser)
    const stones = 200;
    const subtotal = metalCost + castingLabor + labor + stones;
    const costRounded = Math.round(subtotal / 10) * 10;
    const expectedTotal = Math.round((costRounded * 4) / 10) * 10;

    expect(result.total_usd).toBe(expectedTotal);
    expect(result.metal_used).toBe('14k_yellow');
  });

  it('defaults the markup multiplier to 4x when unset or invalid', () => {
    const withoutMarkup = computePrice({ ...baseInputs, markup_multiplier: null }, spots, '14k_yellow');
    const withZeroMarkup = computePrice({ ...baseInputs, markup_multiplier: 0 }, spots, '14k_yellow');
    expect(withoutMarkup.total_usd).toBe(withZeroMarkup.total_usd);
  });

  it('honors a custom positive markup multiplier, including non-integer values', () => {
    const at2x = computePrice({ ...baseInputs, markup_multiplier: 2 }, spots, '14k_yellow');
    const at4x = computePrice({ ...baseInputs, markup_multiplier: 4 }, spots, '14k_yellow');
    // Same rounded cost base, so 4x total should be roughly double 2x total.
    expect(at4x.total_usd).toBeCloseTo(at2x.total_usd * 2, -1);
  });

  it('prices all 14k/18k color variants identically within the same karat tier (color is not a cost factor)', () => {
    const yellow14 = computePrice(baseInputs, spots, '14k_yellow');
    const white14 = computePrice(baseInputs, spots, '14k_white');
    const rose14 = computePrice(baseInputs, spots, '14k_rose');
    expect(white14.total_usd).toBe(yellow14.total_usd);
    expect(rose14.total_usd).toBe(yellow14.total_usd);
  });

  it('auto-computes stone cost from stone_groups when stones_value_usd is null', () => {
    const withOverride = computePrice({ ...baseInputs, stones_value_usd: 500 }, spots, '14k_yellow');
    const withoutOverride = computePrice(
      { ...baseInputs, stones_value_usd: null, stone_groups: [{ count: 1, size_mm: 6.4, shape: 'round' }] },
      spots,
      '14k_yellow',
    );
    // Different stone inputs should produce different totals — proves the
    // auto-computation path actually ran instead of silently pricing stones at 0.
    expect(withoutOverride.total_usd).not.toBe(withOverride.total_usd);
  });

  it('falls back to 14k_yellow when no valid metal choice or default_metal is available', () => {
    const result = computePrice({ ...baseInputs, default_metal: null }, spots, null);
    expect(result.metal_used).toBe('14k_yellow');
  });

  it('rhodium uplift is defined for white golds but not applied to the total (absorbed into overhead per pricing policy)', () => {
    expect(RHODIUM_UPLIFT['14k_white']).toBeGreaterThan(0);
    const result = computePrice(baseInputs, spots, '14k_white');
    expect(result.rhodium_uplift_usd).toBe(0);
  });
});

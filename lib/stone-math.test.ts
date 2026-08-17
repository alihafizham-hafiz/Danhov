import { describe, it, expect } from 'vitest';
import {
  caratFromMm,
  pricePerCaratFromCt,
  computeStoneBreakdown,
  computeStoneGroupsBreakdown,
  effectiveSizeMm,
} from './stone-math';

describe('caratFromMm', () => {
  it('matches the documented DANHOV reference points exactly', () => {
    expect(caratFromMm(6.4)).toBeCloseTo(1.0, 6);
    expect(caratFromMm(7.3)).toBeCloseTo(1.5, 6);
    expect(caratFromMm(8.1)).toBeCloseTo(2.0, 6);
    expect(caratFromMm(8.8)).toBeCloseTo(2.5, 6);
    expect(caratFromMm(9.1)).toBeCloseTo(3.0, 6);
    expect(caratFromMm(10.4)).toBeCloseTo(5.0, 6);
  });

  it('linearly interpolates between bracketing table entries', () => {
    // Halfway between [6.4, 1.000] and [6.6, 1.100]
    expect(caratFromMm(6.5)).toBeCloseTo(1.05, 6);
  });

  it('scales cubically below the 1mm table floor', () => {
    expect(caratFromMm(0.5)).toBeCloseTo(0.005 * Math.pow(0.5, 3), 8);
  });

  it('extrapolates with the GIA cubic formula above the 13.3mm table ceiling', () => {
    expect(caratFromMm(14)).toBeCloseTo(0.0038 * Math.pow(14, 3), 6);
  });

  it('returns 0 for zero, negative, or non-finite input', () => {
    expect(caratFromMm(0)).toBe(0);
    expect(caratFromMm(-5)).toBe(0);
    expect(caratFromMm(NaN)).toBe(0);
  });
});

describe('pricePerCaratFromCt', () => {
  it('picks the highest tier whose floor is at or below the given carat weight', () => {
    expect(pricePerCaratFromCt(0.005)).toBe(420);
    expect(pricePerCaratFromCt(0.02)).toBe(500); // between the 0.010 and 0.030 tiers
    expect(pricePerCaratFromCt(1.0)).toBe(1150);
    expect(pricePerCaratFromCt(5.0)).toBe(7500); // above the highest tier floor
  });

  it('returns 0 for zero, negative, or non-finite carat weight', () => {
    expect(pricePerCaratFromCt(0)).toBe(0);
    expect(pricePerCaratFromCt(-1)).toBe(0);
    expect(pricePerCaratFromCt(NaN)).toBe(0);
  });
});

describe('effectiveSizeMm', () => {
  it('averages length and width when both are present', () => {
    expect(effectiveSizeMm({ length_mm: 6, width_mm: 8 })).toBe(7);
  });

  it('falls back to whichever single dimension is present', () => {
    expect(effectiveSizeMm({ length_mm: 6 })).toBe(6);
    expect(effectiveSizeMm({ width_mm: 8 })).toBe(8);
  });

  it('falls back to size_mm when no length/width is given', () => {
    expect(effectiveSizeMm({ size_mm: 5 })).toBe(5);
  });
});

describe('computeStoneBreakdown', () => {
  it('computes carats, tiered price, and total for a simple round-stone spec', () => {
    const result = computeStoneBreakdown(6.4, 2);
    expect(result.carat_per_stone).toBeCloseTo(1.0, 6);
    expect(result.total_carats).toBeCloseTo(2.0, 6);
    expect(result.price_per_carat_usd).toBe(1150);
    expect(result.total_stone_price_usd).toBeCloseTo(2300, 2);
  });

  it('zeroes out the total price at zero count, even though per-stone carat/rate are still computed', () => {
    const result = computeStoneBreakdown(6.4, 0);
    expect(result.total_carats).toBe(0);
    expect(result.total_stone_price_usd).toBe(0);
    // per-stone figures are independent of count and remain meaningful
    expect(result.carat_per_stone).toBeCloseTo(1.0, 6);
  });
});

describe('computeStoneGroupsBreakdown', () => {
  it('sums independently-costed groups, matching the centre + melee example from migration 014', () => {
    // Exact example from supabase/migrations/014_stone_groups_and_labour.sql
    const result = computeStoneGroupsBreakdown([
      { count: 1, size_mm: 6.5, shape: 'round' },
      { count: 38, size_mm: 1.3, shape: 'round' },
    ]);

    // Group 1: 1 stone at 6.5mm -> 1.05ct, priced at the 1000+ tier ($1150/ct)
    // Group 2: 38 stones at 1.3mm -> 0.010ct each -> 0.38ct total, at the 0.010 tier ($500/ct)
    expect(result.total_carats).toBeCloseTo(1.05 + 0.38, 4);
    expect(result.total_stone_price_usd).toBeCloseTo(1.05 * 1150 + 0.38 * 500, 2);
  });

  it('returns all zeros for empty or missing groups', () => {
    expect(computeStoneGroupsBreakdown([])).toEqual({
      carat_per_stone: 0,
      total_carats: 0,
      price_per_carat_usd: 0,
      total_stone_price_usd: 0,
    });
    expect(computeStoneGroupsBreakdown(null)).toEqual({
      carat_per_stone: 0,
      total_carats: 0,
      price_per_carat_usd: 0,
      total_stone_price_usd: 0,
    });
  });
});

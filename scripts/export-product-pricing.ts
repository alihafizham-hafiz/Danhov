/**
 * Export every active product's full pricing spec to JSON, grouped by
 * category — feeds the Excel backup workbook (one sheet per category).
 *
 * Run: npx tsx scripts/export-product-pricing.ts <out.json>
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import {
  computeStoneBreakdown,
  effectiveSizeMm,
  type StoneGroup,
} from '../lib/stone-math';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const sb = createClient(url, key);

// Platinum alloy math (mirrors lib/pricing.ts — 900Pt/100Ir)
const PT_FRACTION = 0.9;
const IR_FRACTION = 0.1;
const IRIDIUM_DEFAULT = 237.0;
const roundTo10 = (n: number) => Math.round(n / 10) * 10;

async function latestSpot(metal: string): Promise<{ price: number; at: string } | null> {
  const { data } = await sb
    .from('metal_prices')
    .select('price_per_gram_usd, fetched_at')
    .eq('metal', metal)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { price: Number(data.price_per_gram_usd), at: data.fetched_at as string } : null;
}

function groupCols(g: StoneGroup | null | undefined, settingMult: number | null) {
  if (!g || !g.count) return null;
  const b = computeStoneBreakdown(effectiveSizeMm(g), g.count, g.shape, g.length_mm, g.width_mm);
  const caratEachRaw = (g.carat_each_override != null && g.carat_each_override > 0)
    ? g.carat_each_override
    : b.carat_per_stone;
  const count = Number(g.count ?? 0);
  // Cell-precision values: what gets written into the sheet IS what the
  // sheet formulas multiply, so formula results match these totals exactly.
  const caratEach = Math.round(caratEachRaw * 1e6) / 1e6;
  const pricePerCt = Math.round(b.price_per_carat_usd * 100) / 100;
  return {
    count,
    shape: g.shape ?? null,
    length_mm: g.length_mm ?? g.size_mm ?? null,
    width_mm: g.width_mm ?? g.size_mm ?? null,
    carat_each: caratEach,
    total_carats: Math.round(caratEach * count * 1e6) / 1e6,
    price_per_carat_usd: pricePerCt,
    stones_value_usd: Math.round(caratEach * count * pricePerCt),
    setting_labor_usd: settingMult != null ? count * settingMult : null,
  };
}

async function main() {
  const [plat, iridium] = await Promise.all([latestSpot('platinum'), latestSpot('iridium')]);
  const platSpot = plat?.price ?? 32;
  const irSpot = iridium?.price ?? IRIDIUM_DEFAULT;
  // 4dp cell precision so sheet formulas reproduce these totals exactly
  const platAlloyPerG = Math.round((platSpot * PT_FRACTION + irSpot * IR_FRACTION) * 1e4) / 1e4;

  const { data: products, error } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sku');
  if (error) throw error;

  const rows = (products ?? []).map((p) => {
    const platWeight = Number(p.gold_weight_g ?? 0);
    const castingPerG = Number(p.casting_labor_per_gram ?? 10);
    const centreMult = p.centre_multiplier != null ? Number(p.centre_multiplier) : 50;
    const settingMult = p.setting_multiplier != null ? Number(p.setting_multiplier) : 4;
    const extras = {
      three_d_run: Number(p.labor_extras?.three_d_run ?? 30),
      rhodium: Number(p.labor_extras?.rhodium ?? 30),
      laser_engraving: Number(p.labor_extras?.laser_engraving ?? 20),
    };

    const centre = groupCols(p.centre_diamond_group, null);
    const centreLabor = centre ? centre.count * centreMult : 0;

    const stoneGroups: ReturnType<typeof groupCols>[] = Array.isArray(p.stone_groups)
      ? p.stone_groups.map((g: StoneGroup) => groupCols(g, settingMult)).filter(Boolean)
      : [];
    // Centre diamond VALUE is deliberately excluded from card totals (matches
    // ProductEditor) — the centre stone is priced via ring builder/Nivoda;
    // only its setting labor is part of catalog cost.
    const stonesValue = stoneGroups.reduce((s, g) => s + (g!.stones_value_usd ?? 0), 0);
    const stoneSettingLabor = stoneGroups.reduce((s, g) => s + (g!.setting_labor_usd ?? 0), 0);

    const jewelryLabor = Number(p.custom_labor_usd ?? 0);
    const extrasTotal = extras.three_d_run + extras.rhodium + extras.laser_engraving;

    // Card totals — platinum (the pricing base metal)
    const metalCost = platWeight * platAlloyPerG;
    const castingLabor = platWeight * castingPerG;
    const grandCost = roundTo10(metalCost + castingLabor + centreLabor + stoneSettingLabor + jewelryLabor + extrasTotal + stonesValue);
    const markup = Number(p.markup_multiplier ?? 4);
    const websitePrice = roundTo10(grandCost * markup);

    return {
      sku: p.sku,
      name: p.name,
      collection: p.collection,
      category: p.category,
      metals: Array.isArray(p.metals) ? p.metals.join(', ') : p.metals ?? '',
      default_metal: p.default_metal ?? 'platinum',
      platinum_weight_g: platWeight || null,
      casting_per_gram_usd: castingPerG,
      centre,
      centre_multiplier: centreMult,
      centre_labor_usd: centreLabor || null,
      stone_groups: stoneGroups,
      setting_multiplier: settingMult,
      stone_setting_labor_usd: stoneSettingLabor || null,
      labor_3d_run_usd: extras.three_d_run,
      labor_rhodium_usd: extras.rhodium,
      labor_laser_engraving_usd: extras.laser_engraving,
      jewelry_labor_usd: jewelryLabor || null,
      totals: {
        metal_cost_usd: Math.round(metalCost),
        casting_labor_usd: Math.round(castingLabor),
        stones_value_usd: Math.round(stonesValue),
        grand_total_cost_usd: grandCost,
        markup_multiplier: markup,
        website_price_usd: websitePrice,
      },
    };
  });

  const maxGroups = Math.max(0, ...rows.map((r) => r.stone_groups.length));
  const out = {
    exported_at: new Date().toISOString(),
    alloy_per_g: platAlloyPerG,
    spot_note: `Platinum spot $${platSpot.toFixed(2)}/g (fetched ${plat?.at ?? 'static'}), iridium $${irSpot}/g. Alloy 900Pt/100Ir = $${platAlloyPerG}/g.`,
    max_stone_groups: maxGroups,
    count: rows.length,
    by_category: {
      engagement: rows.filter((r) => r.category === 'engagement'),
      wedding: rows.filter((r) => r.category === 'wedding'),
      fine: rows.filter((r) => r.category === 'fine'),
      mens: rows.filter((r) => r.category === 'mens'),
      other: rows.filter((r) => !['engagement', 'wedding', 'fine', 'mens'].includes(r.category ?? '')),
    },
  };
  writeFileSync(process.argv[2] ?? 'product-pricing-export.json', JSON.stringify(out, null, 1));
  console.log(`Exported ${rows.length} active products. Max stone groups: ${maxGroups}.`);
  for (const [cat, list] of Object.entries(out.by_category)) console.log(`  ${cat}: ${(list as unknown[]).length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

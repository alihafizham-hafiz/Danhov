/**
 * Backfill accounting_cost_usd and price_display for every active product
 * using the exact same computePrice() engine the live site uses.
 * Fixes: Accounting Dashboard showing $0 cost on every product because
 * accounting_cost_usd was never populated after the Supabase migration.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { computePrice, getAllSpots, formatUsd, type PricingInputs } from '../lib/pricing';

config({ path: '.env.local' });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false }, realtime: { transport: ws as unknown as typeof WebSocket } }
);

async function main() {
  const { data: products, error } = await client
    .from('products')
    .select(
      'sku, default_metal, gold_weight_g, markup_multiplier, base_labor_usd, diamond_labor_usd, casting_labor_per_gram, custom_labor_usd, labor_extras, stones_value_usd, stone_groups, commission_rate'
    )
    .eq('is_active', true);

  if (error || !products) {
    console.error('Failed to load products:', error?.message);
    process.exit(1);
  }
  console.log(`Loaded ${products.length} active products`);

  const spots = await getAllSpots();
  console.log('Spots:', spots.gold.price_per_gram_usd, spots.platinum.price_per_gram_usd, spots.iridium.price_per_gram_usd);

  let updated = 0;
  let failed = 0;

  for (const p of products as unknown as (PricingInputs & { sku: string })[]) {
    try {
      const breakdown = computePrice(p, spots, p.default_metal);
      const cost = Math.round(
        breakdown.metal_cost_usd +
        breakdown.casting_labor_usd +
        breakdown.labor_usd +
        breakdown.stones_usd +
        breakdown.rhodium_uplift_usd
      );
      const { error: updErr } = await client
        .from('products')
        .update({
          accounting_cost_usd: cost,
          price_display: formatUsd(breakdown.total_usd),
        })
        .eq('sku', p.sku);
      if (updErr) {
        console.error(`  ✗ ${p.sku}:`, updErr.message);
        failed++;
      } else {
        updated++;
      }
    } catch (e) {
      console.error(`  ✗ ${p.sku} compute failed:`, (e as Error).message);
      failed++;
    }
  }

  console.log(`\nDone. Updated ${updated}, failed ${failed}.`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});

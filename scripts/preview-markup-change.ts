import { config } from 'dotenv'
config({ path: '.env.production.local' })

import { createClient } from '@supabase/supabase-js'
import { computePrice, type PricingInputs, type AllSpots } from '../lib/pricing'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
)

type Row = PricingInputs & { sku: string; name: string; collection: string | null }

async function main() {
  const { data: metalRows } = await sb
    .from('metal_prices')
    .select('metal, price_per_gram_usd, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(50)
  function latest(metal: string, fallback: number) {
    const row = metalRows?.find((r) => r.metal === metal)
    return row ? { price_per_gram_usd: Number(row.price_per_gram_usd), fetched_at: row.fetched_at as string } : { price_per_gram_usd: fallback, fetched_at: 'static' }
  }
  const spots: AllSpots = { gold: latest('gold', 98), platinum: latest('platinum', 32), iridium: latest('iridium', 237) }

  const cols =
    'sku, name, collection, default_metal, gold_weight_g, markup_multiplier, base_labor_usd, diamond_labor_usd, casting_labor_per_gram, custom_labor_usd, stones_value_usd, stone_groups, commission_rate'
  const { data: products, error } = await sb.from('products').select(cols).eq('markup_multiplier', 3)
  if (error) throw error
  const rows = (products ?? []) as unknown as Row[]

  let totalOld = 0, totalNew = 0, priced = 0
  const deltas: number[] = []
  for (const p of rows) {
    if (!((p.gold_weight_g ?? 0) > 0)) continue
    const oldPrice = computePrice(p, spots, p.default_metal).total_usd
    const newPrice = computePrice({ ...p, markup_multiplier: 4 }, spots, p.default_metal).total_usd
    totalOld += oldPrice
    totalNew += newPrice
    deltas.push(newPrice - oldPrice)
    priced++
  }

  console.log(`Products at x3 with live pricing: ${priced} / ${rows.length}`)
  console.log(`Average price at x3: $${Math.round(totalOld / priced).toLocaleString()}`)
  console.log(`Average price at x4: $${Math.round(totalNew / priced).toLocaleString()}`)
  console.log(`Average increase: $${Math.round((totalNew - totalOld) / priced).toLocaleString()} (+${(((totalNew - totalOld) / totalOld) * 100).toFixed(1)}%)`)
  console.log(`Min increase: $${Math.min(...deltas).toLocaleString()}, Max increase: $${Math.max(...deltas).toLocaleString()}`)
}

main().catch((e) => { console.error(e); process.exit(1) })

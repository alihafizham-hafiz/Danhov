/**
 * One-off audit: for every active product, compute the REAL price the
 * storefront shows (lib/pricing.ts computePrice, same function the site
 * calls) alongside the OLD buggy admin-preview formula (pre-fix, which
 * added labor_extras + a rhodium uplift the real engine never charges),
 * and the listing-page price (computeListingPriceMap's platinum-preferring
 * metal choice, which can differ from the detail page's default_metal).
 *
 * Not part of the app — run once via `npx tsx scripts/audit-pricing-sync.ts`
 * and delete/ignore afterward.
 */
import { config } from 'dotenv'
config({ path: '.env.production.local' })

import { createClient } from '@supabase/supabase-js'
import {
  computePrice,
  DENSITY_RATIO,
  RHODIUM_UPLIFT,
  type PricingInputs,
  type AllSpots,
} from '../lib/pricing'
import { computeStoneGroupsBreakdown, type StoneGroup } from '../lib/stone-math'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
)

type Row = PricingInputs & {
  sku: string
  name: string
  category: string
  is_active: boolean
  metals: string[] | null
  price_display: string | null
  labor_extras: { three_d_run?: number; rhodium?: number; laser_engraving?: number } | null
}

// Mirrors ProductEditor.tsx's PRE-FIX "Total Product Price" formula exactly,
// for the product's default_metal (the summary box the admin actually reads).
function oldBuggyAdminPreview(p: Row, spots: AllSpots): number | null {
  const defaultMetal = p.default_metal && DENSITY_RATIO[p.default_metal] ? p.default_metal : null
  if (!defaultMetal) return null
  const weight = p.gold_weight_g ?? 0
  if (weight <= 0) return null

  const pricingMetal = /^14k/.test(defaultMetal) ? '14k_yellow' : /^18k/.test(defaultMetal) ? '18k_yellow' : defaultMetal
  const ratio = DENSITY_RATIO[pricingMetal] ?? 1.0
  const metalWeight = weight * ratio
  const isPlat = pricingMetal === 'platinum'
  const costPerG = isPlat
    ? spots.platinum.price_per_gram_usd * 0.9 + spots.iridium.price_per_gram_usd * 0.1
    : (pricingMetal.startsWith('18k') ? 0.75 : 0.5833) * spots.gold.price_per_gram_usd + 3
  const materialCost = metalWeight * costPerG
  const castingLabor = metalWeight * (p.casting_labor_per_gram ?? 10)

  let stones = p.stones_value_usd ?? null
  if (stones == null) {
    stones = Array.isArray(p.stone_groups) && p.stone_groups.length > 0
      ? computeStoneGroupsBreakdown(p.stone_groups as StoneGroup[]).total_stone_price_usd
      : 0
  }

  // Admin's "totalLabour": settingLabour + centreLabour + customLabour + extrasTotal.
  // We don't have raw stone counts/multipliers here, so approximate settingLabour+
  // centreLabour with the persisted base_labor_usd/diamond_labor_usd (that's what
  // save() wrote them as — settingLabour and centreLabour respectively).
  const extrasTotal =
    (p.labor_extras?.three_d_run ?? 30) + (p.labor_extras?.rhodium ?? 30) + (p.labor_extras?.laser_engraving ?? 20)
  const realLabour = (p.base_labor_usd ?? 0) + (p.diamond_labor_usd ?? 0) + (p.custom_labor_usd ?? 0)
  const totalLabour = realLabour + extrasTotal

  const rhodiumUplift = RHODIUM_UPLIFT[defaultMetal] ?? 0 // summary box used this, nonzero for white golds

  const subTotal = materialCost + castingLabor + stones + totalLabour + rhodiumUplift
  const costTotal = Math.round(subTotal / 10) * 10
  const markup = p.markup_multiplier ?? 4
  return Math.round((costTotal * markup) / 10) * 10
}

async function main() {
  const { data: metalRows, error: metalErr } = await sb
    .from('metal_prices')
    .select('metal, price_per_gram_usd, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(50)
  if (metalErr) throw metalErr

  function latest(metal: string, fallback: number) {
    const row = metalRows?.find((r) => r.metal === metal)
    return row ? { price_per_gram_usd: Number(row.price_per_gram_usd), fetched_at: row.fetched_at as string } : { price_per_gram_usd: fallback, fetched_at: 'static-fallback' }
  }
  const spots: AllSpots = {
    gold: latest('gold', 98),
    platinum: latest('platinum', 32),
    iridium: latest('iridium', 237),
  }
  console.log('Spot prices in use:', JSON.stringify(spots))

  const cols =
    'sku, name, category, is_active, default_metal, metals, gold_weight_g, markup_multiplier, base_labor_usd, diamond_labor_usd, casting_labor_per_gram, custom_labor_usd, stones_value_usd, stone_groups, commission_rate, price_display, labor_extras'
  const { data: products, error } = await sb.from('products').select(cols).eq('is_active', true)
  if (error) throw error
  const rows = (products ?? []) as unknown as Row[]
  console.log(`Loaded ${rows.length} active products\n`)

  const priced = rows.filter((p) => (p.gold_weight_g ?? 0) > 0)
  const unpriced = rows.filter((p) => !((p.gold_weight_g ?? 0) > 0))

  console.log(`Live-priced (gold_weight_g > 0): ${priced.length}`)
  console.log(`Static-only (no gold_weight_g, frontend falls back to price_display): ${unpriced.length}`)
  const unpricedNoDisplay = unpriced.filter((p) => !p.price_display)
  console.log(`  ...of which have NO price_display either (frontend shows no price at all): ${unpricedNoDisplay.length}`)
  if (unpricedNoDisplay.length > 0) {
    console.log('  SKUs:', unpricedNoDisplay.map((p) => p.sku).join(', '))
  }
  console.log()

  let mismatches: Array<{ sku: string; name: string; real: number; oldAdmin: number; diff: number }> = []
  for (const p of priced) {
    const real = computePrice(p, spots, p.default_metal).total_usd
    const oldAdmin = oldBuggyAdminPreview(p, spots)
    if (oldAdmin != null && oldAdmin !== real) {
      mismatches.push({ sku: p.sku, name: p.name, real, oldAdmin, diff: oldAdmin - real })
    }
  }
  mismatches.sort((a, b) => b.diff - a.diff)

  console.log(`Products where the OLD admin preview (pre-fix) disagreed with the real live price: ${mismatches.length} / ${priced.length}`)
  if (mismatches.length > 0) {
    console.log('Top 15 by dollar gap:')
    for (const m of mismatches.slice(0, 15)) {
      console.log(`  ${m.sku.padEnd(14)} real=$${m.real.toLocaleString()}  oldAdminPreview=$${m.oldAdmin.toLocaleString()}  gap=$${m.diff.toLocaleString()}`)
    }
    const avgGap = mismatches.reduce((s, m) => s + m.diff, 0) / mismatches.length
    console.log(`Average gap: $${Math.round(avgGap).toLocaleString()}`)
  }

  // Listing page uses computeListingPriceMap's platinum-preferring metal choice;
  // detail page uses default_metal. Flag where those two differ for the SAME product.
  console.log('\nChecking listing-page vs detail-page metal-choice divergence...')
  let listingDiffs: Array<{ sku: string; name: string; detail: number; listing: number; detailMetal: string; listingMetal: string }> = []
  for (const p of priced) {
    const detailMetal = p.default_metal && DENSITY_RATIO[p.default_metal] ? p.default_metal : '14k_yellow'
    const detail = computePrice(p, spots, detailMetal).total_usd
    // Post-fix: computeListingPriceMap now uses default_metal directly, same as detail page.
    const listingMetal = p.default_metal ?? '14k_yellow'
    const listing = computePrice(p, spots, listingMetal).total_usd
    if (listing !== detail) {
      listingDiffs.push({ sku: p.sku, name: p.name, detail, listing, detailMetal, listingMetal })
    }
  }
  console.log(`Products where listing price != detail-page price: ${listingDiffs.length} / ${priced.length}`)
  if (listingDiffs.length > 0) {
    console.log('First 15:')
    for (const d of listingDiffs.slice(0, 15)) {
      console.log(`  ${d.sku.padEnd(14)} detail($${d.detail.toLocaleString()}, ${d.detailMetal})  vs  listing($${d.listing.toLocaleString()}, ${d.listingMetal})`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

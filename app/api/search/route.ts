/**
 * Public site search.
 *
 * GET /api/search?q=foo
 *
 * Searches products by name, collection, SKU, and category. Returns up
 * to 12 best matches (deduplicated by base SKU). Used by the nav search overlay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { computeListingPriceMap } from '@/lib/pricing';
import { stripMetalSuffix } from '@/lib/product-display';
import { resolveProductImage } from '@/lib/local-product-images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Strip trailing metal suffix from a SKU (e.g. -14Y, -PL, -18W). */
function baseSkuKey(sku: string): string {
  return sku.replace(/-?(PL|PLAT|14Y|14W|14R|18Y|18W|18R)$/i, '').toLowerCase();
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const sb = createServiceClient();
  const like = `%${q.replace(/[%_]/g, '')}%`;

  const { data, error } = await sb
    .from('products')
    .select(
      'sku, slug, name, collection, category, images, price_display, default_metal, metals, gold_weight_g, markup_multiplier, base_labor_usd, diamond_labor_usd, casting_labor_per_gram, custom_labor_usd, stones_value_usd, stone_groups'
    )
    .eq('is_active', true)
    .or(`name.ilike.${like},collection.ilike.${like},sku.ilike.${like},category.ilike.${like}`)
    .limit(40);

  if (error) {
    console.error('/api/search failed', error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  type ProductRow = {
    sku: string;
    slug: string;
    name: string;
    collection: string | null;
    category: string;
    images: string[] | null;
    price_display: string | null;
    default_metal: string | null;
    metals: string[] | null;
    gold_weight_g: number | null;
    markup_multiplier: number | null;
    base_labor_usd: number | null;
    diamond_labor_usd: number | null;
    casting_labor_per_gram: number | null;
    custom_labor_usd: number | null;
    stones_value_usd: number | null;
    stone_groups: unknown;
  };

  const rows = data as ProductRow[];

  // Deduplicate by base SKU — keep the first (usually platinum/default) variant
  const seen = new Map<string, ProductRow>();
  for (const row of rows) {
    const key = baseSkuKey(row.sku);
    if (!seen.has(key)) seen.set(key, row);
  }
  const deduped = Array.from(seen.values()).slice(0, 12);

  // Compute live prices
  const priceMap = await computeListingPriceMap(
    deduped.map((p) => ({
      sku: p.sku,
      default_metal: p.default_metal,
      metals: p.metals,
      gold_weight_g: p.gold_weight_g,
      markup_multiplier: p.markup_multiplier,
      base_labor_usd: p.base_labor_usd,
      diamond_labor_usd: p.diamond_labor_usd,
      casting_labor_per_gram: p.casting_labor_per_gram,
      custom_labor_usd: p.custom_labor_usd,
      stones_value_usd: p.stones_value_usd,
      stone_groups: p.stone_groups as never,
    }))
  );

  const items = deduped.map((p) => {
    const computed = priceMap[p.sku];
    return {
      sku: baseSkuKey(p.sku).toUpperCase(),
      slug: p.slug,
      name: stripMetalSuffix(p.name),
      collection: p.collection,
      category: p.category,
      image: resolveProductImage(p.sku, p.images),
      price_display: p.price_display,
      price_computed: computed ? `From $${computed.toLocaleString('en-US')}` : null,
    };
  });

  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  );
}

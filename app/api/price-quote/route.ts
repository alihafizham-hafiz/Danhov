import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { priceAllOptions, formatUsd } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  slug: z.string().min(1).max(120),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ slug: url.searchParams.get('slug') });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 });
  }

  const client = createServiceClient();
  const { data: product, error } = await client
    .from('products')
    .select(
      'sku, slug, name, default_metal, gold_weight_g, markup_multiplier, base_labor_usd, diamond_labor_usd, casting_labor_per_gram, custom_labor_usd, labor_extras, stones_value_usd, stone_groups, commission_rate, metals, is_active'
    )
    .eq('slug', parsed.data.slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  try {
    const options = await priceAllOptions(product, product.metals as string[]);

    // The "primary" displayed price is the product's default_metal if it's
    // one of the available options; otherwise the first option.
    const primary =
      options.find((o) => o.metal_used === product.default_metal) ?? options[0];

    return NextResponse.json(
      {
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        primary: {
          ...primary,
          price_display: formatUsd(primary.total_usd),
        },
        options: options.map((o) => ({
          metal_used: o.metal_used,
          metal_label: o.metal_label,
          total_usd: o.total_usd,
          price_display: formatUsd(o.total_usd),
        })),
        spot_fetched_at: primary.spot_fetched_at,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch (err) {
    console.error('price-quote error:', err);
    return NextResponse.json(
      { error: 'Pricing unavailable. Please contact us at care@danhov.com.' },
      { status: 503 }
    );
  }
}

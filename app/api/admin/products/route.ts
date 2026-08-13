import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { revalidateStorefront } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = [
  'sku', 'slug', 'name', 'collection', 'category', 'categories',
  'metals', 'images', 'metal_images', 'price_display', 'description', 'default_metal',
  'gold_weight_g', 'markup_multiplier', 'base_labor_usd', 'diamond_labor_usd',
  'casting_labor_per_gram',
  'stones_value_usd', 'stone_count_input', 'stone_size_mm', 'stone_groups',
  'setting_multiplier', 'centre_diamond_group', 'centre_multiplier', 'commission_rate',
  'accounting_cost_usd', 'custom_labor_usd', 'labor_extras', 'is_active', 'sub_categories',
] as const;

function pickAllowed(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_FIELDS) {
    if (k in input) out[k] = input[k as keyof typeof input];
  }
  return out;
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.sku || !body.slug || !body.name) {
    return NextResponse.json({ error: 'sku, slug, name required' }, { status: 400 });
  }
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('products')
    .insert(pickAllowed(body))
    .select('sku')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidateStorefront();
  return NextResponse.json({ sku: data.sku });
}

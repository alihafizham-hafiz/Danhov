import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { revalidateStorefront } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { collection: string; markup_multiplier: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { collection, markup_multiplier } = body;
  if (!collection || typeof markup_multiplier !== 'number' || markup_multiplier <= 0) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('products')
    .update({ markup_multiplier })
    .eq('collection', collection)
    .select('sku');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidateStorefront();
  return NextResponse.json({ ok: true, updated: (data ?? []).length });
}

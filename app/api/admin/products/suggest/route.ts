import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ results: [] });

  const sb = createServiceClient();
  const { data } = await sb
    .from('products')
    .select('sku, name')
    .ilike('sku', `${q}%`)
    .order('sku', { ascending: true })
    .limit(10);

  return NextResponse.json({ results: data ?? [] });
}

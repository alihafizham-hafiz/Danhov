import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { revalidateStorefront } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb.from('diamond_markups').select('category, multiplier, updated_at').order('category');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { category: string; multiplier: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { category, multiplier } = body;
  if (!category || typeof multiplier !== 'number' || multiplier <= 0) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('diamond_markups')
    .upsert({ category, multiplier, updated_at: new Date().toISOString() }, { onConflict: 'category' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateStorefront();
  return NextResponse.json(data);
}

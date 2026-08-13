import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb.from('site_settings').select('key, value');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return NextResponse.json(map);
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, value } = await req.json();
  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('site_settings')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select('key, value')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

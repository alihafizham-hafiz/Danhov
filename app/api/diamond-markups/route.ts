import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { DIAMOND_MARKUP_DEFAULTS as DEFAULTS } from '@/lib/diamond-categories';

export const runtime = 'nodejs';
// Always read fresh — admin markup changes must reflect on the site immediately.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const sb = createServiceClient();
    const { data } = await sb.from('diamond_markups').select('category, multiplier');
    const markups = { ...DEFAULTS };
    for (const row of (data ?? [])) markups[row.category] = Number(row.multiplier);
    return NextResponse.json(markups);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

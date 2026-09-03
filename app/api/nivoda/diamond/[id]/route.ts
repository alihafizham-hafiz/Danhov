/**
 * GET /api/nivoda/diamond/[id]
 *
 * Stone detail proxy. 60-second TTL via Supabase. Pass `?fresh=1` to
 * bypass the cache (used by the review page + the checkout route to
 * confirm price + availability right before commit).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedGetDiamond, refreshDiamond } from '@/lib/nivoda-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const offerId = decodeURIComponent(id);
  if (!offerId || offerId.length > 80) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  try {
    const result = fresh
      ? await refreshDiamond(offerId)
      : await cachedGetDiamond(offerId);

    if (!result.stone) {
      return NextResponse.json({ error: 'Diamond not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        stone: result.stone,
        cached: result.cached,
        stale: result.stale,
        fetched_at: result.fetched_at,
      },
      {
        headers: {
          'Cache-Control': fresh
            ? 'no-store'
            : 's-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (e) {
    console.error('/api/nivoda/diamond failed', e);
    return NextResponse.json(
      { error: 'Stone lookup briefly unavailable. Please try again.' },
      { status: 503 }
    );
  }
}

/**
 * POST /api/nivoda/search
 *
 * Customer-facing search proxy. Hits our Supabase cache (10-min TTL) and
 * only falls through to Nivoda on miss. Returns Nivoda's response shape
 * directly, plus a `cached` / `stale` flag for diagnostics.
 *
 * Body:
 *   {
 *     filters: { shapes, color, clarity, cut, sizes, labgrown, ... },
 *     limit, offset, order
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cachedSearchDiamonds } from '@/lib/nivoda-cache';
import type { NivodaSearchFilters } from '@/lib/nivoda';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 60s = Vercel Hobby cap. Each Nivoda fetch has a 25s AbortSignal, so
// even a cold-token cycle (auth + search = 2 fetches) finishes within
// budget. Our error handler runs before Vercel returns its own 504.
export const maxDuration = 60;

const Body = z.object({
  filters: z.object({
    labgrown: z.boolean().optional(),
    shapes: z.array(z.string()).max(20).optional(),
    color: z.array(z.string()).max(20).optional(),
    clarity: z.array(z.string()).max(20).optional(),
    cut: z.array(z.string()).max(20).optional(),
    certificate_lab: z.array(z.string()).max(20).optional(),
    sizes: z.object({ from: z.number().min(0).max(30), to: z.number().min(0).max(30) }).optional(),
    dollar_value: z.object({ from: z.number().int().min(0), to: z.number().int().min(0) }).optional(),
    availability: z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'ON_HOLD', 'ON_MEMO']).optional(),
    has_image: z.boolean().optional(),
  }).default({}),
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).max(50000).optional(),
  order: z.object({
    type: z.enum(['price', 'discount', 'size', 'createdAt', 'none']),
    direction: z.enum(['ASC', 'DESC']),
  }).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid request', detail: e instanceof Error ? e.message : '' },
      { status: 400 }
    );
  }

  // Diagnostic precondition: if Nivoda creds aren't in the env, return a
  // clear 503 with detail rather than throwing inside the client.
  if (!process.env.NIVODA_USERNAME || !process.env.NIVODA_PASSWORD) {
    console.error('/api/nivoda/search: NIVODA_USERNAME / NIVODA_PASSWORD not configured');
    return NextResponse.json(
      {
        error: 'Diamond search is not yet configured.',
        detail: 'NIVODA_USERNAME / NIVODA_PASSWORD missing from server env. Add them in Vercel → Settings → Environment Variables, then redeploy.',
      },
      { status: 503 }
    );
  }

  try {
    const result = await cachedSearchDiamonds(
      body.filters as NivodaSearchFilters,
      { limit: body.limit, offset: body.offset, order: body.order }
    );
    return NextResponse.json(
      {
        items: result.result.items,
        total_count: result.result.total_count,
        cached: result.cached,
        stale: result.stale,
        fallback: result.fallback,
        fetched_at: result.fetched_at,
      },
      {
        headers: {
          // Allow Vercel CDN to also cache for 60s
          'Cache-Control': 's-maxage=60, stale-while-revalidate=600',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('/api/nivoda/search failed', msg);
    // Common cases we surface specifically so the client can diagnose:
    if (/relation .* does not exist|nivoda_search_cache|nivoda_tokens/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Diamond search is not yet configured.',
          detail: 'Database tables missing. Run supabase/migrations/011_nivoda_integration.sql in the Supabase SQL editor.',
        },
        { status: 503 }
      );
    }
    if (/unauthenticated|invalid.*credentials|wrong/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Diamond search is not yet configured.',
          detail: 'Nivoda credentials rejected. Verify NIVODA_USERNAME / NIVODA_PASSWORD in Vercel env match the account.',
        },
        { status: 503 }
      );
    }
    if (/timeout|aborted/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Nivoda is responding slowly right now. Please try again in a moment.',
          detail: msg,
        },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        error: 'Diamond search briefly unavailable. Please try again in a moment.',
        detail: msg,
      },
      { status: 503 }
    );
  }
}

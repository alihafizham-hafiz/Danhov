/**
 * POST   /api/nivoda/hold        — place a hold on an offer ID
 * DELETE /api/nivoda/hold?id=…   — cancel a hold (by our internal hold UUID)
 *
 * Holds reserve a stone on Nivoda's side. We persist a row in nivoda_holds
 * so we can release it (cancel) or convert it after card payment.
 *
 * IMPORTANT: Holds are tied to a session_id (cookie-set or client-passed).
 * We don't authenticate the customer here — anyone can hold a stone, but
 * to convert a hold to an order they must complete checkout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { createHold, cancelHold, NIVODA_PRO_ENABLED } from '@/lib/nivoda';
import { isFallbackOffer } from '@/lib/nivoda-fallback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PostBody = z.object({
  offer_id: z.string().min(8).max(80),
  session_id: z.string().min(8).max(120),
  setting_slug: z.string().max(120).optional(),
  customer_email: z.string().email().max(254).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof PostBody>;
  try {
    body = PostBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid request', detail: e instanceof Error ? e.message : '' },
      { status: 400 }
    );
  }

  // Fallback stones (synthetic catalog) can be "held" client-side just so
  // the customer can continue the build flow. We don't call Nivoda for
  // them — a specialist confirms availability + sources a comparable
  // real stone after deposit.
  if (isFallbackOffer(body.offer_id)) {
    const sbFb = createServiceClient();
    const { data: inserted, error } = await sbFb
      .from('nivoda_holds')
      .insert({
        offer_id: body.offer_id,
        nivoda_hold_id: null,
        session_id: body.session_id,
        status: 'active',
        held_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        customer_email: body.customer_email ?? null,
        setting_slug: body.setting_slug ?? null,
        metadata: { kind: 'fallback' },
      })
      .select('id')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Could not save selection.' }, { status: 500 });
    }
    return NextResponse.json({
      hold_id: inserted.id,
      nivoda_hold_id: null,
      held_until: null,
      fallback: true,
    });
  }

  if (!NIVODA_PRO_ENABLED) {
    return NextResponse.json(
      { error: 'Nivoda Pro API not enabled' },
      { status: 503 }
    );
  }

  // Don't double-hold the same offer in the same session
  const sb = createServiceClient();
  const { data: existing } = await sb
    .from('nivoda_holds')
    .select('id, nivoda_hold_id, held_until, status')
    .eq('offer_id', body.offer_id)
    .eq('session_id', body.session_id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      hold_id: existing.id,
      nivoda_hold_id: existing.nivoda_hold_id,
      held_until: existing.held_until,
      reused: true,
    });
  }

  const r = await createHold(body.offer_id);
  if (!r.ok) {
    return NextResponse.json(
      { error: 'Could not hold this stone.', detail: r.error },
      { status: 502 }
    );
  }
  if (r.data.denied) {
    return NextResponse.json(
      { error: 'This stone is no longer available to hold.' },
      { status: 409 }
    );
  }

  // Persist
  const { data: inserted, error: insertErr } = await sb
    .from('nivoda_holds')
    .insert({
      offer_id: body.offer_id,
      nivoda_hold_id: r.data.id ?? null,
      session_id: body.session_id,
      status: 'active',
      held_until: r.data.until ?? null,
      customer_email: body.customer_email ?? null,
      setting_slug: body.setting_slug ?? null,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('nivoda hold persist failed', insertErr);
    // Hold succeeded on Nivoda but we can't track it locally — try to
    // cancel so we don't leak the reservation.
    if (r.data.id) await cancelHold(r.data.id).catch(() => undefined);
    return NextResponse.json(
      { error: 'Hold tracking failed. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    hold_id: inserted.id,
    nivoda_hold_id: r.data.id,
    held_until: r.data.until,
  });
}

const DeleteQuery = z.object({
  id: z.string().uuid(),
});

export async function DELETE(req: NextRequest) {
  if (!NIVODA_PRO_ENABLED) {
    return NextResponse.json(
      { error: 'Nivoda Pro API not enabled' },
      { status: 503 }
    );
  }

  const parsed = DeleteQuery.safeParse({ id: req.nextUrl.searchParams.get('id') });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid hold id' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: row } = await sb
    .from('nivoda_holds')
    .select('id, nivoda_hold_id, status')
    .eq('id', parsed.data.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
  }

  if (row.status === 'active' && row.nivoda_hold_id) {
    const r = await cancelHold(row.nivoda_hold_id);
    if (!r.ok) {
      console.warn('nivoda cancel hold failed', r.error);
      // continue — we still mark our row cancelled
    }
  }

  await sb
    .from('nivoda_holds')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);

  return NextResponse.json({ ok: true });
}

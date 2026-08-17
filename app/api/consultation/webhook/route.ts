/**
 * Calendly webhook receiver.
 *
 * Listens for `invitee.created` (and `invitee.canceled`) events from
 * Calendly → mirrors the booking into our `consultations` table →
 * sends a brand-styled confirmation email to the customer (Calendly's
 * own confirmation also goes out, but ours carries the DANHOV voice).
 *
 * Set up in Calendly:
 *   Integrations → Webhooks → Create → URL =
 *     https://YOUR-DOMAIN/api/consultation/webhook
 *   Events: invitee.created, invitee.canceled
 *   Copy the signing key → set CALENDLY_WEBHOOK_SIGNING_KEY in env.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, consultationConfirmEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CalendlyPayload = {
  event: string;
  payload: {
    email?: string;
    name?: string;
    scheduled_event?: {
      uri?: string;
      start_time?: string;
      end_time?: string;
      location?: { type?: string; join_url?: string };
    };
    uri?: string;
    questions_and_answers?: { question: string; answer: string }[];
    text_reminder_number?: string | null;
    timezone?: string;
  };
};

export async function POST(req: NextRequest) {
  // 1) Read raw body (needed for signature check)
  const rawBody = await req.text();

  // 2) Verify the signature. Fail closed: a misconfigured/missing signing key
  // must reject the request, not silently accept an unsigned payload.
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    console.error('consultation/webhook: CALENDLY_WEBHOOK_SIGNING_KEY not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  const header = req.headers.get('calendly-webhook-signature') || '';
  if (!verifyCalendlySignature(rawBody, header, signingKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let json: CalendlyPayload;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (json.event !== 'invitee.created' && json.event !== 'invitee.canceled') {
    return NextResponse.json({ ok: true, ignored: json.event });
  }

  const p = json.payload || {};
  const email = (p.email || '').toLowerCase();
  if (!email) return NextResponse.json({ ok: true, skipped: 'no email' });

  const status = json.event === 'invitee.created' ? 'scheduled' : 'cancelled';
  const scheduledAt = p.scheduled_event?.start_time || null;
  const zoomLink = p.scheduled_event?.location?.join_url || null;
  const eventUri = p.scheduled_event?.uri || p.uri || null;

  // Notes: aggregate Q&A from the booking form
  const notes =
    (p.questions_and_answers || [])
      .map((qa) => `${qa.question}: ${qa.answer}`)
      .join('\n') || null;

  const client = createServiceClient();

  // Light customer upsert
  await client
    .from('customers')
    .upsert({ email, name: p.name ?? null }, { onConflict: 'email' });

  // Upsert by calendly_event_uri so cancellations update the same row
  if (status === 'scheduled') {
    await client.from('consultations').upsert(
      {
        customer_email: email,
        customer_name: p.name ?? null,
        calendly_event_uri: eventUri,
        zoom_link: zoomLink,
        scheduled_at: scheduledAt,
        status,
        notes,
      },
      { onConflict: 'calendly_event_uri' }
    );

    // Branded confirmation email (Calendly sends its own too — ours adds the DANHOV voice)
    const tpl = consultationConfirmEmail({
      customerName: p.name ?? null,
      scheduledAt,
      zoomLink,
      notes,
    });
    void sendEmail({ to: email, ...tpl }).catch((e) =>
      console.error('consultation/webhook email failed', e)
    );
  } else {
    // Cancelled — mark the existing row
    if (eventUri) {
      await client
        .from('consultations')
        .update({ status: 'cancelled' })
        .eq('calendly_event_uri', eventUri);
    }
  }

  return NextResponse.json({ ok: true });
}

function verifyCalendlySignature(body: string, header: string, key: string): boolean {
  // Calendly header format: "t=TIMESTAMP,v1=SIGNATURE"
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k.trim(), v];
    })
  );
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  const payload = `${t}.${body}`;
  const expected = crypto.createHmac('sha256', key).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

/**
 * Gift Card purchase — Authorize.Net Accept Hosted.
 *
 * Flow:
 *   1. Insert pending gift_card rows (codes generated up-front)
 *   2. Get AuthNet hosted-payment token
 *   3. Redirect to /checkout/pay
 *   4. AuthNet webhook fires → activates cards and emails recipient(s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { authNetConfigured, createHostedPaymentSession } from '@/lib/authorizenet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  amount: z.number().int().min(25).max(10000),
  quantity: z.number().int().min(1).max(10),
  for_self: z.boolean().default(false),
  sender_name: z.string().min(1).max(200),
  sender_email: z.string().email().max(254),
  recipient_name: z.string().min(1).max(200),
  recipient_email: z.string().email().max(254),
  message: z.string().max(500).optional().default(''),
  deliver_at: z.string().optional(),
});

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `DANHOV-${seg()}-${seg()}-${seg()}`;
}

export async function POST(req: NextRequest) {
  if (!authNetConfigured()) {
    return NextResponse.json(
      { error: 'Payment processing is not yet enabled. Please contact care@danhov.com.' },
      { status: 503 }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { amount, quantity, sender_name, sender_email, recipient_name, recipient_email, message, deliver_at, for_self } = body;
  const totalUsd = amount * quantity;

  // Generate a shared payment ref for all cards in this purchase
  const paymentRef = `GC-${randomUUID().slice(0, 8).toUpperCase()}`; // e.g. GC-6A872BB1

  const sb = createServiceClient();

  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const siteUrl = `${proto}://${host}`;

  const itemName = quantity === 1
    ? `DANHOV Gift Card — $${amount.toLocaleString()}`
    : `DANHOV Gift Cards ×${quantity} — $${amount.toLocaleString()} each`;

  // Create the hosted payment session first so we can key the cards to its invoice ref.
  let session: { id: string; url: string };
  try {
    session = await createHostedPaymentSession({
      orderId: paymentRef,
      amountUsd: totalUsd,
      description: `${itemName}${for_self ? '' : ` — For ${recipient_name}`}`,
      email: sender_email.toLowerCase(),
      successUrl: `${siteUrl}/gift-cards/success`,
      cancelUrl: `${siteUrl}/gift-cards/buy`,
    });
  } catch (e) {
    console.error('[gift-cards/purchase] AuthNet session error:', e);
    return NextResponse.json({ error: 'Payment gateway error. Please try again or contact care@danhov.com.' }, { status: 502 });
  }

  // Insert pending rows keyed to the gateway invoice ref; the webhook activates them.
  const gcRows = Array.from({ length: quantity }, () => ({
    code: generateCode(),
    amount_usd: amount,
    sender_name,
    sender_email: sender_email.toLowerCase(),
    recipient_name,
    recipient_email: recipient_email.toLowerCase(),
    message: message || null,
    deliver_at: deliver_at ? new Date(deliver_at).toISOString() : null,
    status: 'pending',
    stripe_session_id: session.id,
  }));

  const { error: dbErr } = await sb.from('gift_cards').insert(gcRows);
  if (dbErr) {
    console.error('[gift-cards/purchase] db error:', dbErr.message);
    return NextResponse.json({ error: 'Could not create gift card. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

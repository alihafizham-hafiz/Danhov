/**
 * Stripe Checkout webhook.
 *
 * Verifies the Stripe signature (STRIPE_WEBHOOK_SECRET), then on
 * `checkout.session.completed` finalizes either an order or a gift-card
 * purchase — both are keyed to the Checkout Session id.
 *
 * Required env:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET  — signing secret from the webhook endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, depositReceiptEmail, giftCardEmail } from '@/lib/email';
import { createOrder as nivodaCreateOrder, NIVODA_PRO_ENABLED } from '@/lib/nivoda';
import { isFallbackOffer } from '@/lib/nivoda-fallback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    console.warn('[stripe/webhook] signature verification failed:', (e as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true });
  }

  const sessionId = session.id;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  const client = createServiceClient();

  // Gift card purchases are keyed to the session id on gift_cards
  const { data: cards } = await client
    .from('gift_cards')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .eq('status', 'pending');

  if (cards && cards.length > 0) {
    return handleGiftCard(client, sessionId);
  }

  return handleOrder(client, sessionId, paymentIntentId);
}

async function handleOrder(
  client: ReturnType<typeof createServiceClient>,
  sessionId: string,
  paymentIntentId: string | null,
): Promise<NextResponse> {
  const { data: order } = await client
    .from('orders')
    .select('id, customer_email, quote_lock_id, deposit_usd, total_usd, status, milestones, nivoda_offer_id, shipping_address, product_name, product_sku')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();

  if (!order) {
    console.warn('[stripe/webhook] no order for session:', sessionId);
    return NextResponse.json({ received: true });
  }
  if (order.status !== 'pending') {
    return NextResponse.json({ received: true }); // already processed
  }

  const milestones = (order.milestones as Array<{ name: string; status: string; paid_at?: string }>) || [];
  const updatedMilestones = milestones.map(m =>
    m.name === 'deposit' ? { ...m, status: 'paid', paid_at: new Date().toISOString() } : m
  );

  await client.from('orders').update({
    status: 'deposit_paid',
    milestones: updatedMilestones,
    stripe_payment_intent_id: paymentIntentId,
    last_email_sent_at: new Date().toISOString(),
  }).eq('id', order.id).eq('status', 'pending');

  if (order.quote_lock_id) {
    await client.from('quote_locks').update({ consumed: true }).eq('id', order.quote_lock_id);
  }

  // Receipt to customer
  const tpl = depositReceiptEmail({
    productName: order.product_name ?? order.product_sku ?? 'Your piece',
    sku: order.product_sku ?? '—',
    depositUsd: Number(order.deposit_usd),
    totalUsd: Number(order.total_usd),
    orderId: order.id,
  });
  if (order.customer_email) {
    await sendEmail({ to: order.customer_email, ...tpl });
  }

  // Nivoda auto-order
  const offerId = (order.nivoda_offer_id as string | null) ?? extractOfferFromBundle(order.shipping_address);
  if (offerId && NIVODA_PRO_ENABLED && !isFallbackOffer(offerId)) {
    try {
      const ref = `DH-${order.id.slice(0, 8).toUpperCase()}`;
      const r = await nivodaCreateOrder({ offerId, orderReference: ref });
      if (r.ok) {
        await client.from('orders').update({ nivoda_order_id: r.data.id ?? null }).eq('id', order.id);
      } else {
        await sendEmail({
          to: 'care@danhov.com',
          subject: `[Action needed] Nivoda order failed for ${order.id.slice(0, 8).toUpperCase()}`,
          html: `<p>Payment received but Nivoda order failed.</p><p><strong>Order:</strong> ${order.id}<br/><strong>Offer:</strong> ${offerId}<br/><strong>Error:</strong> ${r.error}</p>`,
        });
      }
    } catch (e) {
      console.error('[stripe/webhook] Nivoda order threw:', e);
    }
  }

  // Studio notification
  const ref = order.id.slice(0, 8).toUpperCase();
  await sendEmail({
    to: 'care@danhov.com',
    subject: `[Deposit paid] ${order.product_name ?? order.product_sku ?? 'Order'} — ${ref}`,
    html: `<p>A new commission deposit has been received.</p>
<p>
  <strong>Customer:</strong> ${escapeHtml(order.customer_email || '—')}<br/>
  <strong>Piece:</strong> ${escapeHtml(order.product_name ?? '—')} — ${escapeHtml(order.product_sku ?? '—')}<br/>
  <strong>Deposit:</strong> $${Number(order.deposit_usd).toLocaleString('en-US')}<br/>
  <strong>Total:</strong> $${Number(order.total_usd).toLocaleString('en-US')}<br/>
  <strong>Order:</strong> ${order.id}
</p>`,
    replyTo: order.customer_email || undefined,
  });

  console.info('[stripe/webhook] deposit_paid:', { orderId: order.id, sessionId });
  return NextResponse.json({ received: true });
}

async function handleGiftCard(
  client: ReturnType<typeof createServiceClient>,
  sessionId: string,
): Promise<NextResponse> {
  const { data: cards } = await client
    .from('gift_cards')
    .select('id, code, amount_usd, sender_name, sender_email, recipient_name, recipient_email, message, deliver_at, status')
    .eq('stripe_session_id', sessionId)
    .eq('status', 'pending');

  if (!cards?.length) {
    return NextResponse.json({ received: true });
  }

  const ids = cards.map((c: { id: string }) => c.id);
  await client.from('gift_cards').update({ status: 'active' }).in('id', ids);

  const now = new Date();
  for (const card of cards as Array<{ code: string; amount_usd: number; sender_name: string; sender_email: string; recipient_name: string; recipient_email: string; message: string | null; deliver_at: string | null }>) {
    const deliverAt = card.deliver_at ? new Date(card.deliver_at) : null;
    if (deliverAt && deliverAt > now) continue; // scheduled — cron handles it

    const tpl = giftCardEmail({
      recipientName: card.recipient_name,
      senderName: card.sender_name,
      code: card.code,
      amountUsd: card.amount_usd,
      message: card.message,
    });
    await sendEmail({ to: card.recipient_email, ...tpl });
  }

  const first = cards[0] as { amount_usd: number; sender_name: string; sender_email: string; recipient_name: string };
  const total = cards.reduce((s: number, c: { amount_usd: number }) => s + c.amount_usd, 0);
  await sendEmail({
    to: first.sender_email,
    subject: `Your DANHOV gift card purchase — $${total.toLocaleString('en-US')}`,
    html: `<p>Dear ${first.sender_name},</p><p>Your gift card${cards.length > 1 ? 's have' : ' has'} been sent to <strong>${first.recipient_name}</strong>. Total paid: <strong>$${total.toLocaleString('en-US')}</strong>.</p><p>Thank you for sharing the beauty of DANHOV.</p>`,
  });

  console.info('[stripe/webhook] gift cards activated:', { sessionId, count: cards.length });
  return NextResponse.json({ received: true });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

function extractOfferFromBundle(addr: unknown): string | null {
  if (!addr || typeof addr !== 'object') return null;
  const bundle = (addr as { _bundle?: { diamond?: { offer_id?: string } } })._bundle;
  return bundle?.diamond?.offer_id ?? null;
}

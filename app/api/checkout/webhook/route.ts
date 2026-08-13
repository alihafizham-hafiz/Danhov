/**
 * Authorize.Net Webhook Notifications handler.
 *
 * AuthNet sends JSON (not form-encoded) with an HMAC-SHA512 signature.
 * Signature header: X-ANET-Signature: sha512=HEXDIGEST
 *
 * Required env var:
 *   AUTHNET_SIGNATURE_KEY — the signature key from API Credentials & Keys
 *                           used to verify X-ANET-Signature
 *
 * Events subscribed (configure in AuthNet dashboard):
 *   net.authorize.payment.authcapture.created
 */

import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthNetSignatureKey, getTransactionDetails } from '@/lib/authorizenet';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, depositReceiptEmail, giftCardEmail } from '@/lib/email';
import { createOrder as nivodaCreateOrder, NIVODA_PRO_ENABLED } from '@/lib/nivoda';
import { isFallbackOffer } from '@/lib/nivoda-fallback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type AuthNetEvent = {
  eventType: string;
  payload: {
    responseCode?: number;
    id?: string;       // transaction ID
    authAmount?: number;
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify HMAC-SHA512 signature if key is configured.
  // AuthNet's Signature Key is a hex string; the HMAC is keyed with the DECODED
  // bytes of that key. We also accept the raw-string form as a fallback so a
  // legitimate webhook is never falsely rejected.
  const signingKey = getAuthNetSignatureKey();
  if (signingKey) {
    const got = (req.headers.get('x-anet-signature') ?? '').replace(/^sha512=/i, '').toUpperCase();
    const digest = (key: Buffer | string) => createHmac('sha512', key).update(rawBody).digest('hex').toUpperCase();
    const candidates = [digest(Buffer.from(signingKey, 'hex')), digest(signingKey)];
    if (!got || !candidates.includes(got)) {
      console.warn('[webhook] signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: AuthNetEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  // Only handle auth+capture (full payment collected immediately)
  if (event.eventType !== 'net.authorize.payment.authcapture.created') {
    return NextResponse.json({ received: true });
  }

  if (event.payload.responseCode !== 1) {
    console.info('[webhook] non-approved event, responseCode:', event.payload.responseCode);
    return NextResponse.json({ received: true });
  }

  const transId = event.payload.id;
  if (!transId) return NextResponse.json({ received: true });

  // Fetch full transaction details to get our invoice ref
  let invoiceRef: string;
  let approved: boolean;
  try {
    const details = await getTransactionDetails(transId);
    approved = details.approved;
    invoiceRef = details.invoiceRef;
  } catch (e) {
    console.error('[webhook] getTransactionDetails failed:', e);
    return NextResponse.json({ error: 'AuthNet API error' }, { status: 502 });
  }

  if (!approved || !invoiceRef) {
    console.warn('[webhook] not approved or no invoiceRef:', { transId, approved, invoiceRef });
    return NextResponse.json({ received: true });
  }

  const client = createServiceClient();

  // Gift card flow (invoice refs start with GC-)
  if (invoiceRef.startsWith('GC-')) {
    return handleGiftCard(client, invoiceRef, transId);
  }

  const { data: order } = await client
    .from('orders')
    .select('id, customer_email, quote_lock_id, deposit_usd, total_usd, status, milestones, nivoda_offer_id, shipping_address, product_name, product_sku')
    .eq('stripe_checkout_session_id', invoiceRef)
    .maybeSingle();

  if (!order) {
    console.warn('[webhook] no order for invoiceRef:', invoiceRef);
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
    stripe_payment_intent_id: transId,
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
      console.error('[webhook] Nivoda order threw:', e);
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
  <strong>AuthNet Trans ID:</strong> ${transId}<br/>
  <strong>Order:</strong> ${order.id}
</p>`,
    replyTo: order.customer_email || undefined,
  });

  console.info('[webhook] deposit_paid:', { orderId: order.id, transId });
  return NextResponse.json({ received: true });
}

async function handleGiftCard(
  client: ReturnType<typeof createServiceClient>,
  invoiceRef: string,
  transId: string,
): Promise<NextResponse> {
  const { data: cards } = await client
    .from('gift_cards')
    .select('id, code, amount_usd, sender_name, sender_email, recipient_name, recipient_email, message, deliver_at, status')
    .eq('stripe_session_id', invoiceRef)
    .eq('status', 'pending');

  if (!cards?.length) {
    console.warn('[webhook] no pending gift cards for ref:', invoiceRef);
    return NextResponse.json({ received: true });
  }

  // Activate all cards in this purchase
  const ids = cards.map((c: { id: string }) => c.id);
  await client.from('gift_cards').update({ status: 'active', stripe_session_id: transId }).in('id', ids);

  // Send gift card email to recipient for each card
  const now = new Date();
  for (const card of cards as Array<{ code: string; amount_usd: number; sender_name: string; sender_email: string; recipient_name: string; recipient_email: string; message: string | null; deliver_at: string | null }>) {
    const deliverAt = card.deliver_at ? new Date(card.deliver_at) : null;
    if (deliverAt && deliverAt > now) continue; // scheduled delivery — skip for now (cron handles it)

    const tpl = giftCardEmail({
      recipientName: card.recipient_name,
      senderName: card.sender_name,
      code: card.code,
      amountUsd: card.amount_usd,
      message: card.message,
    });
    await sendEmail({ to: card.recipient_email, ...tpl });
  }

  // Purchase receipt to sender
  const first = cards[0] as { amount_usd: number; sender_name: string; sender_email: string; recipient_name: string };
  const total = cards.reduce((s: number, c: { amount_usd: number }) => s + c.amount_usd, 0);
  await sendEmail({
    to: first.sender_email,
    subject: `Your DANHOV gift card purchase — $${total.toLocaleString('en-US')}`,
    html: `<p>Dear ${first.sender_name},</p><p>Your gift card${cards.length > 1 ? 's have' : ' has'} been sent to <strong>${first.recipient_name}</strong>. Total paid: <strong>$${total.toLocaleString('en-US')}</strong>.</p><p>Thank you for sharing the beauty of DANHOV.</p>`,
  });

  console.info('[webhook] gift cards activated:', { invoiceRef, count: cards.length, transId });
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

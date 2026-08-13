/**
 * Server-side reconciliation after payment.
 *
 * Two paths:
 *   finalizeAuthNetOrder(orderId) — AuthNet Accept Hosted (current)
 *   finalizeCheckoutSession(sessionId) — legacy Stripe (kept for any old links)
 *
 * Both are idempotent — if the webhook already fired and set deposit_paid,
 * we return completed immediately without re-writing.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { getTransactionDetails } from '@/lib/authorizenet';

export type FinalizeResult = {
  status: 'completed' | 'pending' | 'not_found' | 'unconfigured';
  order_id?: string;
  product_name?: string | null;
  deposit_usd?: number;
};

/** Primary path: called from /order/success?order_id=UUID */
export async function finalizeAuthNetOrder(orderId: string): Promise<FinalizeResult> {
  const client = createServiceClient();
  const { data: order, error } = await client
    .from('orders')
    .select('id, status, milestones, deposit_usd, total_usd, stripe_checkout_session_id, stripe_payment_intent_id, quote_lock_id, product_name')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return { status: 'not_found' };

  // Webhook already set this — just confirm
  if (order.status !== 'pending') {
    return { status: 'completed', order_id: order.id, product_name: order.product_name, deposit_usd: Number(order.deposit_usd) };
  }

  // IPN may not have arrived yet (race condition). If we have a trans_id,
  // verify with AuthNet directly and finalize here.
  const transId = order.stripe_payment_intent_id as string | null;
  if (transId) {
    try {
      const details = await getTransactionDetails(transId);
      if (!details.approved) return { status: 'pending', order_id: order.id };
      await flipOrderPaid(client, order, transId);
      return { status: 'completed', order_id: order.id, product_name: order.product_name, deposit_usd: Number(order.deposit_usd) };
    } catch {
      // Network error talking to AuthNet — treat as pending
      return { status: 'pending', order_id: order.id };
    }
  }

  // No trans_id yet (IPN hasn't arrived). AuthNet only redirects to the
  // success URL after approval, so this almost certainly just means the
  // IPN is in-flight. Return pending — the page can poll or the user can
  // refresh.
  return { status: 'pending', order_id: order.id };
}

async function flipOrderPaid(
  client: ReturnType<typeof createServiceClient>,
  order: { id: string; milestones: unknown; quote_lock_id: string | null },
  transId: string,
) {
  const milestones = (order.milestones as Array<{ name: string; status: string; paid_at?: string }>) || [];
  const updated = milestones.map(m =>
    m.name === 'deposit' ? { ...m, status: 'paid', paid_at: new Date().toISOString() } : m
  );

  await client.from('orders').update({
    status: 'deposit_paid',
    milestones: updated,
    stripe_payment_intent_id: transId,
  }).eq('id', order.id).eq('status', 'pending');

  if (order.quote_lock_id) {
    await client.from('quote_locks').update({ consumed: true }).eq('id', order.quote_lock_id);
  }
}

/** Legacy Stripe fallback — kept for old session_id links in emails. */
export async function finalizeCheckoutSession(sessionId: string): Promise<FinalizeResult> {
  if (!process.env.STRIPE_SECRET_KEY) return { status: 'unconfigured' };

  const client = createServiceClient();
  const { data: order, error } = await client
    .from('orders')
    .select('id, status, milestones, deposit_usd, product_name, quote_lock_id')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();

  if (error || !order) return { status: 'not_found' };

  if (order.status !== 'pending') {
    return { status: 'completed', order_id: order.id, product_name: order.product_name, deposit_usd: Number(order.deposit_usd) };
  }

  // Dynamic import to avoid loading Stripe when unused
  const { getStripe } = await import('@/lib/stripe');
  let session: Awaited<ReturnType<ReturnType<typeof getStripe>['checkout']['sessions']['retrieve']>>;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return { status: 'pending', order_id: order.id };
  }

  if (session.payment_status !== 'paid') return { status: 'pending', order_id: order.id };

  const milestones = (order.milestones as Array<{ name: string; status: string; paid_at?: string }>) || [];
  const updated = milestones.map(m => m.name === 'deposit' ? { ...m, status: 'paid', paid_at: new Date().toISOString() } : m);
  await client.from('orders').update({
    status: 'deposit_paid',
    milestones: updated,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  }).eq('id', order.id).eq('status', 'pending');

  if (order.quote_lock_id) {
    await client.from('quote_locks').update({ consumed: true }).eq('id', order.quote_lock_id);
  }

  return { status: 'completed', order_id: order.id, product_name: order.product_name, deposit_usd: Number(order.deposit_usd) };
}

/**
 * Concierge Checkout — Authorize.Net Accept Hosted for the deposit on a
 * locked quote.
 *
 * Flow:
 *   1. Client posts { quote_id, email }
 *   2. Validate lock (not expired, not consumed)
 *   3. Create pending order in DB with a generated UUID
 *   4. Get AuthNet hosted-payment token using that UUID as invoice ref
 *   5. Return redirect URL → /checkout/pay?token=…&order_id=…
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { authNetConfigured, createHostedPaymentSession } from '@/lib/authorizenet';
import { SHIPPING_FEE_USD } from '@/lib/shipping';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEPOSIT_PERCENT = 1;

const Body = z.object({
  quote_id: z.string().uuid(),
  email: z.string().email().max(254).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 'checkout-create', 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  if (!authNetConfigured()) {
    return NextResponse.json(
      { error: 'Online deposits are not yet enabled. Please call (424) 421-4072 and we will take payment by phone.' },
      { status: 503 }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const client = createServiceClient();

  const { data: lock, error: lockErr } = await client
    .from('quote_locks')
    .select('id, product_id, customer_email, metal_choice, locked_price_usd, expires_at, consumed, breakdown')
    .eq('id', body.quote_id)
    .maybeSingle();

  if (lockErr || !lock) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  if (lock.consumed) return NextResponse.json({ error: 'This quote has already been used.' }, { status: 410 });
  if (new Date(lock.expires_at) < new Date()) return NextResponse.json({ error: 'This quote has expired. Please lock a new price.' }, { status: 410 });

  const { data: product } = await client
    .from('products')
    .select('sku, name, slug, images, collection, category')
    .eq('id', lock.product_id)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const customerEmail = (body.email || lock.customer_email || '').toLowerCase();
  if (!customerEmail) return NextResponse.json({ error: 'Customer email required' }, { status: 400 });

  const totalUsd = Number(lock.locked_price_usd) + SHIPPING_FEE_USD;
  const depositUsd = Math.round(totalUsd * DEPOSIT_PERCENT);
  const balanceUsd = totalUsd - depositUsd;

  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const siteUrl = `${proto}://${host}`;

  // Pre-generate order ID so it can be the success URL param
  const orderId = randomUUID();

  let session: { id: string; url: string };
  try {
    session = await createHostedPaymentSession({
      orderId,
      amountUsd: depositUsd,
      description: `${product.name} (${product.sku}) — DANHOV`,
      email: customerEmail,
      successUrl: `${siteUrl}/order/success?order_id=${orderId}`,
      cancelUrl: `${siteUrl}/product/${product.slug}`,
    });
  } catch (e) {
    console.error('[checkout/create] AuthNet session error:', e);
    return NextResponse.json({ error: 'Payment gateway error. Please try again or call (424) 421-4072.' }, { status: 502 });
  }

  // Upsert customer then insert order
  await client.from('customers').upsert({ email: customerEmail }, { onConflict: 'email' });

  const { error: orderErr } = await client.from('orders').insert({
    id: orderId,
    customer_email: customerEmail,
    quote_lock_id: lock.id,
    stripe_checkout_session_id: session.id,
    deposit_usd: depositUsd,
    total_usd: totalUsd,
    shipping_cost_usd: SHIPPING_FEE_USD,
    status: 'pending',
    currency: 'usd',
    product_sku: product.sku,
    product_name: product.name,
    milestones: [
      { name: 'deposit', amount_usd: depositUsd, status: 'pending', created_at: new Date().toISOString() },
      { name: 'balance', amount_usd: balanceUsd, status: 'not_due' },
    ],
  });

  if (orderErr) console.error('[checkout/create] order insert error:', orderErr);

  return NextResponse.json({ url: session.url, order_id: orderId });
}

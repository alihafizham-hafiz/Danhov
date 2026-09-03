/**
 * Cart Checkout — Authorize.Net Accept Hosted for cart items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { authNetConfigured, createHostedPaymentSession } from '@/lib/authorizenet';
import { bankTransferEnabled, BANK_METHOD } from '@/lib/bank';
import { priceProduct } from '@/lib/pricing';
import { fetchProductWithPricingBySlug } from '@/lib/products';
import { SHIPPING_FEE_USD } from '@/lib/shipping';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEPOSIT_PERCENT = 1;

const Item = z.object({
  sku: z.string().min(1).max(80),
  slug: z.string().min(1).max(120),
  qty: z.number().int().min(1).max(99),
  metal: z.string().nullable().optional(),
  variant_label: z.string().nullable().optional(),
  price_num: z.number().nonnegative().optional(),
  ring_size: z.string().nullable().optional(),
  bundle: z
    .object({
      setting_price_usd: z.number().nonnegative(),
      diamond: z.object({
        offer_id: z.string().min(1),
        hold_id: z.string().nullable(),
        shape: z.string(),
        carat: z.number().nonnegative(),
        color: z.string(),
        clarity: z.string(),
        cut: z.string(),
        lab: z.string().nullable(),
        cert_number: z.string().nullable(),
        price_usd: z.number().nonnegative(),
        image: z.string().nullable(),
      }),
      diamonds: z.array(z.object({
        offer_id: z.string().min(1),
        hold_id: z.string().nullable(),
        shape: z.string(),
        carat: z.number().nonnegative(),
        color: z.string(),
        clarity: z.string(),
        cut: z.string(),
        lab: z.string().nullable(),
        cert_number: z.string().nullable(),
        price_usd: z.number().nonnegative(),
        image: z.string().nullable(),
      })).optional(),
    })
    .nullable()
    .optional(),
});

const Body = z.object({
  items: z.array(Item).min(1).max(20),
  email: z.string().email().max(254),
  // 'bank' skips card processing entirely and settles by ACH outside the site. Pricing
  // and validation below are shared, so the two methods can't drift.
  method: z.enum(['card', 'bank','manual']).default('card'),
  delivery_method: z.enum(['ship', 'pickup']).default('ship'),
  shipping_option: z.enum(['express', 'next_day']).default('express'),
  gift_message: z.string().max(500).optional().nullable(),
  shipping_address: z.object({
    first_name: z.string().max(80).optional().nullable(),
    last_name: z.string().max(80).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    apartment: z.string().max(255).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    state: z.string().max(120).optional().nullable(),
    zip: z.string().max(40).optional().nullable(),
    country: z.string().max(120).optional().nullable(),
  }).passthrough().default({}),
  item_count: z.number().int().min(1).max(999).optional(),
}).passthrough();

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 'cart-checkout', 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    console.error('[cart/checkout] invalid body:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

const payByBank = body.method === 'bank';
const isManual = body.method === 'manual';

if (payByBank && !bankTransferEnabled()) {
  return NextResponse.json(
    { error: 'Bank transfer is not yet enabled. Call (424) 421-4072 and we will take payment by phone.' },
    { status: 503 }
  );
}
if (!payByBank && !isManual && !authNetConfigured()) {
  return NextResponse.json(
    { error: 'Online checkout is not yet enabled. Call (424) 421-4072 and we will take payment by phone.' },
    { status: 503 }
  );
}

  type Priced = {
    sku: string; slug: string; name: string; metal: string | null;
    qty: number; unit_price_usd: number; image: string | null;
    ring_size: string | null; bundle: z.infer<typeof Item>['bundle'];
  };

  const priced: Priced[] = [];
  for (const it of body.items) {
    const product = await fetchProductWithPricingBySlug(it.slug);
    if (!product) {
      return NextResponse.json({ error: `One of your pieces (${it.sku}) is no longer available. Please remove it and try again.` }, { status: 410 });
    }
    const metal = it.metal || product.default_metal || null;
    let unitPrice = it.price_num ?? 0;

    if (unitPrice <= 0 && it.bundle) {
      const allDiamonds = it.bundle.diamonds?.length ? it.bundle.diamonds : [it.bundle.diamond];
      const diamondTotal = allDiamonds.reduce((sum, d) => sum + d.price_usd, 0);
      unitPrice = it.bundle.setting_price_usd + diamondTotal;
    } else if (unitPrice <= 0) {
      try {
        const breakdown = await priceProduct(product, metal);
        unitPrice = breakdown.total_usd;
      } catch {
        const m = product.price_display?.match(/[\d,]+/);
        unitPrice = m ? Number(m[0].replace(/,/g, '')) : 0;
      }
    }

    if (unitPrice <= 0) {
      return NextResponse.json({ error: `Could not price ${product.name}. Please contact us at care@danhov.com.` }, { status: 502 });
    }
    priced.push({ sku: product.sku, slug: product.slug, name: product.name, metal, qty: it.qty, unit_price_usd: unitPrice, image: product.images?.[0] ?? null, ring_size: it.ring_size ?? null, bundle: it.bundle ?? null });
  }

  const merchandiseUsd = priced.reduce((sum, p) => sum + p.unit_price_usd * p.qty, 0);
  const totalUsd = merchandiseUsd + SHIPPING_FEE_USD;
  const depositUsd = Math.round(totalUsd * DEPOSIT_PERCENT);
  const balanceUsd = totalUsd - depositUsd;
  const customerEmail = body.email.toLowerCase();
  const deliveryMethod = body.delivery_method || 'ship';
  const shippingOption = body.shipping_option || 'express';
  const giftMessage = (body.gift_message ?? '').trim();
  const shippingAddress = {
    ...(body.shipping_address ?? {}),
    delivery_method: deliveryMethod,
    shipping_option: shippingOption,
    gift_message: giftMessage || null,
  };

  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const siteUrl = `${proto}://${host}`;

  const orderId = randomUUID();
  const descItems = priced.map(p => p.name).join(', ').slice(0, 255);

  let session: { id: string; url: string } | null = null;
  if (!payByBank && !isManual) {
    try {
      session = await createHostedPaymentSession({
        orderId,
        amountUsd: depositUsd,
        description: descItems,
        email: customerEmail,
        successUrl: `${siteUrl}/order/success?order_id=${orderId}`,
        cancelUrl: `${siteUrl}/cart`,
      });
    } catch (e) {
      console.error('[cart/checkout] AuthNet session error:', e);
      return NextResponse.json({ error: 'Payment gateway error. Please try again or call (424) 421-4072.' }, { status: 502 });
    }
  }

  const client = createServiceClient();
  await client.from('customers').upsert({ email: customerEmail }, { onConflict: 'email' });
  const { error: orderErr } = await client.from('orders').insert({
    id: orderId,
    customer_email: customerEmail,
    stripe_checkout_session_id: session?.id ?? null,
    deposit_usd: depositUsd,
    total_usd: totalUsd,
    shipping_cost_usd: SHIPPING_FEE_USD,
    status: 'pending',
    currency: 'usd',
    product_sku: priced.map(p => p.sku).join(','),
    product_name: priced.map(p => p.name).join(' · '),
    notes: giftMessage || (payByBank ? 'Awaiting bank transfer (ACH). Set status to deposit_paid once funds clear.' : isManual ? 'No payment collected yet — payment method to be set up later.' : null),
    custom_overrides: {
      delivery_method: deliveryMethod,
      shipping_option: shippingOption,
      gift_message: giftMessage || null,
      item_count: body.item_count ?? priced.reduce((sum, p) => sum + p.qty, 0),
    },
    milestones: [
      {
        name: 'deposit',
        amount_usd: depositUsd,
        status: 'pending',
        ...(payByBank ? { method: BANK_METHOD } : {}),
        created_at: new Date().toISOString(),
      },
      { name: 'balance', amount_usd: balanceUsd, status: 'not_due' },
    ],
    shipping_country: (body.shipping_address?.country ?? null)?.toString() || null,
    shipping_address: {
      ...shippingAddress,
      _bundle: { flow: 'cart', cart_items: priced },
    },
  });

  // A bank order has no gateway record, so a failed insert would lose it
  // entirely — the customer would be given wiring details for an order that
  // does not exist. Fail loudly instead.
  if (orderErr) {
    console.error('[cart/checkout] order insert error:', orderErr);
    if (payByBank) {
      return NextResponse.json({ error: 'Could not start your order. Please call (424) 421-4072.' }, { status: 500 });
    }
  }

 return NextResponse.json({
  url: session?.url ?? (isManual ? `/order/success?order_id=${orderId}` : `/order/bank?order_id=${orderId}`),
  order_id: orderId,
});
}

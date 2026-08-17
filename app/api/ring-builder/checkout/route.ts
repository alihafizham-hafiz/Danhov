/**
 * Ring Builder commission checkout.
 *
 * Supports three purchase modes:
 *   ring    — setting + one or more diamonds (full commission, 50% deposit)
 *   setting — setting only (made-to-order, 50% deposit)
 *   diamond — one or more loose diamonds (50% deposit)
 *
 * Multi-diamond: pass `diamonds` array. Each item is stored in the order
 * bundle so the receipt clearly shows per-stone pricing and quantities.
 * Legacy single-diamond: `diamond_offer_id` + `quantity` still work.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { authNetConfigured, createHostedPaymentSession } from '@/lib/authorizenet';
import { getDiamondMarkups } from '@/lib/diamond-markups';
import { priceProduct } from '@/lib/pricing';
import { fetchProductWithPricingBySlug } from '@/lib/products';
import { refreshDiamond } from '@/lib/nivoda-cache';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const DEPOSIT_PERCENT = 1;
import { stripMetalSuffix } from '@/lib/product-display';
import { SHIPPING_FEE_USD } from '@/lib/shipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DiamondOrderItem = z.object({
  offer_id: z.string().min(8).max(80),
  quantity: z.number().int().min(1).max(10).default(1),
  hold_id: z.string().uuid().optional().nullable(),
});

const Body = z.object({
  mode: z.enum(['ring', 'setting', 'diamond']).default('ring'),
  setting_slug: z.string().min(1).max(120).optional(),
  setting_quantity: z.number().int().min(1).max(10).default(1),
  // Diamond markup category (natural / lab_grown / fancy_*) — picks the DB markup
  diamond_category: z.string().max(40).optional(),
  // Multi-diamond: preferred
  diamonds: z.array(DiamondOrderItem).optional(),
  // Legacy single-diamond
  diamond_offer_id: z.string().min(8).max(80).optional(),
  hold_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(10).default(1),
  email: z.string().email().max(254),
  customer_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(40),
  shipping_address: z.object({
    name: z.string().trim().min(1).max(120),
    line1: z.string().trim().min(1).max(160),
    line2: z.string().trim().max(160).optional(),
    city: z.string().trim().min(1).max(100),
    region: z.string().trim().min(1).max(100),
    postal_code: z.string().trim().min(1).max(30),
    country: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(7).max(40),
  }),
  ring_size: z.string().max(20).optional(),
  ring_sizes: z.array(z.string().max(20)).max(10).optional(),
  metal: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
  preferred_diamond_shape: z.string().max(60).optional(),
  preferred_diamond_carat: z.string().max(60).optional(),
});

function formatMetal(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/_/g, ' ');
}

/** Strip trailing metal suffix from a SKU (e.g. -14y, -PL, -18w). */
function stripSkuSuffix(sku: string): string {
  return sku.replace(/-?(PL|PLAT|14Y|14W|14R|18Y|18W|18R)$/i, '');
}

/** Map a metal string (e.g. "platinum", "14k_yellow") → SKU suffix (e.g. "PL", "14Y"). */
function metalToSuffix(metal: string | null | undefined): string {
  if (!metal) return 'PL';
  const m = metal.toLowerCase();
  if (m.includes('plat')) return 'PL';
  const k = m.match(/(\d+)\s*k/);
  const karat = k ? k[1] : '14';
  if (m.includes('rose') || m.includes('pink')) return `${karat}R`;
  if (m.includes('white')) return `${karat}W`;
  return `${karat}Y`;
}

/** Compute the SKU for a given metal choice (e.g. "SE500UQ-14y" + "platinum" → "SE500UQ-PL"). */
function skuForMetal(rawSku: string, metal: string | null | undefined): string {
  return `${stripSkuSuffix(rawSku)}-${metalToSuffix(metal)}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 'ring-builder-checkout', 20, 10 * 60 * 1000);
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

  const { mode } = body;
  const settingQty = body.setting_quantity ?? 1;

  // Validate mode-specific required fields
  if ((mode === 'ring' || mode === 'setting') && !body.setting_slug) {
    return NextResponse.json({ error: 'setting_slug is required for this purchase type.' }, { status: 400 });
  }

  // Normalize diamonds: new array takes priority over legacy single field
  const normalizedDiamonds =
    body.diamonds && body.diamonds.length > 0
      ? body.diamonds
      : body.diamond_offer_id
      ? [{ offer_id: body.diamond_offer_id, quantity: body.quantity ?? 1, hold_id: body.hold_id ?? null }]
      : [];

  if (mode !== 'setting' && normalizedDiamonds.length === 0) {
    return NextResponse.json({ error: 'At least one diamond is required for this purchase type.' }, { status: 400 });
  }

  // Per-category diamond markup from the DB — same source the picker uses,
  // so the charged price matches what the customer saw.
  const diamondMarkups = await getDiamondMarkups();
  const dMarkup = diamondMarkups[body.diamond_category ?? 'natural'] ?? diamondMarkups.natural ?? 2.3;

  // ── Load setting ──────────────────────────────────────────────────────
  let setting: Awaited<ReturnType<typeof fetchProductWithPricingBySlug>> | null = null;
  let settingPrice = 0;
  let settingBreakdown = null;

  if (mode === 'ring' || mode === 'setting') {
    setting = await fetchProductWithPricingBySlug(body.setting_slug!);
    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }
    try {
      const breakdown = await priceProduct(setting, body.metal ?? setting.default_metal);
      settingPrice = breakdown.total_usd;
      settingBreakdown = breakdown;
    } catch (e) {
      console.error('ring-builder/checkout: pricing failed', e);
      const m = setting.price_display?.match(/[\d,]+/);
      settingPrice = m ? Number(m[0].replace(/,/g, '')) : 0;
    }
  }

  // ── Load all diamonds ─────────────────────────────────────────────────
  type LoadedDiamond = {
    offer_id: string;
    quantity: number;
    hold_id: string | null | undefined;
    shape: string;
    carat: number;
    color: string;
    clarity: string;
    cut: string;
    lab: string;
    certNumber: string | null;
    price: number;
  };

  const loadedDiamonds: LoadedDiamond[] = [];

  if (mode !== 'setting') {
    for (const item of normalizedDiamonds) {
      let stone;
      try {
        const r = await refreshDiamond(item.offer_id);
        stone = r.stone;
      } catch (e) {
        console.error('ring-builder/checkout: nivoda fetch failed', item.offer_id, e);
        return NextResponse.json(
          { error: 'We could not confirm a diamond is still available. Please re-select.' },
          { status: 503 }
        );
      }

      if (!stone) {
        return NextResponse.json(
          { error: `A diamond is no longer available. Please choose another stone.` },
          { status: 410 }
        );
      }

      const cert = stone.diamond.certificate;
      const diamondPrice = Math.round((Number(stone.price) || 0) * dMarkup);
      if (diamondPrice <= 0) {
        return NextResponse.json(
          { error: 'Diamond price unavailable. Please re-select or contact us at care@danhov.com.' },
          { status: 502 }
        );
      }

      loadedDiamonds.push({
        offer_id: item.offer_id,
        quantity: item.quantity,
        hold_id: item.hold_id,
        shape: (cert?.shape ?? 'Round').toString(),
        carat: cert?.carats ?? 1,
        color: cert?.color ?? '—',
        clarity: cert?.clarity ?? '—',
        cut: cert?.cut ?? '—',
        lab: cert?.lab ?? 'GIA',
        certNumber: cert?.certNumber ?? null,
        price: diamondPrice,
      });
    }
  }

  // ── Totals ────────────────────────────────────────────────────────────
  const settingLineTotal = mode !== 'diamond' ? settingPrice * settingQty : 0;
  const diamondLineTotal = loadedDiamonds.reduce((sum, d) => sum + d.price * d.quantity, 0);
  const merchandiseTotal = settingLineTotal + diamondLineTotal;
  const total = merchandiseTotal + SHIPPING_FEE_USD;
  const deposit = Math.round(total * DEPOSIT_PERCENT);
  const balance = total - deposit;
  const customerEmail = body.email.toLowerCase();
  const ringSize = body.ring_size ?? body.ring_sizes?.[0] ?? null;
  const customerNote = body.note?.trim() || null;

  // ── Build order description for AuthNet ──────────────────────────────
  const firstDiamond = loadedDiamonds[0] ?? null;
  const chosenMetal = body.metal ?? setting?.default_metal;
  const metalLabel = formatMetal(chosenMetal);
  const descParts: string[] = [];
  if (setting) descParts.push(`${setting.name}${metalLabel ? ` (${metalLabel})` : ''}`);
  if (loadedDiamonds.length > 0) descParts.push(`${loadedDiamonds.length} diamond(s)`);
  const description = descParts.join(' + ').slice(0, 255);

  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const siteUrl = `${proto}://${host}`;

  const cancelParams = new URLSearchParams();
  if (body.setting_slug) cancelParams.set('setting', body.setting_slug);
  if (loadedDiamonds.length > 1) {
    cancelParams.set('diamonds', loadedDiamonds.map(d => d.offer_id).join('|'));
  } else if (loadedDiamonds.length === 1) {
    cancelParams.set('diamond', loadedDiamonds[0].offer_id);
    if (loadedDiamonds[0].hold_id) cancelParams.set('hold', loadedDiamonds[0].hold_id);
  }

  const orderId = randomUUID();

  let session: { id: string; url: string };
  try {
    session = await createHostedPaymentSession({
      orderId,
      amountUsd: deposit,
      description,
      email: customerEmail,
      successUrl: `${siteUrl}/order/success?order_id=${orderId}`,
      cancelUrl: `${siteUrl}/ring-builder/review?${cancelParams.toString()}`,
    });
  } catch (e) {
    console.error('[ring-builder/checkout] AuthNet session error:', e);
    return NextResponse.json({ error: 'Payment gateway error. Please try again or call (424) 421-4072.' }, { status: 502 });
  }

  // ── Persist pending order ─────────────────────────────────────────────
  const client = createServiceClient();
  await client.from('customers').upsert({
    email: customerEmail,
    name: body.customer_name,
    phone: body.phone,
  }, { onConflict: 'email' });

  const bundleDiamonds = loadedDiamonds.map(d => ({
    offer_id: d.offer_id,
    hold_id: d.hold_id ?? null,
    shape: d.shape, carat: d.carat, color: d.color, clarity: d.clarity,
    cut: d.cut, lab: d.lab, cert_number: d.certNumber, price_usd: d.price, quantity: d.quantity,
  }));

  const metalSku = setting ? skuForMetal(setting.sku, chosenMetal) : null;

  await client.from('orders').insert({
    id: orderId,
    customer_email: customerEmail,
    stripe_checkout_session_id: session.id,
    deposit_usd: deposit,
    total_usd: total,
    shipping_cost_usd: SHIPPING_FEE_USD,
    status: 'pending',
    currency: 'usd',
    nivoda_offer_id: firstDiamond?.offer_id ?? null,
    nivoda_hold_id: firstDiamond?.hold_id ?? null,
    product_sku: metalSku ?? null,
    product_name: setting
      ? (() => {
          const base = stripMetalSuffix(setting.name);
          const ml = formatMetal(chosenMetal);
          return ml ? `${base} in ${ml}` : base;
        })()
      : null,
    custom_overrides: {
      ring_size: ringSize ?? null,
      ring_sizes: body.ring_sizes ?? null,
      note: customerNote,
      preferred_diamond_shape: body.preferred_diamond_shape ?? null,
      preferred_diamond_carat: body.preferred_diamond_carat ?? null,
    },
    milestones: [
      { name: 'deposit', amount_usd: deposit, status: 'pending', created_at: new Date().toISOString() },
      { name: 'balance', amount_usd: balance, status: 'not_due' },
    ],
    shipping_country: body.shipping_address.country,
    shipping_address: {
      ...body.shipping_address,
      _bundle: {
        flow: 'ring_builder', mode, ring_size: ringSize ?? null,
        setting: setting ? { sku: metalSku ?? setting.sku, slug: setting.slug, name: setting.name, metal: chosenMetal, price_usd: settingPrice, quantity: settingQty, breakdown: settingBreakdown } : null,
        diamonds: bundleDiamonds,
        diamond: bundleDiamonds[0] ?? null,
      },
    },
  });

  return NextResponse.json({ url: session.url, order_id: orderId });
}

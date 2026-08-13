import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { priceProduct } from '@/lib/pricing';
import { sendEmail, quoteLockEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  slug: z.string().min(1).max(120),
  email: z.string().email().max(254),
  metal_choice: z.string().max(40).optional(),
});

const LOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const client = createServiceClient();

  // 1) Load product
  const { data: product, error: prodErr } = await client
    .from('products')
    .select(
      'id, sku, slug, name, default_metal, gold_weight_g, markup_multiplier, base_labor_usd, diamond_labor_usd, casting_labor_per_gram, custom_labor_usd, stones_value_usd, stone_groups, commission_rate, is_active'
    )
    .eq('slug', body.slug)
    .eq('is_active', true)
    .maybeSingle();

  if (prodErr || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // 2) Compute live price (override metal if customer chose one)
  let breakdown;
  try {
    breakdown = await priceProduct(product, body.metal_choice || null);
  } catch (err) {
    console.error('lock-quote pricing error:', err);
    return NextResponse.json(
      { error: 'Live pricing unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }

  // 3) Upsert customer (lightweight — just email-keyed)
  await client
    .from('customers')
    .upsert({ email: body.email.toLowerCase() }, { onConflict: 'email' });

  // 4) Insert the quote lock
  const expires_at = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
  const { data: lock, error: lockErr } = await client
    .from('quote_locks')
    .insert({
      product_id: product.id,
      customer_email: body.email.toLowerCase(),
      metal_choice: breakdown.metal_used,
      locked_price_usd: breakdown.total_usd,
      breakdown,
      expires_at,
      consumed: false,
    })
    .select('id, locked_price_usd, expires_at')
    .single();

  if (lockErr || !lock) {
    console.error('lock-quote insert error:', lockErr);
    return NextResponse.json({ error: 'Could not create quote lock' }, { status: 500 });
  }

  // Brand-styled confirmation email (best-effort — never blocks the response)
  void (async () => {
    try {
      const tpl = quoteLockEmail({
        productName: product.name,
        sku: product.sku,
        metal: breakdown.metal_used,
        priceUsd: Number(lock.locked_price_usd),
        quoteId: lock.id,
        expiresAt: lock.expires_at,
      });
      await sendEmail({ to: body.email.toLowerCase(), ...tpl });
    } catch (e) {
      console.error('lock-quote email failed', e);
    }
  })();

  return NextResponse.json({
    quote_id: lock.id,
    locked_price_usd: lock.locked_price_usd,
    expires_at: lock.expires_at,
    metal: breakdown.metal_used,
    sku: product.sku,
    name: product.name,
  });
}

/**
 * Lazy Stripe client — Authorize.Net is the live payment processor; this
 * only remains to retrieve old pre-migration sessions (see
 * lib/checkout-finalize.ts:finalizeCheckoutSession, reached via
 * /order/success?session_id=... links sent before the AuthNet migration).
 * Do not use this to create new checkout sessions.
 */

import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  cached = new Stripe(key, {
    typescript: true,
  });
  return cached;
}

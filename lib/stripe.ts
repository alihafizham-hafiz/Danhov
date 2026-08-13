/**
 * Lazy Stripe client — only instantiates if STRIPE_SECRET_KEY is set,
 * so the rest of the app keeps building when Stripe isn't wired up.
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

export const DEPOSIT_PERCENT = 1; // Full payment charged at checkout

/**
 * Create a Stripe Checkout Session (hosted redirect) for a DANHOV order.
 * Returns the session id (store in orders.stripe_checkout_session_id) and the
 * hosted URL to redirect the customer to.
 *
 * successUrl should include the literal `{CHECKOUT_SESSION_ID}` placeholder —
 * Stripe substitutes the real session id on redirect.
 */
export async function createCheckoutSession(args: {
  orderId: string;
  amountUsd: number;
  description: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: args.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(args.amountUsd * 100),
          product_data: { name: (args.description || 'DANHOV Order').slice(0, 250) },
        },
      },
    ],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    metadata: { order_id: args.orderId },
    payment_intent_data: { metadata: { order_id: args.orderId } },
  });
  if (!session.url) throw new Error('Stripe Checkout session has no URL');
  return { id: session.id, url: session.url };
}

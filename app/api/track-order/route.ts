import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  pending:       'Order Received',
  deposit_paid:  'Order Confirmed',
  in_production: 'In Production',
  shipped:       'Shipped',
  delivered:     'Delivered',
  cancelled:     'Cancelled',
  failed:        'Payment Failed',
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending:       'Your order has been received and is being confirmed.',
  deposit_paid:  'Your order is confirmed. Your piece is being scheduled for production.',
  in_production: 'Our master jewelers in Los Angeles are handcrafting your piece. Estimated 3 weeks from this stage.',
  shipped:       'Your piece has left our Los Angeles atelier via FedEx Priority Overnight, fully insured.',
  delivered:     'Your DANHOV piece has been delivered. We hope it brings you joy for a lifetime.',
  cancelled:     'This order has been cancelled. Please contact care@danhov.com if you have questions.',
  failed:        'There was an issue with this order. Please contact care@danhov.com.',
};

export async function POST(req: NextRequest) {
  let body: { email?: string; order_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const orderId = (body.order_id ?? '').trim();

  if (!email || !orderId) {
    return NextResponse.json({ error: 'Email and order number are required.' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Support both full UUID and the 8-char uppercase reference shown on the
  // success page (first 8 hex chars of the UUID, e.g. "FD6C0C5A").
  const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  const prefix = orderId.replace(/-/g, '').toLowerCase().slice(0, 8);

  // Fetch by email; then filter client-side to match the UUID prefix.
  // We limit to 50 to avoid full-table scans while safely handling duplicate
  // prefix collisions (astronomically rare for UUIDs but handled correctly).
  const { data: rows, error } = await sb
    .from('orders')
    .select('id, status, created_at, updated_at, customer_email, shipping_address, total_usd, product_name')
    .ilike('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('track-order:', error.message);
    return NextResponse.json({ error: 'Unable to look up your order. Please try again.' }, { status: 500 });
  }

  const data = (rows ?? []).find((r: { id: string }) =>
    isFullUuid
      ? r.id.toLowerCase() === orderId.toLowerCase()
      : r.id.replace(/-/g, '').toLowerCase().startsWith(prefix)
  ) ?? null;

  if (!data) {
    return NextResponse.json(
      { error: 'No order found for that email and order number. Please check your confirmation email and try again.' },
      { status: 404 }
    );
  }

  const statusLabel = STATUS_LABELS[data.status] ?? data.status;
  const statusDescription = STATUS_DESCRIPTIONS[data.status] ?? '';

  return NextResponse.json({
    order: {
      id: data.id,
      status: data.status,
      statusLabel,
      statusDescription,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      productName: (data as Record<string, unknown>).product_name ?? null,
      shippingName: (data.shipping_address as Record<string, unknown> | null)?.name ?? null,
      total: data.total_usd,
    },
  });
}

/**
 * POST /api/nivoda/order
 *
 * Place a Nivoda order. Called after a DANHOV
 * ring-builder deposit is paid — NOT by customer-facing UI.
 *
 * Auth: requires either
 *   - `x-internal-secret` header matching INTERNAL_API_SECRET (webhook), or
 *   - an authenticated admin session (manual placement from /admin/orders)
 *
 * Body:
 *   {
 *     offer_id: string,                    # Nivoda offer ID
 *     order_reference?: string,            # our DANHOV order ref (short id)
 *     danhov_order_id?: string,            # uuid of the DANHOV orders row
 *     customer_email?: string,
 *   }
 *
 * Returns the Nivoda order id + status. Marks any active hold for this
 * offer/session as converted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { createOrder, NIVODA_PRO_ENABLED } from '@/lib/nivoda';
import { getAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({
  offer_id: z.string().min(8).max(80),
  order_reference: z.string().max(80).optional(),
  danhov_order_id: z.string().uuid().optional(),
  customer_email: z.string().email().max(254).optional(),
});

async function isAuthorised(req: NextRequest): Promise<boolean> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (secret && req.headers.get('x-internal-secret') === secret) return true;
  const admin = await getAdmin();
  return !!admin;
}

export async function POST(req: NextRequest) {
  if (!NIVODA_PRO_ENABLED) {
    return NextResponse.json(
      { error: 'Nivoda Pro API not enabled' },
      { status: 503 }
    );
  }

  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid request', detail: e instanceof Error ? e.message : '' },
      { status: 400 }
    );
  }

  const r = await createOrder({
    offerId: body.offer_id,
    orderReference: body.order_reference,
  });

  if (!r.ok) {
    return NextResponse.json(
      { error: 'Nivoda order failed.', detail: r.error },
      { status: 502 }
    );
  }

  const sb = createServiceClient();

  // Update DANHOV order row with Nivoda order id (if we know it)
  if (body.danhov_order_id) {
    await sb
      .from('orders')
      .update({
        nivoda_offer_id: body.offer_id,
        nivoda_order_id: r.data.id ?? null,
      })
      .eq('id', body.danhov_order_id);
  }

  // Mark any active hold for this offer as converted
  await sb
    .from('nivoda_holds')
    .update({ status: 'converted', updated_at: new Date().toISOString() })
    .eq('offer_id', body.offer_id)
    .eq('status', 'active');

  return NextResponse.json({
    nivoda_order_id: r.data.id,
    status: r.data.status,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { computeLabor } from '@/lib/labor';
import { fetchLaborCategories } from '@/lib/labor-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set([
  'pending', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'failed',
]);

const ShippingAddressSchema = z.object({
  name: z.string().max(200).optional(),
  line1: z.string().max(300).optional(),
  line2: z.string().max(300).optional(),
  city: z.string().max(150).optional(),
  region: z.string().max(150).optional(),
  postal_code: z.string().max(30).optional(),
  country: z.string().max(80).optional(),
}).partial().optional();

const CustomOverridesSchema = z.object({
  platinum_weight_g: z.number().min(0).max(500).optional().nullable(),
  stone_count: z.number().int().min(0).max(2000).optional().nullable(),
  stone_size_mm: z.number().min(0).max(50).optional().nullable(),
  ring_size: z.string().max(20).optional().nullable(),
  engraving: z.string().max(120).optional().nullable(),
  metal_override: z.string().max(40).optional().nullable(),
}).partial().optional();

const PatchSchema = z.object({
  status: z.string().optional(),
  customer_email: z.string().email().max(254).optional(),
  total_usd: z.number().min(0).max(10_000_000).optional(),
  deposit_usd: z.number().min(0).max(10_000_000).optional(),
  shipping_cost_usd: z.number().min(0).max(1_000_000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  tracking_number: z.string().max(120).optional().nullable(),
  tracking_carrier: z.string().max(80).optional().nullable(),
  shipping_country: z.string().max(80).optional().nullable(),
  shipping_address: ShippingAddressSchema,
  custom_overrides: CustomOverridesSchema,
  recompute_labor: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid payload', detail: e instanceof Error ? e.message : '' }, { status: 400 });
  }

  if (body.status && !ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Build the update payload from only the keys the admin actually sent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  for (const k of [
    'status', 'customer_email', 'total_usd', 'deposit_usd',
    'shipping_cost_usd', 'notes',
    'tracking_number', 'tracking_carrier', 'shipping_country',
    'shipping_address', 'custom_overrides',
  ] as const) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  // Optional: recompute labor breakdown server-side from custom_overrides
  if (body.recompute_labor && body.custom_overrides) {
    const cats = await fetchLaborCategories();
    const labor = computeLabor(cats, {
      stone_count: body.custom_overrides.stone_count ?? 0,
      metal_key: body.custom_overrides.metal_override ?? null,
      engraving: body.custom_overrides.engraving ?? '',
    });
    update.labor_breakdown = labor;
  }

  const { data, error } = await sb
    .from('orders')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, order: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = createServiceClient();
  const { error } = await sb.from('orders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


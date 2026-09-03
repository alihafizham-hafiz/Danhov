import type { Metadata } from 'next';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import AccountSignIn from './AccountSignIn';
import AccountDashboard, { type AccountOrderRow } from './AccountDashboard';

export const metadata: Metadata = {
  title: 'Account · DANHOV',
  description: 'Sign in to track your cart and order history.',
  alternates: { canonical: '/account' },
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <AccountSignIn />;
  }

  // Fetch the customer's order history server-side using the
  // service-role client (RLS on orders excludes anon reads). We filter
  // strictly by the signed-in user's email so a customer can never
  // see another customer's row.
  const email = (user.email ?? '').toLowerCase();
  type OrdersRow = {
    id: string;
    created_at: string;
    status: string;
    total_usd: number | string | null;
    deposit_usd: number | string | null;
    shipping_cost_usd: number | string | null;
    product_name: string | null;
    product_sku: string | null;
    shipping_address: unknown;
  };

  let orders: AccountOrderRow[] = [];
  if (email) {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('orders')
      .select('id, created_at, status, total_usd, deposit_usd, shipping_cost_usd, product_name, product_sku, shipping_address')
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      orders = (data as OrdersRow[]).map((o) => ({
        id: o.id,
        created_at: o.created_at,
        status: o.status,
        total_usd: Number(o.total_usd ?? 0),
        deposit_usd: Number(o.deposit_usd ?? 0),
        shipping_cost_usd: o.shipping_cost_usd != null ? Number(o.shipping_cost_usd) : null,
        product_name: o.product_name ?? null,
        product_sku: o.product_sku ?? null,
        image: extractFirstImage(o.shipping_address),
      }));
    }
  }

  return (
    <AccountDashboard
      email={user.email ?? ''}
      userId={user.id}
      orders={orders}
    />
  );
}

/**
 * Cart-flow + ring-builder orders stash their piece bundles inside
 * shipping_address._bundle. Pull the first hero image out so the
 * order row in the dashboard has a small thumbnail.
 */
function extractFirstImage(addr: unknown): string | null {
  if (!addr || typeof addr !== 'object') return null;
  const b = (addr as { _bundle?: { cart_items?: { image?: string }[]; setting?: { image?: string } } })._bundle;
  if (!b) return null;
  const fromCart = b.cart_items?.[0]?.image ?? null;
  if (fromCart) return fromCart;
  return b.setting?.image ?? null;
}

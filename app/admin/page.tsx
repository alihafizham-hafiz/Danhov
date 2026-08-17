import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Stats = {
  orders_total: number;
  orders_pending: number;
  orders_deposit_paid: number;
  customers_total: number;
  consultations_total: number;
  consultations_upcoming: number;
  locks_active: number;
};

type RecentOrder = {
  id: string;
  customer_email: string | null;
  total_usd: number;
  status: string;
  created_at: string;
};

type UpcomingConsultation = {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  scheduled_at: string;
  status: string;
};

async function loadStats(): Promise<{ stats: Stats; recentOrders: RecentOrder[]; upcomingConsultations: UpcomingConsultation[] }> {
  const sb = createServiceClient();
  const now = new Date().toISOString();

  const [
    ordersAll,
    ordersPending,
    ordersDeposit,
    customers,
    consultationsAll,
    consultationsUpcoming,
    locksActive,
    recentOrders,
    upcomingConsultations,
  ] = await Promise.all([
    sb.from('orders').select('id', { count: 'exact', head: true }),
    sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'deposit_paid'),
    sb.from('customers').select('email', { count: 'exact', head: true }),
    sb.from('consultations').select('id', { count: 'exact', head: true }),
    sb.from('consultations').select('id', { count: 'exact', head: true })
      .gte('scheduled_at', now).eq('status', 'scheduled'),
    sb.from('quote_locks').select('id', { count: 'exact', head: true })
      .eq('consumed', false).gte('expires_at', now),
    sb.from('orders')
      .select('id, customer_email, total_usd, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    sb.from('consultations')
      .select('id, customer_email, customer_name, scheduled_at, status')
      .gte('scheduled_at', now)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5),
  ]);

  return {
    stats: {
      orders_total: ordersAll.count ?? 0,
      orders_pending: ordersPending.count ?? 0,
      orders_deposit_paid: ordersDeposit.count ?? 0,
      customers_total: customers.count ?? 0,
      consultations_total: consultationsAll.count ?? 0,
      consultations_upcoming: consultationsUpcoming.count ?? 0,
      locks_active: locksActive.count ?? 0,
    },
    recentOrders: recentOrders.data ?? [],
    upcomingConsultations: upcomingConsultations.data ?? [],
  };
}

export default async function AdminDashboard() {
  await requireAdmin();
  const { stats, recentOrders, upcomingConsultations } = await loadStats();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="adm-page">
      <header className="adm-page-head adm-page-head--with-actions">
        <div>
          <h1 className="adm-h1">Dashboard</h1>
          <p className="adm-page-sub">{today}</p>
        </div>
      </header>

      <section className="adm-stat-grid">
        <StatCard label="Orders" value={stats.orders_total} sub={`${stats.orders_pending} pending · ${stats.orders_deposit_paid} deposit-paid`} href="/admin/orders" />
        <StatCard label="Customers" value={stats.customers_total} sub="lifetime" href="/admin/customers" />
        <StatCard label="Consultations" value={stats.consultations_upcoming} sub={`upcoming · ${stats.consultations_total} total`} href="/admin/consultations" />
        <StatCard label="Active Quote Locks" value={stats.locks_active} sub="within 24h" />
      </section>

      <section className="adm-two-col">
        <div className="adm-card">
          <header className="adm-card-head">
            <h2 className="adm-h2">Recent orders</h2>
            <Link href="/admin/orders" className="adm-link">View all →</Link>
          </header>
          {recentOrders.length === 0 ? (
            <div className="adm-empty">No orders yet.</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr><th>Reference</th><th>Customer</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td><Link href="/admin/orders" className="adm-link">{o.id.slice(0,8).toUpperCase()}</Link></td>
                    <td>{o.customer_email}</td>
                    <td>${Number(o.total_usd).toLocaleString('en-US')}</td>
                    <td><StatusPill status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="adm-card">
          <header className="adm-card-head">
            <h2 className="adm-h2">Upcoming consultations</h2>
            <Link href="/admin/consultations" className="adm-link">View all →</Link>
          </header>
          {upcomingConsultations.length === 0 ? (
            <div className="adm-empty">Nothing scheduled.</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr><th>When</th><th>Customer</th><th>Status</th></tr>
              </thead>
              <tbody>
                {upcomingConsultations.map((c) => (
                  <tr key={c.id}>
                    <td>{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'numeric' }) : '—'}</td>
                    <td>{c.customer_name || c.customer_email}</td>
                    <td><StatusPill status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, href }: { label: string; value: number; sub: string; href?: string }) {
  const body = (
    <>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-value">{value}</div>
      <div className="adm-stat-sub">{sub}</div>
    </>
  );
  return href ? (
    <Link href={href} className="adm-stat-card adm-stat-card--link">{body}</Link>
  ) : (
    <div className="adm-stat-card">{body}</div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = `adm-pill adm-pill--${status?.replace(/_/g, '-') ?? 'unknown'}`;
  return <span className={cls}>{status?.replace(/_/g, ' ') ?? '—'}</span>;
}

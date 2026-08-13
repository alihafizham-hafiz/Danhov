import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { getBankDetails, BANK_METHOD } from '@/lib/bank';

export const metadata = {
  title: 'Bank transfer instructions — DANHOV',
  // Never let these land in a search index.
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

type Search = { order_id?: string };

const INK = '#2b2422';
const MUTED = '#8a7d78';
const FAINT = '#b3a8a3';
const RED = '#AC3438';
const LINE = 'rgba(43, 36, 34, 0.10)';

type Milestone = { name?: string; method?: string; status?: string };

export default async function BankInstructionsPage({ searchParams }: { searchParams: Search }) {
  const orderId = searchParams.order_id;
  const bank = getBankDetails();

  let order: {
    id: string;
    deposit_usd: number | null;
    product_name: string | null;
    status: string;
    milestones: Milestone[] | null;
  } | null = null;

  if (orderId && bank) {
    const sb = createServiceClient();
    const { data } = await sb
      .from('orders')
      .select('id, deposit_usd, product_name, status, milestones')
      .eq('id', orderId)
      .maybeSingle();
    order = data ?? null;
  }

  // Only ever render account details for a real order that is actually
  // awaiting a bank transfer. Anything else gets the neutral fallback: a
  // paid/unknown order must not echo the account number back.
  const isBankOrder = (order?.milestones ?? []).some(
    (m) => m?.name === 'deposit' && m?.method === BANK_METHOD
  );
  const awaitingPayment = order?.status === 'pending';
  const showDetails = Boolean(bank && order && isBankOrder && awaitingPayment);

  const reference = order?.id.slice(0, 8).toUpperCase() ?? '';

  return (
    <main
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '140px 24px 96px',
        textAlign: 'center',
      }}
    >
      {!showDetails ? (
        <>
          <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 34, color: INK, marginBottom: 12 }}>
            {order && !awaitingPayment ? 'This order is already settled' : 'Order not found'}
          </h1>
          <p style={{ color: MUTED, fontSize: 15, maxWidth: 520, lineHeight: 1.7 }}>
            {order && !awaitingPayment
              ? 'No payment is outstanding on this order. If you think this is a mistake, call us on (424) 421-4072.'
              : 'We could not find that order. If you were sent here after checkout, call us on (424) 421-4072 and we will sort it out.'}
          </p>
          <Link href="/" style={{ marginTop: 28, color: RED, fontSize: 14 }}>
            Return home
          </Link>
        </>
      ) : (
        <>
          <span style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', color: FAINT, marginBottom: 14 }}>
            Order {reference} · Awaiting payment
          </span>
          <h1 style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 38, color: INK, marginBottom: 10 }}>
            Complete your bank transfer
          </h1>
          <p style={{ color: MUTED, fontSize: 15, maxWidth: 560, lineHeight: 1.7, marginBottom: 8 }}>
            {order?.product_name ? <>Your order for <em>{order.product_name}</em> is reserved. </> : null}
            Send the amount below by ACH transfer from your bank, quoting the reference. We begin work once the funds clear.
          </p>

          {order?.deposit_usd != null && (
            <div style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 44, color: RED, margin: '18px 0 6px' }}>
              ${Number(order.deposit_usd).toLocaleString('en-US')}
            </div>
          )}

          <div
            style={{
              marginTop: 26,
              border: `1px solid ${LINE}`,
              borderRadius: 4,
              padding: '28px 32px',
              minWidth: 'min(520px, 100%)',
              textAlign: 'left',
              background: '#fffdfb',
            }}
          >
            <Row label="Bank" value={bank!.bankName} />
            <Row label="Account name" value={bank!.accountName} />
            <Row label="Account type" value={bank!.accountType} />
            <Row label="Routing number (ACH)" value={bank!.routingNumber} mono />
            <Row label="Account number" value={bank!.accountNumber} mono />
            <Row label="Reference" value={reference} mono last />
          </div>

          <p style={{ color: FAINT, fontSize: 13, maxWidth: 560, lineHeight: 1.7, marginTop: 24 }}>
            Include the reference <strong style={{ color: MUTED }}>{reference}</strong> so we can match your payment.
            ACH transfers usually clear in 3–5 business days. You will receive an email confirmation once they do.
          </p>

          <Link href="/" style={{ marginTop: 30, color: RED, fontSize: 14 }}>
            Return home
          </Link>
        </>
      )}
    </main>
  );
}

function Row({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 24,
        padding: '11px 0',
        borderBottom: last ? 'none' : `1px solid ${LINE}`,
      }}
    >
      <span style={{ color: FAINT, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span
        style={{
          color: INK,
          fontSize: mono ? 16 : 15,
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
          letterSpacing: mono ? '0.06em' : undefined,
          textAlign: 'right',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  );
}

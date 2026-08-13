import Link from 'next/link';
import { finalizeAuthNetOrder, finalizeCheckoutSession } from '@/lib/checkout-finalize';
import CartClearOnSuccess from '@/components/CartClearOnSuccess';

export const metadata = { title: 'Order received — DANHOV' };
export const dynamic = 'force-dynamic';

type Search = { order_id?: string; session_id?: string };

const INK = '#2b2422';
const MUTED = '#8a7d78';
const FAINT = '#b3a8a3';
const RED = '#AC3438';
const LINE = 'rgba(43, 36, 34, 0.10)';

export default async function OrderSuccessPage({ searchParams }: { searchParams: Search }) {
  const orderId   = searchParams.order_id;
  const sessionId = searchParams.session_id;

  // Authorize.Net uses order_id. session_id remains for legacy Stripe links.
  const result = sessionId
    ? await finalizeCheckoutSession(sessionId)
    : orderId
    ? await finalizeAuthNetOrder(orderId)
    : { status: 'not_found' as const };

  const reference   = result.order_id?.slice(0, 8).toUpperCase() ?? '';
  const depositUsd  = result.deposit_usd ?? null;
  const productName = result.product_name ?? null;
  const paid    = result.status === 'completed';
  const pending = result.status === 'pending';

  return (
    <main
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '140px 24px 96px',
        textAlign: 'center',
      }}
    >
      {paid && <CartClearOnSuccess />}

      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Status mark */}
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 30px',
            borderRadius: '50%',
            border: `1px solid ${pending ? FAINT : 'rgba(172,52,56,0.35)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {pending ? (
            <span style={{ fontSize: 22, color: FAINT }}>&middot;&middot;&middot;</span>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12.5L10 17.5L19 7" stroke={RED} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: FAINT,
            marginBottom: 18,
          }}
        >
          {pending ? 'Processing Payment' : 'Order Confirmed'}
        </div>

        <h1
          style={{
            fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
            fontWeight: 500,
            fontSize: 34,
            lineHeight: 1.2,
            letterSpacing: '0.01em',
            color: INK,
            margin: 0,
          }}
        >
          Thank you{productName ? ',' : '.'}
        </h1>

        <p
          style={{
            fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
            fontSize: 17,
            lineHeight: 1.7,
            color: MUTED,
            margin: '18px auto 0',
            maxWidth: 400,
          }}
        >
          {pending ? (
            <>Your payment is being confirmed. This will update in a moment.</>
          ) : (
            <>
              Your order for {productName ? <em style={{ color: INK }}>{productName}</em> : 'your piece'} is secured.
              A DANHOV specialist will reach out within one business day.
            </>
          )}
        </p>

        {/* Order details */}
        {reference && (
          <div
            style={{
              margin: '40px 0 0',
              padding: '24px 28px',
              border: `1px solid ${LINE}`,
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <Row label="Order reference" value={reference} accent />
            {depositUsd != null && (
              <Row label="Amount paid" value={`$${depositUsd.toLocaleString('en-US')}`} />
            )}
          </div>
        )}

        {pending && (
          <p style={{ marginTop: 22, fontSize: 13, color: MUTED, fontFamily: "'Montserrat', sans-serif" }}>
            <a
              href={sessionId ? `?session_id=${sessionId}` : `?order_id=${orderId}`}
              style={{ color: RED, textDecoration: 'none', borderBottom: `1px solid ${RED}`, paddingBottom: 1 }}
            >
              Refresh status
            </a>
          </p>
        )}

        {/* Actions */}
        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {reference && (
            <Link
              href={`/track-order?ref=${reference}`}
              style={{
                display: 'inline-block',
                padding: '14px 44px',
                background: RED,
                color: '#fff8f6',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: 2,
              }}
            >
              Track Your Order
            </Link>
          )}
          <Link
            href="/"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: MUTED,
              textDecoration: 'none',
            }}
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
      <span
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: FAINT,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
          fontSize: accent ? 22 : 18,
          fontWeight: 600,
          letterSpacing: accent ? '0.08em' : '0.02em',
          color: accent ? RED : INK,
        }}
      >
        {value}
      </span>
    </div>
  );
}

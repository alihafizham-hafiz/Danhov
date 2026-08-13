'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

type OrderResult = {
  id: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  createdAt: string;
  updatedAt: string;
  productName: string | null;
  shippingName: string | null;
  total: number | null;
};

const STATUS_STEPS = [
  { key: 'pending',       label: 'Received' },
  { key: 'deposit_paid',  label: 'Confirmed' },
  { key: 'in_production', label: 'In Production' },
  { key: 'shipped',       label: 'Shipped' },
  { key: 'delivered',     label: 'Delivered' },
];

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function TrackOrderPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState(searchParams.get('ref') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), order_id: orderId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Unable to connect. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const stepIdx = order ? getStepIndex(order.status) : -1;
  const isCancelled = order?.status === 'cancelled' || order?.status === 'failed';

  return (
    <main className="track-page">
      <style>{`
        .track-page { font-family: 'Cormorant Garamond', serif; color: #1a1410; background: #faf6f1; min-height: 100vh; }

        /* Page header — matches /faq, /story style */
        .track-page-header {
          padding: 108px 24px 56px;
          background: #faf6f1;
          text-align: center;
          border-bottom: 1px solid #ede8e2;
        }
        .track-eyebrow {
          display: block; font-size: 11px; letter-spacing: 0.22em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 14px;
        }
        .track-page-header h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 4.5vw, 48px); font-weight: 400;
          color: #1a1410; margin: 0 auto 12px; line-height: 1.15;
        }
        .track-page-header h1 em { font-style: italic; }
        .track-header-sub {
          font-size: 14px; color: #6b5e57; max-width: 380px; margin: 0 auto; line-height: 1.65;
        }

        /* Form section */
        .track-form-section {
          padding: 56px 24px 72px;
          background: #fff;
        }
        .track-form-inner { max-width: 480px; margin: 0 auto; }

        .track-form { display: flex; flex-direction: column; gap: 18px; }
        .track-form-group { display: flex; flex-direction: column; gap: 7px; }
        .track-form-group label {
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b5e57; font-weight: 400;
        }
        .track-form-group input {
          border: 1px solid #d4c9c0; border-radius: 4px;
          padding: 13px 16px; font-size: 15px; font-family: 'Cormorant Garamond', serif;
          color: #1a1410; outline: none; transition: border-color 0.15s;
          background: #faf6f1;
        }
        .track-form-group input:focus { border-color: #AC3438; background: #fff; }
        .track-form-group input::placeholder { color: #b4a89d; }
        .track-submit {
          background: #AC3438; color: #faf6f1; border: none; border-radius: 4px;
          padding: 15px; font-size: 12px; font-family: 'Cormorant Garamond', serif;
          letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer;
          transition: background 0.2s; margin-top: 4px; width: 100%;
        }
        .track-submit:hover:not(:disabled) { background: #8B2A2D; }
        .track-submit:disabled { background: #ccc4ba; cursor: default; }
        .track-error {
          background: rgba(172,52,56,0.06); border: 1px solid rgba(172,52,56,0.2);
          border-radius: 4px; padding: 12px 16px; font-size: 13.5px; color: #AC3438;
          line-height: 1.55;
        }
        .track-hint {
          font-size: 12.5px; color: #9c8f86; text-align: center; margin-top: 20px; line-height: 1.6;
        }
        .track-hint a { color: #AC3438; text-decoration: none; }

        /* Divider */
        .track-divider {
          max-width: 480px; margin: 0 auto 28px; display: flex; align-items: center; gap: 16px;
        }
        .track-divider-line { flex: 1; height: 1px; background: #ede8e2; }
        .track-divider-text { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #b4a89d; }

        /* Result */
        .track-result-section { padding: 56px 24px 72px; background: #faf6f1; }
        .track-result { max-width: 600px; margin: 0 auto; }
        .track-result-card {
          background: #fff; border-radius: 8px;
          border: 1px solid #ede8e2;
          box-shadow: 0 4px 20px rgba(26,20,16,0.07);
          overflow: hidden;
        }
        .track-result-header {
          background: linear-gradient(135deg, #1a1410 0%, #2c1f18 100%);
          padding: 28px 32px;
        }
        .track-result-order-id { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(250,246,241,0.45); margin-bottom: 6px; }
        .track-result-product {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px; color: #faf6f1; margin-bottom: 4px; font-weight: 400;
        }
        .track-result-date { font-size: 12px; color: rgba(250,246,241,0.5); }

        /* Progress bar */
        .track-progress { padding: 32px 32px 0; }
        .track-progress-label {
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #9c8f86; margin-bottom: 24px; display: block;
        }
        .track-steps { display: flex; align-items: flex-start; gap: 0; margin-bottom: 12px; }
        .track-step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
        .track-step:not(:last-child)::after {
          content: '';
          position: absolute; top: 14px; left: 50%; right: -50%;
          height: 2px; background: #ede8e2; z-index: 0;
        }
        .track-step.done:not(:last-child)::after { background: #AC3438; }
        .track-step-dot {
          width: 28px; height: 28px; border-radius: 50%;
          border: 2px solid #ede8e2; background: #faf6f1;
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 1; transition: all 0.2s;
          font-size: 11px; color: #ccc4ba;
        }
        .track-step.done .track-step-dot {
          border-color: #AC3438; background: #AC3438; color: #fff; font-size: 12px;
        }
        .track-step.current .track-step-dot {
          border-color: #AC3438; background: #fff; color: #AC3438; font-weight: 700;
        }
        .track-step-label {
          font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
          color: #ccc4ba; margin-top: 8px; text-align: center; line-height: 1.3;
        }
        .track-step.done .track-step-label,
        .track-step.current .track-step-label { color: #1a1410; }

        /* Status detail */
        .track-status-body { padding: 24px 32px 32px; }
        .track-status-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 21px; color: #1a1410; margin-bottom: 8px; font-weight: 400;
        }
        .track-status-desc { font-size: 14px; color: #6b5e57; line-height: 1.65; margin-bottom: 20px; }
        .track-status-meta { font-size: 12.5px; color: #9c8f86; border-top: 1px solid #ede8e2; padding-top: 16px; display: flex; flex-direction: column; gap: 4px; }

        /* Cancelled state */
        .track-cancelled .track-result-header { background: linear-gradient(135deg, #3d1515 0%, #2c1010 100%); }
        .track-status-label.cancelled { color: #AC3438; }

        @media (max-width: 480px) {
          .track-page-header { padding: 96px 20px 44px; }
          .track-form-section { padding: 44px 20px 56px; }
          .track-status-body, .track-progress { padding-left: 20px; padding-right: 20px; }
          .track-result-header { padding: 22px 20px; }
          .track-step-label { font-size: 9px; }
        }
      `}</style>

      {/* Page header */}
      <header className="track-page-header">
        <span className="track-eyebrow">Order Tracking</span>
        <h1>Track Your <em>Order</em></h1>
        <p className="track-header-sub">
          Follow your piece from the atelier to your door. Enter the email and order number from your confirmation.
        </p>
      </header>

      {/* Form */}
      {!order && (
        <section className="track-form-section">
          <div className="track-form-inner">
            <form className="track-form" onSubmit={handleSubmit}>
              <div className="track-form-group">
                <label htmlFor="track-email">Email Address</label>
                <input
                  id="track-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="The email you used at checkout"
                />
              </div>
              <div className="track-form-group">
                <label htmlFor="track-id">Order Number</label>
                <input
                  id="track-id"
                  type="text"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Found in your confirmation email"
                />
              </div>
              {error && <p className="track-error">{error}</p>}
              <button type="submit" className="track-submit" disabled={loading}>
                {loading ? 'Looking up…' : 'Track Order'}
              </button>
            </form>
            <p className="track-hint">
              Your order number is in the confirmation email sent from{' '}
              <a href="mailto:care@danhov.com">care@danhov.com</a>.
              Can&apos;t find it?{' '}
              <a href="mailto:care@danhov.com">Contact us</a>.
            </p>
          </div>
        </section>
      )}

      {/* Result */}
      {order && (
        <section className="track-result-section">
          <div className="track-result">
            <div className={`track-result-card${isCancelled ? ' track-cancelled' : ''}`}>
              {/* Header */}
              <div className="track-result-header">
                <p className="track-result-order-id">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="track-result-product">{order.productName ?? 'DANHOV Order'}</p>
                <p className="track-result-date">Placed {formatDate(order.createdAt)}</p>
              </div>

              {/* Progress steps */}
              {!isCancelled && (
                <div className="track-progress">
                  <span className="track-progress-label">Order Progress</span>
                  <div className="track-steps">
                    {STATUS_STEPS.map((step, i) => {
                      const isDone = i < stepIdx;
                      const isCurrent = i === stepIdx;
                      return (
                        <div
                          key={step.key}
                          className={`track-step${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}`}
                        >
                          <div className="track-step-dot">
                            {isDone ? '✓' : i + 1}
                          </div>
                          <span className="track-step-label">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status detail */}
              <div className="track-status-body">
                <p className={`track-status-label${isCancelled ? ' cancelled' : ''}`}>{order.statusLabel}</p>
                <p className="track-status-desc">{order.statusDescription}</p>
                <div className="track-status-meta">
                  {order.shippingName && <span>Shipping to: {order.shippingName}</span>}
                  {order.total && <span>Order total: ${order.total.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>}
                  <span>Last updated: {formatDate(order.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                onClick={() => { setOrder(null); setEmail(''); setOrderId(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#AC3438', fontSize: 12, letterSpacing: '0.14em',
                  textTransform: 'uppercase', textDecoration: 'underline',
                  fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
                }}
              >
                Track another order
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#9c8f86', marginTop: 20, lineHeight: 1.65 }}>
              Questions? Reach us at{' '}
              <a href="mailto:care@danhov.com" style={{ color: '#AC3438', textDecoration: 'none' }}>care@danhov.com</a>{' '}
              or <a href="tel:+14244214072" style={{ color: '#AC3438', textDecoration: 'none' }}>(424) 421-4072</a>.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

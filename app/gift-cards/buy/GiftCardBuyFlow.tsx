'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';

type Step = 1 | 2 | 3 | 4 | 5;

const DENOMINATIONS = [100, 250, 500, 750, 1000, 2000];

interface FormData {
  forSelf: boolean;
  recipientName: string;
  senderName: string;
  recipientEmail: string;
  senderEmail: string;
  amount: number | null;
  customAmount: string;
  quantity: number;
  message: string;
  deliverAt: string;
}

const STEP_LABELS = ['Who is it for?', 'How much?', 'Your message', 'Delivery', 'Review'];

export default function GiftCardBuyFlow() {
  const { addItem } = useCart();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    forSelf: false,
    recipientName: '',
    senderName: '',
    recipientEmail: '',
    senderEmail: '',
    amount: 500,
    customAmount: '',
    quantity: 1,
    message: '',
    deliverAt: '',
  });

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function resolvedAmount(): number {
    if (form.customAmount) {
      const n = parseInt(form.customAmount, 10);
      if (!isNaN(n) && n >= 25) return n;
    }
    return form.amount ?? 500;
  }

  function totalAmount(): number {
    return resolvedAmount() * form.quantity;
  }

  function canProceed(): boolean {
    if (step === 1) {
      if (!form.senderName.trim() || !form.senderEmail.trim()) return false;
      if (!form.forSelf && (!form.recipientName.trim() || !form.recipientEmail.trim())) return false;
      return true;
    }
    if (step === 2) {
      return resolvedAmount() >= 25 && form.quantity >= 1;
    }
    if (step === 4) {
      const recipientEmail = form.forSelf ? form.senderEmail : form.recipientEmail;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);
    }
    return true;
  }

  function addToCart() {
    const recipientName = form.forSelf ? form.senderName : form.recipientName;
    const recipientEmail = form.forSelf ? form.senderEmail : form.recipientEmail;
    const amount = resolvedAmount();
    addItem({
      id: `gc_${Date.now()}_${amount}`,
      sku: 'GIFT-CARD',
      slug: 'gift-cards',
      name: `DANHOV Gift Card · $${amount.toLocaleString()}`,
      collection: 'Gift Cards',
      metal: null,
      image: null,
      price_display: `$${amount.toLocaleString()}`,
      price_num: amount,
      qty: form.quantity,
      giftCard: {
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim(),
        senderName: form.senderName.trim(),
        senderEmail: form.senderEmail.trim(),
        message: form.message.trim(),
        deliverAt: form.deliverAt,
        amount,
        quantity: form.quantity,
      },
    });
    setAddedToCart(true);
  }

  async function startPurchase() {
    setBusy(true);
    setError('');
    try {
      const recipientName = form.forSelf ? form.senderName : form.recipientName;
      const recipientEmail = form.forSelf ? form.senderEmail : form.recipientEmail;
      const res = await fetch('/api/gift-cards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: resolvedAmount(),
          quantity: form.quantity,
          for_self: form.forSelf,
          sender_name: form.senderName.trim(),
          sender_email: form.senderEmail.trim(),
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim(),
          message: form.message.trim(),
          deliver_at: form.deliverAt || undefined,
        }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Could not start checkout.');
      }
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  const recipientName = form.forSelf ? form.senderName : form.recipientName;
  const recipientEmail = form.forSelf ? form.senderEmail : form.recipientEmail;

  return (
    <div style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", minHeight: '100vh', background: '#faf6f1' }}>
      <style>{`
        .gcb-wrap { max-width: 700px; margin: 0 auto; padding: 88px 24px 80px; }
        .gcb-breadcrumb {
          font-size: 12px; color: #9c8f86; margin-bottom: 32px; display: flex; align-items: center; gap: 8px;
        }
        .gcb-breadcrumb a { color: #AC3438; text-decoration: none; }
        .gcb-breadcrumb a:hover { text-decoration: underline; }
        .gcb-progress {
          display: flex; gap: 0; margin-bottom: 40px;
        }
        .gcb-prog-step {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative;
        }
        .gcb-prog-step:not(:last-child)::after {
          content: ''; position: absolute; top: 12px; left: 50%; width: 100%;
          height: 1px; background: #d4c9c0; z-index: 0;
        }
        .gcb-prog-dot {
          width: 24px; height: 24px; border-radius: 50%; border: 2px solid #d4c9c0;
          background: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #9c8f86; position: relative; z-index: 1;
          transition: all 0.2s;
        }
        .gcb-prog-step.done .gcb-prog-dot { background: #1a1410; border-color: #1a1410; color: #fff; }
        .gcb-prog-step.active .gcb-prog-dot { background: #AC3438; border-color: #AC3438; color: #fff; }
        .gcb-prog-label { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #9c8f86; text-align: center; }
        .gcb-prog-step.active .gcb-prog-label { color: #AC3438; }
        .gcb-prog-step.done .gcb-prog-label { color: #1a1410; }

        .gcb-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 400; color: #1a1410; margin: 0 0 6px; }
        .gcb-subtitle { font-size: 14px; color: #8a7f76; margin: 0 0 32px; }

        .gcb-tabs { display: flex; border-bottom: 1px solid #ede8e2; margin-bottom: 28px; }
        .gcb-tab {
          flex: 1; padding: 12px; text-align: center; cursor: pointer;
          font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
          color: #8a7f76; border-bottom: 2px solid transparent; transition: all 0.15s;
          background: none; border-top: none; border-left: none; border-right: none;
        }
        .gcb-tab.active { color: #AC3438; border-bottom-color: #AC3438; }

        .gcb-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
        .gcb-label {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a7f76;
        }
        .gcb-input, .gcb-textarea, .gcb-select {
          border: 1px solid #d4c9c0; border-radius: 6px;
          padding: 12px 14px; font-size: 14px; font-family: 'Cormorant Garamond', serif;
          background: #fff; color: #1a1410; outline: none;
          transition: border-color 0.15s; width: 100%; box-sizing: border-box;
        }
        .gcb-input:focus, .gcb-textarea:focus, .gcb-select:focus { border-color: #AC3438; }
        .gcb-textarea { resize: vertical; min-height: 100px; }
        .gcb-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .gcb-denom-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;
        }
        .gcb-denom-btn {
          border: 1.5px solid #d4c9c0; border-radius: 8px; background: #fff;
          padding: 16px 8px; cursor: pointer; font-family: 'Cormorant Garamond', serif;
          font-size: 22px; color: #1a1410; text-align: center; transition: all 0.15s;
        }
        .gcb-denom-btn:hover { border-color: #AC3438; color: #AC3438; }
        .gcb-denom-btn.selected { border-color: #AC3438; color: #AC3438; background: rgba(172,52,56,0.04); }

        .gcb-qty { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .gcb-qty-label { font-size: 13px; color: #6b5e57; }
        .gcb-qty-ctrl { display: flex; align-items: center; border: 1px solid #d4c9c0; border-radius: 6px; overflow: hidden; }
        .gcb-qty-btn {
          width: 36px; height: 36px; border: none; background: #faf6f1; cursor: pointer;
          font-size: 18px; color: #1a1410; display: flex; align-items: center; justify-content: center;
          transition: background 0.1s;
        }
        .gcb-qty-btn:hover { background: #ede8e2; }
        .gcb-qty-num {
          min-width: 36px; text-align: center; font-size: 15px; font-weight: 600; color: #1a1410;
        }

        .gcb-char-count { font-size: 11px; color: #9c8f86; text-align: right; margin-top: -12px; margin-bottom: 18px; }

        .gcb-review-card {
          border: 1px solid #ede8e2; border-radius: 10px; overflow: hidden; margin-bottom: 24px;
        }
        .gcb-review-head {
          background: #1a1410; padding: 20px 24px; display: flex; align-items: center; gap: 16px;
        }
        .gcb-review-head-logo { font-family: 'Cormorant Garamond', serif; font-size: 18px; letter-spacing: 0.2em; color: #faf6f1; }
        .gcb-review-amount { font-family: 'Cormorant Garamond', serif; font-size: 28px; color: #faf6f1; margin-left: auto; }
        .gcb-review-body { padding: 20px 24px; }
        .gcb-review-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f0ece8; }
        .gcb-review-row:last-child { border-bottom: none; }
        .gcb-review-key { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: #9c8f86; }
        .gcb-review-val { font-size: 14px; color: #1a1410; text-align: right; max-width: 60%; }
        .gcb-review-msg { font-style: italic; color: #6b5e57; font-size: 13px; margin-top: 14px; border-left: 2px solid #AC3438; padding-left: 12px; }

        .gcb-order-summary {
          background: #fff; border: 1px solid #ede8e2; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;
        }
        .gcb-order-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: #1a1410; margin: 0 0 14px; }
        .gcb-order-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0ece8; font-size: 14px; }
        .gcb-order-line:last-child { border-bottom: none; font-weight: 700; font-size: 15px; }

        .gcb-actions { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 32px; }
        .gcb-back-btn {
          background: none; border: none; cursor: pointer; font-size: 13px;
          color: #8a7f76; font-family: 'Cormorant Garamond', serif; padding: 0;
          display: flex; align-items: center; gap: 6px; transition: color 0.15s;
        }
        .gcb-back-btn:hover { color: #1a1410; }
        .gcb-next-btn {
          background: #1a1410; color: #fff; border: none; border-radius: 2px;
          padding: 14px 40px; font-size: 12px; font-family: 'Cormorant Garamond', serif;
          letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
          transition: background 0.2s; min-width: 180px;
        }
        .gcb-next-btn:hover:not(:disabled) { background: #AC3438; }
        .gcb-next-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gcb-checkout-btn {
          background: #AC3438; color: #fff; border: none; border-radius: 2px;
          padding: 16px 48px; font-size: 13px; font-family: 'Cormorant Garamond', serif;
          letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
          transition: background 0.2s; min-width: 220px;
        }
        .gcb-checkout-btn:hover:not(:disabled) { background: #8f2b2e; }
        .gcb-checkout-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gcb-error { font-size: 13px; color: #AC3438; padding: 10px 14px; background: rgba(172,52,56,0.06); border-left: 3px solid #AC3438; border-radius: 4px; margin-top: 12px; }
        .gcb-addcart-btn {
          background: #fff; color: #1a1410; border: 1.5px solid #1a1410; border-radius: 2px;
          padding: 16px 32px; font-size: 12px; font-family: 'Cormorant Garamond', serif;
          letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
          transition: all 0.2s; min-width: 180px;
        }
        .gcb-addcart-btn:hover:not(:disabled) { background: #1a1410; color: #fff; }
        .gcb-addcart-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gcb-cart-success {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; background: rgba(42,122,42,0.08);
          border-left: 3px solid #2a7a2a; border-radius: 4px; margin-top: 12px;
          font-size: 13px; color: #2a7a2a;
        }

        @media (max-width: 540px) {
          .gcb-row { grid-template-columns: 1fr; }
          .gcb-denom-grid { grid-template-columns: repeat(2, 1fr); }
          .gcb-prog-label { display: none; }
          .gcb-actions { flex-direction: column-reverse; }
          .gcb-next-btn, .gcb-checkout-btn { width: 100%; }
        }
      `}</style>

      <div className="gcb-wrap">
        {/* Breadcrumb */}
        <div className="gcb-breadcrumb">
          <Link href="/">Home</Link> ›
          <Link href="/gift-cards">Gift Cards</Link> ›
          <span>Buy</span>
        </div>

        {/* Progress bar */}
        <div className="gcb-progress">
          {STEP_LABELS.map((label, i) => {
            const s = (i + 1) as Step;
            const cls = step > s ? 'done' : step === s ? 'active' : '';
            return (
              <div key={label} className={`gcb-prog-step ${cls}`}>
                <div className="gcb-prog-dot">
                  {step > s ? '✓' : s}
                </div>
                <span className="gcb-prog-label">{label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Who is it for ── */}
        {step === 1 && (
          <div>
            <h1 className="gcb-title">Who is the gift card for?</h1>
            <p className="gcb-subtitle">All fields are required unless marked optional.</p>

            <div className="gcb-tabs">
              <button
                className={`gcb-tab${!form.forSelf ? ' active' : ''}`}
                onClick={() => set('forSelf', false)}
              >
                A Friend
              </button>
              <button
                className={`gcb-tab${form.forSelf ? ' active' : ''}`}
                onClick={() => set('forSelf', true)}
              >
                For Me
              </button>
            </div>

            {!form.forSelf && (
              <div className="gcb-row">
                <div className="gcb-field">
                  <label className="gcb-label">Their Name</label>
                  <input
                    className="gcb-input"
                    value={form.recipientName}
                    onChange={(e) => set('recipientName', e.target.value)}
                    placeholder="Recipient's name"
                    autoComplete="off"
                  />
                </div>
                <div className="gcb-field">
                  <label className="gcb-label">Their Email</label>
                  <input
                    className="gcb-input"
                    type="email"
                    value={form.recipientEmail}
                    onChange={(e) => set('recipientEmail', e.target.value)}
                    placeholder="recipient@email.com"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            <div className="gcb-row">
              <div className="gcb-field">
                <label className="gcb-label">Your Name</label>
                <input
                  className="gcb-input"
                  value={form.senderName}
                  onChange={(e) => set('senderName', e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="gcb-field">
                <label className="gcb-label">Your Email</label>
                <input
                  className="gcb-input"
                  type="email"
                  value={form.senderEmail}
                  onChange={(e) => set('senderEmail', e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="gcb-actions">
              <span />
              <button
                className="gcb-next-btn"
                disabled={!canProceed()}
                onClick={() => setStep(2)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: How much ── */}
        {step === 2 && (
          <div>
            <h1 className="gcb-title">How much is it for?</h1>
            <p className="gcb-subtitle">Select a preset amount or enter a custom value.</p>

            <div className="gcb-denom-grid">
              {DENOMINATIONS.map((d) => (
                <button
                  key={d}
                  className={`gcb-denom-btn${form.amount === d && !form.customAmount ? ' selected' : ''}`}
                  onClick={() => { set('amount', d); set('customAmount', ''); }}
                >
                  ${d.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="gcb-field">
              <label className="gcb-label">Custom Amount (min $25)</label>
              <input
                className="gcb-input"
                type="number"
                min="25"
                step="25"
                placeholder="e.g. 750"
                value={form.customAmount}
                onChange={(e) => { set('customAmount', e.target.value); set('amount', null); }}
              />
            </div>

            <div className="gcb-qty">
              <span className="gcb-qty-label">Quantity</span>
              <div className="gcb-qty-ctrl">
                <button
                  className="gcb-qty-btn"
                  onClick={() => set('quantity', Math.max(1, form.quantity - 1))}
                  disabled={form.quantity <= 1}
                >
                  −
                </button>
                <span className="gcb-qty-num">{form.quantity}</span>
                <button
                  className="gcb-qty-btn"
                  onClick={() => set('quantity', Math.min(10, form.quantity + 1))}
                  disabled={form.quantity >= 10}
                >
                  +
                </button>
              </div>
              {form.quantity > 1 && (
                <span style={{ fontSize: 13, color: '#8a7f76' }}>
                  Total: ${(resolvedAmount() * form.quantity).toLocaleString()}
                </span>
              )}
            </div>

            <div className="gcb-actions">
              <button className="gcb-back-btn" onClick={() => setStep(1)}>← Back</button>
              <button
                className="gcb-next-btn"
                disabled={!canProceed()}
                onClick={() => setStep(3)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Message ── */}
        {step === 3 && (
          <div>
            <h1 className="gcb-title">Add a personalized message</h1>
            <p className="gcb-subtitle">Optional — included in the gift card email.</p>

            <div className="gcb-field">
              <label className="gcb-label">Your Message (optional, max 250 characters)</label>
              <textarea
                className="gcb-textarea"
                maxLength={250}
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder="Wishing you a lifetime of joy..."
              />
            </div>
            <p className="gcb-char-count">{form.message.length}/250</p>

            <div className="gcb-actions">
              <button className="gcb-back-btn" onClick={() => setStep(2)}>← Back</button>
              <button className="gcb-next-btn" onClick={() => setStep(4)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Delivery details ── */}
        {step === 4 && (
          <div>
            <h1 className="gcb-title">Where & when is it going?</h1>
            <p className="gcb-subtitle">Choose an instant or scheduled delivery date.</p>

            {!form.forSelf && (
              <div className="gcb-field">
                <label className="gcb-label">Recipient Email</label>
                <input
                  className="gcb-input"
                  type="email"
                  value={form.recipientEmail}
                  onChange={(e) => set('recipientEmail', e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}

            <div className="gcb-field">
              <label className="gcb-label">Delivery Date (optional — leave blank to send immediately)</label>
              <input
                className="gcb-input"
                type="date"
                value={form.deliverAt}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => set('deliverAt', e.target.value)}
              />
            </div>

            <div className="gcb-actions">
              <button className="gcb-back-btn" onClick={() => setStep(3)}>← Back</button>
              <button
                className="gcb-next-btn"
                disabled={!canProceed()}
                onClick={() => setStep(5)}
              >
                Review Order →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Review ── */}
        {step === 5 && (
          <div>
            <h1 className="gcb-title">Review your cart</h1>
            <p className="gcb-subtitle">Check all details before checkout.</p>

            <div className="gcb-review-card">
              <div className="gcb-review-head">
                <div>
                  <div className="gcb-review-head-logo">DANHOV</div>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,246,241,0.4)', marginTop: 4 }}>
                    Gift Card · Never Expires
                  </div>
                </div>
                <div className="gcb-review-amount">
                  ${resolvedAmount().toLocaleString()}
                </div>
              </div>
              <div className="gcb-review-body">
                <div className="gcb-review-row">
                  <span className="gcb-review-key">From</span>
                  <span className="gcb-review-val">{form.senderName}</span>
                </div>
                <div className="gcb-review-row">
                  <span className="gcb-review-key">To</span>
                  <span className="gcb-review-val">{recipientName || form.senderName}</span>
                </div>
                <div className="gcb-review-row">
                  <span className="gcb-review-key">Delivery Email</span>
                  <span className="gcb-review-val">{recipientEmail || form.senderEmail}</span>
                </div>
                <div className="gcb-review-row">
                  <span className="gcb-review-key">Send Date</span>
                  <span className="gcb-review-val">
                    {form.deliverAt
                      ? new Date(form.deliverAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Immediately after payment'}
                  </span>
                </div>
                {form.message && (
                  <div className="gcb-review-msg">"{form.message}"</div>
                )}
              </div>
            </div>

            <div className="gcb-order-summary">
              <p className="gcb-order-title">Order Summary</p>
              <div className="gcb-order-line">
                <span>Gift Card × {form.quantity}</span>
                <span>${resolvedAmount().toLocaleString()} each</span>
              </div>
              <div className="gcb-order-line">
                <span>Order Total</span>
                <span>${totalAmount().toLocaleString()}</span>
              </div>
            </div>

            {error && <div className="gcb-error">{error}</div>}
            {addedToCart && (
              <div className="gcb-cart-success">
                ✓ Added to your cart — checkout when you&apos;re ready.
              </div>
            )}

            <div className="gcb-actions" style={{ flexWrap: 'wrap', gap: 12 }}>
              <button className="gcb-back-btn" onClick={() => setStep(4)}>← Edit</button>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="gcb-addcart-btn"
                  disabled={busy || addedToCart}
                  onClick={addToCart}
                >
                  {addedToCart ? '✓ In Cart' : 'Add to Cart'}
                </button>
                <button
                  className="gcb-checkout-btn"
                  disabled={busy}
                  onClick={startPurchase}
                >
                  {busy ? 'Redirecting…' : `Checkout — $${totalAmount().toLocaleString()}`}
                </button>
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#9c8f86', textAlign: 'center', marginTop: 16 }}>
              Secure checkout powered by Authorize.Net. Gift cards are non-refundable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

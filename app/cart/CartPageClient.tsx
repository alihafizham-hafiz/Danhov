'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart, formatUsd } from '@/components/CartProvider';
import { createClient } from '@/lib/supabase/client';
import { stripMetalSuffix } from '@/lib/product-display';
import { SHIPPING_FEE_USD } from '@/lib/shipping';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Method = 'card' | 'bank';

export default function CartPageClient({ bankEnabled }: { bankEnabled?: boolean }) {
  const router = useRouter();
  void router;
  const { items, count, subtotal, removeItem, setQty, clear } = useCart();
  const [email, setEmail] = useState<string>('');
  const [checkoutPending, setCheckoutPending] = useState<Method | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user?.email) setEmail((e) => e || data.user!.email!);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.email) setEmail((e) => e || session.user!.email!);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const emailValid = EMAIL_RE.test(email.trim());
  const orderTotal = subtotal > 0 ? subtotal + SHIPPING_FEE_USD : 0;

  async function startCheckout(method: Method = 'card') {
    if (!emailValid) {
      setCheckoutError('Please enter your email so we can send your order confirmation.');
      return;
    }
    if (items.length === 0) return;
    setCheckoutPending(method);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          method,
          items: items.map((it) => ({
            sku: it.sku,
            slug: it.slug,
            qty: it.qty,
            metal: it.metal ?? null,
            ring_size: it.ring_size ?? null,
            bundle: it.bundle ?? null,
          })),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !payload.url) {
        setCheckoutError(
          payload.error || 'We couldn’t open the secure checkout. Please try again.'
        );
        setCheckoutPending(null);
        return;
      }
      window.location.href = payload.url;
    } catch {
      setCheckoutError('We couldn’t reach the checkout server. Please try again.');
      setCheckoutPending(null);
    }
  }

  if (items.length === 0) {
    return (
      <main className="cart-page">
        <div className="cart-empty-card">
          <div className="cart-page-eyebrow">— Your Cart</div>
          <h1 className="cart-page-title">Your cart is empty.</h1>
          <p className="cart-page-body">
            Each DANHOV piece is handcrafted to order in Los Angeles. Begin
            with our engagement collection, or build a custom ring from
            scratch.
          </p>
          <div className="cart-empty-actions">
            <Link href="/engagement-rings" className="btn-primary">
              Browse Engagement
            </Link>
            <Link href="/ring-builder" className="btn-solid">
              Build a Ring
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const mailBody = encodeURIComponent(
    [
      "I'd like to inquire about the following pieces in my cart:",
      '',
      ...items.map(
        (it) =>
          `• ${stripMetalSuffix(it.name)} (Style ${it.sku})${it.metal ? ` — ${it.metal}` : ''}` +
          (it.qty > 1 ? ` × ${it.qty}` : '') +
          (it.price_display ? ` — ${it.price_display}` : '')
      ),
      '',
      subtotal > 0 ? `Estimated subtotal: ${formatUsd(subtotal)}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  );
  const mailto = `mailto:care@danhov.com?subject=${encodeURIComponent('Cart Inquiry — DANHOV')}&body=${mailBody}`;

  return (
    <main className="cart-page">
      <header className="cart-page-head">
        <div className="cart-page-eyebrow">— Your Cart</div>
        <h1 className="cart-page-title">
          {count} {count === 1 ? 'piece' : 'pieces'} reserved
        </h1>
        <p className="cart-page-sub">
          Each piece is handcrafted to order in Los Angeles. Your specialist
          confirms availability and locks final pricing within 24 hours.
        </p>
      </header>

      <div className="cart-grid">
        <section className="cart-items" aria-label="Cart items">
          {items.map((it) => {
            const isLooseDiamond = it.slug === 'loose-diamond';
            // Multi-diamond bundles use diamonds[], single-diamond uses diamond
            const bundleDiamonds = it.bundle
              ? (it.bundle.diamonds && it.bundle.diamonds.length > 0
                  ? it.bundle.diamonds
                  : [it.bundle.diamond])
              : null;
            const firstBundleDiamond = bundleDiamonds?.[0] ?? null;

            // Shared media content
            const settingImg = it.image ? (
              <Image
                src={it.image}
                alt={it.name}
                width={160}
                height={160}
                sizes="160px"
              />
            ) : (
              <div className="cart-row-media-fallback">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 9l6-6 6 6-6 12L6 9z" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
            );

            return (
              <article key={it.id} className="cart-row">
                {/* Media */}
                <div className="cart-row-media-wrap">
                  {isLooseDiamond ? (
                    <div className="cart-row-media">
                      {it.image ? (
                        <Image
                          src={it.image}
                          alt={it.name}
                          width={160}
                          height={160}
                          sizes="160px"
                        />
                      ) : (
                        <div className="cart-row-media-fallback cart-row-media-diamond">
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M6 9l6-6 6 6-6 12L6 9z" stroke="currentColor" strokeWidth="1.2" />
                            <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                          <span className="cart-row-media-diamond-label">Diamond</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link href={`/product/${it.slug}`} className="cart-row-media">
                      {settingImg}
                    </Link>
                  )}

                  {/* Diamond thumbnail overlay — show first diamond image */}
                  {firstBundleDiamond?.image && (
                    <div className="cart-row-diamond-thumb" aria-label="Diamond included">
                      <Image
                        src={firstBundleDiamond.image}
                        alt={`${firstBundleDiamond.carat.toFixed(2)}ct ${firstBundleDiamond.shape} diamond`}
                        width={52}
                        height={52}
                        sizes="52px"
                      />
                      <span className="cart-row-diamond-thumb-badge">
                        {bundleDiamonds && bundleDiamonds.length > 1 ? `${bundleDiamonds.length} Diamonds` : 'Diamond'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="cart-row-body">
                  <div className="cart-row-top">
                    <div className="cart-row-info">
                      {it.collection && (
                        <div className="cart-row-coll">{it.collection}</div>
                      )}

                      {isLooseDiamond ? (
                        <div className="cart-row-name">{it.name}</div>
                      ) : (
                        <Link href={`/product/${it.slug}`} className="cart-row-name">
                          {stripMetalSuffix(it.name)}
                        </Link>
                      )}

                      {/* Style · Metal · Ring size */}
                      <div className="cart-row-meta">
                        {!isLooseDiamond && <span>Style {it.sku}</span>}
                        {it.metal && <span>· {it.metal}</span>}
                        {it.ring_size && (
                          <span className="cart-row-size-badge">· Size {it.ring_size}</span>
                        )}
                      </div>

                      {/* Bundle diamond details — one row per diamond */}
                      {bundleDiamonds && bundleDiamonds.map((d, di) => (
                        <div key={d.offer_id} className="cart-row-bundle-detail">
                          <span className="cart-row-bundle-label">
                            {bundleDiamonds.length > 1 ? `Diamond ${di + 1}` : 'Diamond'}
                          </span>
                          <span>
                            {d.carat.toFixed(2)} ct {d.shape}
                            {' '}· {d.color} / {d.clarity}
                            {d.lab ? ` · ${d.lab}` : ''}
                            {d.cert_number ? ` ${d.cert_number}` : ''}
                          </span>
                        </div>
                      ))}

                      {/* Bundle price breakdown */}
                      {bundleDiamonds && it.bundle && (
                        <div className="cart-row-bundle-breakdown">
                          <span>Setting ${it.bundle.setting_price_usd.toLocaleString('en-US')}</span>
                          {bundleDiamonds.map((d, di) => (
                            <span key={d.offer_id}>
                              + {bundleDiamonds.length > 1 ? `Diamond ${di + 1}` : 'Diamond'} ${d.price_usd.toLocaleString('en-US')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="cart-row-remove"
                      onClick={() => removeItem(it.id)}
                      aria-label={`Remove ${it.name}`}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="cart-row-bottom">
                    <div className="cart-row-qty">
                      <button
                        type="button"
                        onClick={() => setQty(it.id, it.qty - 1)}
                        aria-label="Decrease quantity"
                        disabled={it.qty <= 1}
                      >
                        −
                      </button>
                      <span aria-live="polite">{it.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(it.id, it.qty + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-row-price">
                      {it.price_num > 0 ? formatUsd(it.price_num * it.qty) : 'Price on inquiry'}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          <button type="button" className="cart-clear" onClick={clear}>
            Clear cart
          </button>
        </section>

        <aside className="cart-summary" aria-label="Order summary">
          <div className="cart-summary-card">
            <h2 className="cart-summary-title">Summary</h2>
            <div className="cart-summary-row">
              <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
              <span>{subtotal > 0 ? formatUsd(subtotal) : 'Inquire'}</span>
            </div>
            <div className="cart-summary-row">
              <span>Shipping</span>
              <span>{formatUsd(SHIPPING_FEE_USD)}</span>
            </div>
            <div className="cart-summary-row cart-summary-row--muted">
              <span>Tax</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="cart-summary-rule" />
            <div className="cart-summary-row cart-summary-row--total">
              <span>Estimated total</span>
              <span>{orderTotal > 0 ? formatUsd(orderTotal) : 'Inquire'}</span>
            </div>

            <label className="cart-summary-email">
              <span>Email for your order confirmation</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setCheckoutError(null); }}
              />
            </label>

            <button
              type="button"
              className="btn-primary cart-summary-cta"
              onClick={() => startCheckout('card')}
              disabled={checkoutPending !== null || items.length === 0 || !emailValid}
            >
              {checkoutPending === 'card'
                ? 'Opening secure checkout…'
                : `Place Order ${orderTotal > 0 ? `· ${formatUsd(orderTotal)}` : ''}`}
            </button>

            {bankEnabled && (
              <button
                type="button"
                className="btn-solid cart-summary-cta"
                onClick={() => startCheckout('bank')}
                disabled={checkoutPending !== null || items.length === 0 || !emailValid}
              >
                {checkoutPending === 'bank'
                  ? 'Preparing instructions…'
                  : 'Pay by Bank Transfer (ACH)'}
              </button>
            )}

            {checkoutError && (
              <p className="cart-summary-err" role="alert">{checkoutError}</p>
            )}

            <a href={mailto} className="btn-solid cart-summary-cta">
              Or Inquire by Email
            </a>
            <Link href="/engagement-rings" className="cart-summary-link">
              Continue browsing →
            </Link>

            <p className="cart-summary-note">
              Each DANHOV piece is handcrafted to order in Los Angeles — your
              specialist confirms timeline within one business day of payment.
              Payments processed securely via Authorize.Net.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart, formatUsd } from '@/components/CartProvider';
import { createClient } from '@/lib/supabase/client';
import { stripMetalSuffix } from '@/lib/product-display';
import { SHIPPING_FEE_USD } from '@/lib/shipping';
import './cart.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Method = 'card' | 'bank';

export default function CartPageClient({ bankEnabled }: { bankEnabled?: boolean }) {
  const router = useRouter();
  void router;
  const { items, count, subtotal, removeItem, updateItem, setQty, clear } = useCart();
  const [email, setEmail] = useState<string>('');
  const [checkoutPending, setCheckoutPending] = useState<Method | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Interactive UI States
  const [qtyDropdownOpenId, setQtyDropdownOpenId] = useState<string | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [pendingMetal, setPendingMetal] = useState<string>('');
  const [pendingSize, setPendingSize] = useState<string>('');

  const editingItem = items.find((it) => it.id === editingItemId) ?? null;
  const deleteItem = items.find((it) => it.id === deleteItemId) ?? null;

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
  const canCheckout = items.length > 0 && checkoutPending === null;

  // Route to the dedicated checkout page. The checkout page itself will
  // validate the email and open the secure hosted payment flow.
  function startCheckout(_method: Method = 'card') {
    if (items.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }
    setCheckoutError(null);
    router.push('/checkout');
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

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const experienceTabs = [
    { title: 'HOW MAY WE HELP YOU?', content: 'Our client care experts are available to assist you with sizing, custom engravings, and styling advice.' },
    { title: 'DELIVERY & RETURNS', content: 'Complimentary insured shipping on all orders. Returns and exchanges accepted within 30 days.' },
    { title: 'ACCEPTED PAYMENT TYPES', content: 'We accept major credit cards, Apple Pay, PayPal, and bank wire transfers (ACH).' },
    { title: 'PRODUCT CARE & REPAIR', content: 'Each piece comes with lifetime craftsmanship warranty and complimentary annual cleaning.' },
  ];

  const metalOptions = [
    '18k Rose Gold',
    '18k Yellow Gold',
    '18k White Gold',
    'Platinum',
    'Sterling Silver',
  ];

  const ringSizeOptions = Array.from({ length: 17 }, (_, i) => String(4 + i / 2)).filter((size) => {
    const num = Number(size);
    return Number.isFinite(num) && num >= 4 && num <= 12.5;
  });

  const openEditModal = (item: (typeof items)[number]) => {
    setEditingItemId(item.id);
    setPendingQty(item.qty || 1);
    setPendingMetal(item.metal || metalOptions[0]);
    setPendingSize(item.ring_size || ringSizeOptions[0]);
  };

  const closeEditModal = () => {
    setEditingItemId(null);
  };

  const saveEditModal = () => {
    if (!editingItemId) return;
    updateItem(editingItemId, {
      qty: pendingQty,
      metal: pendingMetal,
      ring_size: pendingSize,
    });
    closeEditModal();
  };

  const confirmDelete = () => {
    if (!deleteItemId) return;
    removeItem(deleteItemId);
    setDeleteItemId(null);
  };  

  if (items.length === 0) {
    return (
      <main className="cart-page-main" style={{ textAlign: 'center' }}>
        <header className="cart-header-wrap">
          <div className="cart-header-inner">
            <h1 className="cart-title">Shopping Cart (0)</h1>
          </div>
        </header>
        <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '24px', fontFamily: 'Georgia, serif', marginBottom: '24px' }}>Your Shopping Cart is Empty</h2>
          <Link href="/engagement-rings" style={{ display: 'inline-block', padding: '14px 32px', backgroundColor: '#000', color: '#fff', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Browse Collections
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page-main">
      {/* Top Header */}
      <header className="cart-header-wrap">
        <div className="cart-header-inner">
          <h1 className="cart-title">
            Shopping Cart <span>({count})</span>
          </h1>
        </div>
      </header>

      <div className="cart-container">
        
        {/* ============ LEFT COLUMN (Real Cart Items) ============ */}
        <section aria-label="Cart items" className="cart-left-col">
          {items.map((it) => {
            const isLooseDiamond = it.slug === 'loose-diamond';
            const bundleDiamonds = it.bundle
              ? (it.bundle.diamonds && it.bundle.diamonds.length > 0
                  ? it.bundle.diamonds
                  : [it.bundle.diamond])
              : null;
            const firstBundleDiamond = bundleDiamonds?.[0] ?? null;

            return (
              <article key={it.id} className="cart-item-row">
                {/* Image Box */}
                <div className="cart-item-img-box">
                  {isLooseDiamond ? (
                    <span style={{ fontSize: '12px', color: '#666' }}>Diamond</span>
                  ) : (
                    <Link href={`/product/${it.slug}`} style={{ width: '100%', height: '100%', display: 'block', position: 'relative' }}>
                      {it.image ? (
                        <Image src={it.image} alt={it.name} fill sizes="140px" style={{ objectFit: 'contain' }} />
                      ) : (
                        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }} fill="none" aria-hidden="true">
                          <ellipse cx="100" cy="110" rx="60" ry="28" stroke="#D4AF37" strokeWidth="3" />
                          <path d="M75 105 C85 90 115 90 125 105 C115 120 85 120 75 105 Z" stroke="#D4AF37" strokeWidth="3" fill="none" />
                          <path d="M95 98 L105 80 L115 98 Z" fill="#D4AF37" />
                        </svg>
                      )}
                    </Link>
                  )}
                  {firstBundleDiamond?.image && (
                    <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', background: '#fff' }}>
                      <Image src={firstBundleDiamond.image} alt="Diamond" width={40} height={40} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="cart-item-details">
                  <div className="cart-item-top">
                    <div>
                      {isLooseDiamond ? (
                        <h3 className="cart-item-name">{it.name}</h3>
                      ) : (
                        <Link href={`/product/${it.slug}`} className="cart-item-name">
                          {it.name}
                        </Link>
                      )}
                      {it.variant_label && (
                        <div className="cart-item-sub">{it.variant_label}</div>
                      )}
                      <div className="cart-item-sub">
                        {it.collection || 'Wire Bangle'}
                      </div>
                    </div>
                    <div className="cart-item-price">
                      {it.price_num > 0 ? formatUsd(it.price_num * it.qty) : 'Price on inquiry'}
                    </div>
                  </div>

                  {/* Specs & Functional Qty Dropdown */}
                  <div className="cart-specs">
                    {it.metal && (
                      <div className="cart-spec-line">
                        <span className="cart-spec-label">Material</span>
                        <span className="cart-spec-val">{it.metal}</span>
                      </div>
                    )}
                    {it.ring_size && (
                      <div className="cart-spec-line">
                        <span className="cart-spec-label">Size</span>
                        <span className="cart-spec-val">{it.ring_size}</span>
                      </div>
                    )}
                    <div className="cart-spec-line" style={{ alignItems: 'center' }}>
                      <span className="cart-spec-label">Qty</span>
                      
                      <div className={`custom-qty-wrapper ${qtyDropdownOpenId === it.id ? 'open' : ''}`}>
                        <button
                          type="button"
                          className="custom-qty-btn"
                          onClick={() => setQtyDropdownOpenId(qtyDropdownOpenId === it.id ? null : it.id)}
                        >
                          <span>{it.qty}</span>
                          <span>＾</span>
                        </button>
                        <div className="custom-qty-dropdown">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div
                              key={n}
                              className={`qty-option ${it.qty === n ? 'selected' : ''}`}
                              onClick={() => {
                                setQty(it.id, n);
                                setQtyDropdownOpenId(null);
                              }}
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  <p className="delivery-note">
                    Complimentary Express Delivery With Signature
                  </p>

                  {/* Action Links */}
                  <div className="cart-actions-row">
                    <button type="button" className="cart-action-link" onClick={() => openEditModal(it)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteItemId(it.id)}
                      className="cart-action-link delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          <div>
            <button
              type="button"
              className="clear-cart-btn"
              onClick={clear}
            >
              Clear cart
            </button>
          </div>
        </section>

        {/* ============ RIGHT COLUMN (Summary & Accordions) ============ */}
        <aside aria-label="Order summary" className="cart-right-col">
          
          {/* Summary Box */}
          <div className="summary-card">
            <div className="summary-rows">
              <div className="summary-row-item">
                <span>Subtotal</span>
                <span style={{ fontWeight: 600 }}>{subtotal > 0 ? formatUsd(subtotal) : 'Inquire'}</span>
              </div>
              <div className="summary-row-item">
                <span>Complimentary Express Delivery With Signature</span>
                <span style={{ fontWeight: 600 }}>$0.00</span>
              </div>
              <div className="summary-row-item" style={{ alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Estimated Tax 
                  <span className="summary-info-icon">i</span>
                </span>
                <span style={{ fontWeight: 600 }}>$0.00</span>
              </div>
            </div>

            <div className="shipping-accordion-toggle">
              <span>Taxes and other shipping methods</span>
              <span>⌄</span>
            </div>

            <div className="summary-total-row">
              <span style={{ fontSize: '16px' }}>Estimated Total</span>
              <span className="summary-total-price">
                {orderTotal > 0 ? formatUsd(orderTotal) : 'Inquire'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.7)', marginTop: '4px' }}>Complimentary Delivery & Returns</p>

            {/* Email Input */}
            <label className="email-confirm-label">
              <span style={{ fontSize: '12px', fontWeight: 500 }}>Email for your order confirmation</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setCheckoutError(null);
                }}
                className="email-input-box"
              />
            </label>

            {/* Functional Checkout Button */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={() => startCheckout('card')}
                disabled={!canCheckout}
                className="checkout-btn-main"
                style={{ opacity: !canCheckout ? 0.4 : 1 }}
              >
                CHECKOUT
              </button>

              <button type="button" disabled className="payment-dummy-btn paypal-btn-bg">
                <span style={{ fontFamily: 'sans-serif', fontWeight: 'bold', fontStyle: 'italic', color: '#003087', fontSize: '18px' }}>
                  Pay<span style={{ color: '#009cde' }}>Pal</span>
                </span>
              </button>

              <button type="button" disabled className="payment-dummy-btn applepay-btn-bg">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M16.365 1.43c0 1.14-.462 2.06-1.222 2.85-.79.83-2.07 1.47-3.09 1.39-.13-1.09.46-2.24 1.19-2.98.79-.82 2.14-1.43 3.12-1.26zM20.6 17.13c-.5 1.15-.74 1.67-1.38 2.68-.9 1.4-2.16 3.15-3.73 3.16-1.39.02-1.75-.9-3.64-.89-1.89.01-2.29.91-3.68.9-1.57-.02-2.76-1.6-3.66-3-2.51-3.87-2.78-8.4-1.23-10.82.11-2.62 2.4-4.24 4.16-4.28 1.66-.03 2.63 1.13 3.97 1.13 1.33 0 2.05-1.13 4.05-1.06 1.42.05 3 .77 4.09 2.32-3.6 1.97-3.02 6.62.05 7.86z" />
                </svg>
                <span style={{ fontFamily: 'sans-serif', fontSize: '15px', fontWeight: 500 }}>Pay</span>
              </button>

              {bankEnabled && (
                <button
                  type="button"
                  onClick={() => startCheckout('bank')}
                  disabled={!canCheckout}
                  style={{ width: '100%', border: '1px solid #000', color: '#000', backgroundColor: '#fff', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '14px', cursor: 'pointer', fontWeight: '500', opacity: !canCheckout ? 0.4 : 1 }}
                >
                  {checkoutPending === 'bank' ? 'Preparing instructions…' : 'Pay by Bank Transfer (ACH)'}
                </button>
              )}

              <a href={mailto} className="inquire-email-btn">
                Or Inquire by Email
              </a>
            </div>

            {checkoutError && (
              <p style={{ fontSize: '13px', color: '#AC3438', marginTop: '12px' }} role="alert">
                {checkoutError}
              </p>
            )}
          </div>

          {/* Blue Box Card */}
          <div className="blue-box-card">
            <div className="blue-box-square">
              <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' }}>Blue Box</span>
            </div>
            <div>
              <h4 style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontWeight: 'normal' }}>The DANHOV Blue Box®</h4>
              <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.7)', marginTop: '4px', lineHeight: 1.5 }}>
                Every purchase comes in an iconic Tiffany Blue Box® crowned with a white satin ribbon
              </p>
              <Link href="/gift-cards" style={{ fontSize: '12px', fontWeight: '600', textDecoration: 'underline', color: '#000', marginTop: '4px', display: 'block' }}>
                Packaging and Gift Options
              </Link>
            </div>
          </div>

          {/* Interactive Experience Accordions */}
          <div className="experience-card">
            <h3 style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontWeight: 'normal', marginBottom: '16px' }}>The Tiffany Experience</h3>
            <div className="experience-accordion-item-wrap" style={{ display: 'flex', flexDirection: 'column' }}>
              {experienceTabs.map((tab, idx) => (
                <div key={idx} className={`experience-accordion-item ${activeAccordion === idx ? 'active' : ''}`}>
                  <div className="experience-header" onClick={() => toggleAccordion(idx)}>
                    <span>{tab.title}</span>
                    <span style={{ fontSize: '18px', transform: activeAccordion === idx ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                  </div>
                  <div className="experience-content">
                    {tab.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="security-footer-note">
            Each DANHOV piece is handcrafted to order in Los Angeles — your specialist confirms timeline within one business day of payment. Payments processed securely via Authorize.Net.
          </p>

        </aside>
      </div>

      {editingItem && (
        <div className="cart-modal-overlay" onClick={closeEditModal}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="cart-modal-close" onClick={closeEditModal} aria-label="Close edit item modal">
              ×
            </button>
            <h3 className="cart-modal-title">Edit Item</h3>

            <div className="cart-modal-product-name">{stripMetalSuffix(editingItem.name)}</div>
            <div className="cart-modal-subtitle">
              {editingItem.collection || 'Medium Link Earrings in Rose Gold'}
            </div>
            <div className="cart-modal-price">{editingItem.price_num > 0 ? formatUsd(editingItem.price_num * pendingQty) : 'Price on inquiry'}</div>

            <div className="cart-modal-form">
              {editingItem.metal && (
                <label className="cart-modal-field">
                  <span>Material</span>
                  <select value={pendingMetal} onChange={(e) => setPendingMetal(e.target.value)}>
                    {metalOptions.map((metal) => (
                      <option key={metal} value={metal}>{metal}</option>
                    ))}
                  </select>
                </label>
              )}

              {editingItem.ring_size && (
                <label className="cart-modal-field">
                  <span>Size</span>
                  <select value={pendingSize} onChange={(e) => setPendingSize(e.target.value)}>
                    {ringSizeOptions.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="cart-modal-field">
                <span>Quantity</span>
                <select value={pendingQty} onChange={(e) => setPendingQty(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((qty) => (
                    <option key={qty} value={qty}>{qty}</option>
                  ))}
                </select>
              </label>
            </div>

            <button type="button" className="cart-modal-save" onClick={saveEditModal}>
              Save & Update
            </button>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="cart-modal-overlay" onClick={() => setDeleteItemId(null)}>
          <div className="cart-delete-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="cart-modal-close" onClick={() => setDeleteItemId(null)} aria-label="Close delete modal">
              ×
            </button>
            <h3 className="cart-delete-title">Remove Product?</h3>
            <p className="cart-delete-name">{stripMetalSuffix(deleteItem.name)}</p>
            <div className="cart-delete-actions">
              <button type="button" className="cart-delete-primary" onClick={confirmDelete}>
                YES, REMOVE PRODUCT
              </button>
              <button type="button" className="cart-delete-secondary" onClick={() => setDeleteItemId(null)}>
                SAVE FOR LATER
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
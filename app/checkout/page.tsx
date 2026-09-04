'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCart, formatUsd } from '@/components/CartProvider';
import { createClient } from '@/lib/supabase/client';
import { stripMetalSuffix } from '@/lib/product-display';
import './checkout.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const COUNTRY_OPTIONS = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'France', 'Germany', 'Italy', 'Spain',
  'Switzerland', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'India',
  'Japan', 'South Korea', 'Singapore', 'Hong Kong', 'China', 'Brazil', 'Mexico', 'Argentina',
  'Belgium', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Portugal',
  'Austria', 'Greece', 'Turkey', 'South Africa', 'Israel', 'Egypt', 'Thailand', 'Vietnam', 'Indonesia',
  'Philippines', 'New Zealand', 'Other',
];

type DeliveryMode = 'ship' | 'pickup';
type ShippingOption = 'express' | 'next_day';

export default function CheckoutPage() {
  const { items, subtotal, count, clear } = useCart();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('ship');
  const [shippingOption, setShippingOption] = useState<ShippingOption>('express');
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('United States');
  const [giftMessage, setGiftMessage] = useState('');
  const [showGiftMessage, setShowGiftMessage] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user?.email) setEmail((current) => current || data.user!.email!);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.email) setEmail((current) => current || session.user!.email!);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [items.length]);
    useEffect(() => {
    document.body.classList.add('checkout-page-active');
    return () => {
      document.body.classList.remove('checkout-page-active');
    };
  }, []);

  const emailValid = EMAIL_RE.test(email.trim());
  const shippingValid = deliveryMode === 'pickup'
    ? [firstName, lastName].every((value) => value.trim().length > 0)
    : [firstName, lastName, phone, address, city, zip, country].every((value) => value.trim().length > 0);
  const orderTotal = subtotal > 0 ? subtotal : 0;

  const summaryText = useMemo(() => {
    return items.length === 0 ? 'Your cart is empty.' : `${count} ${count === 1 ? 'piece' : 'pieces'} ready for checkout`;
  }, [count, items.length]);

  async function startCheckout() {
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!emailValid) {
      setError('Please enter a valid email so we can confirm your order.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          method: 'manual',
          delivery_method: deliveryMode,
          shipping_option: shippingOption,
          item_count: count,
          gift_message: giftMessage.trim(),
          shipping_address: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            apartment: apartment.trim(),
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
            country: country.trim(),
          },
          items: items.map((it) => ({
            sku: it.sku,
            slug: it.slug,
            qty: it.qty,
            metal: it.metal ?? null,
            variant_label: it.variant_label ?? null,
            price_num: it.price_num ?? null,
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
        throw new Error(payload.error || 'We could not open secure checkout.');
      }

      window.location.href = payload.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not open secure checkout.');
      setLoading(false);
    }
  }

  function goToShipping() {
    if (!emailValid) {
      setError('Please enter a valid email before continuing.');
      return;
    }
    setError(null);
    setStep(2);
  }

  function goToPayment() {
    if (!shippingValid) {
      setError('Please complete all required shipping details.');
      return;
    }
    setError(null);
    setStep(3);
  }

  if (items.length === 0) {
    return (
      <main className="checkout-empty-page">
        <div className="checkout-empty-box">
          <p className="checkout-kicker">Checkout</p>
          <h1>Your cart is empty</h1>
          <p>Add a piece to continue to secure checkout.</p>
          <Link href="/engagement-rings" className="checkout-empty-link">
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <div className="checkout-page-header">
          <h1>Checkout</h1>
        </div>

        <div className="checkout-grid">
          <section className="checkout-form-panel">
            <div className={`checkout-step ${step === 1 ? 'is-active' : ''} ${emailValid ? 'is-complete' : ''}`}>
              <div className="checkout-step-row">
                <span className="checkout-step-badge">{emailValid ? '✓' : '1'}</span>
                <div className="checkout-step-copy">
                 {step > 1 && emailValid ? (
  <>
    <div className="checkout-step-header">
      <span>Email Contact</span>
      <button type="button" className="checkout-step-edit" onClick={() => setStep(1)}>Edit</button>
    </div>
    <div className="checkout-step-value">{email}</div>
  </>
) : (
  <>
    <div className="checkout-step-header">
      <span>Enter Email Address</span>
    </div>
    <div className="checkout-form-grid">
      <label className="checkout-field">
        <span>Email Address</span>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="Example@gmail.com"
        />
      </label>
    </div>
  </>
)}
                </div>
              </div>
            </div>

            <div className={`checkout-step ${step === 2 ? 'is-active' : ''} ${shippingValid ? 'is-complete' : ''} ${!emailValid ? 'is-disabled' : ''}`}>
              <div className="checkout-step-row">
                <span className="checkout-step-badge">{shippingValid ? '✓' : '2'}</span>
                <div className="checkout-step-copy">
                  <div className="checkout-step-header">
                    <span>Shipping</span>
                    {shippingValid && <button type="button" className="checkout-step-edit" onClick={() => setStep(2)}>Edit</button>}
                  </div>

                  {step === 2 || shippingValid ? (
                    <div className="checkout-shipping-form">
                      <div className="checkout-section-header">Delivery Method</div>
                      <div className="checkout-radio-row">
                        <label className={`checkout-radio-option ${deliveryMode === 'ship' ? 'is-selected' : ''}`}>
                          <input type="radio" name="delivery" checked={deliveryMode === 'ship'} onChange={() => setDeliveryMode('ship')} />
                          <span className="checkout-radio-mark" />
                          <span>Ship my items</span>
                        </label>
                        <label className={`checkout-radio-option ${deliveryMode === 'pickup' ? 'is-selected' : ''}`}>
                          <input type="radio" name="delivery" checked={deliveryMode === 'pickup'} onChange={() => setDeliveryMode('pickup')} />
                          <span className="checkout-radio-mark" />
                          <span>Pickup in store</span>
                        </label>
                      </div>

                      <div className="checkout-section-header">Shipping Address</div>

                      <div className="checkout-form-grid checkout-form-grid--two">
                        <label className="checkout-field">
                          <span>First name*</span>
                          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </label>
                        <label className="checkout-field">
                          <span>Last name*</span>
                          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </label>
                      </div>

                      {deliveryMode === 'ship' && (
                        <>
                          <label className="checkout-field">
                            <span>Recipient&apos;s Phone Number*</span>
                            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                          </label>

                          <label className="checkout-field">
                            <span>Street Address*</span>
                            <input value={address} onChange={(e) => setAddress(e.target.value)} />
                          </label>

                          <label className="checkout-field">
                            <span>Apartment, Suite, Building (Optional)</span>
                            <input value={apartment} onChange={(e) => setApartment(e.target.value)} />
                          </label>

                          <div className="checkout-form-grid checkout-form-grid--two">
                            <label className="checkout-field">
                              <span>Zip Code*</span>
                              <input value={zip} onChange={(e) => setZip(e.target.value)} />
                            </label>
                            <label className="checkout-field">
                              <span>City*</span>
                              <input value={city} onChange={(e) => setCity(e.target.value)} />
                            </label>
                          </div>

                          <div className="checkout-form-grid checkout-form-grid--two checkout-form-grid--selects">
                            <label className="checkout-field">
                              <span>State*</span>
                              <select value={state} onChange={(e) => setState(e.target.value)}>
                                <option value="">Select your State</option>
                                <option>California</option>
                                <option>New York</option>
                                <option>Texas</option>
                                <option>Florida</option>
                                <option>Illinois</option>
                                <option>Washington</option>
                              </select>
                            </label>
                            <label className="checkout-field">
                              <span>Country*</span>
                              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                                {COUNTRY_OPTIONS.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </>
                      )}

                      <div className="checkout-section-header">Shipping Method</div>
                      <div className="checkout-shipping-methods">
                        <label className={`checkout-method ${shippingOption === 'express' ? 'is-selected' : ''}`}>
                          <input type="radio" name="shipping-method" checked={shippingOption === 'express'} onChange={() => setShippingOption('express')} />
                          <span className="checkout-method-mark" />
                          <span className="checkout-method-copy">
                            <span className="checkout-method-title">Complimentary Express Delivery With Signature</span>
                            <span className="checkout-method-subtitle">Delivery by Thursday, September 3, 2026</span>
                          </span>
                          <span className="checkout-method-price">$0.00</span>
                        </label>

                        <label className={`checkout-method ${shippingOption === 'next_day' ? 'is-selected' : ''}`}>
                          <input type="radio" name="shipping-method" checked={shippingOption === 'next_day'} onChange={() => setShippingOption('next_day')} />
                          <span className="checkout-method-mark" />
                          <span className="checkout-method-copy">
                            <span className="checkout-method-title">Next Day Delivery With Signature</span>
                            <span className="checkout-method-subtitle">Delivery by Tuesday, September 1, 2026 — Order before 3:00 pm EST</span>
                          </span>
                          <span className="checkout-method-price">$0.00</span>
                        </label>
                      </div>

                      <div className="checkout-section-header">Packaging</div>
                      <div className="checkout-packaging-card">
                        <div className="checkout-packaging-visual" aria-hidden="true" />
                        <div className="checkout-packaging-copy">
                          <div className="checkout-packaging-title">Classic</div>
                          <p>Your item will be carefully delivered in the iconic DANHOV &amp; Co. blue gift box with white ribbon.</p>
                        </div>
                      </div>

                      <button type="button" className="checkout-gift-link" onClick={() => setShowGiftMessage((value) => !value)}>
                        {showGiftMessage ? 'Hide Gift Message' : 'Add Gift Message'}
                      </button>

                      {showGiftMessage && (
                        <label className="checkout-field checkout-gift-field">
                          <span>Gift Message</span>
                          <textarea
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value)}
                            rows={4}
                            placeholder="Write a note for the recipient..."
                          />
                        </label>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={`checkout-step ${step === 3 ? 'is-active' : ''} ${step >= 3 ? 'is-complete' : ''} ${!shippingValid ? 'is-disabled' : ''}`}>
              <div className="checkout-step-row">
                <span className="checkout-step-badge">{step >= 3 ? '✓' : '3'}</span>
                <div className="checkout-step-copy">
                  <div className="checkout-step-header">
                    <span>Payment</span>
                  </div>
                  {step === 3 && (
                    <div className="checkout-payment-placeholder">Secure payment information will appear here.</div>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="checkout-error">{error}</p>}

            <div className="checkout-submit-wrap">
              <button
                type="button"
                onClick={step === 1 ? goToShipping : step === 2 ? goToPayment : startCheckout}
                disabled={loading || (step === 1 ? !emailValid : step === 2 ? !shippingValid : false)}
                className="checkout-submit-btn"
              >
                {loading ? 'Opening secure checkout…' : step === 1 ? 'Continue with checkout' : step === 2 ? 'Continue to payment' : 'Continue to secure checkout'}
              </button>
            </div>
          </section>

          <aside className="checkout-summary-panel">
            {/* Totals card — comes first, like reference */}
            <div className="checkout-summary-card">
              <div className="checkout-totals">
                <div className="checkout-total-row">
                  <span>Subtotal</span>
                  <strong>{subtotal > 0 ? formatUsd(subtotal) : 'Inquire'}</strong>
                </div>
                <div className="checkout-total-row">
                  <span>Shipping</span>
                  <strong>Calculated at payment</strong>
                </div>
                <div className="checkout-total-row checkout-total-row--grand">
                  <span>Total</span>
                  <span>{orderTotal > 0 ? formatUsd(orderTotal) : 'Inquire'}</span>
                </div>
              </div>
            </div>

            {/* Order summary card — items list */}
            <div className="checkout-summary-card">
              <div className="checkout-summary-head">
                <h2>Order summary</h2>
                <span>{summaryText}</span>
              </div>

              <div className="checkout-items">
                {items.map((item) => (
                  <div key={item.id} className="checkout-item-row">
                    <div className="checkout-item-thumb">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <span>Item</span>
                      )}
                    </div>
                    <div className="checkout-item-copy">
                      <div className="checkout-item-name">{stripMetalSuffix(item.name)}</div>
                      <div className="checkout-item-meta">{item.metal || item.collection || 'DANHOV'}</div>
                    </div>
                    <div className="checkout-item-price">{item.price_num > 0 ? formatUsd(item.price_num * item.qty) : 'Inquire'}</div>
                  </div>
                ))}
              </div>

              <div className="checkout-summary-actions">
                <Link href="/cart" className="checkout-link-back">Back to cart</Link>
                <button type="button" onClick={() => clear()} className="checkout-link-clear">Clear cart</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
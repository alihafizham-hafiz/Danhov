'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Product } from '@/lib/products';
import { DiamondCardMedia, type ShapeT } from '@/components/DiamondPicker';
import { useCart } from '@/components/CartProvider';
import { stripMetalSuffix } from '@/lib/product-display';
import { SHIPPING_FEE_USD } from '@/lib/shipping';

export type ReviewDiamond = {
  offer_id: string;
  carat: number;
  shape: string;
  color: string;
  clarity: string;
  cut: string;
  lab: string;
  cert_number: string | null;
  image: string | null;
  video: string | null;
  price_usd: number;
  hold_id?: string | null;
};

type Props = {
  mode: 'ring' | 'setting' | 'diamond';
  setting: Product | null;
  diamonds: ReviewDiamond[];
  settingPrice: number;
  metal?: string | null;
  dcat?: string;
  finishedPiece?: boolean;
};

const US_RING_SIZES = [
  '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5',
  '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13',
];

export default function BuilderReview({ mode, setting, diamonds, settingPrice, metal, dcat, finishedPiece = false }: Props) {
  const { addItem } = useCart();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [customerNote, setCustomerNote] = useState('');
  const [settingQty, setSettingQty] = useState(1);
  // Per-unit ring sizes — one slot per setting unit
  const [ringSizes, setRingSizes] = useState<string[]>(['']);
  // Per-diamond quantity — keep in sync with diamonds array length
  const [diamondQtys, setDiamondQtys] = useState<number[]>(() => diamonds.map(() => 1));
  const [loading, setLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [addingAnother, setAddingAnother] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Diamond preference — only captured in setting-only mode
  const [prefShape, setPrefShape] = useState('');
  const [prefCarat, setPrefCarat] = useState('');

  // Sync diamondQtys when diamonds array changes (e.g. second diamond added via URL change)
  useEffect(() => {
    setDiamondQtys(prev => diamonds.map((_, i) => prev[i] ?? 1));
  }, [diamonds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync ringSizes array length when setting quantity changes
  useEffect(() => {
    setRingSizes(prev => Array.from({ length: settingQty }, (_, i) => prev[i] ?? ''));
  }, [settingQty]);

  const needsRingSize = mode === 'ring' || mode === 'setting';

  const settingSubtotal = settingPrice * settingQty;
  const diamondSubtotals = diamonds.map((d, i) => d.price_usd * (diamondQtys[i] ?? 1));
  const merchandiseTotal =
    (mode !== 'diamond' ? settingSubtotal : 0) +
    (mode !== 'setting' ? diamondSubtotals.reduce((a, b) => a + b, 0) : 0);
  const total = merchandiseTotal + SHIPPING_FEE_USD;

  function setDiamondQty(i: number, v: number) {
    setDiamondQtys(prev => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function setRingSize(i: number, v: string) {
    setRingSizes(prev => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    setErr(null);
  }

  function removeSetting() {
    const qs = new URLSearchParams();
    const d0 = diamonds[0] ?? null;
    if (diamonds.length > 1) {
      qs.set('diamonds', diamonds.map(d => d.offer_id).join('|'));
    } else if (d0) {
      qs.set('diamond', d0.offer_id);
      if (d0.hold_id) qs.set('hold', d0.hold_id);
    }
    if (metal) qs.set('metal', metal);
    router.push(`/ring-builder/review?${qs.toString()}`);
  }

  function changeDiamond(offerId: string) {
    const qs = new URLSearchParams();
    if (setting?.slug) qs.set('setting', setting.slug);
    if (metal) qs.set('metal', metal);
    const otherIds = diamonds.filter(d => d.offer_id !== offerId).map(d => d.offer_id);
    if (otherIds.length > 0) qs.set('orderdiamond', otherIds.join('|'));
    router.push(`/ring-builder/diamond?${qs.toString()}`);
  }

  function removeDiamond(offerId: string) {
    const remaining = diamonds.filter(d => d.offer_id !== offerId);
    const qs = new URLSearchParams();
    if (remaining.length === 0) {
      if (setting?.slug) qs.set('setting', setting.slug);
      if (metal) qs.set('metal', metal);
      router.push(`/ring-builder/diamond?${qs.toString()}`);
      return;
    }
    qs.set('diamonds', remaining.map(d => d.offer_id).join('|'));
    if (setting?.slug) qs.set('setting', setting.slug);
    if (metal) qs.set('metal', metal);
    if (remaining.length === 1 && remaining[0].hold_id) qs.set('hold', remaining[0].hold_id);
    router.push(`/ring-builder/review?${qs.toString()}`);
  }

  function addAnotherDiamond() {
    setAddingAnother(true);
    const existingIds = diamonds.map(d => d.offer_id).join('|');
    const qs = new URLSearchParams();
    if (setting?.slug) qs.set('setting', setting.slug);
    if (metal) qs.set('metal', metal);
    qs.set('orderdiamond', existingIds);
    router.push(`/ring-builder/diamond?${qs.toString()}`);
  }

  function validate(): boolean {
    setErr(null);
    if (!customerName.trim()) {
      setErr('Please enter the recipient name.');
      return false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErr('Please enter a valid email address.');
      return false;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      setErr('Please enter a valid phone number.');
      return false;
    }
    if (!addressLine1.trim() || !city.trim() || !region.trim() || !postalCode.trim() || !country.trim()) {
      setErr('Please complete the shipping address.');
      return false;
    }
    if (needsRingSize) {
      const missing = ringSizes.slice(0, settingQty).findIndex(s => !s);
      if (missing !== -1) {
        setErr(
          settingQty > 1
            ? `Please select a ring size for Ring ${missing + 1} before continuing.`
            : 'Please select a ring size before continuing.'
        );
        return false;
      }
    }
    // Setting-only ("Buy Ring Only"): diamond preferences are optional —
    // the customer can buy the ring without choosing any diamond.
    return true;
  }

  async function startCommission() {
    if (!validate()) return;
    setLoading(true);
    try {
      // Build note — prepend diamond preference when buying setting only
      let fullNote = customerNote.trim();
      if (mode === 'setting' && !finishedPiece && prefShape && prefCarat) {
        const prefLine = `Preferred centre diamond: ${prefShape}, approx. ${prefCarat}`;
        fullNote = fullNote ? `${prefLine}\n\n${fullNote}` : prefLine;
      }
      const body: Record<string, unknown> = {
        mode,
        email,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        shipping_address: {
          name: customerName.trim(),
          line1: addressLine1.trim(),
          line2: addressLine2.trim() || undefined,
          city: city.trim(),
          region: region.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          phone: phone.trim(),
        },
        note: fullNote || undefined,
      };
      if (mode === 'ring' || mode === 'setting') {
        body.setting_slug = setting?.slug;
        body.setting_quantity = settingQty;
        if (metal) body.metal = metal;
        if (settingQty === 1) {
          body.ring_size = ringSizes[0] || undefined;
        } else {
          body.ring_sizes = ringSizes.slice(0, settingQty);
          body.ring_size = ringSizes[0] || undefined;
        }
        if (mode === 'setting' && !finishedPiece) {
          body.preferred_diamond_shape = prefShape || undefined;
          body.preferred_diamond_carat = prefCarat || undefined;
        }
      }
      if (mode !== 'setting' && diamonds.length > 0) {
        body.diamonds = diamonds.map((d, i) => ({
          offer_id: d.offer_id,
          quantity: diamondQtys[i] ?? 1,
          hold_id: d.hold_id ?? null,
        }));
        if (dcat) body.diamond_category = dcat;
        body.diamond_offer_id = diamonds[0].offer_id;
        body.hold_id = diamonds[0].hold_id ?? undefined;
        body.quantity = diamondQtys[0] ?? 1;
      }

      const r = await fetch('/api/ring-builder/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error || 'Could not open checkout.');
      window.location.href = data.url as string;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not open checkout.');
      setLoading(false);
    }
  }

  function addToCart() {
    if (needsRingSize) {
      const missing = ringSizes.slice(0, settingQty).findIndex(s => !s);
      if (missing !== -1) {
        setErr(
          settingQty > 1
            ? `Please select a ring size for Ring ${missing + 1} before adding to cart.`
            : 'Please select a ring size before adding to cart.'
        );
        return;
      }
    }
    setErr(null);
    const note = customerNote.trim() || null;

    if (mode === 'ring' && setting) {
      // Always one cart item for the complete ring — setting + ALL diamonds
      const size = ringSizes[0] || null;
      const bundleDiamonds = diamonds.map((d) => ({
        offer_id: d.offer_id,
        hold_id: d.hold_id ?? null,
        shape: d.shape,
        carat: d.carat,
        color: d.color,
        clarity: d.clarity,
        cut: d.cut,
        lab: d.lab,
        cert_number: d.cert_number,
        price_usd: d.price_usd,
        image: d.image,
      }));
      const totalDiamondPrice = diamonds.reduce((sum, d) => sum + d.price_usd, 0);
      const bundleName =
        diamonds.length === 1
          ? `${stripMetalSuffix(setting.name)} + ${diamonds[0].carat.toFixed(2)}ct ${diamonds[0].shape}`
          : `${stripMetalSuffix(setting.name)} + ${diamonds.length} Diamonds`;
      addItem({
        id: `bundle-${setting.slug}-${diamonds.map((d) => d.offer_id).join('+')}`,
        sku: setting.sku,
        slug: setting.slug,
        name: bundleName,
        collection: setting.collection ?? null,
        metal: metal ?? setting.default_metal ?? null,
        image: setting.images?.[0] ?? null,
        price_display: `$${(settingPrice + totalDiamondPrice).toLocaleString('en-US')}`,
        price_num: settingPrice + totalDiamondPrice,
        ring_size: size,
        note,
        bundle: {
          setting_price_usd: settingPrice,
          diamond: bundleDiamonds[0],
          diamonds: bundleDiamonds,
        },
      });
    } else if (mode === 'setting' && setting) {
      for (let i = 0; i < settingQty; i++) {
        const size = ringSizes[i] || null;
        addItem({
          id: `setting-${setting.slug}-${metal ?? setting.default_metal ?? 'default'}-${size ?? 'nosize'}-${i}`,
          sku: setting.sku,
          slug: setting.slug,
          name: stripMetalSuffix(setting.name),
          collection: setting.collection ?? null,
          metal: metal ?? setting.default_metal ?? null,
          image: setting.images?.[0] ?? null,
          price_display: `$${settingPrice.toLocaleString('en-US')}`,
          price_num: settingPrice,
          ring_size: size,
          note,
          bundle: null,
        });
      }
    } else if (mode === 'diamond') {
      for (const [i, diamond] of diamonds.entries()) {
        const qty = diamondQtys[i] ?? 1;
        for (let q = 0; q < qty; q++) {
          addItem({
            id: `diamond-${diamond.offer_id}${qty > 1 ? `-${q}` : ''}`,
            sku: diamond.offer_id.slice(0, 20),
            slug: 'loose-diamond',
            name: `${diamond.carat.toFixed(2)} ct ${diamond.shape} Diamond`,
            collection: `${diamond.lab}${diamond.cert_number ? ` · ${diamond.cert_number}` : ''}`,
            metal: null,
            image: diamond.image,
            price_display: `$${diamond.price_usd.toLocaleString('en-US')}`,
            price_num: diamond.price_usd,
            ring_size: null,
            note,
            bundle: null,
          });
        }
      }
    }

    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2500);
  }

  const heroImage = setting?.images?.[0] ?? null;
  const firstDiamond = diamonds[0] ?? null;

  // "Add a Setting" URL — pass all diamond IDs so none are lost
  const addSettingHref = (() => {
    const p = new URLSearchParams();
    if (diamonds.length > 1) {
      p.set('diamonds', diamonds.map(d => d.offer_id).join('|'));
    } else if (firstDiamond) {
      p.set('diamond', firstDiamond.offer_id);
      if (firstDiamond.hold_id) p.set('hold', firstDiamond.hold_id);
    }
    return `/ring-builder/setting?${p.toString()}`;
  })();

  return (
    <div className="builder-review">
      <div className="builder-review-top">
        {/* ── Visuals ───────────────────────────────────────────────────── */}
        <div className="builder-review-visual">
          {mode !== 'diamond' && (
            <div className="builder-review-img">
              {heroImage ? (
                <Image src={heroImage} alt={setting?.name ?? 'Setting'} width={520} height={520} />
              ) : (
                <div className="builder-ring-fallback">
                  <svg viewBox="0 0 56 56" fill="none" aria-hidden="true">
                    <circle cx="28" cy="28" r="20" stroke="#AC3438" strokeWidth="1.5" />
                  </svg>
                </div>
              )}
            </div>
          )}
          {/* All diamond cards — autoPlay=true so every card loads immediately */}
          {mode !== 'setting' && diamonds.map((d, i) => {
            if (!d.image && !d.video) return null;
            return (
              <div
                key={d.offer_id}
                className={`builder-review-diamond-img${mode === 'diamond' && i === 0 ? ' builder-review-diamond-img--hero' : ''}`}
              >
                <div className="builder-review-diamond-media">
                  <DiamondCardMedia
                    image={d.image}
                    video={d.video}
                    shape={d.shape.toUpperCase() as ShapeT}
                    carat={d.carat}
                    autoPlay={true}
                  />
                </div>
                <span className="builder-review-diamond-caption">
                  {diamonds.length > 1
                    ? `Diamond ${i + 1} of ${diamonds.length}`
                    : `Your stone${d.video ? ' · 360° view' : ''}`}
                </span>
              </div>
            );
          })}
          <p className="builder-review-tagline">
            {mode === 'ring'
              ? 'Your one-of-one — handcrafted in Los Angeles, made in 3 weeks.'
              : mode === 'setting'
              ? 'Handcrafted to order in Los Angeles · 3 week lead time.'
              : 'GIA-graded · conflict-free · ethically traced.'}
          </p>
        </div>

        {/* ── Details & form ────────────────────────────────────────────── */}
        <div className="builder-review-details">

          {/* Setting line */}
          {mode !== 'diamond' && setting && (
            <div className="builder-review-line">
              <div className="builder-review-line-left">
                <h3>{stripMetalSuffix(setting.name)}</h3>
                <span className="builder-review-sku">Style {setting.sku}</span>
                {setting.collection && (
                  <span className="builder-review-collection"> · {setting.collection}</span>
                )}
                {mode === 'setting' && (
                  <div className="builder-review-grade">
                    {finishedPiece ? 'Finished piece · listed diamonds included' : 'Setting only · centre diamond not included'}
                  </div>
                )}
              </div>
              <div className="builder-review-line-right">
                <span className="builder-review-price">
                  ${settingPrice.toLocaleString('en-US')}
                </span>
                <div className="builder-review-item-qty">
                  <button
                    type="button"
                    className="builder-review-qty-btn"
                    disabled={settingQty <= 1}
                    onClick={() => setSettingQty(q => Math.max(1, q - 1))}
                    aria-label="Decrease setting quantity"
                  >−</button>
                  <span className="builder-review-qty-val">{settingQty}</span>
                  <button
                    type="button"
                    className="builder-review-qty-btn"
                    disabled={settingQty >= 10}
                    onClick={() => setSettingQty(q => Math.min(10, q + 1))}
                    aria-label="Increase setting quantity"
                  >+</button>
                </div>
                {settingQty > 1 && (
                  <span className="builder-review-line-subtotal">
                    ${settingSubtotal.toLocaleString('en-US')}
                  </span>
                )}
                {mode === 'ring' && (
                  <div className="builder-review-setting-actions">
                    <a href={addSettingHref} className="builder-review-change-setting">
                      Change
                    </a>
                    <button
                      type="button"
                      className="builder-review-remove-setting"
                      onClick={removeSetting}
                      aria-label="Remove setting"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'ring' && <div className="builder-review-divider" />}

          {/* Diamond lines — one per selected diamond */}
          {mode !== 'setting' && diamonds.map((diamond, i) => {
            const qty = diamondQtys[i] ?? 1;
            const subtotal = diamond.price_usd * qty;
            const certLabel = diamond.cert_number
              ? `${diamond.lab} · ${diamond.cert_number}`
              : diamond.lab;

            return (
              <div key={diamond.offer_id}>
                {i > 0 && <div className="builder-review-divider" />}
                <div className="builder-review-line">
                  <div className="builder-review-line-left">
                    {diamonds.length > 1 && (
                      <span className="builder-review-diamond-idx">Diamond {i + 1} of {diamonds.length}</span>
                    )}
                    <h3>
                      {diamond.carat.toFixed(2)} ct {diamond.shape} Diamond
                    </h3>
                    <span className="builder-review-sku">{certLabel}</span>
                    <div className="builder-review-grade">
                      {diamond.color} color · {diamond.clarity} clarity · {diamond.cut} cut
                      {diamond.hold_id && <> · reserved for you for 24h</>}
                    </div>
                  </div>
                  <div className="builder-review-line-right">
                    <span className="builder-review-price">
                      ${diamond.price_usd.toLocaleString('en-US')}
                    </span>
                    <div className="builder-review-item-qty">
                      <button
                        type="button"
                        className="builder-review-qty-btn"
                        disabled={qty <= 1}
                        onClick={() => setDiamondQty(i, Math.max(1, qty - 1))}
                        aria-label="Decrease quantity"
                      >−</button>
                      <span className="builder-review-qty-val">{qty}</span>
                      <button
                        type="button"
                        className="builder-review-qty-btn"
                        disabled={qty >= 10}
                        onClick={() => setDiamondQty(i, Math.min(10, qty + 1))}
                        aria-label="Increase quantity"
                      >+</button>
                    </div>
                    {qty > 1 && (
                      <span className="builder-review-line-subtotal">
                        Subtotal ${subtotal.toLocaleString('en-US')}
                      </span>
                    )}
                    <div className="builder-review-diamond-actions">
                      <button
                        type="button"
                        className="builder-review-change-diamond"
                        onClick={() => changeDiamond(diamond.offer_id)}
                        aria-label={`Change diamond ${i + 1}`}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className="builder-review-remove-diamond"
                        onClick={() => removeDiamond(diamond.offer_id)}
                        aria-label={`Remove diamond ${i + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="builder-review-divider builder-review-divider-strong" />

          {/* Totals */}
          <div className="builder-review-totals">
            {(settingQty > 1 || diamonds.length > 1 || diamondQtys.some(q => q > 1)) && (
              <>
                {mode !== 'diamond' && setting && (
                  <div className="builder-review-total-row builder-review-total-row--sub">
                    <span>Setting{settingQty > 1 ? ` × ${settingQty}` : ''}</span>
                    <span>${settingSubtotal.toLocaleString('en-US')}</span>
                  </div>
                )}
                {mode !== 'setting' && diamonds.map((d, i) => (
                  <div key={d.offer_id} className="builder-review-total-row builder-review-total-row--sub">
                    <span>
                      {diamonds.length > 1 ? `Diamond ${i + 1}` : 'Diamond'}
                      {(diamondQtys[i] ?? 1) > 1 && ` × ${diamondQtys[i]}`}
                    </span>
                    <span>${diamondSubtotals[i].toLocaleString('en-US')}</span>
                  </div>
                ))}
              </>
            )}
            <div className="builder-review-total-row">
              <span>Shipping</span>
              <span>${SHIPPING_FEE_USD.toLocaleString('en-US')}</span>
            </div>
            <div className="builder-review-total-row">
              <span>
                Order total
              </span>
              <strong>${total.toLocaleString('en-US')}</strong>
            </div>
            <p className="builder-review-balance">
              {mode !== 'diamond' && 'Production: 3 weeks. '}Lifetime craftsmanship warranty.
            </p>
          </div>

          {/* Ring size — one selector per setting unit */}
          {needsRingSize && (
            <div className="builder-review-ring-size">
              {settingQty === 1 ? (
                <>
                  <label className="builder-review-ring-size-label" htmlFor="rb-ring-size-0">
                    Ring Size <span className="builder-review-ring-size-us">(US sizing)</span>
                    <span className="builder-review-ring-size-req">Required</span>
                  </label>
                  <select
                    id="rb-ring-size-0"
                    className="builder-review-ring-size-select"
                    value={ringSizes[0] ?? ''}
                    onChange={(e) => setRingSize(0, e.target.value)}
                  >
                    <option value="">— Select your size —</option>
                    {US_RING_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="other">Other / International — I&apos;ll note in email</option>
                  </select>
                  <p className="builder-review-ring-size-hint">
                    Not sure of your size? A specialist will confirm before production begins.
                  </p>
                </>
              ) : (
                <>
                  <div className="builder-review-ring-size-label">
                    Ring Sizes <span className="builder-review-ring-size-us">(US sizing)</span>
                    <span className="builder-review-ring-size-req">Required — one per ring</span>
                  </div>
                  <div className="builder-review-ring-sizes-multi">
                    {Array.from({ length: settingQty }, (_, i) => (
                      <div key={i} className="builder-review-ring-size-row">
                        <label className="builder-review-ring-size-unit-label" htmlFor={`rb-ring-size-${i}`}>
                          Ring {i + 1}
                        </label>
                        <select
                          id={`rb-ring-size-${i}`}
                          className="builder-review-ring-size-select"
                          value={ringSizes[i] ?? ''}
                          onChange={(e) => setRingSize(i, e.target.value)}
                        >
                          <option value="">— Select size —</option>
                          {US_RING_SIZES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          <option value="other">Other — I&apos;ll note in email</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="builder-review-ring-size-hint">
                    Not sure of a size? A specialist will confirm each before production begins.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Diamond Preferences — setting-only mode */}
          {mode === 'setting' && !finishedPiece && (
            <div className="builder-review-diamond-pref">
              <div className="builder-review-diamond-pref-head">
                <span className="builder-review-diamond-pref-icon">◆</span>
                <div>
                  <p className="builder-review-diamond-pref-title">Centre Diamond Preference</p>
                  <p className="builder-review-diamond-pref-sub">
                    Tell us what you have in mind — our team will source or confirm your stone before production begins.
                  </p>
                </div>
              </div>

              <div className="builder-review-diamond-pref-fields">
                <div className="builder-review-diamond-pref-field">
                  <label className="builder-review-ring-size-label" htmlFor="rb-pref-shape">
                    Diamond Shape <span style={{ color: '#9a8f88', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <select
                    id="rb-pref-shape"
                    className="builder-review-ring-size-select"
                    value={prefShape}
                    onChange={(e) => { setPrefShape(e.target.value); setErr(null); }}
                  >
                    <option value="">— Select shape —</option>
                    <option value="Round Brilliant">Round Brilliant</option>
                    <option value="Oval">Oval</option>
                    <option value="Cushion">Cushion</option>
                    <option value="Princess">Princess</option>
                    <option value="Emerald">Emerald</option>
                    <option value="Pear">Pear</option>
                    <option value="Radiant">Radiant</option>
                    <option value="Marquise">Marquise</option>
                    <option value="Asscher">Asscher</option>
                    <option value="Heart">Heart</option>
                    <option value="Not sure yet">Not sure yet — I&apos;d like help</option>
                  </select>
                </div>

                <div className="builder-review-diamond-pref-field">
                  <label className="builder-review-ring-size-label" htmlFor="rb-pref-carat">
                    Approximate Size <span style={{ color: '#9a8f88', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <select
                    id="rb-pref-carat"
                    className="builder-review-ring-size-select"
                    value={prefCarat}
                    onChange={(e) => { setPrefCarat(e.target.value); setErr(null); }}
                  >
                    <option value="">— Select size —</option>
                    <option value="Under 0.50 ct">Under 0.50 ct</option>
                    <option value="0.50 ct (~5.0 mm)">0.50 ct (~5.0 mm)</option>
                    <option value="0.75 ct (~5.8 mm)">0.75 ct (~5.8 mm)</option>
                    <option value="1.00 ct (~6.4 mm)">1.00 ct (~6.4 mm)</option>
                    <option value="1.25 ct (~6.9 mm)">1.25 ct (~6.9 mm)</option>
                    <option value="1.50 ct (~7.3 mm)">1.50 ct (~7.3 mm)</option>
                    <option value="1.75 ct (~7.7 mm)">1.75 ct (~7.7 mm)</option>
                    <option value="2.00 ct (~8.1 mm)">2.00 ct (~8.1 mm)</option>
                    <option value="2.50 ct (~8.8 mm)">2.50 ct (~8.8 mm)</option>
                    <option value="3.00 ct (~9.1 mm)">3.00 ct (~9.1 mm)</option>
                    <option value="Over 3.00 ct">Over 3.00 ct</option>
                    <option value="Not sure yet">Not sure yet — I&apos;d like guidance</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Optional customer message */}
          <div className="builder-review-note">
            <label className="builder-review-note-label" htmlFor="rb-note">
              Message for our team
              <span>(Optional)</span>
            </label>
            <textarea
              id="rb-note"
              className="builder-review-note-textarea"
              placeholder="Special requests, engraving ideas, questions for our jewelers…"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Add a Setting — only when no setting is chosen yet */}
          {mode === 'diamond' && firstDiamond && (
            <div className="builder-review-add-setting">
              <div className="builder-review-add-setting-text">
                <strong>Want to pair {diamonds.length > 1 ? 'these diamonds' : 'this diamond'} with a setting?</strong>
                Browse our handcrafted settings — {diamonds.length > 1 ? 'all your diamonds' : 'your diamond'} will be carried through.
              </div>
              <a href={addSettingHref} className="builder-review-add-setting-btn">
                Add a Setting →
              </a>
            </div>
          )}

          {/* Add another diamond — available in both diamond-only and ring modes */}
          {(mode === 'diamond' || mode === 'ring') && firstDiamond && (
            <div className="builder-review-add-diamond">
              <div className="builder-review-add-diamond-text">
                <strong>Add another diamond?</strong>
                {mode === 'ring'
                  ? 'Select an additional stone to include in this ring.'
                  : 'Select a second stone — it appears as a separate line item in this order.'}
              </div>
              <button
                type="button"
                className="builder-review-add-diamond-btn"
                disabled={addingAnother}
                onClick={addAnotherDiamond}
              >
                {addingAnother ? 'Loading picker…' : 'Browse Diamonds →'}
              </button>
            </div>
          )}

          {/* Customer and shipping details */}
          <div className="builder-review-form">
            <div className="builder-review-customer-grid">
              <label className="builder-review-customer-field">
                <span>Recipient name</span>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoComplete="name" />
              </label>
              <label className="builder-review-customer-field">
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              <label className="builder-review-customer-field">
                <span>Phone number</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </label>
              <label className="builder-review-customer-field">
                <span>Country</span>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country-name" />
              </label>
              <label className="builder-review-customer-field builder-review-customer-field--full">
                <span>Address line 1</span>
                <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} autoComplete="address-line1" />
              </label>
              <label className="builder-review-customer-field builder-review-customer-field--full">
                <span>Address line 2 <em>(Optional)</em></span>
                <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} autoComplete="address-line2" />
              </label>
              <label className="builder-review-customer-field">
                <span>City</span>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
              </label>
              <label className="builder-review-customer-field">
                <span>State / region</span>
                <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} autoComplete="address-level1" />
              </label>
              <label className="builder-review-customer-field">
                <span>Postal code</span>
                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} autoComplete="postal-code" />
              </label>
            </div>
            <div className="builder-review-actions">
              <button
                type="button"
                className="builder-cta-next builder-commission-btn"
                onClick={startCommission}
                disabled={loading}
              >
                {loading ? 'Opening secure checkout…' : 'Checkout →'}
              </button>
              <button
                type="button"
                className="builder-addtocart-btn"
                onClick={addToCart}
              >
                {cartAdded ? '✓ Added to Cart' : 'Add to Cart'}
              </button>
            </div>
          </div>

          {err && <p className="quote-lock-err" style={{ marginTop: 8 }}>{err}</p>}

          <p className="builder-review-secured">
            Secured by Authorize.Net · We will email you the order reference and a specialist
            will reach out within one business day to confirm {needsRingSize ? (finishedPiece ? 'size and order' : 'size, engraving, and stone') : 'shipping and order'} details.
          </p>
        </div>
      </div>
    </div>
  );
}

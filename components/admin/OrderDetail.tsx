'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LaborCategory } from '@/lib/labor';
import { computeLabor, platinumToGoldWeightG } from '@/lib/labor';
import { DIAMOND_SHAPES, type StoneGroup } from '@/lib/stone-math';
import DiamondShapeIcon from '@/components/admin/DiamondShapeIcon';
import { stripMetalSuffix } from '@/lib/product-display';

function skuForMetal(rawSku: string, metal: string | null | undefined): string {
  const base = rawSku.replace(/-?(PL|PLAT|14Y|14W|14R|18Y|18W|18R)$/i, '');
  const m = (metal ?? '').toLowerCase();
  let suffix = 'PL';
  if (m.includes('plat')) suffix = 'PL';
  else {
    const k = m.match(/(\d+)\s*k/);
    const karat = k ? k[1] : '14';
    if (m.includes('rose') || m.includes('pink')) suffix = `${karat}R`;
    else if (m.includes('white')) suffix = `${karat}W`;
    else if (m.includes('yellow') || m.includes('gold')) suffix = `${karat}Y`;
  }
  return base === rawSku ? rawSku : `${base}-${suffix}`;
}

// Map a diamond-shape slug → its human label for the order readout.
const SHAPE_LABEL: Record<string, string> = Object.fromEntries(
  DIAMOND_SHAPES.map((s) => [s.slug, s.label]),
);

type ShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  _bundle?: CommissionBundle | null;
};

type DiamondBundleItem = {
  offer_id?: string;
  shape?: string;
  carat?: number;
  color?: string;
  clarity?: string;
  cut?: string;
  lab?: string;
  cert_number?: string | null;
  price_usd?: number;
  quantity?: number;
  hold_id?: string | null;
};

type CommissionBundle = {
  flow?: string;
  mode?: 'ring' | 'setting' | 'diamond';
  ring_size?: string | null;
  setting?: {
    sku?: string;
    name?: string;
    metal?: string | null;
    price_usd?: number;
    quantity?: number;
  } | null;
  // New: array of diamonds with individual quantities
  diamonds?: DiamondBundleItem[] | null;
  // Legacy: single diamond (kept for backward compat)
  diamond?: DiamondBundleItem | null;
};

type CustomOverrides = {
  platinum_weight_g?: number | null;
  stone_count?: number | null;
  stone_size_mm?: number | null;
  ring_size?: string | null;
  engraving?: string | null;
  metal_override?: string | null;
  note?: string | null;
};

type Order = {
  id: string;
  customer_email: string;
  total_usd: number | null;
  deposit_usd: number | null;
  shipping_cost_usd: number | null;
  status: string;
  created_at: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  currency: string | null;
  shipping_country: string | null;
  shipping_address: ShippingAddress | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  custom_overrides: CustomOverrides | null;
  labor_breakdown: { lines?: { label: string; total_usd: number }[]; total_usd?: number } | null;
  notes: string | null;
  milestones: unknown;
  nivoda_offer_id?: string | null;
  nivoda_order_id?: string | null;
  nivoda_hold_id?: string | null;
};

type Product = {
  sku: string;
  name: string;
  slug: string;
  collection: string | null;
  platinum_weight_g: number | null;
  gold_weight_g: number | null;
  stone_count: number | null;
  stone_size_mm: number | null;
  images: string[] | null;
  // Multi-group stone spec (count / mm / diamond shape per group) plus the
  // metal context — surfaced read-only so the studio sees exactly what
  // stones the piece carries when fulfilling the order.
  stone_groups: StoneGroup[] | null;
  default_metal: string | null;
  metals: string[] | null;
};

type QuoteLock = {
  metal_choice: string | null;
  locked_price_usd: number | null;
  breakdown: unknown;
};

function formatMetal(raw: string | null | undefined): string {
  if (!raw) return '—';
  // e.g. "14k_yellow" → "14K Yellow Gold", "platinum" → "Platinum"
  const up = raw.toUpperCase().replace(/_/g, ' ');
  const karatMatch = raw.match(/(\d+)\s*k/i);
  const karat = karatMatch ? `${karatMatch[1]}K` : null;
  const isRose = /rose|pink/i.test(raw);
  const isWhite = /white/i.test(raw);
  const isYellow = /yellow/i.test(raw);
  const isPlatinum = /plat/i.test(raw);
  let metalName = 'Gold';
  if (isPlatinum) metalName = 'Platinum';
  else if (isRose) metalName = 'Rose Gold';
  else if (isWhite) metalName = 'White Gold';
  else if (isYellow) metalName = 'Yellow Gold';
  if (isPlatinum) return 'Platinum';
  return karat ? `${karat} ${metalName}` : up;
}

const STATUSES = [
  'pending', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'failed',
];

const METAL_OPTIONS = [
  '14k_yellow', '14k_white', '14k_rose',
  '18k_yellow', '18k_white', '18k_rose',
];

const CARRIERS = ['FedEx', 'UPS', 'USPS', 'DHL', 'Brink\'s'];

export default function OrderDetail({
  order: initialOrder,
  product,
  quoteLock,
  laborCategories,
}: {
  order: Order;
  product: Product | null;
  quoteLock: QuoteLock | null;
  laborCategories: LaborCategory[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // Seed editable state from order + fallback to product spec
  const [status, setStatus] = useState(initialOrder.status);
  const [customerEmail, setCustomerEmail] = useState(initialOrder.customer_email ?? '');
  const [totalUsd, setTotalUsd] = useState(initialOrder.total_usd ?? 0);
  const [depositUsd, setDepositUsd] = useState(initialOrder.deposit_usd ?? 0);
  const [notes, setNotes] = useState(initialOrder.notes ?? '');
  const [trackingNumber, setTrackingNumber] = useState(initialOrder.tracking_number ?? '');
  const [trackingCarrier, setTrackingCarrier] = useState(initialOrder.tracking_carrier ?? '');
  const [shippingCost, setShippingCost] = useState<string>(
    initialOrder.shipping_cost_usd != null ? String(initialOrder.shipping_cost_usd) : '',
  );

  const co = initialOrder.custom_overrides ?? {};
  const [platinumWeight, setPlatinumWeight] = useState<number>(
    co.platinum_weight_g ?? product?.platinum_weight_g ?? 0
  );
  const [stoneCount, setStoneCount] = useState<number>(
    co.stone_count ?? product?.stone_count ?? 0
  );
  const [stoneSizeMm, setStoneSizeMm] = useState<number>(
    co.stone_size_mm ?? product?.stone_size_mm ?? 0
  );
  const [ringSize, setRingSize] = useState(co.ring_size ?? '');
  const [engraving, setEngraving] = useState(co.engraving ?? '');
  const [metalOverride, setMetalOverride] = useState(
    co.metal_override ?? quoteLock?.metal_choice ?? '14k_yellow'
  );

  const addr = initialOrder.shipping_address ?? {};
  const [shipName, setShipName] = useState(addr.name ?? '');
  const [shipLine1, setShipLine1] = useState(addr.line1 ?? '');
  const [shipLine2, setShipLine2] = useState(addr.line2 ?? '');
  const [shipCity, setShipCity] = useState(addr.city ?? '');
  const [shipRegion, setShipRegion] = useState(addr.region ?? '');
  const [shipPostal, setShipPostal] = useState(addr.postal_code ?? '');
  const [shipCountry, setShipCountry] = useState(
    addr.country ?? initialOrder.shipping_country ?? ''
  );
  const [shipPhone, setShipPhone] = useState(addr.phone ?? '');

  // Live-recompute labor from the spec
  const liveLabor = useMemo(
    () =>
      computeLabor(laborCategories, {
        stone_count: stoneCount,
        metal_key: metalOverride,
        engraving,
      }),
    [laborCategories, stoneCount, metalOverride, engraving]
  );

  const liveGoldWeightG = useMemo(
    () => platinumToGoldWeightG(platinumWeight || 0),
    [platinumWeight]
  );

  function flash(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${initialOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          customer_email: customerEmail || undefined,
          total_usd: totalUsd,
          deposit_usd: depositUsd,
          notes: notes || null,
          tracking_number: trackingNumber || null,
          tracking_carrier: trackingCarrier || null,
          shipping_cost_usd: shippingCost === '' ? null : Number(shippingCost),
          shipping_country: shipCountry || null,
          shipping_address: {
            name: shipName, line1: shipLine1, line2: shipLine2,
            city: shipCity, region: shipRegion, postal_code: shipPostal,
            country: shipCountry, phone: shipPhone,
          },
          custom_overrides: {
            platinum_weight_g: platinumWeight || null,
            stone_count: stoneCount || null,
            stone_size_mm: stoneSizeMm || null,
            ring_size: ringSize || null,
            engraving: engraving || null,
            metal_override: metalOverride || null,
          },
          recompute_labor: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      flash('ok', 'Order updated');
      router.refresh();
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const balance = Math.max(0, (totalUsd || 0) - (depositUsd || 0));
  const heroImage = product?.images?.[0];
  const bundle = (initialOrder.shipping_address as ShippingAddress | null)?._bundle ?? null;
  const modeLabel =
    bundle?.mode === 'ring'
      ? 'Complete Ring (Setting + Diamond)'
      : bundle?.mode === 'setting'
      ? 'Setting Only'
      : bundle?.mode === 'diamond'
      ? 'Diamond Only'
      : null;

  return (
    <>
      {toast && <div className={`adm-toast adm-toast--${toast.kind}`}>{toast.msg}</div>}

      <div className="adm-detail-grid">
        {/* LEFT — primary edit form */}
        <div className="adm-detail-main">

          {/* Product card */}
          {product ? (
            <section className="adm-card adm-detail-product">
              {heroImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt={product.name} className="adm-detail-product-img" />
              )}
              <div className="adm-detail-product-body">
                <div className="adm-page-sub">{product.collection ?? '—'} · {product.sku}</div>
                <h2 className="adm-h2" style={{ margin: '4px 0 12px' }}>{stripMetalSuffix(product.name)}</h2>
                <div className="adm-detail-product-meta">
                  <span>Platinum weight (orig): <b>{product.platinum_weight_g ?? '—'} g</b></span>
                  <span>Stones (orig): <b>{product.stone_count ?? 0}</b></span>
                  <span>Stone size (orig): <b>{product.stone_size_mm ?? '—'} mm</b></span>
                </div>

                {/* Stone groups — read-only breakdown of every spec'd set of
                    stones (count · mm · diamond shape) so the bench knows
                    exactly what to set when fulfilling this order. */}
                {Array.isArray(product.stone_groups) && product.stone_groups.length > 0 && (
                  <div className="adm-order-stones">
                    <span className="adm-field-label">Stone groups</span>
                    <ul className="adm-order-stone-list">
                      {product.stone_groups.map((g, i) => (
                        <li key={i} className="adm-order-stone-row">
                          <DiamondShapeIcon shape={g.shape} size={16} className="adm-order-stone-icon" />
                          <span className="adm-order-stone-shape">
                            {g.shape ? (SHAPE_LABEL[g.shape] ?? g.shape) : 'Round brilliant'}
                          </span>
                          <span className="adm-order-stone-spec">
                            <b>{g.count ?? '—'}</b> stones
                            {g.length_mm != null && g.width_mm != null
                              ? <> · <b>{g.length_mm}×{g.width_mm}</b> mm</>
                              : g.size_mm != null && <> · <b>{g.size_mm}</b> mm</>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="adm-card adm-empty">
              <div>No product linked to this order.</div>
              <div className="adm-page-sub" style={{ marginTop: 4 }}>
                Manual order. Edit the spec below and the labor will recompute.
              </div>
            </section>
          )}

          {/* Commission bundle — read-only detail card, shown for ring-builder orders */}
          {bundle?.flow === 'ring_builder' && (
            <section className="adm-card adm-commission-bundle">
              <h3 className="adm-h3">Order Details</h3>
              {modeLabel && (
                <div className="adm-commission-type">
                  <span className="adm-field-label">Order type</span>
                  <span className="adm-commission-mode">{modeLabel}</span>
                </div>
              )}
              {bundle.ring_size && (
                <div className="adm-commission-row">
                  <span className="adm-field-label">Ring size</span>
                  <strong className="adm-commission-value adm-commission-ring-size">
                    US {bundle.ring_size}
                  </strong>
                </div>
              )}
              {!bundle.ring_size && bundle.mode !== 'diamond' && (
                <div className="adm-commission-row adm-commission-row--warn">
                  <span className="adm-field-label">Ring size</span>
                  <span className="adm-commission-warn">Not yet provided — confirm with customer</span>
                </div>
              )}
              {initialOrder.custom_overrides?.note && (
                <div className="adm-commission-row adm-commission-row--note">
                  <span className="adm-field-label">Customer note</span>
                  <span className="adm-commission-note">{initialOrder.custom_overrides.note}</span>
                </div>
              )}

              {/* Setting details */}
              {bundle.setting && (
                <div className="adm-commission-section">
                  <span className="adm-field-label">Setting</span>
                  <table className="adm-commission-table">
                    <tbody>
                      {bundle.setting.name && (
                        <tr><td>Name</td><td><strong>{stripMetalSuffix(bundle.setting.name)}</strong></td></tr>
                      )}
                      {bundle.setting.sku && (
                        <tr><td>SKU</td><td><span className="adm-mono">{skuForMetal(bundle.setting.sku, bundle.setting.metal)}</span></td></tr>
                      )}
                      {bundle.setting.metal && (
                        <tr><td>Metal</td><td><strong>{formatMetal(bundle.setting.metal)}</strong></td></tr>
                      )}
                      {bundle.setting.price_usd != null && (
                        <tr><td>Unit price</td><td><strong>${bundle.setting.price_usd.toLocaleString('en-US')}</strong></td></tr>
                      )}
                      {(bundle.setting.quantity ?? 1) > 1 && (
                        <tr><td>Quantity</td><td><strong>× {bundle.setting.quantity}</strong></td></tr>
                      )}
                      {bundle.setting.price_usd != null && (bundle.setting.quantity ?? 1) > 1 && (
                        <tr>
                          <td>Subtotal</td>
                          <td><strong>${(bundle.setting.price_usd * (bundle.setting.quantity ?? 1)).toLocaleString('en-US')}</strong></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Diamond details — supports both legacy single and new array */}
              {(() => {
                const allDiamonds: DiamondBundleItem[] =
                  bundle.diamonds && bundle.diamonds.length > 0
                    ? bundle.diamonds
                    : bundle.diamond
                    ? [bundle.diamond]
                    : [];
                if (allDiamonds.length === 0) return null;
                return (
                  <>
                    {allDiamonds.map((d, idx) => (
                      <div key={d.offer_id ?? idx} className="adm-commission-section">
                        <span className="adm-field-label">
                          {allDiamonds.length > 1 ? `Diamond ${idx + 1} of ${allDiamonds.length}` : 'Diamond (Nivoda)'}
                        </span>
                        <table className="adm-commission-table">
                          <tbody>
                            {d.carat != null && (
                              <tr><td>Stone</td><td><strong>{d.carat.toFixed(2)} ct {d.shape}</strong></td></tr>
                            )}
                            {d.color && (
                              <tr><td>Grade</td><td>{d.color} color · {d.clarity} clarity · {d.cut} cut</td></tr>
                            )}
                            {d.lab && (
                              <tr>
                                <td>Certificate</td>
                                <td>
                                  {d.lab}
                                  {d.cert_number && (
                                    <> · <span className="adm-mono">{d.cert_number}</span></>
                                  )}
                                </td>
                              </tr>
                            )}
                            {d.offer_id && (
                              <tr><td>Nivoda offer ID</td><td><span className="adm-mono adm-page-sub">{d.offer_id}</span></td></tr>
                            )}
                            {d.price_usd != null && (
                              <tr><td>Unit price</td><td><strong>${d.price_usd.toLocaleString('en-US')}</strong></td></tr>
                            )}
                            {(d.quantity ?? 1) > 1 && (
                              <tr><td>Quantity</td><td><strong>× {d.quantity}</strong></td></tr>
                            )}
                            {d.price_usd != null && (d.quantity ?? 1) > 1 && (
                              <tr>
                                <td>Subtotal</td>
                                <td><strong>${(d.price_usd * (d.quantity ?? 1)).toLocaleString('en-US')}</strong></td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </>
                );
              })()}
            </section>
          )}

          {/* Spec — editable */}
          <section className="adm-card">
            <h3 className="adm-h3">Spec (editable)</h3>
            <p className="adm-page-sub" style={{ marginTop: -4, marginBottom: 12 }}>
              Customer often calls to adjust metal weight or stone count after placing the order. Update here and the labor breakdown recomputes automatically.
            </p>
            <div className="adm-grid-2">
              <label className="adm-field">
                <span>Weight (platinum, g)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="adm-input"
                  value={platinumWeight}
                  onChange={(e) => setPlatinumWeight(Number(e.target.value))}
                />
                <span className="adm-field-hint">≈ {liveGoldWeightG} g gold equivalent</span>
              </label>
              <label className="adm-field">
                <span>Diamond / stone count</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="adm-input"
                  value={stoneCount}
                  onChange={(e) => setStoneCount(Number(e.target.value))}
                />
              </label>
              <label className="adm-field">
                <span>Stone size (mm)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="adm-input"
                  value={stoneSizeMm}
                  onChange={(e) => setStoneSizeMm(Number(e.target.value))}
                />
              </label>
              <label className="adm-field">
                <span>Metal</span>
                <select
                  className="adm-select"
                  value={metalOverride}
                  onChange={(e) => setMetalOverride(e.target.value)}
                >
                  {METAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span>Ring size</span>
                <input
                  type="text"
                  className="adm-input"
                  value={ringSize}
                  onChange={(e) => setRingSize(e.target.value)}
                  placeholder="e.g. 6.5"
                />
              </label>
              <label className="adm-field">
                <span>Engraving (inside band)</span>
                <input
                  type="text"
                  maxLength={25}
                  className="adm-input"
                  value={engraving}
                  onChange={(e) => setEngraving(e.target.value)}
                  placeholder="Up to 25 chars"
                />
              </label>
            </div>
          </section>

          {/* Labor breakdown — live */}
          <section className="adm-card">
            <h3 className="adm-h3">Labor breakdown (live)</h3>
            <p className="adm-page-sub" style={{ marginTop: -4, marginBottom: 12 }}>
              Recomputed from the 5 labor categories every time you edit the spec above.
            </p>
            <table className="adm-table adm-table--compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Units</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {liveLabor.lines.length === 0 ? (
                  <tr><td colSpan={4} className="adm-page-sub">No labor lines apply to this spec.</td></tr>
                ) : liveLabor.lines.map((l) => (
                  <tr key={l.slug}>
                    <td>{l.label}</td>
                    <td style={{ textAlign: 'right' }}>${l.unit_price_usd.toLocaleString('en-US')}</td>
                    <td style={{ textAlign: 'right' }}>{l.units} ({l.unit.replace(/_/g, ' ')})</td>
                    <td style={{ textAlign: 'right' }}><b>${l.total_usd.toLocaleString('en-US')}</b></td>
                  </tr>
                ))}
                <tr className="adm-table-total">
                  <td colSpan={3} style={{ textAlign: 'right' }}><b>Total labor</b></td>
                  <td style={{ textAlign: 'right' }}><b>${liveLabor.total_usd.toLocaleString('en-US')}</b></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Pricing */}
          <section className="adm-card">
            <h3 className="adm-h3">Pricing</h3>
            <div className="adm-grid-2">
              <label className="adm-field">
                <span>Total (USD)</span>
                <input
                  type="number"
                  min="0"
                  className="adm-input"
                  value={totalUsd}
                  onChange={(e) => setTotalUsd(Number(e.target.value))}
                />
              </label>
              <label className="adm-field">
                <span>Deposit paid (USD)</span>
                <input
                  type="number"
                  min="0"
                  className="adm-input"
                  value={depositUsd}
                  onChange={(e) => setDepositUsd(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="adm-balance">
              Balance due before shipping: <b>${balance.toLocaleString('en-US')}</b>
            </div>
          </section>

          {/* Shipping */}
          <section className="adm-card">
            <h3 className="adm-h3">Shipping</h3>
            <div className="adm-grid-2">
              <label className="adm-field">
                <span>Recipient name</span>
                <input type="text" className="adm-input" value={shipName} onChange={(e) => setShipName(e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Country</span>
                <input type="text" className="adm-input" value={shipCountry} onChange={(e) => setShipCountry(e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Phone number</span>
                <input type="tel" className="adm-input" value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} />
              </label>
              <label className="adm-field adm-field--full">
                <span>Address line 1</span>
                <input type="text" className="adm-input" value={shipLine1} onChange={(e) => setShipLine1(e.target.value)} />
              </label>
              <label className="adm-field adm-field--full">
                <span>Address line 2 (optional)</span>
                <input type="text" className="adm-input" value={shipLine2} onChange={(e) => setShipLine2(e.target.value)} />
              </label>
              <label className="adm-field">
                <span>City</span>
                <input type="text" className="adm-input" value={shipCity} onChange={(e) => setShipCity(e.target.value)} />
              </label>
              <label className="adm-field">
                <span>State / region</span>
                <input type="text" className="adm-input" value={shipRegion} onChange={(e) => setShipRegion(e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Postal code</span>
                <input type="text" className="adm-input" value={shipPostal} onChange={(e) => setShipPostal(e.target.value)} />
              </label>
            </div>
            <div className="adm-grid-2" style={{ marginTop: 12 }}>
              <label className="adm-field">
                <span>Tracking carrier</span>
                <select className="adm-select" value={trackingCarrier} onChange={(e) => setTrackingCarrier(e.target.value)}>
                  <option value="">—</option>
                  {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="adm-field">
                <span>Tracking number</span>
                <input type="text" className="adm-input" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
              </label>
            </div>
            <div className="adm-grid-2" style={{ marginTop: 12 }}>
              <label className="adm-field">
                <span>Shipping cost (USD)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="adm-input"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="e.g. 45.00"
                />
                <span className="adm-page-sub" style={{ marginTop: 4 }}>
                  Flows to the customer invoice. Leave blank for complimentary shipping.
                </span>
              </label>
            </div>
          </section>

          {/* Internal notes */}
          <section className="adm-card">
            <h3 className="adm-h3">Internal notes</h3>
            <p className="adm-page-sub" style={{ marginTop: -4, marginBottom: 12 }}>
              Visible only inside the atelier. Not printed on the customer invoice.
            </p>
            <textarea
              className="adm-input"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. customer wants pickup Friday, prefers no gift box…"
            />
          </section>
        </div>

        {/* RIGHT — sidebar */}
        <aside className="adm-detail-side">
          <div className="adm-card">
            <h3 className="adm-h3">Status</h3>
            <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="adm-card">
            <h3 className="adm-h3">Customer</h3>
            <label className="adm-field">
              <span>Email</span>
              <input
                type="email"
                className="adm-input"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </label>
          </div>

          {(initialOrder.stripe_checkout_session_id || initialOrder.stripe_payment_intent_id) && (
            <div className="adm-card">
              <h3 className="adm-h3">Payment Gateway</h3>
              {initialOrder.stripe_checkout_session_id && (
                <div className="adm-mono adm-page-sub" style={{ wordBreak: 'break-all', marginBottom: 6 }}>
                  Invoice Ref: {initialOrder.stripe_checkout_session_id}
                </div>
              )}
              {initialOrder.stripe_payment_intent_id && (
                <div className="adm-mono adm-page-sub" style={{ wordBreak: 'break-all' }}>
                  Transaction ID: {initialOrder.stripe_payment_intent_id}
                </div>
              )}
            </div>
          )}

          {(initialOrder.nivoda_offer_id || initialOrder.nivoda_order_id) && (
            <div className="adm-card">
              <h3 className="adm-h3">Nivoda</h3>
              {initialOrder.nivoda_order_id ? (
                <div className="adm-page-sub" style={{ marginBottom: 6 }}>
                  Order: <span className="adm-mono">{initialOrder.nivoda_order_id}</span>
                </div>
              ) : (
                <div className="adm-page-sub" style={{ marginBottom: 6, color: '#AC3438' }}>
                  Order not yet placed on Nivoda
                </div>
              )}
              {initialOrder.nivoda_offer_id && (
                <div className="adm-mono adm-page-sub" style={{ wordBreak: 'break-all' }}>
                  Offer: {initialOrder.nivoda_offer_id}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="adm-btn adm-btn-primary adm-btn-full"
            disabled={saving}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save all changes'}
          </button>
        </aside>
      </div>
    </>
  );
}

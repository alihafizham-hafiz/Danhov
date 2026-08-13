'use client';

import { useEffect } from 'react';
import { stripMetalSuffix } from '@/lib/product-display';

type CenterDiamond = {
  carat: number | null;
  shape: string | null;
  lab: string | null;
  cert_number: string | null;
  color: string | null;
  clarity: string | null;
};

type Props = {
  order: {
    id: string;
    created_at: string;
    customer_email: string;
    total_usd: number;
    deposit_usd: number;
    shipping_cost_usd: number | null;
    status: string;
    currency: string;
    shipping_address: unknown;
    tracking_number: string | null;
    tracking_carrier: string | null;
  };
  product: {
    name: string;
    sku: string;
    collection: string | null;
  };
  spec: {
    platinum_weight_g: number | null;
    gold_equiv_weight_g: number | null;
    stone_count: number | null;
    stone_size_mm: number | null;
    total_carats: number | null;
    stone_color: string | null;
    stone_clarity: string | null;
    metal: string | null;
    ring_size: string | null;
    engraving: string | null;
  };
  centerDiamond?: CenterDiamond | null;
};

/**
 * Studio invoice. Per the client, labour is NOT broken out on the
 * customer-facing document — only the all-in commission price is shown
 * along with the materials specification (metal, accent stones, centre
 * diamond if it's a bundle) and the shipping cost the studio captured
 * on the order detail screen.
 */
export default function PrintInvoice({ order, product, spec, centerDiamond }: Props) {
  // Auto-open the print dialog on mount
  useEffect(() => {
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  const addr = (order.shipping_address ?? {}) as {
    name?: string; line1?: string; line2?: string;
    city?: string; region?: string; postal_code?: string; country?: string;
  };

  const shippingCost = Number(order.shipping_cost_usd ?? 0);
  const itemsSubtotal = Math.max(0, order.total_usd - shippingCost);
  const balance = Math.max(0, order.total_usd - order.deposit_usd);
  const ref = String(order.id).slice(0, 8).toUpperCase();
  const placed = new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      <style jsx global>{`
        @page { size: A4; margin: 16mm 14mm; }
        @media print {
          .adm-shell, .adm-sidebar, .adm-header, .adm-scrim, .no-print { display: none !important; }
          .adm-main, body, html { background: #fff !important; padding: 0 !important; margin: 0 !important; }
        }
        .invoice {
          font-family: 'Cormorant Garamond', 'Garamond', Georgia, serif;
          color: #1a1410;
          max-width: 760px;
          margin: 24px auto;
          padding: 48px 56px;
          background: #fff;
          box-shadow: 0 2px 24px rgba(0,0,0,0.06);
        }
        @media print {
          .invoice { box-shadow: none; margin: 0; padding: 0; max-width: none; }
        }
        .invoice h1, .invoice h2, .invoice h3, .invoice h4 { font-weight: 500; margin: 0; }
        .invoice-letterhead {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding-bottom: 24px; border-bottom: 2px solid #AC3438;
        }
        .invoice-brand-mark {
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px; font-weight: 500; letter-spacing: 0.18em;
          color: #AC3438; line-height: 1;
        }
        .invoice-brand-sub {
          font-family: 'Cormorant Garamond', serif;
          font-size: 10px; letter-spacing: 0.32em;
          color: #1a1410; margin-top: 6px; text-transform: uppercase;
        }
        .invoice-meta {
          text-align: right;
          font-family: 'Cormorant Garamond', serif; font-size: 11px; line-height: 1.7;
          color: #1a1410;
        }
        .invoice-meta .invoice-ref {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; color: #1a1410; letter-spacing: 0.1em;
          font-style: italic; margin-bottom: 6px;
        }
        .invoice-parties {
          display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
          margin: 28px 0 18px;
        }
        .invoice-party h4 {
          font-family: 'Cormorant Garamond', serif; font-size: 10px;
          letter-spacing: 0.24em; text-transform: uppercase; color: #1a1410;
          margin-bottom: 8px;
        }
        .invoice-party-body { font-family: 'Cormorant Garamond', serif; font-size: 12px; line-height: 1.7; color: #1a1410; }
        .invoice-section { margin-top: 24px; }
        .invoice-section-title {
          font-family: 'Cormorant Garamond', serif; font-size: 10px;
          letter-spacing: 0.24em; text-transform: uppercase; color: #1a1410;
          padding-bottom: 6px; margin-bottom: 10px; border-bottom: 1px solid #ece6df;
        }
        .invoice-spec {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;
          font-family: 'Cormorant Garamond', serif; font-size: 12px;
          color: #1a1410; line-height: 1.7;
        }
        .invoice-spec span.k { color: #1a1410; }
        .invoice-totals { display: flex; justify-content: flex-end; margin-top: 18px; }
        .invoice-totals-box {
          min-width: 280px; font-family: 'Cormorant Garamond', serif; font-size: 12px; color: #1a1410;
        }
        .invoice-totals-row {
          display: flex; justify-content: space-between;
          padding: 5px 0;
        }
        .invoice-totals-row.grand {
          border-top: 2px solid #AC3438;
          margin-top: 8px; padding-top: 12px;
          font-family: 'Cormorant Garamond', serif; font-size: 18px; font-style: italic;
          color: #AC3438;
        }
        .invoice-balance {
          background: #faf6f1; padding: 14px 18px; border-left: 3px solid #AC3438;
          margin: 20px 0 0;
          font-family: 'Cormorant Garamond', serif; font-size: 12px; line-height: 1.6; color: #1a1410;
        }
        .invoice-balance b { color: #AC3438; }
        .invoice-footer {
          margin-top: 36px; padding-top: 18px; border-top: 1px solid #ece6df;
          font-family: 'Cormorant Garamond', serif; font-size: 10px; line-height: 1.7;
          color: #1a1410; text-align: center;
        }
        .invoice-footer em {
          font-family: 'Cormorant Garamond', serif; font-size: 14px;
          font-style: italic; color: #AC3438; display: block; margin-bottom: 6px;
        }
        .no-print {
          text-align: center; padding: 14px; max-width: 760px; margin: 0 auto;
        }
      `}</style>

      <div className="no-print" style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            background: '#AC3438', color: '#fff', border: 'none',
            padding: '10px 24px', fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
            fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', borderRadius: 4,
          }}
        >
          Print
        </button>
      </div>

      <div className="invoice">
        <div className="invoice-letterhead">
          <div>
            <div className="invoice-brand-mark">DANHOV</div>
            <div className="invoice-brand-sub">Atelier · Los Angeles · est. 1984</div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-ref">Invoice {ref}</div>
            <div>Order date · {placed}</div>
            <div>Status · {order.status.replace(/_/g, ' ')}</div>
          </div>
        </div>

        <div className="invoice-parties">
          <div className="invoice-party">
            <h4>From</h4>
            <div className="invoice-party-body">
              <b>DANHOV Atelier</b><br />
              3439 Cahuenga Blvd W<br />
              Los Angeles, CA 90068<br />
              care@danhov.com · (424) 421-4072
            </div>
          </div>
          <div className="invoice-party">
            <h4>Bill to</h4>
            <div className="invoice-party-body">
              {addr.name && <><b>{addr.name}</b><br /></>}
              {order.customer_email}<br />
              {addr.line1 && <>{addr.line1}<br /></>}
              {addr.line2 && <>{addr.line2}<br /></>}
              {(addr.city || addr.region || addr.postal_code) && (
                <>{[addr.city, addr.region, addr.postal_code].filter(Boolean).join(', ')}<br /></>
              )}
              {addr.country && <>{addr.country}</>}
            </div>
          </div>
        </div>

        <div className="invoice-section">
          <div className="invoice-section-title">Order Details</div>
          <div style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", fontSize: 22, fontStyle: 'italic', color: '#1a1410', marginBottom: 4 }}>
            {stripMetalSuffix(product.name)}
          </div>
          <div style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", fontSize: 11, letterSpacing: '0.1em', color: '#1a1410', textTransform: 'uppercase', marginBottom: 16 }}>
            {[product.collection, `Model ${product.sku}`].filter(Boolean).join(' · ')}
          </div>

          <div className="invoice-spec">
            <div><span className="k">Model number:</span> {product.sku}</div>
            {spec.metal && (
              <div>
                <span className="k">Metal:</span> {spec.metal.replace(/_/g, ' ')}
              </div>
            )}
            {spec.platinum_weight_g != null && (
              <div>
                <span className="k">Weight:</span> {spec.platinum_weight_g} g platinum
                {spec.gold_equiv_weight_g != null && ` (≈ ${spec.gold_equiv_weight_g} g gold)`}
              </div>
            )}
            {spec.ring_size && <div><span className="k">Ring size:</span> {spec.ring_size}</div>}
            {spec.stone_count != null && (
              <div>
                <span className="k">Accent stones:</span> {spec.stone_count}
                {spec.stone_size_mm ? ` × ${spec.stone_size_mm} mm` : ''}
                {spec.total_carats != null && spec.total_carats > 0 ? ` · ${spec.total_carats.toFixed(2)} ct total` : ''}
              </div>
            )}
            {(spec.stone_color || spec.stone_clarity) && (
              <div>
                <span className="k">Stone quality:</span>{' '}
                {[spec.stone_color, spec.stone_clarity].filter(Boolean).join(' · ')}
              </div>
            )}
            {spec.engraving && <div><span className="k">Engraving:</span> &ldquo;{spec.engraving}&rdquo;</div>}
          </div>
        </div>

        {centerDiamond && (centerDiamond.carat || centerDiamond.shape || centerDiamond.cert_number) && (
          <div className="invoice-section">
            <div className="invoice-section-title">Centre diamond</div>
            <div className="invoice-spec">
              {centerDiamond.carat != null && (
                <div><span className="k">Weight:</span> {centerDiamond.carat.toFixed(2)} ct</div>
              )}
              {centerDiamond.shape && (
                <div><span className="k">Shape:</span> {centerDiamond.shape}</div>
              )}
              {centerDiamond.color && (
                <div><span className="k">Color:</span> {centerDiamond.color}</div>
              )}
              {centerDiamond.clarity && (
                <div><span className="k">Clarity:</span> {centerDiamond.clarity}</div>
              )}
              {(centerDiamond.lab || centerDiamond.cert_number) && (
                <div>
                  <span className="k">Certificate:</span>{' '}
                  {[centerDiamond.lab, centerDiamond.cert_number].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="invoice-totals">
          <div className="invoice-totals-box">
            <div className="invoice-totals-row">
              <span>Piece subtotal</span>
              <span>${itemsSubtotal.toLocaleString('en-US')}</span>
            </div>
            <div className="invoice-totals-row">
              <span>Shipping</span>
              <span>
                {shippingCost > 0
                  ? `$${shippingCost.toLocaleString('en-US')}`
                  : 'Complimentary'}
              </span>
            </div>
            <div className="invoice-totals-row grand">
              <span>Total</span>
              <span>${order.total_usd.toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>

        <div className="invoice-balance">
          Amount paid: <b>${order.deposit_usd.toLocaleString('en-US')}</b>
          {balance > 0 && <><br />Balance due before shipping: <b>${balance.toLocaleString('en-US')}</b></>}
          {order.tracking_number && (
            <>
              <br /><br />
              Shipment via <b>{order.tracking_carrier ?? 'courier'}</b> · tracking{' '}
              <span style={{ fontFamily: 'monospace' }}>{order.tracking_number}</span>
            </>
          )}
        </div>

        <div className="invoice-footer">
          <em>Presence is a present.</em>
          Every DANHOV piece is handcrafted to order in Los Angeles · Lifetime craftsmanship warranty · 30-day return on non-customized pieces · One complimentary resizing within 60 days of delivery · Recycled gold · Conflict-free stones.
        </div>
      </div>
    </>
  );
}

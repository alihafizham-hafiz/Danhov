import type { Metadata } from 'next';
import PartnerForm from '@/components/PartnerForm';

export const metadata: Metadata = {
  title: 'Partner With Us · DANHOV Trade & B2B',
  description:
    'Carry DANHOV handcrafted jewelry in your store. We partner with independent jewelers, boutiques, and luxury retailers worldwide. Apply for a wholesale account today.',
  alternates: { canonical: '/partner' },
};

const BENEFITS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L15.8 9.2L22 11L15.8 12.8L14 19L12.2 12.8L6 11L12.2 9.2L14 3Z" fill="#AC3438" opacity="0.9"/>
        <circle cx="22" cy="22" r="2" fill="#AC3438" opacity="0.5"/>
      </svg>
    ),
    title: 'Exclusive Wholesale Pricing',
    body: 'Competitive margins on DANHOV\'s full catalog — engagement rings, wedding bands, fine jewelry, and men\'s collection.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="6" width="20" height="16" rx="2" stroke="#AC3438" strokeWidth="1.5" fill="none"/>
        <path d="M4 11h20" stroke="#AC3438" strokeWidth="1.5"/>
        <circle cx="9" cy="17" r="1.5" fill="#AC3438"/>
        <circle cx="14" cy="17" r="1.5" fill="#AC3438" opacity="0.5"/>
      </svg>
    ),
    title: 'No Inventory Risk',
    body: 'Every piece is made to order. You sell, we craft. No minimum orders, no unsold stock — a true made-to-order partnership.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke="#AC3438" strokeWidth="1.5" fill="none"/>
        <path d="M14 9v5l3 3" stroke="#AC3438" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: '3 Week Fulfillment',
    body: 'Handcrafted in Los Angeles, shipped white-glove and fully insured directly to your customer or store.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4C8.48 4 4 8.48 4 14s4.48 10 10 10 10-4.48 10-10S19.52 4 14 4Z" stroke="#AC3438" strokeWidth="1.5" fill="none"/>
        <path d="M10 14l3 3 5-5" stroke="#AC3438" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Dedicated Trade Rep',
    body: 'Every wholesale partner is assigned a dedicated account rep for orders, custom requests, and marketing support.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="5" y="5" width="18" height="18" rx="3" stroke="#AC3438" strokeWidth="1.5" fill="none"/>
        <path d="M9 14h10M9 10h6M9 18h8" stroke="#AC3438" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Co-branded Materials',
    body: 'High-res imagery, product descriptions, and brand storytelling assets available to all wholesale partners.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6Z" stroke="#AC3438" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      </svg>
    ),
    title: '#1 Sustainable Brand',
    body: 'Partner with the most sustainable jewelry house in the US. Recycled gold, conflict-free stones — a story your customers will love.',
  },
];

const PARTNER_TYPES = [
  { label: 'Independent Jeweler', desc: 'Expand your case with handcrafted Los Angeles gold without the inventory burden.' },
  { label: 'Luxury Boutique', desc: 'Offer a curated selection of DANHOV\'s most distinctive engagement and fine jewelry pieces.' },
  { label: 'Department Store', desc: 'Wholesale accounts with volume pricing, co-op advertising, and dedicated in-store support.' },
  { label: 'Online Retailer', desc: 'Drop-ship integration available. We fulfill directly under your branding.' },
];

export default function PartnerPage() {
  return (
    <main className="partner-page">
      <style>{`
        .partner-page { font-family: 'Cormorant Garamond', serif; color: #1a1410; }

        /* Hero */
        .partner-hero {
          background: linear-gradient(160deg, #1a1410 0%, #2c1f18 55%, #3d2a20 100%);
          padding: 120px 24px 100px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .partner-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 60%, rgba(172,52,56,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .partner-eyebrow {
          font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          color: #AC3438; margin-bottom: 20px; display: block;
        }
        .partner-hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 400; color: #faf6f1; line-height: 1.15;
          margin: 0 auto 24px; max-width: 760px;
        }
        .partner-hero-sub {
          font-size: 16px; color: #c4b8ad; line-height: 1.7;
          max-width: 560px; margin: 0 auto 48px;
        }
        .partner-hero-cta {
          display: inline-block;
          background: #AC3438; color: #fff;
          padding: 14px 40px; border-radius: 999px;
          font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;
          text-decoration: none; transition: background 0.2s;
        }
        .partner-hero-cta:hover { background: #8B2A2D; }

        /* Partner types */
        .partner-types {
          background: #faf6f1; padding: 80px 24px;
        }
        .partner-types-inner { max-width: 1100px; margin: 0 auto; }
        .partner-section-label {
          text-align: center; font-size: 11px; letter-spacing: 0.18em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 12px;
        }
        .partner-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 4vw, 42px); font-weight: 400;
          text-align: center; color: #1a1410; margin: 0 0 56px;
        }
        .partner-types-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
        }
        .partner-type-card {
          background: #fff; border: 1px solid rgba(172,52,56,0.12);
          border-radius: 8px; padding: 28px 24px;
        }
        .partner-type-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; color: #1a1410; margin-bottom: 10px;
        }
        .partner-type-desc { font-size: 14px; color: #6b5e57; line-height: 1.6; }

        /* Benefits */
        .partner-benefits { background: #fff; padding: 80px 24px; }
        .partner-benefits-inner { max-width: 1100px; margin: 0 auto; }
        .partner-benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px; margin-top: 56px;
        }
        .partner-benefit {
          display: flex; gap: 18px; align-items: flex-start;
        }
        .partner-benefit-icon { flex-shrink: 0; margin-top: 2px; }
        .partner-benefit-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; color: #1a1410; margin-bottom: 6px;
        }
        .partner-benefit-body { font-size: 14px; color: #6b5e57; line-height: 1.65; }

        /* Application form */
        .partner-apply { background: #faf6f1; padding: 80px 24px; }
        .partner-apply-inner { max-width: 680px; margin: 0 auto; }
        .partner-apply-intro {
          font-size: 15px; color: #6b5e57; line-height: 1.7;
          text-align: center; margin-bottom: 48px;
        }
        .partner-form { display: flex; flex-direction: column; gap: 20px; }
        .partner-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .partner-form-group { display: flex; flex-direction: column; gap: 6px; }
        .partner-form-group label {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          color: #8a7f76;
        }
        .partner-form-group input,
        .partner-form-group select,
        .partner-form-group textarea {
          border: 1px solid #d4c9c0; border-radius: 6px;
          padding: 11px 14px; font-size: 14px; font-family: 'Cormorant Garamond', serif;
          background: #fff; color: #1a1410; outline: none;
          transition: border-color 0.15s;
        }
        .partner-form-group input:focus,
        .partner-form-group select:focus,
        .partner-form-group textarea:focus { border-color: #AC3438; }
        .partner-form-group textarea { resize: vertical; min-height: 100px; }
        .partner-submit {
          background: #1a1410; color: #faf6f1;
          border: none; border-radius: 999px; cursor: pointer;
          padding: 14px 40px; font-size: 13px; font-family: 'Cormorant Garamond', serif;
          letter-spacing: 0.12em; text-transform: uppercase;
          align-self: center; transition: background 0.2s;
        }
        .partner-submit:hover { background: #8B2A2D; }

        /* Trade contact strip */
        .partner-contact {
          background: linear-gradient(135deg, #1a1410 0%, #2c1f18 100%);
          padding: 60px 24px; text-align: center;
        }
        .partner-contact h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px; font-weight: 400; color: #faf6f1; margin-bottom: 12px;
        }
        .partner-contact p { font-size: 15px; color: #c4b8ad; margin-bottom: 28px; }
        .partner-contact a {
          color: #AC3438; font-size: 18px; text-decoration: none;
          border-bottom: 1px solid rgba(172,52,56,0.3);
          padding-bottom: 2px; transition: border-color 0.15s;
        }
        .partner-contact a:hover { border-color: #AC3438; }

        @media (max-width: 640px) {
          .partner-form-row { grid-template-columns: 1fr; }
          .partner-hero { padding: 80px 20px 64px; }
        }
      `}</style>

      {/* Hero */}
      <section className="partner-hero">
        <span className="partner-eyebrow">Trade &amp; Wholesale</span>
        <h1>Partner With DANHOV</h1>
        <p className="partner-hero-sub">
          We are a designer and manufacturer. Bring handcrafted Los Angeles jewelry
          to your customers — with no inventory risk, dedicated support, and the
          story of a house built on sacred geometry and eternal love.
        </p>
        <a href="#apply" className="partner-hero-cta">Apply for a Wholesale Account</a>
      </section>

      {/* Who we partner with */}
      <section className="partner-types">
        <div className="partner-types-inner">
          <p className="partner-section-label">Who We Work With</p>
          <h2 className="partner-section-title">Built for the finest retailers</h2>
          <div className="partner-types-grid">
            {PARTNER_TYPES.map((t) => (
              <div key={t.label} className="partner-type-card">
                <p className="partner-type-label">{t.label}</p>
                <p className="partner-type-desc">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="partner-benefits">
        <div className="partner-benefits-inner">
          <p className="partner-section-label">The Partnership</p>
          <h2 className="partner-section-title" style={{ textAlign: 'center' }}>Why retailers choose DANHOV</h2>
          <div className="partner-benefits-grid">
            {BENEFITS.map((b) => (
              <div key={b.title} className="partner-benefit">
                <div className="partner-benefit-icon">{b.icon}</div>
                <div>
                  <p className="partner-benefit-title">{b.title}</p>
                  <p className="partner-benefit-body">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="partner-apply" id="apply">
        <div className="partner-apply-inner">
          <p className="partner-section-label" style={{ textAlign: 'center' }}>Wholesale Application</p>
          <h2 className="partner-section-title">Apply for a Trade Account</h2>
          <p className="partner-apply-intro">
            Complete the form below and a DANHOV trade specialist will respond within
            one business day. All applications are reviewed individually.
          </p>
          <PartnerForm />
        </div>
      </section>

      {/* Direct contact */}
      <section className="partner-contact">
        <h2>Ready to talk trade?</h2>
        <p>Our trade team is available Monday–Friday, 9am–6pm PST.</p>
        <a href="mailto:trade@danhov.com">trade@danhov.com</a>
      </section>
    </main>
  );
}

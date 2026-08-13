import type { Metadata } from 'next';
import Link from 'next/link';
import GiftCardBalanceChecker from './GiftCardBalanceChecker';

export const metadata: Metadata = {
  title: 'Gift Cards · DANHOV Luxury Jewelry',
  description:
    'Give the gift of a handcrafted DANHOV piece. Gift cards are delivered instantly by email, never expire, and redeem on any engagement ring, wedding band, or fine jewelry.',
  alternates: { canonical: '/gift-cards' },
};

export default function GiftCardsPage() {
  return (
    <main style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", color: '#1a1410', background: '#faf6f1' }}>
      <style>{`
        /* ── Hero ── */
        .gc-hero {
          background: linear-gradient(160deg, #1a1410 0%, #2c1f18 55%, #3d2a20 100%);
          padding: 90px 24px 80px; position: relative; overflow: hidden;
          display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;
          max-width: 100%;
        }
        .gc-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 50% at 70% 60%, rgba(172,52,56,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .gc-hero-text { position: relative; z-index: 1; padding: 0 24px 0 max(24px, calc((100vw - 1200px)/2)); }
        .gc-hero-eyebrow {
          display: block; font-size: 11px; letter-spacing: 0.22em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 18px;
        }
        .gc-hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(32px, 4.5vw, 56px); font-weight: 400;
          color: #faf6f1; margin: 0 0 20px; line-height: 1.12;
        }
        .gc-hero-sub {
          font-size: 15px; color: #c4b8ad; max-width: 440px; line-height: 1.7; margin-bottom: 36px;
        }
        .gc-hero-cta {
          display: inline-block; padding: 16px 44px;
          background: #AC3438; color: #fff;
          font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
          text-decoration: none; border-radius: 4px;
          transition: background 0.2s;
        }
        .gc-hero-cta:hover { background: #8f2b2e; }
        .gc-hero-card-wrap { position: relative; z-index: 1; padding-right: max(24px, calc((100vw - 1200px)/2)); }
        .gc-preview-card {
          width: 100%; max-width: 420px; aspect-ratio: 1.586;
          background: linear-gradient(135deg, #1a1410 0%, #3d2a20 50%, #1a1410 100%);
          border-radius: 16px; padding: 28px 32px;
          display: flex; flex-direction: column; justify-content: space-between;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3);
          position: relative; overflow: hidden;
        }
        .gc-preview-card::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 60% at 80% 20%, rgba(172,52,56,0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .gc-card-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px; color: #faf6f1; letter-spacing: 0.15em;
          position: relative; z-index: 1;
        }
        .gc-card-tagline {
          font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(250,246,241,0.4); margin-top: 4px; position: relative; z-index: 1;
        }
        .gc-card-bottom { position: relative; z-index: 1; }
        .gc-card-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 38px; color: #faf6f1; line-height: 1; margin-bottom: 6px;
        }
        .gc-card-footer {
          display: flex; justify-content: space-between;
          font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(250,246,241,0.35);
        }

        /* ── 3-card grid ── */
        .gc-cards-section { padding: 72px 24px; background: #fff; }
        .gc-cards-inner { max-width: 1040px; margin: 0 auto; }
        .gc-section-eyebrow {
          display: block; font-size: 11px; letter-spacing: 0.18em;
          text-transform: uppercase; color: #AC3438; text-align: center; margin-bottom: 12px;
        }
        .gc-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(24px, 3.5vw, 36px); font-weight: 400;
          text-align: center; color: #1a1410; margin: 0 0 44px;
        }
        .gc-service-cards {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;
        }
        .gc-service-card {
          border: 1px solid #ede8e2; border-radius: 10px; padding: 32px 28px;
          display: flex; flex-direction: column; gap: 16px; background: #faf6f1;
          align-items: center; text-align: center;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .gc-service-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08); border-color: #d4c9c0; }
        .gc-service-card.featured {
          border-color: #AC3438; border-width: 2px;
          box-shadow: 0 8px 32px rgba(172,52,56,0.1);
        }
        .gc-service-icon {
          width: 48px; height: 48px; border-radius: 50%;
          background: #1a1410; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .gc-service-card.featured .gc-service-icon { background: #AC3438; }
        .gc-service-name {
          font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #1a1410;
        }
        .gc-service-desc { font-size: 13.5px; color: #6b5e57; line-height: 1.65; flex: 1; }
        .gc-service-link {
          display: inline-block; padding: 11px 28px; border-radius: 4px;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          text-decoration: none; align-self: flex-start; transition: all 0.2s;
          background: #AC3438; color: #fff; border: 1px solid #AC3438;
        }
        .gc-service-link:hover { background: #8B2A2D; border-color: #8B2A2D; }
        .gc-service-link.outline { background: transparent; color: #AC3438; border-color: rgba(172,52,56,0.4); }
        .gc-service-link.outline:hover { background: #AC3438; color: #fff; border-color: #AC3438; }

        /* ── How it works ── */
        .gc-how { background: #faf6f1; padding: 72px 24px; }
        .gc-how-inner { max-width: 960px; margin: 0 auto; }
        .gc-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; margin-top: 0; }
        .gc-step { text-align: center; }
        .gc-step-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 48px; color: #AC3438; line-height: 1;
          display: block; margin-bottom: 12px;
        }
        .gc-step-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: #1a1410; margin-bottom: 8px; }
        .gc-step-body { font-size: 13.5px; color: #6b5e57; line-height: 1.65; }

        /* ── Perks strip ── */
        .gc-perks { background: #1a1410; padding: 40px 24px; }
        .gc-perks-inner { max-width: 960px; margin: 0 auto; display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
        .gc-perk { text-align: center; color: #faf6f1; }
        .gc-perk-icon { font-size: 22px; margin-bottom: 6px; color: #AC3438; }
        .gc-perk-label { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.75; }

        /* ── Fine print ── */
        .gc-fine { background: #fff; padding: 40px 24px; text-align: center; }
        .gc-fine p { font-size: 13px; color: #9c8f86; line-height: 1.7; max-width: 560px; margin: 0 auto; }
        .gc-fine a { color: #AC3438; text-decoration: none; }

        @media (max-width: 768px) {
          .gc-hero { grid-template-columns: 1fr; padding: 64px 20px 52px; text-align: center; }
          .gc-hero-text { padding: 0; }
          .gc-hero-sub, .gc-hero-cta { margin-left: auto; margin-right: auto; }
          .gc-hero-card-wrap { display: none; }
          .gc-perks-inner { gap: 28px; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="gc-hero">
        <div className="gc-hero-text">
          <span className="gc-hero-eyebrow">Gift Cards</span>
          <h1>Give the Gift of Handcrafted Gold</h1>
          <p className="gc-hero-sub">
            A DANHOV gift card is delivered instantly, never expires, and redeems
            against any piece in the collection — including custom commissions.
          </p>
          <Link href="/gift-cards/buy" className="gc-hero-cta">
            Buy a Gift Card
          </Link>
        </div>
        <div className="gc-hero-card-wrap">
          <div className="gc-preview-card">
            <div>
              <div className="gc-card-logo">DANHOV</div>
              <div className="gc-card-tagline">Handcrafted in Los Angeles · Est. 1984</div>
            </div>
            <div className="gc-card-bottom">
              <div className="gc-card-amount">$500</div>
              <div className="gc-card-footer">
                <span>Gift Card</span>
                <span>Never Expires</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Service cards ── */}
      <section className="gc-cards-section">
        <div className="gc-cards-inner">
          <span className="gc-section-eyebrow">Gift Card Services</span>
          <h2 className="gc-section-title">Everything you need</h2>
          <div className="gc-service-cards">
            {/* Buy */}
            <div className="gc-service-card featured">
              <div className="gc-service-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#faf6f1" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div>
                <p className="gc-service-name">Buy a Gift Card</p>
                <p className="gc-service-desc">
                  Choose any amount from $100 to $10,000. Send to a friend or keep for yourself.
                  Delivered instantly by email on the date you choose.
                </p>
              </div>
              <Link href="/gift-cards/buy" className="gc-service-link">
                Buy Now →
              </Link>
            </div>
            {/* Check Balance */}
            <div className="gc-service-card">
              <div className="gc-service-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#faf6f1" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/><path d="M12 8v4l3 3"/>
                </svg>
              </div>
              <div>
                <p className="gc-service-name">Check Balance</p>
                <p className="gc-service-desc">
                  Already have a DANHOV gift card? Enter your code below to see the remaining balance and card status.
                </p>
              </div>
              <GiftCardBalanceChecker />
            </div>
            {/* Corporate */}
            <div className="gc-service-card">
              <div className="gc-service-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#faf6f1" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <p className="gc-service-name">Corporate & Bulk</p>
                <p className="gc-service-desc">
                  Gifting for a team, event, or client? We offer custom denominations and branded
                  packaging for bulk orders of 10 or more.
                </p>
              </div>
              <a href="mailto:care@danhov.com?subject=Corporate Gift Card Inquiry" className="gc-service-link outline">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="gc-how">
        <div className="gc-how-inner">
          <span className="gc-section-eyebrow">How It Works</span>
          <h2 className="gc-section-title">Simple, beautiful, instant</h2>
          <div className="gc-steps">
            {[
              { n: '01', title: 'Choose an amount', body: 'Select from $100 to $10,000 or enter any custom value. Pick a quantity if gifting multiple.' },
              { n: '02', title: 'Personalize it', body: 'Add a recipient name, personal message, and choose an instant or scheduled delivery date.' },
              { n: '03', title: 'Delivered by email', body: 'A branded DANHOV gift card arrives in the recipient\'s inbox on your chosen date, with your message included.' },
              { n: '04', title: 'Redeemed at checkout', body: 'The recipient enters the code at checkout — valid on any piece in the collection, including custom commissions. No expiry, no fees.' },
            ].map((s) => (
              <div key={s.n} className="gc-step">
                <span className="gc-step-num">{s.n}</span>
                <p className="gc-step-title">{s.title}</p>
                <p className="gc-step-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Perks strip ── */}
      <div className="gc-perks">
        <div className="gc-perks-inner">
          {[
            { icon: '✦', label: 'Instant Email Delivery' },
            { icon: '◇', label: 'Never Expires' },
            { icon: '✧', label: 'No Hidden Fees' },
            { icon: '◈', label: 'Any Denomination' },
          ].map((p) => (
            <div key={p.label} className="gc-perk">
              <div className="gc-perk-icon">{p.icon}</div>
              <div className="gc-perk-label">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fine print ── */}
      <div className="gc-fine">
        <p>
          Gift cards are non-refundable and cannot be exchanged for cash. Balances roll over and never expire.
          Questions? Contact us at{' '}
          <a href="mailto:care@danhov.com">care@danhov.com</a> or call{' '}
          <a href="tel:+14244214072">(424) 421-4072</a>.
        </p>
      </div>
    </main>
  );
}

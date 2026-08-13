import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sustainability Report · DANHOV Jewelry',
  description:
    'DANHOV sustainability report — 100% recycled gold, conflict-free stones, handcrafted in Los Angeles since 1984. Jewelry built on love, not compromise.',
  alternates: { canonical: '/sustainability' },
};

const PILLARS = [
  {
    title: 'Recycled Gold',
    bullets: ['100% recycled 14K & 18K gold', 'No newly mined metal, ever', 'Same purity, zero compromise'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#faf6f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    ),
  },
  {
    title: 'Conflict-Free Stones',
    bullets: ['GIA & AGS-certified diamonds', 'Kimberley Process compliant', 'Full mine-to-setting traceability'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#faf6f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20M12 22V9"/>
        <path d="M6 3l4 6M18 3l-4 6"/>
      </svg>
    ),
  },
  {
    title: 'Made in Los Angeles',
    bullets: ['Every piece crafted in our LA atelier', 'Master jewelers earning living wages', 'No offshore manufacturing'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#faf6f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    title: 'Made to Order',
    bullets: ['Zero speculative production', 'No unsold inventory or waste', 'Your piece, made for you alone'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#faf6f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
];

const SECTIONS = [
  {
    num: '01',
    title: 'We Source Only Recycled Gold',
    body: 'Since our founding in 1984, DANHOV has never used newly mined gold. Every ring, band, and pendant we craft is made from 100% recycled 14K and 18K gold — metal already in the world, transformed into something worth keeping forever. We believe the earth has given enough. Our job is to work beautifully with what already exists.',
    image: '/triad-vortex.jpg',
    alt: 'DANHOV ring crafted from recycled gold',
    reverse: false,
  },
  {
    num: '02',
    title: 'Conflict-Free Stones, Every Time',
    body: 'Every diamond and gemstone that enters our atelier is conflict-free and ethically traced from mine to setting. Natural diamonds are GIA or AGS certified. Lab-grown stones meet the same standard. We believe a ring built to mark love should carry no burden of harm — and we trace every stone to make sure it doesn\'t.',
    image: '/phil-3.jpg',
    alt: 'DANHOV atelier crafting ethically sourced jewelry',
    reverse: true,
  },
  {
    num: '03',
    title: 'Handcrafted in Los Angeles',
    body: 'Our atelier has been in Los Angeles for over four decades. Every piece is made by master jewelers who are paid living wages, receive full healthcare benefits, and have a genuine stake in the quality of what they create. No offshore production. No shortcuts. The hands that shape your ring are the same hands that have shaped DANHOV since 1984.',
    image: '/triad-galaxy.png',
    alt: 'DANHOV ring handcrafted in Los Angeles',
    reverse: false,
  },
  {
    num: '04',
    title: 'Made to Order — Nothing Wasted',
    body: 'We produce nothing speculatively. Every DANHOV piece is commissioned before it is made — eliminating overstock, unsold inventory, and the quiet waste that mass production treats as the cost of doing business. When you order, we begin. Not before. This is how fine jewelry has always worked, and how we intend to keep working.',
    image: '/phil-4.jpg',
    alt: 'DANHOV bespoke commission made to order',
    reverse: true,
  },
  {
    num: '05',
    title: 'Packaging Without Plastic',
    body: 'The box your ring arrives in is made from FSC-certified, plastic-free materials — designed to be kept, not discarded. We view packaging as part of the piece, not an afterthought. No bubble wrap, no styrofoam, no unnecessary inserts. Just materials that were made thoughtfully, for something made to last.',
    image: '/phil-5.jpg',
    alt: 'DANHOV sustainable packaging',
    reverse: false,
  },
];

export default function SustainabilityPage() {
  return (
    <main style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", color: '#1a1410', background: '#faf6f1' }}>
      <style>{`
        /* ── Breadcrumb ── */
        .sr-crumb {
          padding: 14px max(24px, calc((100vw - 1200px)/2));
          font-size: 12px; color: #9c8f86; background: #fff;
          border-bottom: 1px solid #ede8e2;
          display: flex; align-items: center; gap: 8px;
        }
        .sr-crumb a { color: #AC3438; text-decoration: none; }
        .sr-crumb a:hover { text-decoration: underline; }

        /* ── Hero ── */
        .sr-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 560px;
          background: #faf6f1;
          position: relative;
        }
        .sr-hero-left {
          padding: 72px max(24px, calc((100vw - 1200px)/2 + 24px)) 72px max(48px, calc((100vw - 1200px)/2 + 48px));
          display: flex; flex-direction: column; justify-content: center; gap: 20px;
          position: relative; z-index: 1;
        }
        .sr-hero-eyebrow {
          font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
          color: #AC3438; display: block;
        }
        .sr-hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(34px, 4vw, 54px); font-weight: 400;
          color: #1a1410; margin: 0; line-height: 1.1;
        }
        .sr-hero-year {
          font-size: 13px; letter-spacing: 0.14em; color: #9c8f86;
          text-transform: uppercase;
        }
        .sr-hero-body {
          font-size: 15px; color: #6b5e57; line-height: 1.75;
          max-width: 420px;
        }
        .sr-hero-cta {
          display: inline-block; padding: 14px 36px;
          background: #AC3438; color: #faf6f1;
          font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
          text-decoration: none; align-self: flex-start;
          border-radius: 999px;
          transition: background 0.2s;
        }
        .sr-hero-cta:hover { background: #8f2b2e; }

        .sr-hero-right {
          position: relative; overflow: hidden;
          background: #faf6f1;
        }
        .sr-hero-side-label {
          position: absolute; right: 0; top: 50%;
          transform: translateY(-50%) rotate(90deg);
          transform-origin: center;
          font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase;
          color: rgba(250,246,241,0.5);
          white-space: nowrap; writing-mode: horizontal-tb;
          padding: 8px 12px;
        }

        /* ── Journey section ── */
        .sr-journey {
          background: #fff; padding: 88px 24px;
        }
        .sr-journey-inner { max-width: 760px; margin: 0 auto; text-align: center; }
        .sr-label {
          display: block; font-size: 11px; letter-spacing: 0.2em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 16px;
        }
        .sr-journey h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(26px, 3.5vw, 38px); font-weight: 400;
          color: #1a1410; margin: 0 0 24px;
        }
        .sr-journey-body {
          font-size: 15px; color: #6b5e57; line-height: 1.8; margin: 0 0 40px;
        }
        .sr-journey-stats {
          display: flex; justify-content: center; gap: 48px; flex-wrap: wrap;
          padding-top: 32px; border-top: 1px solid #ede8e2;
        }
        .sr-stat { text-align: center; }
        .sr-stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px; color: #AC3438; line-height: 1; display: block;
        }
        .sr-stat-label {
          font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
          color: #8a7f76; margin-top: 4px; display: block;
        }

        /* ── How We Do It pillars ── */
        .sr-pillars {
          background: #faf6f1; padding: 88px 24px;
        }
        .sr-pillars-inner { max-width: 1100px; margin: 0 auto; }
        .sr-pillars h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(26px, 3.5vw, 38px); font-weight: 400;
          text-align: center; color: #1a1410; margin: 0 0 56px;
        }
        .sr-pillars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 28px;
        }
        .sr-pillar-card {
          background: #fff; border: 1px solid #ede8e2;
          padding: 32px 24px; display: flex; flex-direction: column; gap: 18px;
          transition: box-shadow 0.2s;
        }
        .sr-pillar-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .sr-pillar-icon {
          width: 52px; height: 52px; border-radius: 50%;
          background: #AC3438; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; align-self: center;
        }
        .sr-pillar-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; color: #1a1410; text-align: center;
        }
        .sr-pillar-bullets {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .sr-pillar-bullets li {
          font-size: 13px; color: #6b5e57; display: flex; gap: 9px; align-items: flex-start; line-height: 1.5;
        }
        .sr-pillar-bullets li::before {
          content: '—'; color: #AC3438; flex-shrink: 0; font-size: 12px; margin-top: 1px;
        }

        /* ── Alternating sections ── */
        .sr-sections { background: #fff; }
        .sr-section {
          display: grid; grid-template-columns: 1fr 1fr;
          min-height: 500px; border-bottom: 1px solid #ede8e2;
        }
        /* Reversed: image moves to left column */
        .sr-section.reverse .sr-section-img { order: -1; }

        .sr-section-text {
          padding: 72px 56px; display: flex; flex-direction: column;
          justify-content: center; gap: 20px;
        }
        .sr-section-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 80px; color: rgba(172,52,56,0.1); line-height: 1;
          display: block; margin-bottom: -8px;
        }
        .sr-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(22px, 2.5vw, 32px); color: #1a1410; font-weight: 400;
          margin: 0;
        }
        .sr-section-divider {
          width: 40px; height: 2px; background: #AC3438; flex-shrink: 0;
        }
        .sr-section-body {
          font-size: 14.5px; color: #6b5e57; line-height: 1.8; margin: 0; max-width: 420px;
        }

        /* Section images — contained with cream bg so full image is visible */
        .sr-section-img {
          position: relative; overflow: hidden; background: #fff;
        }
        .sr-section-img img {
          width: 100%; height: 100%; object-fit: contain;
          transition: transform 0.4s ease;
        }
        .sr-section:hover .sr-section-img img { transform: scale(1.02); }

        /* ── CTA ── */
        .sr-cta {
          background: #1a1410; padding: 96px 24px; text-align: center; position: relative; overflow: hidden;
        }
        .sr-cta::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(172,52,56,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .sr-cta-label {
          display: block; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(250,246,241,0.8); margin-bottom: 18px; position: relative; z-index: 1;
        }
        .sr-cta h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 4vw, 48px); font-weight: 400;
          color: #faf6f1; margin: 0 0 16px; max-width: 640px; margin-inline: auto;
          position: relative; z-index: 1;
        }
        .sr-cta p {
          font-size: 15px; color: rgba(250,246,241,0.65); line-height: 1.7;
          max-width: 480px; margin: 0 auto 40px;
          position: relative; z-index: 1;
        }
        .sr-cta-buttons {
          display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;
          position: relative; z-index: 1;
        }
        .sr-cta-btn-primary {
          display: inline-block; padding: 15px 44px;
          background: #AC3438; color: #fff;
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          text-decoration: none; border-radius: 999px; transition: background 0.2s;
        }
        .sr-cta-btn-primary:hover { background: #8f2b2e; }
        .sr-cta-btn-outline {
          display: inline-block; padding: 15px 44px;
          border: 1px solid rgba(250,246,241,0.35); color: rgba(250,246,241,0.8);
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          text-decoration: none; border-radius: 999px; transition: all 0.2s;
        }
        .sr-cta-btn-outline:hover { border-color: #faf6f1; color: #faf6f1; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .sr-hero { grid-template-columns: 1fr; min-height: auto; }
          .sr-hero-right { height: 380px; }
          .sr-hero-left { padding: 56px 24px; }
          .sr-pillars-grid { grid-template-columns: 1fr 1fr; }
          .sr-section { grid-template-columns: 1fr; }
          .sr-section.reverse .sr-section-img { order: 0; }
          .sr-section-text { padding: 48px 24px; }
          .sr-section-img { height: 360px; }
          .sr-section-num { font-size: 56px; }
        }
        @media (max-width: 600px) {
          .sr-pillars-grid { grid-template-columns: 1fr; }
          .sr-journey-stats { gap: 28px; }
          .sr-cta { padding: 64px 20px; }
        }
      `}</style>

      {/* ── Breadcrumb ── */}
      <nav className="sr-crumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>›</span>
        <span>Sustainability Report</span>
      </nav>

      {/* ── Hero ── */}
      <section className="sr-hero">
        <div className="sr-hero-left">
          <span className="sr-hero-eyebrow">Sustainability Report · 2024</span>
          <h1>Jewelry That Gives Back More Than It Takes</h1>
          <p className="sr-hero-body">
            Since 1984, every decision we make — the gold we use, the stones we source,
            the hands that craft each piece, and the box it ships in — is guided by
            a single principle: leave the world more whole than you found it.
          </p>
          <Link href="/engagement-rings" className="sr-hero-cta">
            Shop the Collection
          </Link>
        </div>
        <div className="sr-hero-right">
          <Image
            src="/triad-galaxy-cut.png"
            alt="DANHOV handcrafted ring"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
          <span className="sr-hero-side-label" style={{ color: 'rgba(26,20,16,0.3)' }}>DANHOV · SUSTAINABILITY REPORT · 2024</span>
        </div>
      </section>

      {/* ── Our Journey ── */}
      <section className="sr-journey">
        <div className="sr-journey-inner">
          <span className="sr-label">Our Journey</span>
          <h2>Toward a More Responsible Fine Jewelry</h2>
          <p className="sr-journey-body">
            DANHOV was founded in Los Angeles in 1984 with an obsession: to create jewelry
            of enduring beauty without enduring harm. Over four decades, we have built that
            commitment into every layer of how we operate — not as a marketing story, but as
            the only way we know how to work. 100% recycled gold. Conflict-free, certified
            stones. Every piece made to order by artisans earning living wages in our
            Los Angeles atelier. We have never compromised on these principles, and we
            have no intention of starting now.
          </p>
          <div className="sr-journey-stats">
            {[
              { num: '1984', label: 'Founded in LA' },
              { num: '100%', label: 'Recycled Gold' },
              { num: '100%', label: 'Conflict-Free' },
              { num: '0', label: 'Plastic Packaging' },
            ].map((s) => (
              <div key={s.label} className="sr-stat">
                <span className="sr-stat-num">{s.num}</span>
                <span className="sr-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How We Do It ── */}
      <section className="sr-pillars">
        <div className="sr-pillars-inner">
          <span className="sr-label" style={{ textAlign: 'center', display: 'block' }}>How We Do It</span>
          <h2>Four Commitments We Never Compromise</h2>
          <div className="sr-pillars-grid">
            {PILLARS.map((p) => (
              <div key={p.title} className="sr-pillar-card">
                <div className="sr-pillar-icon">{p.icon}</div>
                <p className="sr-pillar-title">{p.title}</p>
                <ul className="sr-pillar-bullets">
                  {p.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Numbered alternating sections ── */}
      <div className="sr-sections">
        {SECTIONS.map((s) => (
          <div
            key={s.num}
            className={`sr-section${s.reverse ? ' reverse' : ''}`}
          >
            <div className="sr-section-text">
              <span className="sr-section-num">{s.num}</span>
              <h3 className="sr-section-title">{s.title}</h3>
              <div className="sr-section-divider" />
              <p className="sr-section-body">{s.body}</p>
            </div>
            <div className="sr-section-img">
              <Image
                src={s.image}
                alt={s.alt}
                fill
                style={{ objectFit: 'contain' }}
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <section className="sr-cta">
        <span className="sr-cta-label">In It Together</span>
        <h2>Every piece you commission is a vote for how jewelry should be made.</h2>
        <p>
          When you choose DANHOV, you choose recycled gold, certified stones,
          living-wage craft, and zero waste. And you choose something made to last
          longer than a trend.
        </p>
        <div className="sr-cta-buttons">
          <Link href="/engagement-rings" className="sr-cta-btn-primary">
            Explore the Collection
          </Link>
          <Link href="/ring-builder/setting" className="sr-cta-btn-outline">
            Build Your Ring
          </Link>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import HomepageScripts from '@/components/HomepageScripts';
import HeroVideo from '@/components/HeroVideo';
import ScrollToHash from '@/components/ScrollToHash';
import AIDesignSection from '@/components/AIDesignSection';
import FindFormSection from '@/components/FindFormSection';
import CategoryCardsSection from '@/components/CategoryCardsSection';
import AbbraccioStorySection from '@/components/AbbraccioStorySection';
import WhyDanhovSection from '@/components/WhyDanhovSection';
import CoCreateSection from '@/components/CoCreateSection';
import DailySignpostSection from '@/components/DailySignpostSection';
import InvitationsMoreSection from '@/components/InvitationsMoreSection';
import HeritageSection from '@/components/HeritageSection';
import TrustProofSection from '@/components/TrustProofSection';
import {
  buildLocalBusiness,
  buildWebSite,
  jsonLdScript,
} from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Handcrafted Luxury Jewelry · Los Angeles · Est. 1984',
  description:
    'Discover DANHOV — luxury handcrafted engagement rings, wedding bands, and fine jewelry in 14k or 18k gold. Made to order in Los Angeles since 1984. Lifetime craftsmanship warranty.',
  alternates: { canonical: '/' },
};

export const revalidate = 300;

export default async function HomePage() {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/jack-70/30min';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(buildLocalBusiness())}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(buildWebSite())}
      />

      <HomepageScripts />
      <ScrollToHash />

      {/* ── HERO — cinematic: galaxy → water vortex → Abbraccio reveal.
             The brand film already carries that arc, so it *is* the hero
             rather than a section below it (brief §1). ─────────────────── */}
      <section className="hero hero-cine">
        <HeroVideo />
        {/* Veil — keeps the headline legible over the brightest frames of the
            vortex without flattening the imagery behind it. */}
        <div className="hero-cine-veil" aria-hidden="true" />

        <div className="hero-content hero-cine-inner">
          <h1 className="hero-headline">
            <span className="ch-line ch-headline ch-headline-accent" id="chLine1">
              You Already Are One.
            </span>
          </h1>
          <div className="hero-rule" id="chDiv" />
          <p className="ch-line ch-philosophy" id="chLine3">
            Love is remembering.
          </p>

          <div className="ch-line hero-cine-ctas" id="heroFounder" style={{ opacity: 0 }}>
            <Link href="/ring-builder" className="hero-cine-cta hero-cine-cta--primary">
              Build Your Ring
            </Link>
            <a
              href={calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-cine-cta hero-cine-cta--ghost"
            >
              Book Appointment
            </a>
          </div>
        </div>
      </section>

      {/* ══ PHILOSOPHY ═══════════════════════════════════════════════ */}

      {/* ── THE DANHOV STORY — Abbraccio: one wire → two → one ───── */}
      <AbbraccioStorySection />

      {/* ── A MESSAGE FROM JACK ──────────────────────────────────── */}
      <section style={{
        background: '#0a0806',
        padding: 'clamp(10px, 1.4vw, 18px) clamp(16px, 2vw, 28px)',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
          fontSize: 'clamp(9px, 1vw, 11px)',
          letterSpacing: '0.38em',
          textTransform: 'uppercase',
          color: 'rgba(242,236,228,0.75)',
          marginBottom: '0.6em',
        }}>
          A Message from Jack
        </p>
        <p className="jack-quote">
          &ldquo;In silence, I saw the oneness of the universe&nbsp;&mdash; and that we are not part of it. We <em>are</em> it. There, in that stillness, I caught the design of the ring, which is the universe itself. The kingdom of heaven is not out there to be searched for&nbsp;&mdash; it is inside us. I was only the one it came through, to gift it to humanity as the Self&nbsp;Love Ring.&rdquo;
        </p>
        <p style={{
          fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
          fontSize: 'clamp(9px, 0.95vw, 11px)',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'rgba(242,236,228,0.45)',
        }}>
          — Jack Hovsepian &nbsp;·&nbsp; Founder, DANHOV &nbsp;·&nbsp; Est. 1984
        </p>
      </section>

      {/* ── DAILY SIGNPOST ───────────────────────────────────────── */}
      <DailySignpostSection />

      {/* ── CRAFT & TRUST ────────────────────────────────────────── */}
      <HeritageSection />
      {/* ── WHY DANHOV — value proposition ───────────────────────── */}
      <WhyDanhovSection />

      {/* ── FEATURED IN ──────────────────────────────────────────── */}
      <div className="featured-eyebrow">AS SEEN IN</div>
      <div className="featured-section">
        <div className="featured-logos">
          {[0, 1].map((set) => (
            <div key={set} className="featured-set" aria-hidden={set === 1 ? true : undefined}>
              <span className="featured-logo">
                <svg height="28" viewBox="0 0 136 28" xmlns="http://www.w3.org/2000/svg">
                  <text y="24" fontFamily="'Cormorant Garamond',serif" fontSize="25" fontWeight="800" fill="#111111" letterSpacing="6">VOGUE</text>
                </svg>
              </span>
              <span className="featured-logo">
                <svg height="42" viewBox="0 0 138 42" xmlns="http://www.w3.org/2000/svg">
                  <text y="14" fontFamily="'Cormorant Garamond',serif" fontSize="9" fontWeight="500" fill="#111111" letterSpacing="3.5">HARPER&apos;S</text>
                  <text y="38" fontFamily="'Cormorant Garamond',serif" fontSize="22" fontWeight="700" fill="#AC3438" letterSpacing="1">BAZAAR</text>
                </svg>
              </span>
              <span className="featured-logo">
                <svg height="28" viewBox="0 0 76 28" xmlns="http://www.w3.org/2000/svg">
                  <text y="24" fontFamily="'Cormorant Garamond',serif" fontSize="26" fontWeight="800" fill="#111111" letterSpacing="2">WWD</text>
                </svg>
              </span>
              <span className="featured-logo">
                <svg height="32" viewBox="0 0 118 32" xmlns="http://www.w3.org/2000/svg">
                  <text y="26" fontFamily="'Cormorant Garamond',serif" fontSize="28" fontWeight="600" fontStyle="italic" fill="#111111" letterSpacing="3">Brides</text>
                </svg>
              </span>
              <span className="featured-logo">
                <svg height="34" viewBox="0 0 148 34" xmlns="http://www.w3.org/2000/svg">
                  <text y="14" fontFamily="'Cormorant Garamond',serif" fontSize="10" fontWeight="600" fill="#111111" letterSpacing="2">WHO WHAT</text>
                  <text y="30" fontFamily="'Cormorant Garamond',serif" fontSize="10" fontWeight="600" fill="#111111" letterSpacing="9.5">WEAR</text>
                </svg>
              </span>
              <span className="featured-logo">
                <svg height="36" viewBox="0 0 130 36" xmlns="http://www.w3.org/2000/svg">
                  <text y="15" fontFamily="'Cormorant Garamond',serif" fontSize="13" fontWeight="600" fill="#0B2C4A" letterSpacing="3">TOWN &amp;</text>
                  <text y="34" fontFamily="'Cormorant Garamond',serif" fontSize="13" fontWeight="600" fill="#0B2C4A" letterSpacing="1">COUNTRY</text>
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ENGAGEMENT RINGS — collection cards with Life Path ───── */}
      <CategoryCardsSection />

      {/* ── DESIGN IN SILENCE — 4-step process ───────────────────── */}
      <CoCreateSection />

      {/* ── AI DESIGN SECTION ────────────────────────────────────── */}
      <AIDesignSection />

      {/* ── FIND YOUR FORM (DIAMOND SHAPES) ──────────────────────── */}
      <FindFormSection />

      {/* ── COUPLE PROOF — real testimonials ─────────────────────── */}
      <TrustProofSection />

      {/* ══ APPOINTMENT BOOKING — closes the flow (brief §3). The id also
             gives Nav's existing /#appointment link a real target. ═════ */}
      <div id="appointment" />

      {/* ── WHAT WE OFFER ────────────────────────────────────────── */}
      <InvitationsMoreSection />

    </>
  );
}

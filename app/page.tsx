import type { Metadata } from 'next';
import HomepageScripts from '@/components/HomepageScripts';
import ScrollToHash from '@/components/ScrollToHash';
import AIDesignSection from '@/components/AIDesignSection';
import FindFormSection from '@/components/FindFormSection';
import CategoryCardsSection from '@/components/CategoryCardsSection';
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

      {/* ── HERO — light centered design ─────────────────────────── */}
      <section className="hero">
        <div className="hero-content">
          <div className="cinematic-hero">
            <div className="ch-line ch-silence" id="chLine1">In Silence</div>
            <div className="ch-line ch-realized" id="chLine2">I realized</div>
            <div className="ch-line ch-oneness" id="chLine3">the oneness of the universe.</div>
            <div className="hero-rule" id="chDiv" />
            <div className="ch-line ch-ring" id="chLine4">The Swirl Self Love Ring</div>
            <div className="ch-line ch-messaged" id="chLine5">was messaged.</div>
          </div>

          <div className="origin-founder" id="heroFounder" style={{ opacity: 0 }}>
            <div className="origin-founder-line" />
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(11px,1.4vw,14px)', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#111111' }}>
              Jack Hovsepian — Founder, DANHOV — Est. 1984
            </span>
            <div className="origin-founder-line" />
          </div>

        </div>

      </section>

      {/* ── BRAND VIDEO ──────────────────────────────────────────── */}
      <section style={{
        background: '#0a0806',
        padding: '0',
        position: 'relative',
      }}>
        {/* video wrapper — natural 16:9, no cropping */}
        <div style={{ position: 'relative', lineHeight: 0 }}>
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster="/danhov-video-poster.jpg"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            src="/danhov-brand-video.mp4"
          />

          {/* bottom gradient + logo overlay — compact at very bottom */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '20%',
            background: 'linear-gradient(to top, rgba(10,8,6,0.88) 0%, rgba(10,8,6,0.4) 65%, transparent 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 0 20px',
            pointerEvents: 'none',
            gap: 0,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/danhov-logo-transparent.png"
              alt="DANHOV"
              style={{
                height: 'clamp(28px, 3.5vw, 52px)',
                width: 'auto',
                display: 'block',
                filter: 'brightness(0) invert(1)',
              }}
            />
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '0.58rem',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              color: '#f2ece4',
              fontWeight: 600,
              marginTop: 18,
            }}>
              The Art of Seeing
            </span>
          </div>
        </div>

      </section>

      {/* ── SELF-LOVE MANIFESTO ──────────────────────────────────── */}
      <section style={{
        background: '#0a0806',
        padding: 'clamp(48px, 6vw, 80px) clamp(24px, 8vw, 120px)',
        textAlign: 'center',
        borderTop: '1px solid rgba(242,236,228,0.07)',
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '0.58rem',
          letterSpacing: '0.55em',
          textTransform: 'uppercase',
          color: '#AC3438',
          marginBottom: 28,
          fontWeight: 600,
        }}>
          A Message from Jack
        </p>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(1.05rem, 2.2vw, 1.55rem)',
          fontStyle: 'italic',
          fontWeight: 300,
          color: '#f2ece4',
          maxWidth: 720,
          margin: '0 auto 28px',
          lineHeight: 1.75,
        }}>
          &ldquo;In the silence, I understood — the whole universe is one, and you are the center of it.
          To love yourself is to love the universe itself. This ring was not designed.
          It was received. A swirl for the self. A circle with no beginning and no end,
          because love — real love — starts within.&rdquo;
        </p>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '0.58rem',
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: 'rgba(242,236,228,0.38)',
          fontWeight: 500,
        }}>
          — Jack Hovsepian &nbsp;·&nbsp; Founder, DANHOV &nbsp;·&nbsp; Est. 1984
        </p>
      </section>

      {/* ── DAILY SIGNPOST ───────────────────────────────────────── */}
      <DailySignpostSection />

      {/* ── DESIGN IN SILENCE — 4-step process ───────────────────── */}
      <CoCreateSection />

      {/* ── AI DESIGN SECTION ────────────────────────────────────── */}
      <AIDesignSection />

      {/* ── FIND YOUR FORM (DIAMOND SHAPES) ──────────────────────── */}
      <FindFormSection />

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

      {/* ── COUPLE PROOF — real testimonials ─────────────────────── */}
      <TrustProofSection />

      {/* ── WHAT WE OFFER ────────────────────────────────────────── */}
      <InvitationsMoreSection />

      {/* ── CRAFT & TRUST ────────────────────────────────────────── */}
      <HeritageSection />
    </>
  );
}

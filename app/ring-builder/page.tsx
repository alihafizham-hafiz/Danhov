import type { Metadata } from 'next';
import Link from 'next/link';
import BuilderStepper, { DiamondIcon, SettingIcon, CompleteIcon } from '@/components/BuilderStepper';
import AIDesignSection from '@/components/AIDesignSection';
import './builder.css';

export const metadata: Metadata = {
  title: 'Ring Builder · Design Your Own',
  description:
    'Design your own DANHOV engagement ring — choose the setting, then the diamond. Every piece handcrafted to order in Los Angeles, in 14k or 18k gold.',
  alternates: { canonical: '/ring-builder' },
};

type LandingSearch = { setting?: string; metal?: string };

export default async function RingBuilderLandingPage({
  searchParams,
}: {
  searchParams: LandingSearch | Promise<LandingSearch>;
}) {
  const params = await searchParams;
  const diamondParams = new URLSearchParams();
  if (params.setting) diamondParams.set('setting', params.setting);
  if (params.metal) diamondParams.set('metal', params.metal);
  const diamondHref = `/ring-builder/diamond${diamondParams.toString() ? `?${diamondParams.toString()}` : ''}`;

  return (
    <main className="builder-page">
      <BuilderStepper current={1} hasSetting={false} hasDiamond={false} />

      <section className="builder-hero">
        <span className="section-eyebrow">Create Your Ring</span>
        <h1 className="section-title">
          Design <em>your own</em>
        </h1>
        <p className="section-body">
          Four quiet steps. First, choose the setting that speaks to you — a swirl, a
          tension hold, a solitaire. Then choose your diamond. Then we begin.
        </p>
      </section>

      <section className="builder-intro-grid">
        <article className="builder-intro-card">
          <span className="builder-intro-step">I</span>
          <h3>Choose your setting</h3>
          <p>
            Browse our handcrafted settings — Abbraccio, Voltaggio, Classico, and more.
            Filter by metal and style.
          </p>
        </article>
        <article className="builder-intro-card">
          <span className="builder-intro-step">II</span>
          <h3>Choose your diamond</h3>
          <p>
            Pick your shape, carat, color, clarity and cut. Every diamond is GIA-graded,
            conflict-free and ethically traced.
          </p>
          <Link href={diamondHref} className="builder-path-btn builder-path-btn--primary" style={{ alignSelf: 'center' }}>
            Choose a Diamond
          </Link>
        </article>
        <article className="builder-intro-card">
          <span className="builder-intro-step">III</span>
          <h3>Complete your commission</h3>
          <p>
            We confirm the pairing, lock today&apos;s gold price for 24 hours, and a master
            jeweler in Los Angeles begins your piece.
          </p>
        </article>
      </section>

      {/* ── Three purchase paths ─────────────────────────────────── */}
      <section className="builder-paths">
        <p className="builder-paths-eyebrow">Choose how you&apos;d like to shop</p>
        <div className="builder-paths-grid">
          <article className="builder-path-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="builder-path-icon">
              <CompleteIcon />
            </div>
            <h3>Build a Complete Ring</h3>
            <p>Choose your setting, then pair it with a certified diamond. The classic commission path.</p>
            <Link href="/ring-builder/setting" className="builder-path-btn builder-path-btn--primary" style={{ alignSelf: 'center' }}>
              Start with a Setting
            </Link>
          </article>

          <article className="builder-path-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="builder-path-icon">
              <SettingIcon />
            </div>
            <h3>Buy a Setting Alone</h3>
            <p>Purchase just the ring setting — handcrafted to your size and metal choice, without a diamond.</p>
            <Link href="/ring-builder/setting" className="builder-path-btn builder-path-btn--primary" style={{ alignSelf: 'center' }}>
              Browse Settings
            </Link>
          </article>

          <article className="builder-path-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="builder-path-icon">
              <DiamondIcon />
            </div>
            <h3>Buy a Loose Diamond</h3>
            <p>Select a GIA-graded diamond from live inventory. No setting required — a specialist will assist.</p>
            <Link href="/ring-builder/diamond" className="builder-path-btn builder-path-btn--primary" style={{ alignSelf: 'center' }}>
              Browse Diamonds
            </Link>
          </article>
        </div>
      </section>

      {/* ── AI Design Section ─────────────────────────────────────── */}
      <AIDesignSection />

      <section className="builder-cta" style={{ textAlign: 'center' }}>
        <p className="builder-cta-sub">
          Prefer to speak with a specialist first? A private 30-minute consultation is just
          one click away.
        </p>
        <Link href="/engagement-rings" className="btn-primary" style={{ marginTop: 24, display: 'inline-block' }}>
          Browse All 580+ Rings
        </Link>
      </section>
    </main>
  );
}

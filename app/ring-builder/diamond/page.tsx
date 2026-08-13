import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import BuilderStepper from '@/components/BuilderStepper';
import DiamondPicker, { type Diamond } from '@/components/DiamondPicker';
import { cachedSearchDiamonds } from '@/lib/nivoda-cache';
import { getDiamondMarkups } from '@/lib/diamond-markups';
import type { NivodaShape } from '@/lib/nivoda';
import { fetchProductWithPricingBySlug } from '@/lib/products';
import { requiresCenterStone } from '@/lib/product-purchase-mode';
import '../builder.css';

export const metadata: Metadata = {
  title: 'Select Your Diamond · Ring Builder',
  description:
    "Live diamond inventory — every stone is GIA / IGI graded and ethically traced. Filter by shape, carat, color, clarity, and cut to find the centre of your DANHOV piece.",
  alternates: { canonical: '/ring-builder/diamond' },
};

export const dynamic = 'force-dynamic';

type Search = {
  setting?: string;
  diamond?: string;
  hold?: string;
  metal?: string;
  shape?: string;
  existing?: string;
  inorder?: string;
  orderdiamond?: string;
};

const VALID_SHAPES = ['ROUND', 'OVAL', 'PRINCESS', 'CUSHION', 'EMERALD', 'PEAR', 'HEART', 'MARQUISE', 'RADIANT', 'ASSCHER'];

// ── Async data layer — wrapped in Suspense so the shell streams first ──────
// Fetches prefetched diamonds server-side (warm cache = instant, cold cache
// times out in 2.5 s and lets the client fetch take over).
async function PrefetchedPicker({ searchParams }: { searchParams: Search }) {
  const initialShape = (
    VALID_SHAPES.includes(searchParams.shape?.toUpperCase() ?? '')
      ? searchParams.shape!.toUpperCase()
      : 'ROUND'
  ) as NivodaShape;

  let initialItems: Diamond[] = [];
  let initialTotalCount = 0;
  let diamondMarkups: Record<string, number> = {};

  await Promise.allSettled([
    Promise.race([
      cachedSearchDiamonds(
        {
          shapes: [initialShape],
          labgrown: false,
          sizes: { from: 0.5, to: 50 },
          color: ['D', 'E', 'F', 'G', 'H'],
          clarity: ['VS1', 'VS2', 'SI1'],
          cut: ['EX', 'ID'],
          availability: 'AVAILABLE',
        },
        { limit: 50, offset: 0, order: { type: 'price', direction: 'ASC' } }
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('prefetch timeout')), 2500)
      ),
    ]).then(result => {
      initialItems = (result.result.items ?? []) as Diamond[];
      initialTotalCount = result.result.total_count ?? 0;
    }),
    getDiamondMarkups().then(m => { diamondMarkups = m; }),
  ]);

  return (
    <DiamondPicker
      settingSlug={searchParams.setting}
      metal={searchParams.metal}
      initialOfferId={searchParams.diamond}
      existingOfferId={searchParams.existing}
      inOrderOfferId={searchParams.inorder}
      orderDiamondIds={searchParams.orderdiamond?.split('|').filter(Boolean)}
      initialItems={initialItems}
      initialTotalCount={initialTotalCount}
      markups={diamondMarkups}
    />
  );
}

// ── Static skeleton shown while PrefetchedPicker resolves ─────────────────
function DiamondPickerSkeleton() {
  return (
    <div className="be-picker">
      <div className="be-toolbar">
        <div className="be-toolbar-count">
          <span className="be-skel-line" style={{ width: 130, height: 14, display: 'inline-block' }} />
        </div>
      </div>
      <div className="be-layout">
        <aside className="be-sidebar">
          {[80, 60, 100, 70, 90].map((w, i) => (
            <div key={i} className="be-facet" style={{ marginBottom: 24 }}>
              <div className="be-skel-line" style={{ width: w, marginBottom: 12 }} />
              <div className="be-skel-line" style={{ width: '90%' }} />
            </div>
          ))}
        </aside>
        <section className="be-results">
          <div className="be-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="be-card be-card--skel" aria-hidden="true">
                <div className="be-card-media">
                  <div className="be-card-media-inner be-skel-block" />
                </div>
                <div className="be-card-body">
                  <div className="be-skel-line" style={{ width: '72%', marginBottom: 10 }} />
                  <div className="be-skel-line" style={{ width: '54%', marginBottom: 10 }} />
                  <div className="be-skel-line" style={{ width: '38%', marginBottom: 20 }} />
                  <div className="be-skel-line" style={{ width: '100%', height: 38 }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Page shell — NOT async, renders instantly ─────────────────────────────
// The shell (nav, stepper, heading) streams to the browser immediately.
// The Suspense boundary shows DiamondPickerSkeleton while PrefetchedPicker
// resolves, then swaps in real diamonds — zero blank screen.
export default async function SelectDiamondPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  if (searchParams.setting) {
    const setting = await fetchProductWithPricingBySlug(searchParams.setting);
    if (setting && !requiresCenterStone(setting.centre_diamond_group)) {
      const params = new URLSearchParams({ setting: setting.slug, finished: '1' });
      if (searchParams.metal) params.set('metal', searchParams.metal);
      redirect(`/ring-builder/review?${params.toString()}`);
    }
  }

  return (
    <main className="builder-page builder-page--diamond">
      <BuilderStepper
        current={2}
        hasSetting={!!searchParams.setting}
        hasDiamond={!!searchParams.diamond}
        settingSlug={searchParams.setting}
        diamondId={searchParams.diamond}
      />

      <section className="builder-section-head builder-section-head--compact">
        <span className="section-eyebrow">Step 2 of 3</span>
        <h1 className="section-title">Select your <em>diamond</em></h1>
      </section>

      <div className="diamond-manifesto">
        <p className="diamond-manifesto-text">
          No diamond sparkles without being worked.<br />
          Neither do you.<br />
          <em>Freedom is on the other side of the work.</em>
        </p>
      </div>

      <Suspense fallback={<DiamondPickerSkeleton />}>
        <PrefetchedPicker searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

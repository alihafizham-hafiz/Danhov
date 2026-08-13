import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import BuilderStepper from '@/components/BuilderStepper';
import BuilderReview, { type ReviewDiamond } from '@/components/BuilderReview';
import '../builder.css';
import { fetchProductWithPricingBySlug } from '@/lib/products';
import { priceProduct } from '@/lib/pricing';
import { cachedGetDiamond } from '@/lib/nivoda-cache';
import { getDiamondMarkups } from '@/lib/diamond-markups';
import { requiresCenterStone } from '@/lib/product-purchase-mode';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { setting?: string; diamond?: string; diamonds?: string; hold?: string; finished?: string };
}): Promise<Metadata> {
  const hasSetting = !!searchParams.setting;
  const hasDiamond = !!(searchParams.diamonds || searchParams.diamond);
  if (hasSetting && hasDiamond)
    return {
      title: 'Complete Your Ring · Ring Builder',
      description:
        'Review your DANHOV ring commission — chosen setting, chosen diamond, and total. Begin your made-to-order piece in Los Angeles.',
      alternates: { canonical: '/ring-builder/review' },
    };
  if (hasSetting)
    return {
      title: 'Purchase Setting · Ring Builder · DANHOV',
      description: 'Review and purchase your chosen DANHOV ring setting, handcrafted to order in Los Angeles.',
    };
  return {
    title: 'Purchase Diamond · Ring Builder · DANHOV',
    description: 'Review and purchase your chosen GIA-graded diamond from DANHOV.',
  };
}

export const dynamic = 'force-dynamic';

function shapeDisplay(s: string | null): string {
  if (!s) return 'Round';
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default async function CompleteRingPage({
  searchParams,
}: {
  searchParams: { setting?: string; diamond?: string; diamonds?: string; hold?: string; metal?: string; dcat?: string; finished?: string };
}) {
  const settingSlug = searchParams.setting;
  const chosenMetal = searchParams.metal ?? null;
  let finishedPiece = searchParams.finished === '1';

  // Parse diamonds: prefer ?diamonds=D1|D2, fall back to ?diamond=D
  const diamondParam = searchParams.diamonds || searchParams.diamond;
  const diamondIds = diamondParam
    ? diamondParam.split('|').map(s => s.trim()).filter(Boolean)
    : [];

  // For backward compat: ?hold maps to the first/last diamond (the most recently selected one)
  const holdParam = searchParams.hold ?? null;

  // Need at least one of setting or diamond
  if (!settingSlug && diamondIds.length === 0) redirect('/ring-builder/setting');

  const mode: 'ring' | 'setting' | 'diamond' =
    settingSlug && diamondIds.length > 0 ? 'ring' : settingSlug ? 'setting' : 'diamond';

  // ── Load setting ──────────────────────────────────────────────────────
  let setting: Awaited<ReturnType<typeof fetchProductWithPricingBySlug>> | null = null;
  let settingPrice = 0;
  if (mode === 'ring' || mode === 'setting') {
    setting = await fetchProductWithPricingBySlug(settingSlug!);
    if (!setting) redirect('/ring-builder/setting');

    // The database is authoritative. This prevents stale buttons or edited
    // URLs from showing setting/diamond questions for a finished product.
    finishedPiece = !requiresCenterStone(setting.centre_diamond_group);

    // Finished bands and jewelry already include their listed stones. Do not
    // let stale or hand-crafted builder URLs attach an unrelated centre stone.
    if (diamondIds.length > 0 && !requiresCenterStone(setting.centre_diamond_group)) {
      const params = new URLSearchParams({ setting: setting.slug, finished: '1' });
      if (chosenMetal) params.set('metal', chosenMetal);
      redirect(`/ring-builder/review?${params.toString()}`);
    }

    const catalogPrice = parsePriceDisplay(setting.price_display);
    const canComputeLive =
      (setting.gold_weight_g ?? 0) > 0 || (setting.stones_value_usd ?? 0) > 0;

    if (canComputeLive) {
      try {
        const breakdown = await priceProduct(setting, chosenMetal ?? setting.default_metal);
        settingPrice = breakdown.total_usd;
      } catch {
        settingPrice = catalogPrice;
      }
    } else {
      settingPrice = catalogPrice;
    }
  }

  // ── Load all diamonds concurrently ────────────────────────────────────
  // Per-category markup from the DB (same source the picker uses) so the
  // review price matches exactly what the customer saw when selecting.
  const diamondMarkups = await getDiamondMarkups();
  const dMarkup = diamondMarkups[searchParams.dcat ?? 'natural'] ?? diamondMarkups.natural ?? 2.3;

  const reviewDiamonds: ReviewDiamond[] = [];
  if (mode === 'ring' || mode === 'diamond') {
    const results = await Promise.all(
      diamondIds.map(id =>
        cachedGetDiamond(id).catch(() => null)
      )
    );
    for (const [i, nivoda] of results.entries()) {
      if (!nivoda?.stone) continue;
      const cert = nivoda.stone.diamond.certificate;
      reviewDiamonds.push({
        offer_id: nivoda.stone.id,
        carat: cert?.carats ?? 1,
        shape: shapeDisplay(cert?.shape ?? null),
        color: cert?.color ?? '—',
        clarity: cert?.clarity ?? '—',
        cut: cert?.cut ?? '—',
        lab: cert?.lab ?? 'GIA',
        cert_number: cert?.certNumber ?? null,
        image: nivoda.stone.diamond.image ?? null,
        video: nivoda.stone.diamond.video ?? null,
        price_usd: Math.round((Number(nivoda.stone.price) || 0) * dMarkup),
        // Map ?hold to the last diamond (the most recently added one when multi-selecting)
        hold_id: i === diamondIds.length - 1 ? holdParam : null,
      });
    }

    if (reviewDiamonds.length === 0) {
      if (mode === 'ring') redirect(`/ring-builder/diamond?setting=${settingSlug}`);
      else redirect('/ring-builder/diamond');
    }
  }

  const stepperHasSetting = mode === 'ring' || mode === 'setting';
  const stepperHasDiamond = mode === 'ring' || mode === 'diamond';
  const firstOfferId = reviewDiamonds[0]?.offer_id;

  return (
    <main className="builder-page">
      <BuilderStepper
        current={3}
        hasSetting={stepperHasSetting}
        hasDiamond={stepperHasDiamond}
        settingSlug={settingSlug}
        diamondId={firstOfferId}
      />

      <section className="builder-section-head">
        <span className="section-eyebrow">
          {mode === 'ring' ? 'Step 3 of 3' : 'Final Step'}
        </span>
        <h1 className="section-title">
          {mode === 'ring' ? (
            <>Complete <em>your ring</em></>
          ) : mode === 'setting' ? (
            <>Purchase <em>your {finishedPiece ? 'piece' : 'setting'}</em></>
          ) : (
            <>Purchase <em>your diamond{reviewDiamonds.length > 1 ? 's' : ''}</em></>
          )}
        </h1>
        {mode !== 'diamond' && (
          <p className="section-body">
            {mode === 'ring'
              ? "Review your pairing below. When you're ready, place your order and your piece begins in our Los Angeles atelier."
              : `Review your chosen ${finishedPiece ? 'piece' : 'setting'}. Your piece will be handcrafted to order in Los Angeles in 3 weeks.`}
          </p>
        )}
      </section>

      <BuilderReview
        mode={mode}
        setting={setting ?? null}
        diamonds={reviewDiamonds}
        settingPrice={settingPrice}
        metal={chosenMetal}
        dcat={searchParams.dcat ?? 'natural'}
        finishedPiece={finishedPiece}
      />

      <div className="builder-review-edit-row">
        {mode !== 'diamond' && (() => {
          const p = new URLSearchParams();
          if (settingSlug) p.set('setting', settingSlug);
          if (firstOfferId) p.set('diamond', firstOfferId);
          if (holdParam) p.set('hold', holdParam);
          const qs = p.toString();
          return (
            <Link href={`/ring-builder/setting${qs ? `?${qs}` : ''}`}>
              ← Edit Setting
            </Link>
          );
        })()}
        {mode !== 'setting' && reviewDiamonds.map((d, i) => {
          const p = new URLSearchParams();
          if (settingSlug) p.set('setting', settingSlug);
          p.set('diamond', d.offer_id);
          if (d.hold_id) p.set('hold', d.hold_id);
          p.set('inorder', d.offer_id);
          const otherIds = reviewDiamonds.filter((_, j) => j !== i).map(od => od.offer_id);
          if (otherIds.length > 0) p.set('orderdiamond', otherIds.join('|'));
          const qs = p.toString();
          const label = reviewDiamonds.length > 1
            ? `Change Diamond ${i + 1}`
            : `${mode === 'diamond' ? 'Change Diamond' : 'Edit Diamond'}`;
          return (
            <Link key={d.offer_id} href={`/ring-builder/diamond${qs ? `?${qs}` : ''}`}>
              ← {label}
            </Link>
          );
        })}
      </div>
    </main>
  );
}

function parsePriceDisplay(display: string | null | undefined): number {
  if (!display) return 0;
  const m = display.match(/[\d,]+(?:\.\d+)?/);
  if (!m) return 0;
  return Number(m[0].replace(/,/g, ''));
}

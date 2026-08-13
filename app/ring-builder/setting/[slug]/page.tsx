import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchProductBySlug, fetchProductSlugsByCategory, fetchProductWithPricingBySlug } from '@/lib/products';
import { priceAllOptions, computePrice, STATIC_SPOTS, ALL_METALS } from '@/lib/pricing';
import { stripMetalSuffix } from '@/lib/product-display';
import { METAL_LABEL_DISPLAY } from '@/lib/stone-math';
import { getOrGenerateNarrative, occasionForCategory } from '@/lib/narratives';
import BuilderStepper from '@/components/BuilderStepper';
import ProductGalleryMetal from '@/components/ProductGalleryMetal';
import ProductOptions from '@/components/ProductOptions';
import NarrativeBox from '@/components/NarrativeBox';
import SkuDisplay from '@/components/SkuDisplay';
import { MetalProvider } from '@/components/MetalContext';
import '../../builder.css';

interface Props {
  params: { slug: string };
  searchParams: { metal?: string; diamond?: string; diamonds?: string };
}

type MetalKey = (typeof ALL_METALS)[number];

function isMetalKey(value: string | null | undefined): value is MetalKey {
  return !!value && (ALL_METALS as readonly string[]).includes(value);
}

function normaliseMetalKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const karat = value.match(/\b(14|18)\s*k\b/)?.[1];
  const isRose = value.includes('rose') || value.includes('pink');
  const isWhite = value.includes('white');
  const isYellow = value.includes('yellow') || (!isRose && !isWhite && value.includes('gold'));
  const isPlatinum = value.includes('plat');

  if (isPlatinum) return 'platinum';
  if (karat && isRose) return `${karat}k_rose`;
  if (karat && isWhite) return `${karat}k_white`;
  if (karat && isYellow) return `${karat}k_yellow`;
  return null;
}

export async function generateStaticParams() {
  const products = await fetchProductSlugsByCategory('engagement');
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProductBySlug(params.slug);
  if (!product) return { title: 'Setting Not Found · DANHOV Ring Builder' };
  return {
    title: `${stripMetalSuffix(product.name)} · Ring Builder · DANHOV`,
    description: `Configure the ${stripMetalSuffix(product.name)} — choose your metal, then select your diamond. Every piece handcrafted in Los Angeles.`,
    alternates: { canonical: `/ring-builder/setting/${params.slug}` },
  };
}

export default async function SettingDetailPage({ params, searchParams }: Props) {
  const product = await fetchProductWithPricingBySlug(params.slug);
  if (!product) notFound();

  const diamondsParam = searchParams.diamonds || null;
  const diamondId = diamondsParam
    ? diamondsParam.split('|')[0]
    : (searchParams.diamond || undefined);
  const hasDiamond = !!(diamondsParam || diamondId);

  const backHref = diamondsParam
    ? `/ring-builder/setting?diamonds=${encodeURIComponent(diamondsParam)}`
    : diamondId
    ? `/ring-builder/setting?diamond=${encodeURIComponent(diamondId)}`
    : '/ring-builder/setting';

  const defaultMetalKey = normaliseMetalKey(product.default_metal);
  const seededMetalImages: Record<string, string[]> = {};
  for (const [metal, imgs] of Object.entries(product.metal_images ?? {})) {
    const key = normaliseMetalKey(metal);
    if (key && (imgs?.length ?? 0) > 0) seededMetalImages[key] = imgs;
  }
  if (defaultMetalKey && !(seededMetalImages[defaultMetalKey]?.length) && product.images?.length) {
    seededMetalImages[defaultMetalKey] = product.images;
  }
  const metalsWithImages = ALL_METALS.filter((m) => (seededMetalImages[m]?.length ?? 0) > 0);
  const requestedMetal = normaliseMetalKey(searchParams.metal);
  const defaultMetal = isMetalKey(requestedMetal) && metalsWithImages.includes(requestedMetal)
    ? requestedMetal
    : isMetalKey(defaultMetalKey) && metalsWithImages.includes(defaultMetalKey)
    ? defaultMetalKey
    : metalsWithImages[0] ?? null;
  const availableMetalCopy = metalsWithImages.map((m) => METAL_LABEL_DISPLAY[m] ?? m).join(' · ');

  // Compute live per-metal prices
  let pricemap: Record<string, number> = {};
  if ((product.gold_weight_g ?? 0) > 0) {
    try {
      const breakdowns = await priceAllOptions(product, [...ALL_METALS]);
      for (const b of breakdowns) {
        if (b.total_usd > 0 && b.metal_cost_usd > 0) pricemap[b.metal_used] = b.total_usd;
      }
    } catch {
      for (const k of ALL_METALS) {
        const b = computePrice(product, STATIC_SPOTS, k);
        if (b.total_usd > 0) pricemap[b.metal_used] = b.total_usd;
      }
    }
  }

  const occasion = occasionForCategory(product.category);
  const narrativeResult = await getOrGenerateNarrative(product, occasion).catch(() => null);
  const narrative = narrativeResult ?? { narrative: '' };
  const displayName = stripMetalSuffix(product.name);

  return (
    <main className="builder-page">
      <BuilderStepper current={1} hasSetting={false} hasDiamond={hasDiamond} />

      {/* Breadcrumb / back */}
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="bc-sep">/</span>
        <Link href={backHref}>Choose Setting</Link>
        <span className="bc-sep">/</span>
        <span>{displayName}</span>
      </nav>

      <MetalProvider initialMetal={defaultMetal}>
        <div className="product-detail">
          {/* Gallery */}
          <div className="product-image-col">
            <ProductGalleryMetal
              defaultImages={product.images ?? []}
              metalImages={seededMetalImages}
              alt={product.name}
              collection={product.collection}
            />
          </div>

          {/* Info */}
          <div className="product-info-col">
            <p className="product-metal-notice">
              Handcrafted to order in all metals shown &nbsp;·&nbsp; Photography reflects the primary variant
            </p>
            {product.collection && (
              <span className="product-category-label">{product.collection}</span>
            )}
            <div className="product-name-row">
              <h1 className="product-name">{displayName}</h1>
            </div>
            <SkuDisplay sku={product.sku} />
            <div className="product-divider" />

            <ProductOptions
              sku={product.sku}
              slug={product.slug}
              name={product.name}
              collection={product.collection}
              centreDiamondGroup={product.centre_diamond_group}
              metals={metalsWithImages}
              defaultMetal={defaultMetal}
              images={product.images}
              price_display={product.price_display}
              pricemap={pricemap}
            />

            {metalsWithImages.length > 1 && (
              <p className="product-metals-line">
                Also crafted in {availableMetalCopy}
              </p>
            )}

            <NarrativeBox
              slug={product.slug}
              defaultOccasion={occasion}
              defaultNarrative={narrative.narrative}
            />

            <div className="product-attributes">
              <div className="product-attr-row">
                <svg className="product-attr-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L14 8H20L15.5 11.5L17.5 17.5L12 14L6.5 17.5L8.5 11.5L4 8H10L12 2Z" stroke="#AC3438" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                <div className="product-attr-text">
                  <strong>Handcrafted in Los Angeles</strong>
                  Each ring is individually cast, set, and finished by master jewelers since 1984.
                </div>
              </div>
              <div className="product-attr-row">
                <svg className="product-attr-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="#AC3438" strokeWidth="1.2" />
                  <path d="M12 6v6l4 2" stroke="#AC3438" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <div className="product-attr-text">
                  <strong>Custom Sizing Available</strong>
                  All styles can be crafted in your exact size, metal preference, and stone selection.
                </div>
              </div>
              <div className="product-attr-row">
                <svg className="product-attr-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#AC3438" strokeWidth="1.2" />
                </svg>
                <div className="product-attr-text">
                  <strong>Lifetime Craftsmanship Warranty</strong>
                  DANHOV stands behind every piece with our commitment to enduring quality.
                </div>
              </div>
            </div>
          </div>
        </div>
      </MetalProvider>
    </main>
  );
}

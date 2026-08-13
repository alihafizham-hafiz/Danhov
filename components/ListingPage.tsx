'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/products';
import { collectionToSlug } from '@/lib/products';
import WishlistHeart from '@/components/WishlistHeart';
import { stripMetalSuffix } from '@/lib/product-display';


function safeUrl(url: string): string {
  if (!url || url.includes('%')) return url;
  try {
    const u = new URL(url);
    u.pathname = u.pathname.split('/').map(seg => encodeURIComponent(seg)).join('/');
    return u.toString();
  } catch { return url; }
}

type Collection = {
  label: string;
  value: string; // slug used for filter matching
};

type MetalFilter = {
  label: string;
  value: 'all' | 'platinum' | 'white' | 'yellow' | 'rose';
  swatch?: { background: string; border?: string };
};

type Props = {
  category: string;
  title: string;
  subtitle: string;
  eyebrow?: string;
  collections?: Collection[];
  showMetalFilter?: boolean;
  philosophyStripe?: { eyebrow?: string; quote: string; attribution?: string };
  aiPrompt: string;
  products: Product[];
  initialCollection?: string;
  /** Override the URL each card links to. Defaults to /product/[slug] */
  cardHref?: (slug: string) => string;
  /** Show wishlist heart on cards. Default: true */
  showWishlist?: boolean;
  /** Show the Life Path teaser card at the end. Default: true for engagement */
  showLifePathTeaser?: boolean;
};

const METAL_FILTERS: MetalFilter[] = [
  { label: 'All Metals', value: 'all' },
  { label: 'Platinum', value: 'platinum', swatch: { background: '#d8d6d0', border: '1px solid #aaa' } },
  { label: 'White Gold', value: 'white', swatch: { background: '#e8e0d8', border: '1px solid #bbb' } },
  { label: 'Yellow Gold', value: 'yellow', swatch: { background: '#d4a853' } },
  { label: 'Rose Gold', value: 'rose', swatch: { background: '#e8a090' } },
];

const PLACEHOLDER_SVG = (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="28" cy="28" r="20" stroke="#AC3438" strokeWidth="1.5" />
    <circle cx="28" cy="28" r="12" stroke="#AC3438" strokeWidth="0.75" opacity="0.5" />
    <circle cx="28" cy="28" r="4" fill="#AC3438" opacity="0.3" />
  </svg>
);

const HERO_SPIRAL = (
  <svg
    className="hero-spiral"
    viewBox="0 0 600 600"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="300" cy="300" r="280" stroke="#AC3438" strokeWidth="0.6" />
    <circle cx="300" cy="300" r="220" stroke="rgba(172,52,56,0.4)" strokeWidth="0.5" />
    <circle cx="300" cy="300" r="165" stroke="#AC3438" strokeWidth="0.5" />
    <circle cx="300" cy="300" r="115" stroke="rgba(172,52,56,0.4)" strokeWidth="0.4" />
    <circle cx="300" cy="300" r="72" stroke="#AC3438" strokeWidth="0.4" />
    <circle cx="300" cy="300" r="38" stroke="rgba(172,52,56,0.4)" strokeWidth="0.3" />
    <line x1="300" y1="20" x2="300" y2="580" stroke="#AC3438" strokeWidth="0.3" />
    <line x1="20" y1="300" x2="580" y2="300" stroke="#AC3438" strokeWidth="0.3" />
    <line x1="100" y1="100" x2="500" y2="500" stroke="rgba(172,52,56,0.4)" strokeWidth="0.25" />
    <line x1="500" y1="100" x2="100" y2="500" stroke="rgba(172,52,56,0.4)" strokeWidth="0.25" />
    <polygon
      points="300,28 548,164 548,436 300,572 52,436 52,164"
      stroke="#AC3438"
      strokeWidth="0.4"
      fill="none"
    />
  </svg>
);

function concreteMetalKeys(product: {
  default_metal: string | null;
  images?: string[];
  metal_images?: Record<string, string[]> | null;
}): Set<string> {
  const keys = new Set<string>();
  for (const [metal, imgs] of Object.entries(product.metal_images ?? {})) {
    const key = metalKeyFromLabel(metal) ?? metal;
    if ((imgs?.length ?? 0) > 0) keys.add(key);
  }
  if (product.default_metal && (product.images?.length ?? 0) > 0) {
    keys.add(metalKeyFromLabel(product.default_metal) ?? product.default_metal);
  }
  return keys;
}

/**
 * Match a product to the active metal chip using concrete sellable/displayable
 * metal variants only. The broad `metals` field is intentionally ignored here:
 * in this catalog it can contain generic options that are not actually available
 * as product-page swatches/photos for that specific piece.
 */
function metalMatches(
  product: { default_metal: string | null; images?: string[]; metal_images?: Record<string, string[]> | null },
  filter: MetalFilter['value'],
): boolean {
  if (filter === 'all') return true;

  const keys = concreteMetalKeys(product);
  return metalKeysForFilter(filter).some((key) => keys.has(key));
}

/**
 * Convert a human-readable metal label to the normalized key used in
 * metal_images / METAL_TONES. E.g. "14K White Gold" → "14k_white".
 */
function metalKeyFromLabel(label: string): string | null {
  const l = label.toLowerCase().replace(/\s+/g, '');
  // Already normalized
  if (/^(14k_white|18k_white|14k_yellow|18k_yellow|14k_rose|18k_rose|platinum)$/.test(l)) return l;
  if (l.includes('18k') && l.includes('white')) return '18k_white';
  if (l.includes('14k') && l.includes('white')) return '14k_white';
  if (l.includes('18k') && l.includes('yellow')) return '18k_yellow';
  if (l.includes('14k') && l.includes('yellow')) return '14k_yellow';
  if (l.includes('18k') && l.includes('rose')) return '18k_rose';
  if (l.includes('14k') && l.includes('rose')) return '14k_rose';
  if (l.includes('plat')) return 'platinum';
  return null;
}

/**
 * Base-design key for a product — groups all metal variants of the same design
 * so the listing shows each design once.
 *
 * Strategy: stripped product name + category. We intentionally exclude collection
 * from the key because the same design variant sometimes has a null or different
 * collection value in the DB. Category is included so a "Diamond Solitaire" in
 * engagement and one in wedding don't merge.
 *
 * Name stripping removes " in [metal]" suffixes. For products where the name
 * carries no metal at all (e.g. "Norem de Danhov tension style engagement ring"),
 * stripMetalSuffix is a no-op and the name itself is the key — so all DB rows
 * sharing that exact name collapse to one card, exactly as the admin intended.
 */
function baseDesignKey(p: Product): string {
  // Collapse only true metal variants of the same SKU. Several legacy catalog
  // rows share generic names like "Voltaggio Tension Set Ring" even though they
  // are distinct designs, so names are not reliable grouping keys.
  const sku = String(p.sku ?? '');
  const skuPart = sku.replace(/-\d*[a-zA-Z]+$/i, '').toLowerCase();
  if (skuPart) return `${skuPart}||${p.category}`;

  const namePart = stripMetalSuffix(p.name).toLowerCase().trim();
  return `${namePart}||${p.category}`;
}

type SortKey =
  | 'featured'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'collection_asc'
  | 'collection_desc'
  | 'sku_asc'
  | 'newest';

const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Featured',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  name_asc: 'Name: A to Z',
  name_desc: 'Name: Z to A',
  collection_asc: 'Collection: A to Z',
  collection_desc: 'Collection: Z to A',
  sku_asc: 'Model: Oldest First',
  newest: 'Newest',
};

function filterSlug(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugHasWord(slug: string, word: string): boolean {
  return slug.includes(`-${word}-`) || slug.startsWith(`${word}-`) || slug.endsWith(`-${word}`) || slug === word;
}

function slugHasAnyWord(slug: string, words: string[]): boolean {
  return words.some((word) => slugHasWord(slug, word));
}

function productMatchesSubCategory(product: Product, filter: string, pageCategory: string): boolean {
  const explicitFilters = (product.sub_categories ?? []).map(filterSlug);
  if (explicitFilters.includes(filter)) return true;

  const haystack = filterSlug([
    product.name,
    product.collection,
    product.category,
    ...(product.categories ?? []),
    ...(product.sub_categories ?? []),
  ].filter(Boolean).join(' '));

  if (slugHasWord(haystack, filter)) return true;

  if (pageCategory === 'fine') {
    if (filter === 'earrings') return slugHasAnyWord(haystack, ['earring', 'earrings', 'stud', 'studs', 'hoop', 'hoops']);
    if (filter === 'pendants') return slugHasAnyWord(haystack, ['pendant', 'pendants', 'necklace', 'necklaces', 'neckless']);
    if (filter === 'rings') return slugHasAnyWord(haystack, ['ring', 'rings']);
    if (filter === 'bands') return slugHasAnyWord(haystack, ['band', 'bands']);
    if (filter === 'limited') return slugHasAnyWord(haystack, ['limited', 'trenta']);
    return false;
  }

  if (pageCategory !== 'wedding') return false;

  const isHisBand = slugHasAnyWord(haystack, ['men', 'mens', 'groom', 'his']);
  const isHerBand = slugHasAnyWord(haystack, ['women', 'womens', 'woman', 'bride', 'bridal', 'her', 'hers']);

  if (filter === 'his-bands') return isHisBand;
  if (filter === 'her-bands') return isHerBand || !isHisBand;
  if (filter === 'award-winners') return haystack.includes('award');

  return false;
}

function parsePrice(p: Product): number {
  if (p.price_computed != null) return p.price_computed;
  if (!p.price_display) return 0;
  const m = p.price_display.match(/[\d,]+/);
  if (!m) return 0;
  return Number(m[0].replace(/,/g, ''));
}

function sortText(value: string | null | undefined): string {
  return String(value ?? '').toLowerCase();
}

function metalKeysForFilter(filter: MetalFilter['value']): string[] {
  if (filter === 'platinum') return ['platinum'];
  if (filter === 'white') return ['14k_white', '18k_white'];
  if (filter === 'yellow') return ['14k_yellow', '18k_yellow'];
  if (filter === 'rose') return ['14k_rose', '18k_rose'];
  return [];
}

export default function ListingPage({
  category,
  title,
  subtitle,
  eyebrow = 'DANHOV — Est. 1984, Los Angeles',
  collections,
  showMetalFilter = true,
  philosophyStripe,
  aiPrompt,
  products,
  initialCollection,
  cardHref,
  showWishlist = true,
  showLifePathTeaser,
}: Props) {
  const resolvedShowLifePathTeaser = showLifePathTeaser ?? (category === 'engagement');
  const [collectionFilter, setCollectionFilter] = useState<string>(initialCollection ?? 'all');
  const [metalFilter, setMetalFilter] = useState<MetalFilter['value']>('all');
  const [sortKey, setSortKey] = useState<SortKey>('featured');
  const [perPage, setPerPage] = useState<number>(24);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filtered = useMemo(() => {
    const result = products.filter((p) => {
      // Collection / sub-category filter
      if (collectionFilter !== 'all' && collections && collections.length > 0) {
        if (category === 'engagement') {
          const slug = collectionToSlug(p.collection, collections);
          if (slug !== collectionFilter) return false;
        } else {
          if (!productMatchesSubCategory(p, collectionFilter, category)) return false;
        }
      }
      // Metal filter
      if (showMetalFilter && metalFilter !== 'all') {
        if (!metalMatches(p, metalFilter)) return false;
      }
      return true;
    });

    // ── Collapse metal variants → one card per design ──
    // Group all variants by base design key, pick the best representative,
    // then MERGE the other variants' metal_images and metals into it so the
    // card shows swatches and cycling images for every available colour.
    const groups = new Map<string, Product[]>();
    for (const p of result) {
      const key = baseDesignKey(p);
      const arr = groups.get(key) ?? [];
      arr.push(p);
      groups.set(key, arr);
    }

    const scoreVariant = (x: Product): number => {
      let s = 0;
      const dm = (x.default_metal ?? '').toLowerCase();
      if (metalFilter !== 'all' && dm.includes(metalFilter)) s += 8;
      if (dm.includes('platinum')) s += 4;
      if ((x.images?.length ?? 0) > 0) s += 2;
      return s;
    };

    const deduped = Array.from(groups.values()).map((variants) => {
      variants.sort((a, b) => scoreVariant(b) - scoreVariant(a));
      const best: Product = { ...variants[0] };
      // Always merge — even single-variant designs benefit from seeding
      {
        const mergedMetalImages: Record<string, string[]> = { ...(best.metal_images ?? {}) };
        const mergedMetals = new Set(best.metals ?? []);
        for (const v of variants.slice(1)) {
          for (const [metal, imgs] of Object.entries(v.metal_images ?? {})) {
            if (!mergedMetalImages[metal] && imgs.length > 0) mergedMetalImages[metal] = imgs;
          }
          for (const m of v.metals ?? []) mergedMetals.add(m);
        }
        // Seed metal_images from each variant's primary images using its default_metal.
        // This makes swatch clicks actually change the displayed photo even when
        // per-metal images haven't been explicitly uploaded — the default photo of
        // each variant IS the correct image for that metal.
        for (const v of variants) {
          const dm = v.default_metal;
          if (dm && !mergedMetalImages[dm]) {
            const primary = (v.images ?? []).filter(u => typeof u === 'string' && u.trim() !== '');
            if (primary.length) mergedMetalImages[dm] = primary;
          }
        }
        best.metal_images = mergedMetalImages;
        best.metals = Array.from(mergedMetals);
      }
      if (variants.length > 1) {
        // Pick computed price from any variant that has one (representative may not be
        // the variant the admin configured pricing on)
        if (best.price_computed == null) {
          const withPrice = variants.slice(1).find(v => v.price_computed != null);
          if (withPrice) best.price_computed = withPrice.price_computed;
        }
      }
      return best;
    });

    // Sort
    if (sortKey === 'price_asc') {
      deduped.sort((a, b) => parsePrice(a) - parsePrice(b));
    } else if (sortKey === 'price_desc') {
      deduped.sort((a, b) => parsePrice(b) - parsePrice(a));
    } else if (sortKey === 'name_asc') {
      deduped.sort((a, b) => sortText(stripMetalSuffix(a.name)).localeCompare(sortText(stripMetalSuffix(b.name))));
    } else if (sortKey === 'name_desc') {
      deduped.sort((a, b) => sortText(stripMetalSuffix(b.name)).localeCompare(sortText(stripMetalSuffix(a.name))));
    } else if (sortKey === 'collection_asc') {
      deduped.sort((a, b) => sortText(a.collection).localeCompare(sortText(b.collection)) || a.sku.localeCompare(b.sku));
    } else if (sortKey === 'collection_desc') {
      deduped.sort((a, b) => sortText(b.collection).localeCompare(sortText(a.collection)) || a.sku.localeCompare(b.sku));
    } else if (sortKey === 'sku_asc') {
      deduped.sort((a, b) => a.sku.localeCompare(b.sku));
    } else if (sortKey === 'newest') {
      deduped.sort((a, b) => b.sku.localeCompare(a.sku));
    } else {
      // featured: engagement rings first, then fine, then wedding, then mens
      // (relevant on collection pages like Abbraccio that mix rings + bands)
      const categoryPriority = (p: Product) =>
        p.category === 'engagement' ? 0 :
        p.category === 'fine'       ? 1 :
        p.category === 'wedding'    ? 2 : 3;
      deduped.sort((a, b) => {
        const diff = categoryPriority(a) - categoryPriority(b);
        return diff !== 0 ? diff : a.sku.localeCompare(b.sku);
      });
    }
    return deduped;
  }, [products, collectionFilter, metalFilter, sortKey, collections, category, showMetalFilter]);

  // Reset to page 1 whenever filters, sort, or per-page changes
  useEffect(() => { setCurrentPage(1); }, [collectionFilter, metalFilter, sortKey, perPage]);

  // Total distinct designs (collapsed across metal variants), independent
  // of the active filters — drives the "X handcrafted styles" hero count.
  const totalCount = useMemo(
    () => new Set(products.map((p) => baseDesignKey(p))).size,
    [products],
  );
  const visibleCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(visibleCount / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * perPage;
  const pageEnd = pageStart + perPage;
  const paginated = filtered.slice(pageStart, pageEnd);

  return (
    <main className="listing-page">
      {/* PAGE HERO */}
      <section className="page-hero">
        {HERO_SPIRAL}
        <div className="page-hero-inner">
          <span className="page-hero-eyebrow">{eyebrow}</span>
          <h1 className="page-hero-title">{title}</h1>
          <p className="page-hero-subtitle">{subtitle}</p>
          <span className="page-hero-count">{totalCount} handcrafted styles</span>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{title}</span>
      </div>

      {/* AI ADVISOR PANEL */}
      <div className="ai-advisor-wrap">
        <div className="dnh-panel">
          <div className="dnh-panel-copy">
            <span>
              Let our advisor guide you to the perfect style, metal, and fit.
            </span>
          </div>
          <button
            className="dnh-trigger dnh-trigger--listing"
            data-dnh={
              collectionFilter !== 'all' && COLLECTION_AI_PROMPTS[collectionFilter]
                ? COLLECTION_AI_PROMPTS[collectionFilter]
                : aiPrompt
            }
            type="button"
          >
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 1L8 5.5L12.5 7L8 8.5L7 13L6 8.5L1.5 7L6 5.5L7 1Z"
                fill="currentColor"
              />
            </svg>
            ASK THE ADVISOR
          </button>
        </div>
      </div>

      {/* INLINE TAG FILTER BAR */}
      <div className="tag-filter-bar">
        <div className="tag-filter-main-row">
          <div className="tag-filter-chips">
            {collections && collections.length > 0 && (
              <div className="tag-filter-group">
                <button
                  type="button"
                  className={`tag-chip${collectionFilter === 'all' ? ' is-active' : ''}`}
                  onClick={() => setCollectionFilter('all')}
                >
                  All
                </button>
                {collections.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`tag-chip${collectionFilter === c.value ? ' is-active' : ''}`}
                    onClick={() => setCollectionFilter(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {showMetalFilter && (
              <div className="tag-filter-group tag-filter-group--metals">
                {METAL_FILTERS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`tag-chip${metalFilter === m.value ? ' is-active' : ''}`}
                    onClick={() => setMetalFilter(m.value)}
                  >
                    {m.swatch && (
                      <span
                        className="tag-chip-swatch"
                        style={{ background: m.swatch.background, border: m.swatch.border }}
                      />
                    )}
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="vc-toolbar-sort">
            <label htmlFor="vc-sort" className="vc-sort-label">Sort</label>
            <span className="vc-sort-value">{SORT_LABELS[sortKey]}</span>
            <select
              id="vc-sort"
              className="vc-sort-select"
              value={sortKey}
              aria-label="Sort products"
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="featured">Featured</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="name_asc">Name: A → Z</option>
              <option value="name_desc">Name: Z → A</option>
              <option value="collection_asc">Collection: A → Z</option>
              <option value="collection_desc">Collection: Z → A</option>
              <option value="sku_asc">Model: Oldest First</option>
              <option value="newest">Newest</option>
            </select>
            <svg className="vc-sort-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* PRODUCT GRID — Van Cleef carbon-copy:
          centred white-background tile, image dots below the photo to
          swap between product images on click, serif name, material
          summary, price, optional "+N variations" hint. Editorial
          spread inserted after every six product cards. */}
      <section className="vc-products">
        <div className="vc-products-count">
          {visibleCount} {visibleCount === 1 ? 'piece' : 'pieces'}
        </div>

        {visibleCount === 0 ? (
          <div className="vc-empty">
            <p className="vc-empty-title">No matching pieces</p>
            <p className="vc-empty-body">Try a different filter combination.</p>
          </div>
        ) : (
          <div className="vc-grid">
            {(() => {
              let editorialSlot = 0;
              const items = paginated.flatMap((p, idx) => {
                const nodes: React.ReactNode[] = [
                  <VanCleefCard
                    key={p.sku}
                    product={p}
                    placeholder={PLACEHOLDER_SVG}
                    cardHref={cardHref}
                    showWishlist={showWishlist}
                    preferredMetalFilter={showMetalFilter ? metalFilter : 'all'}
                  />,
                ];
                const isInsertSlot = idx === 5 || (idx > 5 && (idx - 5) % 10 === 0);
                if (isInsertSlot && idx !== paginated.length - 1) {
                  const slotIndex = editorialSlot++;
                  nodes.push(
                    <EditorialTile
                      key={`editorial-${idx}`}
                      category={category}
                      slotIndex={slotIndex}
                    />
                  );
                }
                return nodes;
              });
              if (resolvedShowLifePathTeaser && safePage === totalPages) {
                items.push(<LifePathTeaser key="life-path-teaser" />);
              }
              return items;
            })()}
          </div>
        )}

        {/* PAGINATION */}
        {visibleCount > 0 && (
          <div className="vc-pagination">
            <div className="vc-per-page">
              <span className="vc-per-page-label">Per page</span>
              {[12, 24, 48].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`vc-per-page-btn${perPage === n ? ' is-active' : ''}`}
                  onClick={() => setPerPage(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="vc-page-nums">
                <button
                  type="button"
                  className="vc-page-btn vc-page-btn--arrow"
                  disabled={safePage === 1}
                  onClick={() => { setCurrentPage(safePage - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`vc-page-btn${safePage === n ? ' is-active' : ''}`}
                    onClick={() => { setCurrentPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="vc-page-btn vc-page-btn--arrow"
                  disabled={safePage === totalPages}
                  onClick={() => { setCurrentPage(safePage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* PHILOSOPHY STRIPE */}
      {philosophyStripe && (
        <div className="philosophy-stripe">
          <p
            dangerouslySetInnerHTML={{
              __html: philosophyStripe.quote,
            }}
          />
          {philosophyStripe.attribution && (
            <span className="philosophy-stripe-attr">{philosophyStripe.attribution}</span>
          )}
        </div>
      )}
    </main>
  );
}

const METAL_LABEL: Record<string, string> = {
  '14k_white':  '14K White Gold',
  '18k_white':  '18K White Gold',
  '14k_yellow': '14K Yellow Gold',
  '18k_yellow': '18K Yellow Gold',
  '14k_rose':   '14K Rose Gold',
  'platinum':   'Platinum',
};

const ALL_METALS = ['14k_white', '18k_white', '14k_yellow', '18k_yellow', '14k_rose', 'platinum'];

// Fallback chain: if no image for selected metal, try these alternatives (closest color family first)
const METAL_FALLBACK: Record<string, string[]> = {
  '14k_white':  ['18k_white', 'platinum'],
  '18k_white':  ['14k_white', 'platinum'],
  'platinum':   ['18k_white', '14k_white'],
  '14k_yellow': ['18k_yellow'],
  '18k_yellow': ['14k_yellow'],
  '14k_rose':   ['18k_rose'],
  '18k_rose':   ['14k_rose'],
};

const METAL_TONES: Record<string, { bg: string; border?: string }> = { // eslint-disable-line
  '14k_white':  { bg: 'linear-gradient(135deg,#f4efe9 0%,#c9c7c2 100%)', border: '1px solid rgba(60,30,20,0.18)' },
  '18k_white':  { bg: 'linear-gradient(135deg,#f0ebe4 0%,#bfbdb8 100%)', border: '1px solid rgba(60,30,20,0.18)' },
  '14k_yellow': { bg: 'linear-gradient(135deg,#e9c463 0%,#c69a3a 100%)' },
  '18k_yellow': { bg: 'linear-gradient(135deg,#e4bc50 0%,#bd9030 100%)' },
  '14k_rose':   { bg: 'linear-gradient(135deg,#f1b7a3 0%,#cf8a72 100%)' },
  'platinum':   { bg: 'linear-gradient(135deg,#ecebe7 0%,#babab5 100%)', border: '1px solid rgba(60,30,20,0.18)' },
};

// ── Van Cleef-style card ────────────────────────────────────────────
function VanCleefCard({
  product,
  placeholder,
  cardHref,
  showWishlist = true,
  preferredMetalFilter,
}: {
  product: Product;
  placeholder: React.ReactNode;
  cardHref?: (slug: string) => string;
  showWishlist?: boolean;
  preferredMetalFilter: MetalFilter['value'];
}) {
  const productUrl = cardHref ? cardHref(product.slug) : `/product/${product.slug}`;
  const metalImages = product.metal_images ?? {};

  // Only show swatches for metals we have actual images for — clicking must change the photo.
  // We deliberately exclude metals that are only listed in the `metals` array but have no
  // images, because the fallback would just show the same platinum photo, misleading the user.
  const keysWithImages = new Set(ALL_METALS.filter(m => (metalImages[m]?.length ?? 0) > 0));
  const concreteKeys = concreteMetalKeys(product);
  const showMetals = ALL_METALS.filter(m => concreteKeys.has(m));

  // Shuffle each card's default metal across TONES (silver / yellow / rose) so
  // the listing shows a mix instead of every card defaulting to platinum.
  // Deterministic by SKU (stable across SSR/client — no hydration mismatch).
  const defaultMetal = (() => {
    const preferred = metalKeysForFilter(preferredMetalFilter).find((k) => showMetals.includes(k));
    if (preferred) return preferred;

    const toneGroups = [
      ['platinum', '14k_white', '18k_white'],
      ['14k_yellow', '18k_yellow'],
      ['14k_rose', '18k_rose'],
    ];
    const availTones = toneGroups
      .map(g => g.find(k => keysWithImages.has(k)))
      .filter((k): k is string => !!k);
    if (availTones.length > 0) {
      let h = 0;
      for (let i = 0; i < product.sku.length; i++) h = (h * 31 + product.sku.charCodeAt(i)) | 0;
      return availTones[Math.abs(h) % availTones.length];
    }
    const defaultKey = product.default_metal ? metalKeyFromLabel(product.default_metal) ?? product.default_metal : '';
    return (defaultKey && concreteKeys.has(defaultKey))
      ? defaultKey
      : showMetals[0] ?? '';
  })();

  const [selectedMetal, setSelectedMetal] = useState(defaultMetal);
  // Default to index 1 (_2.jpg = laying-down flatlay)
  // Rest on the first (eager-loaded) image so the thumbnail always shows;
  // hovering cycles through the other angles.
  const [cyclingIdx, setCyclingIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Images for selected metal — try exact metal, then closest family, then product default
  const getImagesForMetal = (m: string) => {
    if (m && metalImages[m]?.length) return metalImages[m];
    for (const fallback of (METAL_FALLBACK[m] ?? [])) {
      if (metalImages[fallback]?.length) return metalImages[fallback];
    }
    return product.images ?? [];
  };

  // Cap at 5 images per card — enough angles, avoids excessive DOM nodes
  const displayImages = getImagesForMetal(selectedMetal).slice(0, 5);
  const isAwardWinner = product.collection?.toLowerCase().includes('award');

  function startCycling() {
    setCyclingIdx(0);
    if (displayImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setCyclingIdx((i) => (i + 1) % displayImages.length);
      }, 700);
    }
  }

  function stopCycling() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setCyclingIdx(0);
  }

  function selectMetal(e: React.MouseEvent, m: string) {
    e.preventDefault();
    setSelectedMetal(m);
    setCyclingIdx(0);
  }

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setSelectedMetal(defaultMetal);
    setCyclingIdx(0);
  }, [defaultMetal]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="vc-card">
      {isAwardWinner && (
        <div className="vc-card-most-loved">MOST LOVED</div>
      )}
      {showWishlist && <WishlistHeart slug={product.slug} />}

      <Link
        href={productUrl}
        className="vc-card-media"
        aria-label={product.name}
        onMouseEnter={startCycling}
        onMouseLeave={stopCycling}
      >
        {displayImages.length > 0 ? (
          displayImages.map((src, i) => (
            <div key={src} className={`img-slide${i === cyclingIdx ? ' img-slide--active' : ''}`}>
              <Image
                src={safeUrl(src)}
                alt={product.name}
                fill
                sizes="(max-width: 560px) 50vw, (max-width: 980px) 50vw, (max-width: 1200px) 33vw, 25vw"
                style={{ objectFit: 'contain', objectPosition: 'center' }}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))
        ) : (
          <div className="vc-card-placeholder">{placeholder}</div>
        )}
      </Link>

      <div className="vc-card-meta">
        <Link href={productUrl} className="vc-card-name-link" prefetch={false}>
          <h3 className="vc-card-name">{stripMetalSuffix(product.name)}</h3>
        </Link>
        {(product.price_computed != null || product.price_display) && (
          <p className="vc-card-price">
            {product.price_computed != null
              ? '$' + product.price_computed.toLocaleString('en-US')
              : product.price_display}
          </p>
        )}

        <div className="vc-card-metals">
          {showMetals.map((m) => {
            const tone = METAL_TONES[m];
            if (!tone) return null;
            return (
              <button
                key={m}
                type="button"
                className={`vc-card-swatch${selectedMetal === m ? ' is-active' : ''}`}
                onClick={(e) => selectMetal(e, m)}
                title={METAL_LABEL[m]}
                style={{ background: tone.bg, border: tone.border ?? 'none' }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Life Path teaser — dark special card shown as the last item on the
// engagement rings grid. Clicking opens the Life Path numerology feature.
function LifePathTeaser() {
  return (
    <Link href="/life-path" className="vc-card vc-lp-teaser" aria-label="Discover your Life Path ring">
      <div className="vc-lp-teaser-bg" aria-hidden="true">
        <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="vc-lp-teaser-spiral">
          <circle cx="140" cy="140" r="118" stroke="#AC3438" strokeWidth="0.8" opacity="0.6"/>
          <circle cx="140" cy="140" r="92" stroke="#AC3438" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="140" cy="140" r="66" stroke="#AC3438" strokeWidth="0.5" opacity="0.3"/>
          <circle cx="140" cy="140" r="42" stroke="#AC3438" strokeWidth="0.4" opacity="0.25"/>
          <circle cx="140" cy="140" r="22" stroke="#AC3438" strokeWidth="0.4" opacity="0.2"/>
          <line x1="140" y1="22" x2="140" y2="258" stroke="#AC3438" strokeWidth="0.3" opacity="0.2"/>
          <line x1="22" y1="140" x2="258" y2="140" stroke="#AC3438" strokeWidth="0.3" opacity="0.2"/>
          <line x1="57" y1="57" x2="223" y2="223" stroke="#AC3438" strokeWidth="0.25" opacity="0.15"/>
          <line x1="223" y1="57" x2="57" y2="223" stroke="#AC3438" strokeWidth="0.25" opacity="0.15"/>
        </svg>
      </div>
      <div className="vc-lp-teaser-content">
        <span className="vc-lp-teaser-eyebrow">DANHOV · Exclusive</span>
        <h3 className="vc-lp-teaser-title">The Life Path</h3>
        <p className="vc-lp-teaser-sub">
          Your birth date holds the blueprint<br />for a ring designed only for you.
        </p>
        <span className="vc-lp-teaser-cta">Discover Yours →</span>
      </div>
    </Link>
  );
}

// ── Editorial tile — a centred quote card woven between the product
// rows. Not a link, not a CTA — just a moment of breath. The customer
// scrolls past a row of pieces, then reads a single line that captures
// the spirit of the collection, then scrolls into the next row.
//
// `slotIndex` is the running count of editorial tiles in this listing;
// we cycle through EDITORIAL_QUOTES so the customer never sees the
// same line twice as they scroll down.
function EditorialTile({
  category,
  slotIndex,
}: {
  category: string;
  slotIndex: number;
}) {
  const quotes = EDITORIAL_QUOTES[category] ?? EDITORIAL_QUOTES.default;
  const quote = quotes[slotIndex % quotes.length];
  return (
    <figure
      className="vc-editorial"
      aria-label={`DANHOV reflection: ${quote.text}`}
    >
      <div className="vc-editorial-media" aria-hidden="true">
        <div className="vc-editorial-illustration" />
      </div>
      <blockquote className="vc-editorial-quote">
        <p className="vc-editorial-quote-text">
          <span className="vc-editorial-quote-mark vc-editorial-quote-mark--open" aria-hidden="true">&ldquo;</span>
          {quote.text}
          <span className="vc-editorial-quote-mark vc-editorial-quote-mark--close" aria-hidden="true">&rdquo;</span>
        </p>
        {quote.attribution && (
          <footer className="vc-editorial-quote-attr">— {quote.attribution}</footer>
        )}
      </blockquote>
    </figure>
  );
}

type EditorialQuote = { text: string; attribution?: string };

// One ordered list per category. Quote-style brand messages — short,
// meditative, untraceable to any one product. The picker cycles through
// them so each editorial slot reads as a different reflection.
const EDITORIAL_QUOTES: Record<string, EditorialQuote[]> = {
  engagement: [
    { text: 'Sacred geometry, set in gold.' },
    { text: 'The spiral does not end. It returns.' },
    { text: 'In silence, the ring was formed.' },
    { text: 'Two souls, one circle, infinite.' },
    { text: 'Every ring is a held space.' },
  ],
  wedding: [
    { text: 'I am you.' },
    { text: 'Two whole people choosing each other.' },
    { text: 'The circle that begins exactly where it ends.' },
    { text: 'A vow is a quiet thing. So is gold.' },
    { text: 'Worn together, written together.' },
  ],
  fine: [
    { text: 'Quiet pieces, for loud lives.' },
    { text: 'Wear it every day. It was made for this.' },
    { text: 'Light, gathered.' },
    { text: 'Small enough to forget. Beautiful enough to remember.' },
  ],
  mens: [
    { text: 'Strength is a soft thing.' },
    { text: 'In silence, the band was forged.' },
    { text: 'A ring that carries a name.' },
    { text: 'Weight, worn well.' },
  ],
  collection: [
    { text: 'A name given with intention. A piece made with purpose.' },
    { text: 'Every piece in this collection carries the same DNA.' },
    { text: 'In silence, the design arrived.' },
    { text: 'DANHOV — Los Angeles, since 1984.' },
  ],
  default: [
    { text: 'Handcrafted in Los Angeles since 1984.' },
    { text: 'Sacred geometry, set in gold.' },
    { text: 'Presence is a present.' },
  ],
};

// Per-collection AI advisor opening messages — used when a collection
// chip is active to give the advisor precise context about the piece.
const COLLECTION_AI_PROMPTS: Record<string, string> = {
  abbraccio:  "I'm exploring the Abbraccio collection — DANHOV's iconic swirl embrace settings. Help me find the right piece.",
  voltaggio:  "I'm drawn to Voltaggio tension-set rings where the stone floats in the ring's energy. What should I know?",
  classico:   "I love the Classico collection's timeless solitaires. Help me find my ideal setting.",
  norme:      "I'm looking at Norme de Danhov — the foundational forms. What sets these apart from other collections?",
  carezza:    "The Carezza collection's delicate pavé work caught my eye. Help me understand my customization options.",
  'per-lei':  "I'm exploring Per Lei — the floral and feminine U Collection designs. Help me find the right piece.",
  petalo:     "The Petalo petal forms are beautiful. Help me choose the right size, metal, and setting.",
  solo:       "Solo Filo's single continuous thread speaks to me. What options are available?",
  eleganza:   "I want refined simplicity from the Eleganza collection. Help me find a timeless piece.",
  couture:    "I'm looking for a statement piece from Couture. What makes these designs different?",
  unito:      "The Unito collection — two forms joined as one — speaks to me. What are my options?",
};

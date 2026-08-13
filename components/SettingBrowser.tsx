'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Product } from '@/lib/products';
import { stripMetalSuffix } from '@/lib/product-display';

// ─── Metal helpers ─────────────────────────────────────────────────────────

interface MetalOption {
  key: string;
  display: string;
  karat: string;
  name: string;
  color: string;
}

function normaliseMetalKey(raw: string): string {
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
  if (isRose) return 'rose';
  if (isWhite) return 'white';
  if (isYellow) return 'yellow';
  return value.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function parseMetalOption(raw: string): MetalOption {
  const key = normaliseMetalKey(raw);
  const karatMatch = key.match(/^(14|18)k_/);
  const karat = karatMatch ? `${karatMatch[1]}K` : '';
  const isRose = key.includes('rose');
  const isYellow = key.includes('yellow') || key === 'gold';
  const isWhite = key.includes('white');
  const isPlatinum = key === 'platinum';

  let name = 'Gold';
  let color = 'linear-gradient(135deg, #e9c463 0%, #c69a3a 100%)';
  if (isRose) { name = 'Rose Gold'; color = 'linear-gradient(135deg, #f1b7a3 0%, #cf8a72 100%)'; }
  else if (isWhite) { name = 'White Gold'; color = 'linear-gradient(135deg, #f4efe9 0%, #c9c7c2 100%)'; }
  else if (isYellow) { name = 'Yellow Gold'; color = 'linear-gradient(135deg, #e9c463 0%, #c69a3a 100%)'; }
  else if (isPlatinum) { name = 'Platinum'; color = 'linear-gradient(135deg, #ecebe7 0%, #babab5 100%)'; }

  return {
    key,
    display: karat ? `${karat} ${name}` : name,
    karat,
    name,
    color,
  };
}

function concreteMetalKeys(product: Product): string[] {
  const keys = new Set<string>();
  for (const [metal, imgs] of Object.entries(product.metal_images ?? {})) {
    if ((imgs?.length ?? 0) > 0) keys.add(normaliseMetalKey(metal));
  }
  if (product.default_metal && (product.images?.length ?? 0) > 0) {
    keys.add(normaliseMetalKey(product.default_metal));
  }
  return Array.from(keys);
}

// ─── Grouping helpers ──────────────────────────────────────────────────────

// Strip trailing metal/karat code from SKU: -14r, -14w, -14y, -18r, -pl, -plat, etc.
function baseSkuKey(sku: string | null | undefined): string {
  if (!sku) return `__no_sku__${Math.random()}`;
  return sku.replace(/-\d*[a-z]+$/i, '').toLowerCase();
}

function displayBaseSku(sku: string): string {
  return sku.replace(/-\d*[a-z]+$/i, '');
}

// Determine the primary metal for this product variant (for swatch colour)
function variantPrimaryMetal(p: Product): string | null {
  const concrete = concreteMetalKeys(p);
  if (concrete.length > 0) return concrete[0];
  const sku = p.sku ?? '';
  const m = sku.match(/-(\d{2})?([a-z]+)$/i);
  if (m) {
    const karat = m[1] ?? '14';
    const code = m[2].toLowerCase();
    const codeMap: Record<string, string> = {
      r: `${karat}k_rose_gold`, rg: `${karat}k_rose_gold`,
      y: `${karat}k_yellow_gold`, yg: `${karat}k_yellow_gold`,
      w: `${karat}k_white_gold`, wg: `${karat}k_white_gold`,
      pl: 'platinum', plat: 'platinum',
    };
    if (codeMap[code]) return codeMap[code];
  }
  return null;
}

type ProductGroup = {
  key: string;
  canonical: Product;
  variants: Product[];
  swatches: Array<{ metal: MetalOption; slug: string; metalRaw: string }>;
  minPrice: number | null;
};

function buildGroups(products: Product[], priceMap?: Record<string, number>): ProductGroup[] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const key = baseSkuKey(p.sku);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  return Array.from(map.values()).map((variants) => {
    // Sort so platinum appears first — it's the prestige default
    variants.sort((a, b) => {
      const aIsPl = /plat/i.test(variantPrimaryMetal(a) ?? '');
      const bIsPl = /plat/i.test(variantPrimaryMetal(b) ?? '');
      return aIsPl === bIsPl ? 0 : aIsPl ? -1 : 1;
    });
    const seenColors = new Set<string>();
    const swatches: Array<{ metal: MetalOption; slug: string; metalRaw: string }> = [];
    for (const v of variants) {
      for (const metal of concreteMetalKeys(v)) {
        const opt = parseMetalOption(metal);
        if (!seenColors.has(opt.color)) {
          seenColors.add(opt.color);
          swatches.push({ metal: opt, slug: v.slug, metalRaw: metal });
        }
      }
    }
    let minPrice: number | null = null;
    for (const v of variants) {
      const computed = priceMap?.[v.sku] ?? null;
      const p = computed !== null ? computed : parsePrice(v.price_display);
      if (p !== null && (minPrice === null || p < minPrice)) minPrice = p;
    }

    return {
      key: baseSkuKey(variants[0].sku),
      canonical: variants[0],
      variants,
      swatches: swatches.slice(0, 4),
      minPrice,
    };
  });
}

// ─── Price helpers ─────────────────────────────────────────────────────────

function parsePrice(display: string | null): number | null {
  if (!display) return null;
  const m = display.replace(/,/g, '').match(/[\d.]+/);
  return m ? Math.round(Number(m[0])) : null;
}

// ─── Per-collection ring style icons ──────────────────────────────────────

const COLLECTION_ICONS: Record<string, React.ReactNode> = {
  abbraccio: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <path d="M28 11C29.5 6 34 6 34 9.5C34 13 29 13.5 26.5 10C24 6.5 26.5 2.5 30 4.5" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  ),
  classico: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <circle cx="28" cy="6.5" r="3.5" />
      <line x1="25.5" y1="9.5" x2="24.5" y2="11.5" strokeWidth="1" />
      <line x1="30.5" y1="9.5" x2="31.5" y2="11.5" strokeWidth="1" />
    </svg>
  ),
  couture: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <circle cx="28" cy="6.5" r="2.5" />
      <circle cx="28" cy="6.5" r="5" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
      <circle cx="28" cy="1.5" r="1" fill="currentColor" />
      <circle cx="33.2" cy="3.8" r="1" fill="currentColor" />
      <circle cx="22.8" cy="3.8" r="1" fill="currentColor" />
    </svg>
  ),
  voltaggio: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M10 19C10 14 18 11 28 11C38 11 46 14 46 19C46 24 38 27 28 27C18 27 10 24 10 19Z" />
      <path d="M18 19C18 16 22 14 28 14C34 14 38 16 38 19C38 22 34 24 28 24C22 24 18 22 18 19Z" />
      <line x1="28" y1="3" x2="28" y2="10.5" strokeWidth="0.8" />
      <circle cx="28" cy="6.5" r="3" strokeWidth="1.2" />
    </svg>
  ),
  'norme de danhov': (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <rect x="24.5" y="3" width="7" height="7" rx="0.5" strokeWidth="1.3" />
    </svg>
  ),
  norme: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <rect x="24.5" y="3" width="7" height="7" rx="0.5" strokeWidth="1.3" />
    </svg>
  ),
  'per lei': (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <path d="M24 3.5C24 3.5 24 9 28 9C32 9 32 3.5 32 3.5" fill="none" strokeLinecap="round" />
      <path d="M21.5 5.5C21.5 5.5 21.5 10.5 28 10.5C34.5 10.5 34.5 5.5 34.5 5.5" fill="none" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  ),
  petalo: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <ellipse cx="28" cy="6" rx="2.5" ry="4.5" strokeWidth="1.2" />
      <ellipse cx="22.5" cy="8.5" rx="2" ry="3.2" transform="rotate(-35 22.5 8.5)" strokeWidth="0.9" />
      <ellipse cx="33.5" cy="8.5" rx="2" ry="3.2" transform="rotate(35 33.5 8.5)" strokeWidth="0.9" />
    </svg>
  ),
  perlina: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <circle cx="21.5" cy="9" r="2" fill="currentColor" fillOpacity="0.12" strokeWidth="1" />
      <circle cx="28" cy="5.5" r="2.8" fill="currentColor" fillOpacity="0.12" strokeWidth="1" />
      <circle cx="34.5" cy="9" r="2" fill="currentColor" fillOpacity="0.12" strokeWidth="1" />
    </svg>
  ),
  'pop of color': (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <circle cx="28" cy="6.5" r="4" fill="currentColor" fillOpacity="0.22" strokeWidth="1.2" />
      <circle cx="26.5" cy="5" r="1.2" fill="currentColor" fillOpacity="0.45" stroke="none" />
    </svg>
  ),
  'award winners': (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <path d="M28 2L29.4 6H33.5L30.3 8.3L31.5 12.5L28 10L24.5 12.5L25.7 8.3L22.5 6H26.6L28 2Z" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  ),
  eleganza: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <ellipse cx="28" cy="6.5" rx="2.2" ry="4.5" strokeWidth="1.2" />
    </svg>
  ),
  carezza: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <circle cx="28" cy="5" r="1.2" fill="currentColor" />
      <circle cx="24" cy="7" r="1" fill="currentColor" />
      <circle cx="32" cy="7" r="1" fill="currentColor" />
      <circle cx="21.5" cy="10" r="0.8" fill="currentColor" />
      <circle cx="34.5" cy="10" r="0.8" fill="currentColor" />
    </svg>
  ),
  unito: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="24" cy="17" rx="14" ry="7" />
      <ellipse cx="32" cy="17" rx="14" ry="7" />
      <line x1="28" y1="4" x2="28" y2="10" strokeWidth="1" />
    </svg>
  ),
  'solo filo': (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <ellipse cx="28" cy="15" rx="21" ry="10" />
    </svg>
  ),
  solo: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <ellipse cx="28" cy="15" rx="21" ry="10" />
    </svg>
  ),
  rings: (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden="true">
      <ellipse cx="28" cy="14" rx="18" ry="9" />
    </svg>
  ),
};

function CollectionStyleIcon({ collection }: { collection: string }) {
  const key = collection.toLowerCase();
  const icon = COLLECTION_ICONS[key];
  if (icon) return <>{icon}</>;
  return (
    <svg viewBox="0 0 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <ellipse cx="28" cy="19" rx="18" ry="8" />
      <ellipse cx="28" cy="19" rx="11" ry="4.5" />
      <circle cx="28" cy="6" r="3" />
    </svg>
  );
}

// ─── Best image helper ─────────────────────────────────────────────────────

function metalPriorityKey(k: string): number {
  if (k.includes('plat'))   return 0;
  if (k.includes('white'))  return 1;
  if (k.includes('yellow')) return 2;
  return 3;
}

function getBestImage(p: Product): string | null {
  const mi = p.metal_images;
  if (mi) {
    const sorted = Object.keys(mi).sort((a, b) => metalPriorityKey(a) - metalPriorityKey(b));
    for (const k of sorted) {
      if (mi[k]?.[0]) return mi[k][0];
    }
  }
  return p.images?.[0] ?? null;
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
  products: Product[];
  priceMap?: Record<string, number>;
  diamondId?: string;
  diamondsParam?: string | null;
}

// ─── Main component ────────────────────────────────────────────────────────

const PER_PAGE_OPTIONS = [12, 24, 48];
const DEFAULT_PER_PAGE = 24;

export default function SettingBrowser({ products, priceMap, diamondId, diamondsParam }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allCollections = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of products) {
      if (p.collection && !seen.has(p.collection)) {
        seen.add(p.collection);
        out.push(p.collection);
      }
    }
    return out.sort();
  }, [products]);

  // One representative photo per collection (best metal, first angle)
  const collectionImageMap = useMemo(() => {
    const metalPriority = (k: string) =>
      k.includes('plat') ? 0 : k.includes('white') ? 1 : k.includes('yellow') ? 2 : 3;

    const map: Record<string, string> = {};
    for (const p of products) {
      const col = p.collection;
      if (!col || map[col]) continue;

      const mi = p.metal_images;
      if (mi) {
        const sorted = Object.keys(mi).sort((a, b) => metalPriority(a) - metalPriority(b));
        for (const k of sorted) {
          if (mi[k]?.[0]) { map[col] = mi[k][0]; break; }
        }
      }
      if (!map[col] && p.images?.[0]) map[col] = p.images[0];
    }
    return map;
  }, [products]);

  const allMetals = useMemo(() => {
    const seen = new Map<string, MetalOption>();
    for (const p of products) {
      for (const m of concreteMetalKeys(p)) {
        const opt = parseMetalOption(m);
        if (!seen.has(opt.key)) seen.set(opt.key, opt);
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      const order = ['Rose Gold', 'Yellow Gold', 'White Gold', 'Gold', 'Platinum'];
      const ia = order.indexOf(a.name);
      const ib = order.indexOf(b.name);
      if (ia !== ib) return ia - ib;
      return (Number(b.karat.replace('K', '')) || 0) - (Number(a.karat.replace('K', '')) || 0);
    });
  }, [products]);

  // Group products by base SKU — one card per unique setting
  const groups = useMemo(() => buildGroups(products, priceMap), [products, priceMap]);

  const { globalMin, globalMax } = useMemo(() => {
    let min = Infinity;
    let max = 0;
    for (const g of groups) {
      if (g.minPrice !== null) {
        if (g.minPrice < min) min = g.minPrice;
        if (g.minPrice > max) max = g.minPrice;
      }
    }
    return {
      globalMin: Math.floor((min === Infinity ? 100 : min) / 100) * 100,
      globalMax: Math.ceil((max || 10000) / 1000) * 1000,
    };
  }, [groups]);

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [showMoreStyles, setShowMoreStyles] = useState(false);
  const [showMoreMetals, setShowMoreMetals] = useState(false);

  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());
  const [activeMetals, setActiveMetals] = useState<Set<string>>(new Set());
  const [priceMin, setPriceMin] = useState(globalMin);
  const [priceMax, setPriceMax] = useState(globalMin);
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const [inputMin, setInputMin] = useState(String(globalMin));
  const [inputMax, setInputMax] = useState(String(globalMin));
  useEffect(() => { setInputMin(String(priceMin)); }, [priceMin]);
  useEffect(() => { setInputMax(String(priceMax)); }, [priceMax]);

  const priceFiltered = priceMax > globalMin;
  const activeCount = activeStyles.size + activeMetals.size + (priceFiltered ? 1 : 0);

  function toggleSet<T>(set: Set<T>, val: T): Set<T> {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    return next;
  }

  const resetAll = useCallback(() => {
    setActiveStyles(new Set());
    setActiveMetals(new Set());
    setPriceMin(globalMin);
    setPriceMax(globalMin);
    setSort('featured');
  }, [globalMin]);

  const filteredGroups = useMemo(() => {
    let result = groups;

    if (activeStyles.size > 0) {
      result = result.filter((g) => g.canonical.collection && activeStyles.has(g.canonical.collection));
    }
    if (activeMetals.size > 0) {
      result = result.filter((g) =>
        g.variants.some((v) =>
          concreteMetalKeys(v).some((m) => activeMetals.has(m))
        )
      );
    }
    if (priceFiltered) {
      result = result.filter((g) => {
        if (g.minPrice === null) return true;
        return g.minPrice >= priceMin && g.minPrice <= priceMax;
      });
    }

    if (sort === 'price-asc') {
      result = [...result].sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
    } else if (sort === 'price-desc') {
      result = [...result].sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
    }

    return result;
  }, [groups, activeStyles, activeMetals, priceFiltered, priceMin, priceMax, sort]);

  // Pagination — read from URL, reset to 1 when filters change
  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const perPage = PER_PAGE_OPTIONS.includes(Number(searchParams.get('per_page')))
    ? Number(searchParams.get('per_page'))
    : DEFAULT_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageGroups = filteredGroups.slice((safePage - 1) * perPage, safePage * perPage);

  function navigatePage(page: number, pp: number = perPage) {
    const dSuffix = diamondsParam
      ? `diamonds=${encodeURIComponent(diamondsParam)}`
      : diamondId
      ? `diamond=${encodeURIComponent(diamondId)}`
      : '';
    const params = new URLSearchParams(dSuffix ? `?${dSuffix}` : '');
    params.set('page', String(page));
    params.set('per_page', String(pp));
    router.push(`/ring-builder/setting?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) navigatePage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyles.size, activeMetals.size, priceFiltered, sort]);

  // Pagination page numbers with ellipsis (same logic as admin)
  const pageNums: (number | '…')[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - safePage) <= 2) {
      pageNums.push(n);
    } else if (pageNums[pageNums.length - 1] !== '…') {
      pageNums.push('…');
    }
  }

  const visibleStyles = showMoreStyles ? allCollections : allCollections.slice(0, 5);
  const visibleMetals = showMoreMetals ? allMetals : allMetals.slice(0, 5);

  return (
    <div className="sb">
      {/* ── Filter toggle bar ─────────────────────────────────────────── */}
      <div className="sb-toggle-bar">
        <button
          className="sb-toggle-btn"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <span className="sb-toggle-chevron">{filtersOpen ? '∧' : '∨'}</span>
          {filtersOpen ? 'Hide' : 'Show'} all filters
          <span className="sb-toggle-count">({activeCount})</span>
        </button>
        {activeCount > 0 && (
          <button className="sb-reset-btn" onClick={resetAll}>
            Clear all
          </button>
        )}
      </div>

      {/* ── Filter panel ──────────────────────────────────────────────── */}
      {filtersOpen && (
        <div className="sb-filters">
          <div className="sb-filters-col">
            {/* Style */}
            <div className="sb-filter-section">
              <div className="sb-filter-title">Style</div>
              <div className="sb-style-chips">
                {visibleStyles.map((col) => (
                  <button
                    key={col}
                    className={`sb-style-chip${activeStyles.has(col) ? ' is-active' : ''}`}
                    onClick={() => setActiveStyles((s) => toggleSet(s, col))}
                    aria-pressed={activeStyles.has(col)}
                  >
                    <span className="sb-style-icon">
                      {collectionImageMap[col] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={collectionImageMap[col]} alt={col} className="sb-style-img" />
                      ) : (
                        <CollectionStyleIcon collection={col} />
                      )}
                    </span>
                    <span className="sb-style-label">{col}</span>
                  </button>
                ))}
              </div>
              {allCollections.length > 5 && (
                <button className="sb-more-btn" onClick={() => setShowMoreStyles((v) => !v)}>
                  {showMoreStyles ? '∧ Less' : '∨ More Styles'}
                </button>
              )}
            </div>

            {/* Metal */}
            <div className="sb-filter-section">
              <div className="sb-filter-title">Metal</div>
              <div className="sb-metal-chips">
                {visibleMetals.map((m) => (
                  <button
                    key={m.key}
                    className={`sb-metal-chip${activeMetals.has(m.key) ? ' is-active' : ''}`}
                    onClick={() => setActiveMetals((s) => toggleSet(s, m.key))}
                    aria-pressed={activeMetals.has(m.key)}
                    title={m.display}
                  >
                    <span className="sb-metal-circle" style={{ background: m.color }}>
                      {m.karat && <span className="sb-metal-karat">{m.karat}</span>}
                    </span>
                    <span className="sb-metal-name">{m.name}</span>
                  </button>
                ))}
              </div>
              {allMetals.length > 5 && (
                <button className="sb-more-btn" onClick={() => setShowMoreMetals((v) => !v)}>
                  {showMoreMetals ? '∧ Less' : '∨ More Metals'}
                </button>
              )}
            </div>
          </div>

          {/* Right column: Price */}
          <div className="sb-filters-col">
            <div className="sb-filter-section">
              <div className="sb-filter-title">Price</div>
              <div className="sb-price-wrap">
                <div className="sb-price-slider-track">
                  <div className="sb-price-track-bg" />
                  <div
                    className="sb-price-track-fill"
                    style={{
                      left: `${((priceMin - globalMin) / Math.max(globalMax - globalMin, 1)) * 100}%`,
                      right: `${100 - ((priceMax - globalMin) / Math.max(globalMax - globalMin, 1)) * 100}%`,
                    }}
                  />
                  <input
                    type="range"
                    className="sb-range sb-range--min"
                    min={globalMin}
                    max={globalMax}
                    step={100}
                    value={priceMin}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v <= priceMax) setPriceMin(v);
                    }}
                  />
                  <input
                    type="range"
                    className="sb-range sb-range--max"
                    min={globalMin}
                    max={globalMax}
                    step={100}
                    value={priceMax}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v >= priceMin) setPriceMax(v);
                    }}
                  />
                </div>
                <div className="sb-price-inputs">
                  <div className="sb-price-input-wrap">
                    <span className="sb-price-dollar">$</span>
                    <input
                      type="number"
                      className="sb-price-input"
                      value={inputMin}
                      min={globalMin}
                      max={globalMax}
                      step={100}
                      onChange={(e) => setInputMin(e.target.value)}
                      onBlur={() => {
                        const v = Math.max(globalMin, Math.min(globalMax, Number(inputMin) || globalMin));
                        const clamped = Math.min(v, priceMax > globalMin ? priceMax : globalMax);
                        setPriceMin(clamped);
                        setInputMin(String(clamped));
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      aria-label="Minimum price"
                    />
                  </div>
                  <span className="sb-price-dash">—</span>
                  <div className="sb-price-input-wrap">
                    <span className="sb-price-dollar">$</span>
                    <input
                      type="number"
                      className="sb-price-input"
                      value={inputMax}
                      min={globalMin}
                      max={globalMax}
                      step={100}
                      onChange={(e) => setInputMax(e.target.value)}
                      onBlur={() => {
                        const v = Math.max(globalMin, Math.min(globalMax, Number(inputMax) || globalMin));
                        const clamped = Math.max(v, priceMin);
                        setPriceMax(clamped);
                        setInputMax(String(clamped));
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      aria-label="Maximum price"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar: count + sort ──────────────────────────────────────── */}
      <div className="sb-toolbar">
        <span className="sb-toolbar-count">
          {filteredGroups.length} setting{filteredGroups.length !== 1 ? 's' : ''}
          {activeCount > 0 ? ' matching filters' : ''}
        </span>
        <label className="sb-sort-label">
          Sort order:
          <select
            className="sb-sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </label>
      </div>

      {/* ── Product grid ──────────────────────────────────────────────── */}
      <div className="sb-grid">
        {filteredGroups.length === 0 ? (
          <div className="sb-empty">
            <p>No settings match the current filters.</p>
            <button className="sb-reset-btn" onClick={resetAll}>Clear all filters</button>
          </div>
        ) : (
          pageGroups.map((g) => (
            <SettingGroupCard key={g.key} group={g} diamondId={diamondId} diamondsParam={diamondsParam} />
          ))
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="sb-pagination">
          <button
            className="sb-page-btn"
            onClick={() => navigatePage(safePage - 1)}
            disabled={safePage <= 1}
          >← Prev</button>

          <div className="sb-pagination__pages">
            {pageNums.map((n, i) =>
              n === '…' ? (
                <span key={`e-${i}`} className="sb-page-btn sb-page-btn--ellipsis">…</span>
              ) : (
                <button
                  key={n}
                  className={`sb-page-btn${n === safePage ? ' sb-page-btn--active' : ''}`}
                  onClick={() => navigatePage(n)}
                  disabled={n === safePage}
                >{n}</button>
              )
            )}
          </div>

          <button
            className="sb-page-btn"
            onClick={() => navigatePage(safePage + 1)}
            disabled={safePage >= totalPages}
          >Next →</button>

          <div className="sb-pagination__jump">
            <label className="sb-pagination__label">Go to page</label>
            <select
              className="sb-pagination__select"
              value={safePage}
              onChange={(e) => navigatePage(Number(e.target.value))}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Page {n}</option>
              ))}
            </select>
          </div>

          <div className="sb-pagination__jump">
            <label className="sb-pagination__label">Show</label>
            <select
              className="sb-pagination__select"
              value={perPage}
              onChange={(e) => navigatePage(1, Number(e.target.value))}
            >
              {PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group card ────────────────────────────────────────────────────────────

function SettingGroupCard({ group, diamondId, diamondsParam }: { group: ProductGroup; diamondId?: string; diamondsParam?: string | null }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const p = group.canonical;

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.transform = `perspective(700px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
  }

  function onMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.18s, border-color 0.18s';
    el.style.transform = '';
    setTimeout(() => { if (el) el.style.transition = ''; }, 450);
  }

  const heroImage = getBestImage(p);
  const dSuffix = diamondsParam
    ? `?diamonds=${encodeURIComponent(diamondsParam)}`
    : diamondId
    ? `?diamond=${encodeURIComponent(diamondId)}`
    : '';
  const canonicalHref = `/ring-builder/setting/${p.slug}${dSuffix}`;
  const baseSku = p.sku ? displayBaseSku(p.sku) : null;

  return (
    <div
      ref={cardRef}
      className="sb-card"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <Link href={canonicalHref} className="sb-card-img-link" tabIndex={-1} aria-hidden="true">
        <div className="sb-card-img">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt={p.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              loading="lazy"
            />
          ) : (
            <svg className="sb-card-placeholder" viewBox="0 0 80 80" fill="none" aria-hidden="true">
              <circle cx="40" cy="40" r="28" stroke="#c9b8ad" strokeWidth="1" />
              <circle cx="40" cy="40" r="16" stroke="#c9b8ad" strokeWidth="0.6" />
              <circle cx="40" cy="12" r="4" fill="#c9b8ad" />
            </svg>
          )}
        </div>
      </Link>

      <div className="sb-card-body">
        <Link href={canonicalHref} className="sb-card-name-link">
          <h3 className="sb-card-name">
            {stripMetalSuffix(p.name)}
          </h3>
        </Link>

        {group.swatches.length > 0 && (
          <div className="sb-card-swatches">
            {group.swatches.map((s) => (
              <Link
                key={s.slug}
                href={`/ring-builder/setting/${s.slug}${dSuffix}`}
                className="sb-card-swatch"
                style={{ background: s.metal.color }}
                title={s.metal.display}
                aria-label={`View in ${s.metal.display}`}
              />
            ))}
          </div>
        )}

        {group.minPrice !== null && (
          <p className="sb-card-price">
            {group.swatches.length > 1 ? 'From ' : ''}${group.minPrice.toLocaleString('en-US')} USD
          </p>
        )}
      </div>
    </div>
  );
}

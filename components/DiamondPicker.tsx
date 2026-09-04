'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { diamondCategoryKey } from '@/lib/diamond-categories';

// ── Diamond media: still image + loupe360 360° viewer on hover ───────────
// Brilliant Earth carbon-copy. Nivoda's `video` field is a loupe360 viewer
// URL (an HTML page that renders the diamond's 360° turntable spin and
// handles its own hover/drag rotation), NOT a raw video file — so we embed
// it in an <iframe>. The still `image` shows by default; on hover we lazily
// mount the loupe360 iframe over it so the stone spins exactly like BE.
// Iframes are mounted only on first hover (never 24 at once) for performance.
//
// Nivoda image URLs can be slow / 4xx / CDN-blocked; on any error we
// degrade gracefully so the customer never sees a broken-image icon.
// loupe360's native canvas width — viewer renders at this size internally.
// We measure the card and scale the iframe down to match.
const LOUPE360_NATIVE = 500;

// Photographic shape images — used as card placeholder when Nivoda has no image
const SHAPE_PHOTO: Record<string, string> = {
  ROUND:    '/diamond-shapes/round.jpg',
  OVAL:     '/diamond-shapes/oval.jpg',
  CUSHION:  '/diamond-shapes/cushion.jpg',
  PRINCESS: '/diamond-shapes/princess.jpg',
  EMERALD:  '/diamond-shapes/emerald.jpg',
  PEAR:     '/diamond-shapes/pear.jpg',
  RADIANT:  '/diamond-shapes/radiant.jpg',
  HEART:    '/diamond-shapes/heart.png',
  MARQUISE: '/diamond-shapes/marquise.jpg',
  ASSCHER:  '/diamond-shapes/asscher.jpg',
};

export function DiamondCardMedia({
  image,
  video,
  shape,
  carat: _carat,
  autoPlay = false,
}: {
  image: string | null;
  video: string | null;
  shape: ShapeT;
  carat: number;
  /** When true, mount the 360° iframe immediately and show it once ready — no hover needed. */
  autoPlay?: boolean;
}) {
  const [imgStatus, setImgStatus] = useState<'loading' | 'ok' | 'error'>(
    image ? 'loading' : 'error'
  );
  const [hovering, setHovering] = useState(false);
  // autoPlay: mount the iframe on render so it loads without user interaction
  const [spinMounted, setSpinMounted] = useState(autoPlay);
  const [spinReady, setSpinReady] = useState(false);
  const [spinScale, setSpinScale] = useState(1);
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgStatus(image ? 'loading' : 'error');
  }, [image]);
  useEffect(() => {
    setSpinMounted(autoPlay);
    setSpinReady(false);
  }, [video, autoPlay]);

  // Measure the card and compute the scale needed to fit the loupe360 viewer.
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setSpinScale(w / LOUPE360_NATIVE);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const hasSpin = !!video;
  const hasImage = !!image && imgStatus !== 'error';

  // autoPlay: show iframe immediately — loupe360 has its own loader and
  // will auto-rotate once its canvas initialises. No need to wait for onLoad.
  const spinVisible = autoPlay ? spinMounted : (hovering && spinReady);

  const onEnter = () => {
    setHovering(true);
    if (hasSpin && !autoPlay) setSpinMounted(true);
  };
  const onLeave = () => setHovering(false);

  if (!hasImage && !hasSpin) {
    return (
      <div className="be-card-shape-placeholder">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SHAPE_PHOTO[shape] ?? SHAPE_PHOTO['ROUND']}
          alt=""
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      ref={mediaRef}
      className="dpicker-media"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {imgStatus === 'loading' && !spinVisible && <div className="dpicker-skel" aria-hidden="true" />}

      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setImgStatus('ok')}
          onError={() => setImgStatus('error')}
          className="dpicker-media-img"
          style={{
            // autoPlay: keep image visible as background while loupe360 initialises,
            // fade out once iframe has signalled onLoad (spinReady).
            opacity: imgStatus === 'ok'
              ? (autoPlay ? (spinReady ? 0 : 1) : (hasSpin && spinVisible ? 0 : 1))
              : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}

      {/* loupe360 viewer — set at its native 500px canvas size, then scaled
          down via transform to exactly fill the card. This prevents the partial-
          viewport zoom (where 280px iframe shows only the centre of a 500px
          canvas, making the diamond look cropped/zoomed). */}
      {hasSpin && spinMounted && (
        <div className="dpicker-spin-frame" style={{ opacity: spinVisible ? 1 : 0 }}>
          <iframe
            src={video!}
            title="360° diamond view"
            loading="lazy"
            scrolling="no"
            className="dpicker-media-spin"
            style={{
              width: LOUPE360_NATIVE,
              height: LOUPE360_NATIVE,
              transform: `scale(${spinScale})`,
              transformOrigin: 'top left',
            }}
            onLoad={() => setSpinReady(true)}
          />
        </div>
      )}

      {hasSpin && !spinReady && (autoPlay || hovering) && spinMounted && (
        <span className="dpicker-loading" aria-label="Loading 360° view">
          <span className="dpicker-loading-ring" />
        </span>
      )}

      {hasSpin && !hovering && !autoPlay && (
        <span className="dpicker-spin" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M21 4v4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          360°
        </span>
      )}
    </div>
  );
}
export type ShapeT =
  | 'ROUND' | 'OVAL' | 'PRINCESS' | 'CUSHION' | 'EMERALD'
  | 'PEAR' | 'HEART' | 'MARQUISE' | 'RADIANT' | 'ASSCHER';

// ── Filter shape ──────────────────────────────────────────────────────────

type Shape = 'ROUND' | 'OVAL' | 'PRINCESS' | 'CUSHION' | 'EMERALD' | 'PEAR' | 'HEART' | 'MARQUISE' | 'RADIANT' | 'ASSCHER';
type Color = 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';
type FancyColor = 'Yellow' | 'Pink' | 'Blue' | 'Green' | 'Orange' | 'Purple' | 'Brown' | 'Grey';
const FANCY_COLORS: { value: FancyColor; label: string; dot: string }[] = [
  { value: 'Yellow',  label: 'Yellow',  dot: '#e9c463' },
  { value: 'Pink',    label: 'Pink',    dot: '#f1b7a3' },
  { value: 'Blue',    label: 'Blue',    dot: '#7eb8e0' },
  { value: 'Green',   label: 'Green',   dot: '#8bc98e' },
  { value: 'Orange',  label: 'Orange',  dot: '#e8914a' },
  { value: 'Purple',  label: 'Purple',  dot: '#b089c8' },
  { value: 'Brown',   label: 'Cognac',  dot: '#a07850' },
  { value: 'Grey',    label: 'Grey',    dot: '#b0aea8' },
];
type Clarity = 'FL' | 'IF' | 'VVS1' | 'VVS2' | 'VS1' | 'VS2' | 'SI1' | 'SI2';
type Cut = 'EX' | 'ID' | 'VG' | 'G';

type SortField = 'price' | 'size' | 'discount';

const SHAPES: { value: Shape; label: string }[] = [
  { value: 'ROUND', label: 'Round' },
  { value: 'OVAL', label: 'Oval' },
  { value: 'CUSHION', label: 'Cushion' },
  { value: 'PRINCESS', label: 'Princess' },
  { value: 'EMERALD', label: 'Emerald' },
  { value: 'PEAR', label: 'Pear' },
  { value: 'RADIANT', label: 'Radiant' },
  { value: 'HEART', label: 'Heart' },
  { value: 'MARQUISE', label: 'Marquise' },
  { value: 'ASSCHER', label: 'Asscher' },
];

const COLORS: Color[] = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
const CLARITIES: Clarity[] = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2'];
const CUTS: { value: Cut; label: string }[] = [
  { value: 'EX', label: 'Excellent' },
  { value: 'ID', label: 'Ideal' },
  { value: 'VG', label: 'Very Good' },
  { value: 'G', label: 'Good' },
];

export type Diamond = {
  id: string;                 // offer id
  price: number | null;
  markup_price: number | null;
  diamond: {
    NivodaStockId: string | null;
    image: string | null;
    video: string | null;
    availability: string | null;
    certificate: {
      lab: string | null;
      certNumber: string | null;
      shape: string | null;
      carats: number | null;
      clarity: string | null;
      color: string | null;
      cut: string | null;
      polish: string | null;
      symmetry: string | null;
      pdfUrl: string | null;
    } | null;
  };
};

function ShapeIcon({ shape, color = 'currentColor' }: { shape: Shape; color?: string }) {
  const s = { stroke: color, strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (shape) {
    case 'ROUND':    return <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" {...s} /></svg>;
    case 'OVAL':     return <svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="20" rx="12" ry="17" {...s} /></svg>;
    case 'CUSHION':  return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="4" width="32" height="32" rx="8" {...s} /></svg>;
    case 'PRINCESS': return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="5" width="30" height="30" {...s} /></svg>;
    case 'EMERALD':  return <svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="13,3 27,3 36,11 36,29 27,37 13,37 4,29 4,11" {...s} /></svg>;
    case 'PEAR':     return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 C27 7 34 15 34 23 C34 32 28 37 20 37 C12 37 6 32 6 23 C6 15 13 7 20 4 Z" {...s} /></svg>;
    case 'RADIANT':  return <svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="11,5 29,5 35,11 35,29 29,35 11,35 5,29 5,11" {...s} /></svg>;
    case 'HEART':    return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 34 C14 30 4 22 4 16 C4 10 8 5 14 5 C17 5 19 8 20 11 C21 8 23 5 26 5 C32 5 36 10 36 16 C36 22 26 30 20 34 Z" {...s} /></svg>;
    case 'MARQUISE': return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 C30 10 36 15 36 20 C36 25 30 30 20 37 C10 30 4 25 4 20 C4 15 10 10 20 3 Z" {...s} /></svg>;
    case 'ASSCHER':  return <svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="12,4 28,4 36,12 36,28 28,36 12,36 4,28 4,12" {...s} /><polygon points="15,10 25,10 30,15 30,25 25,30 15,30 10,25 10,15" stroke={color} strokeWidth="0.8" fill="none" /></svg>;
    default: return null;
  }
}


function ensureSessionId(): string {
  if (typeof window === 'undefined') return 'srv';
  const KEY = 'danhov_session_id';
  let sid = window.localStorage.getItem(KEY);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    window.localStorage.setItem(KEY, sid);
  }
  return sid;
}

type Props = {
  settingSlug?: string;
  /** The metal the customer selected on the setting detail page. */
  metal?: string;
  /** Called once the stone is held and we're navigating to Complete Ring. */
  onSelected?: (offerId: string, holdId: string) => void;
  /** If a stone is already selected (e.g. coming back to /diamond from /review). */
  initialOfferId?: string;
  /** Server-prefetched diamonds so the grid renders on first paint with no client fetch. */
  initialItems?: Diamond[];
  initialTotalCount?: number;
  /** Offer ID already in cart (Add Another Diamond flow) — shows "In Cart" badge. */
  existingOfferId?: string;
  /** Offer ID currently reserved in a pending order (Change Diamond flow) — shows "In Your Order" badge + un-reserve option. */
  inOrderOfferId?: string;
  /** Offer IDs already in the current order (ADD mode) — shows "In Your Order" badge, cannot be un-reserved. Selecting a new stone appends to this list. */
  orderDiamondIds?: string[];
  /** Per-category markup multipliers from the diamond_markups table. Falls back to 2.3× if not provided. */
  markups?: Record<string, number>;
};

function getMarkup(isLabgrown: boolean, fancyColors: string[], markups?: Record<string, number>): number {
  const m = markups ?? {};
  const key = diamondCategoryKey(isLabgrown, fancyColors[0]);
  // Fall back sensibly if a specific fancy key is unset: lab_fancy_* → lab_grown, fancy_* → natural
  return m[key] ?? (isLabgrown ? m.lab_grown : m.natural) ?? 2.3;
}

const VALID_SHAPES: Shape[] = ['ROUND', 'OVAL', 'PRINCESS', 'CUSHION', 'EMERALD', 'PEAR', 'HEART', 'MARQUISE', 'RADIANT', 'ASSCHER'];

export default function DiamondPicker({ settingSlug, metal, onSelected, initialOfferId, initialItems, initialTotalCount, existingOfferId, inOrderOfferId, orderDiamondIds, markups }: Props) {
  const searchParams = useSearchParams();
  // Honour a ?shape= deep link from the homepage shape tiles so the
  // grid pre-filters to whatever the customer clicked.
  const initialShape: Shape = (() => {
    const q = searchParams?.get('shape')?.toUpperCase();
    if (q && (VALID_SHAPES as string[]).includes(q)) return q as Shape;
    return 'ROUND';
  })();
  const [shape, setShape] = useState<Shape>(initialShape);
  const [labgrown, setLabgrown] = useState<boolean>(false);
  const [fancyColors, setFancyColors] = useState<FancyColor[]>([]);
  const [caratMin, setCaratMin] = useState<number>(0.5);
  const [caratMax, setCaratMax] = useState<number>(50);
  const [colors, setColors] = useState<Color[]>(['D', 'E', 'F', 'G', 'H']);
  const [clarities, setClarities] = useState<Clarity[]>(['VS1', 'VS2', 'SI1']);
  const [cuts, setCuts] = useState<Cut[]>(['EX', 'ID']);
  const [sortField, setSortField] = useState<SortField>('price');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');

  const hasServerData = !!(initialItems && initialItems.length > 0);
  const [items, setItems] = useState<Diamond[]>(initialItems ?? []);
  const [totalCount, setTotalCount] = useState(hasServerData ? (initialTotalCount ?? 0) : 0);
  const [offset, setOffset] = useState(0);
  // Start non-loading when we have server-prefetched items; first useEffect
  // will skip the fetch and flip this back only on actual filter changes.
  const [loading, setLoading] = useState(!hasServerData);
  const [err, setErr] = useState<string | null>(null);
  // Skip the mount-time fetch when server already provided initial data.
  const skipNextFetch = useRef<boolean>(hasServerData);
  const [selected, setSelected] = useState<string | null>(initialOfferId ?? null);
  const [holding, setHolding] = useState<string | null>(null);
  // IDs the user has explicitly "un-reserved" — removes In Your Order lock so they can pick a different stone
  const [unreservedIds, setUnreservedIds] = useState<Set<string>>(new Set());

  const sessionId = useMemo(() => ensureSessionId(), []);
  const PAGE_SIZE = 50; // Nivoda's hard per-request maximum

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  // Reset offset when filters change
  const fancyMode = fancyColors.length > 0;
  const filterSignature = useMemo(
    () => JSON.stringify({ shape, labgrown, fancyColors, caratMin, caratMax, colors, clarities, cuts, sortField, sortDir }),
    [shape, labgrown, fancyColors, caratMin, caratMax, colors, clarities, cuts, sortField, sortDir]
  );
  useEffect(() => {
    setOffset(0);
  }, [filterSignature]);

  // Fetch results when filters or offset change
  const lastReq = useRef(0);
  useEffect(() => {
    // If the server already provided the initial page, skip the redundant
    // mount-time fetch. Subsequent filter/offset changes always fetch.
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const reqId = ++lastReq.current;
    setLoading(true);
    setErr(null);

    // Fancy colored diamonds use different fields — clarity/cut grades don't
    // apply the same way, and the inventory is smaller so we cast a wide net.
    const body = fancyMode ? {
      filters: {
        shapes: [shape],
        labgrown,
        color: ['FANCY'] as string[],
        ...(fancyColors.length > 0 ? { fancyColor: fancyColors as string[] } : {}),
        availability: 'AVAILABLE' as const,
      },
      limit: 50,
      offset,
      order: { type: sortField, direction: sortDir },
    } : {
      filters: {
        shapes: [shape],
        labgrown,
        sizes: { from: caratMin, to: caratMax },
        color: colors as string[],
        clarity: clarities,
        cut: cuts,
        availability: 'AVAILABLE' as const,
      },
      limit: PAGE_SIZE,
      offset,
      order: { type: sortField, direction: sortDir },
    };

    fetch('/api/nivoda/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        if (reqId !== lastReq.current) return;
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          const base = e.error || `Search failed (${r.status})`;
          const msg = e.detail ? `${base} ${e.detail}` : base;
          throw new Error(msg);
        }
        const data = await r.json();
        const incoming = (data.items as Diamond[]) ?? [];
        setItems(prev => offset === 0 ? incoming : [...prev, ...incoming]);
        setTotalCount(Number(data.total_count) || 0);
      })
      .catch((e) => {
        if (reqId !== lastReq.current) return;
        setErr(e instanceof Error ? e.message : 'Search failed');
        setItems([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (reqId === lastReq.current) setLoading(false);
      });
  }, [filterSignature, offset, shape, labgrown, caratMin, caratMax, colors, clarities, cuts, sortField, sortDir, fancyColors, fancyMode]);

  // Selecting a stone places a short Nivoda hold (reserves it while the
  // customer reviews) and advances straight to the Complete Ring screen —
  // mirroring the Nivoda reference flow exactly: pick a diamond here, then
  // see the assembled setting + diamond on /ring-builder/review. A failed
  // hold is non-fatal — the studio re-confirms availability at checkout.
  async function selectStone(d: Diamond) {
    if (holding) return;
    const preservedSettingSlug = settingSlug || window.sessionStorage.getItem('danhov_ring_builder_setting') || undefined;
    setSelected(d.id);
    setHolding(d.id);
    setErr(null);

    // Pre-warm the stone detail cache so the review page loads instantly
    // instead of making a fresh Nivoda API call. Fire-and-forget.
    fetch('/api/nivoda/warm-stone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer_id: d.id, stone: d }),
    }).catch(() => {});

    const qs = new URLSearchParams();
    if (orderDiamondIds && orderDiamondIds.length > 0) {
      qs.set('diamonds', [...orderDiamondIds, d.id].join('|'));
    } else {
      qs.set('diamond', d.id);
    }
    if (preservedSettingSlug) qs.set('setting', preservedSettingSlug);
    if (metal) qs.set('metal', metal);
    qs.set('dcat', diamondCategoryKey(labgrown, fancyColors[0]));

    // Move to Step 3 immediately. Availability holds are best-effort and
    // must never block or interrupt the ring review navigation.
    window.location.assign(`/ring-builder/review?${qs.toString()}`);

    let holdId: string | null = null;
    try {
      const holdRes = await fetch('/api/nivoda/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: d.id,
          session_id: sessionId,
          setting_slug: preservedSettingSlug,
        }),
      });
      if (holdRes.ok) {
        const holdJson = await holdRes.json().catch(() => ({}));
        holdId = holdJson.hold_id ?? null;
      } else {
        const e = await holdRes.json().catch(() => ({}));
        console.warn('[diamond] hold failed, continuing without hold:', e);
      }
    } catch (e) {
      console.warn('[diamond] hold request failed, continuing without hold:', e);
    }

    onSelected?.(d.id, holdId ?? '');

    void holdId;
  }


  return (
    <div className="be-picker">
      {/* ── Top toolbar: total count + sort ─────────────────────── */}
      <div className="be-toolbar">
        <div className="be-toolbar-count">
          {loading ? (
            <span>Loading inventory…</span>
          ) : (
            <>
              <span className="be-toolbar-count-num">{totalCount.toLocaleString('en-US')}</span>{' '}
              <span>{totalCount === 1 ? 'Diamond' : 'Diamonds'}</span>
            </>
          )}
          {err && <span className="be-toolbar-err"> · {err}</span>}
        </div>

        <div className="be-toolbar-sort">
          <label htmlFor="be-sort">Sort By:</label>
          <select
            id="be-sort"
            value={`${sortField}-${sortDir}`}
            onChange={(e) => {
              const [f, d] = e.target.value.split('-');
              setSortField(f as SortField);
              setSortDir(d as 'ASC' | 'DESC');
            }}
          >
            <option value="price-ASC">Price: Low to High</option>
            <option value="price-DESC">Price: High to Low</option>
            <option value="size-DESC">Carat: High to Low</option>
            <option value="size-ASC">Carat: Low to High</option>
            <option value="discount-DESC">Best Value</option>
          </select>
        </div>
      </div>

      <div className="be-layout">
        {/* ── LEFT SIDEBAR — facets ────────────────────────────── */}
        <aside className="be-sidebar">
          <details className="be-facet" open>
            <summary className="be-facet-head">Diamond Origin</summary>
            <div className="be-facet-body">
              <div className="be-toggle-pair">
                <button
                  type="button"
                  className={`be-toggle${!labgrown ? ' is-on' : ''}`}
                  onClick={() => setLabgrown(false)}
                >
                  Natural
                </button>
                <button
                  type="button"
                  className={`be-toggle${labgrown ? ' is-on' : ''}`}
                  onClick={() => setLabgrown(true)}
                >
                  Lab Grown
                </button>
              </div>
            </div>
          </details>

          <details className="be-facet" open>
            <summary className="be-facet-head">Diamond Shape</summary>
            <div className="be-facet-body">
              <div className="be-shape-grid">
                {SHAPES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`be-shape${shape === s.value ? ' is-active' : ''}`}
                    onClick={() => setShape(s.value)}
                    aria-label={s.label}
                  >
                    <span className="be-shape-icon">
                      <ShapeIcon shape={s.value} />
                    </span>
                    <span className="be-shape-label">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </details>

          <details className="be-facet" open>
            <summary className="be-facet-head">Carat</summary>
            <div className="be-facet-body">
              <div className="be-range">
                <label>
                  <span>From</span>
                  <input
                    type="number" step="0.1" min="0.1" max="50"
                    value={caratMin}
                    onChange={(e) => setCaratMin(Math.max(0.1, Number(e.target.value)))}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="number" step="0.1" min="0.1" max="50"
                    value={caratMax}
                    onChange={(e) => setCaratMax(Math.max(caratMin, Number(e.target.value)))}
                  />
                </label>
              </div>
            </div>
          </details>

          <details className="be-facet" open>
            <summary className="be-facet-head">Color</summary>
            <div className="be-facet-body">
              <p className="be-color-label">White</p>
              <div className={`be-chip-row${fancyMode ? ' be-chip-row--muted' : ''}`}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`be-chip${!fancyMode && colors.includes(c) ? ' is-active' : ''}`}
                    onClick={() => { setFancyColors([]); setColors(toggle(colors, c)); }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="be-color-label be-color-label--fancy">
                <span className="be-fancy-dot" />
                Fancy Color
              </p>
              <div className="be-chip-row be-chip-row--fancy">
                {FANCY_COLORS.map((fc) => (
                  <button
                    key={fc.value}
                    type="button"
                    className={`be-chip be-chip--fancy${fancyColors.includes(fc.value) ? ' is-active' : ''}`}
                    onClick={() => setFancyColors(toggle(fancyColors, fc.value))}
                  >
                    <span className="be-fancy-swatch" style={{ background: fc.dot }} />
                    {fc.label}
                  </button>
                ))}
              </div>
            </div>
          </details>

          <details className="be-facet" open>
            <summary className="be-facet-head">Clarity</summary>
            <div className="be-facet-body">
              <div className="be-chip-row">
                {CLARITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`be-chip${clarities.includes(c) ? ' is-active' : ''}`}
                    onClick={() => setClarities(toggle(clarities, c))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </details>

          <details className="be-facet" open>
            <summary className="be-facet-head">Cut</summary>
            <div className="be-facet-body">
              <div className="be-chip-row be-chip-row--wide">
                {CUTS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`be-chip${cuts.includes(c.value) ? ' is-active' : ''}`}
                    onClick={() => setCuts(toggle(cuts, c.value))}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </details>
        </aside>

        {/* ── RIGHT — results grid ─────────────────────────────── */}
        <section className="be-results">
          <div className="be-grid">
            {/* Shimmer skeleton shown while the first fetch is in flight */}
            {loading && items.length === 0 && (
              Array.from({ length: 12 }).map((_, i) => (
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
              ))
            )}

            {items.map((d) => {
              const cert = d.diamond.certificate;
              const price = Math.round((d.price ?? 0) * getMarkup(labgrown, fancyColors, markups));
              const isSelected = selected === d.id;
              const isHolding = holding === d.id;
              const isUnreserved = unreservedIds.has(d.id);
              const isInCart = !!(existingOfferId && d.id === existingOfferId && !isUnreserved);
              // CHANGE mode: single inOrderOfferId, can be un-reserved
              const isInOrder = !!(inOrderOfferId && d.id === inOrderOfferId && !isUnreserved);
              // ADD mode: already in the multi-diamond order list, cannot be un-reserved
              const isInOrderAdd = !!(orderDiamondIds?.includes(d.id));
              const isDisabled = !!holding || isInCart || isInOrder || isInOrderAdd;

              let btnText: string;
              if (isInOrderAdd) btnText = '✓ In Your Order';
              else if (isInOrder) btnText = '✓ In Your Order';
              else if (isInCart) btnText = '✓ Already in Cart';
              else if (isHolding) btnText = 'Reserving…';
              else if (isSelected) btnText = '✓ Selected';
              else btnText = 'Select';

              return (
                <div
                  key={d.id}
                  className={`be-card${isSelected ? ' is-selected' : ''}${isInCart ? ' be-card--in-cart' : ''}${(isInOrder || isInOrderAdd) ? ' be-card--in-order' : ''}`}
                >
                  <div className="be-card-media">
                    {isInCart && (
                      <span className="be-card-in-cart-badge">In Cart</span>
                    )}
                    {(isInOrder || isInOrderAdd) && (
                      <span className="be-card-in-order-badge">In Your Order</span>
                    )}
                    <div className="be-card-media-inner">
                      <DiamondCardMedia
                        image={d.diamond.image}
                        video={d.diamond.video}
                        shape={(cert?.shape?.toUpperCase() as Shape) ?? shape}
                        carat={cert?.carats ?? 1}
                      />
                    </div>
                  </div>

                  <div className="be-card-body">
                    <div className={`be-card-type${labgrown ? ' is-lab' : ''}`}>
                      {labgrown ? 'Lab-Grown' : (fancyColors.length > 0 ? 'Natural · Fancy Color' : 'Natural')}
                    </div>
                    <div className="be-card-headline">
                      {cert?.carats ? cert.carats.toFixed(2) : '—'} ct {(cert?.shape || shape).toString().toLowerCase()} Diamond
                    </div>
                    <div className="be-card-grade">
                      {cert?.cut === 'EX' || cert?.cut === 'ID' ? 'Super Ideal' : (cert?.cut ?? 'Very Good')}
                      {' · '}
                      {cert?.color ?? '—'}
                      {' · '}
                      {cert?.clarity ?? '—'}
                    </div>
                    {cert?.lab && (
                      <div className="be-card-cert">
                        <span>{cert.lab}{cert.certNumber ? ` ${cert.certNumber}` : ''}</span>
                        {cert.pdfUrl && (
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="be-card-cert-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Certificate ↗
                          </a>
                        )}
                      </div>
                    )}
                    <div className="be-card-price">${Number(price).toLocaleString('en-US')}</div>
                    <button
                      type="button"
                      className={`be-card-cta${isSelected ? ' is-selected' : ''}${isInCart ? ' is-in-cart' : ''}${(isInOrder || isInOrderAdd) ? ' is-in-order' : ''}`}
                      disabled={isDisabled}
                      onClick={(e) => {
                        if (isInCart || isInOrder || isInOrderAdd) return;
                        e.stopPropagation();
                        selectStone(d);
                      }}
                    >
                      {btnText}
                    </button>
                    {/* Un-reserve only available in CHANGE mode (inOrderOfferId), not ADD mode */}
                    {isInOrder && !isInOrderAdd && (
                      <button
                        type="button"
                        className="be-card-unreserve"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnreservedIds(prev => new Set([...prev, d.id]));
                        }}
                      >
                        Un-reserve · Select Different →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {!loading && items.length === 0 && (
              <div className="be-empty">
                <p>No diamonds match this combination right now.</p>
                <p className="be-empty-hint">
                  Try widening the carat range or relaxing color / clarity.
                </p>
              </div>
            )}
          </div>

          {items.length < totalCount && (
            <div className="be-pager">
              <span className="be-pager-status">
                Showing {items.length.toLocaleString()} of {totalCount.toLocaleString()} diamonds
              </span>
              <button
                type="button"
                className="be-pager-btn be-pager-btn--load-more"
                disabled={loading}
                onClick={() => setOffset(prev => prev + PAGE_SIZE)}
              >
                {loading ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, totalCount - items.length)} more`}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

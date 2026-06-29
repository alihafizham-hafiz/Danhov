'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ── Shared types ──────────────────────────────────────────────────────────

export type CollectionItem = {
  name: string;
  slug: string;
  images: string[];
  meaning: string;
  body: string;
};

export type ProductItem = {
  sku: string;
  slug: string;
  name: string;
  collection: string | null;
  images: string[] | null;
  price_display: string | null;
};

export type CategoryData = {
  collections: CollectionItem[];
  products: ProductItem[];
};

export type EngagementCard = {
  label: string;
  value: string;
  meaning: string;
  body: string;
  href: string;
  images: string[];
  linkLabel: string;
  isLifePath: boolean;
};

// ── SVG placeholders ───────────────────────────────────────────────────────

const LIFE_PATH_SVG = (
  <svg width="80" height="80" viewBox="0 0 120 120" fill="none">
    <circle cx="60" cy="60" r="40" stroke="#AC3438" strokeWidth="2" opacity="0.5" fill="none" />
    <line x1="60" y1="24" x2="60" y2="96" stroke="#AC3438" strokeWidth="0.8" opacity="0.5" />
    <line x1="28" y1="42" x2="92" y2="78" stroke="#AC3438" strokeWidth="0.8" opacity="0.5" />
    <line x1="92" y1="42" x2="28" y2="78" stroke="#AC3438" strokeWidth="0.8" opacity="0.5" />
    <line x1="24" y1="60" x2="96" y2="60" stroke="#AC3438" strokeWidth="0.8" opacity="0.5" />
    <circle cx="60" cy="60" r="14" fill="rgba(172,52,56,0.08)" stroke="#AC3438" strokeWidth="1" />
    <circle cx="60" cy="24" r="2.5" fill="#AC3438" />
    <circle cx="92" cy="78" r="2.5" fill="#AC3438" />
    <circle cx="28" cy="78" r="2.5" fill="#AC3438" />
  </svg>
);

const RING_SVG = (
  <svg width="60" height="60" viewBox="0 0 80 80" fill="none" aria-hidden>
    <circle cx="40" cy="40" r="28" stroke="#AC3438" strokeWidth="1.5" fill="none" opacity="0.5" />
    <circle cx="40" cy="40" r="16" stroke="#AC3438" strokeWidth="5" fill="rgba(172,52,56,0.06)" />
  </svg>
);

const CATEGORY_BADGES: Record<string, string> = {
  'engagement-hero': 'Engagement',
  fine: 'Fine Jewelry',
  mens: "Men's",
};

// ── Individual rail card ───────────────────────────────────────────────────

function RailCard({ card }: { card: EngagementCard }) {
  const defaultIdx = card.images.length > 1 ? 1 : 0;
  const [activeIdx, setActiveIdx] = useState(defaultIdx);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCycle() {
    if (card.images.length <= 1) return;
    setActiveIdx(0);
    timerRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % card.images.length);
    }, 1200);
  }

  function stopCycle() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActiveIdx(card.images.length > 1 ? 1 : 0);
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const badge = CATEGORY_BADGES[card.value];

  return (
    <Link
      href={card.href}
      className="cat-rail-card"
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
    >
      <div className="cat-rail-vitrine">
        {card.images.length > 0 ? (
          card.images.map((src, i) => (
            <div
              key={src}
              className={`img-slide${i === activeIdx ? ' img-slide--active' : ''}`}
            >
              <img
                src={src}
                alt={card.label}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain', objectPosition: 'center',
                  display: 'block',
                }}
                loading="eager"
              />
            </div>
          ))
        ) : (
          <div className="cat-rail-placeholder">
            {card.isLifePath ? LIFE_PATH_SVG : RING_SVG}
          </div>
        )}
        <div className="cat-rail-info">
          <div className="cat-rail-name">{card.label}</div>
          <div className="cat-rail-meaning">{card.meaning}</div>
          {badge && <span className="cat-rail-badge">{badge}</span>}
        </div>
      </div>
    </Link>
  );
}

// ── Rail container ─────────────────────────────────────────────────────────

export default function CategoryGridClient({
  engagementCards,
}: {
  engagementCards: EngagementCard[];
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  // Progress bar update
  useEffect(() => {
    const rail = railRef.current;
    const fill = fillRef.current;
    if (!rail || !fill) return;

    function update() {
      const max = rail!.scrollWidth - rail!.clientWidth;
      fill!.style.width = `${max > 0 ? (rail!.scrollLeft / max) * 100 : 0}%`;
    }

    rail.addEventListener('scroll', update, { passive: true });
    update();
    return () => rail.removeEventListener('scroll', update);
  }, []);

  // Mouse-wheel → horizontal scroll (one card per tick, works with snap)
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        const card = rail!.querySelector<HTMLElement>('.cat-rail-card');
        const step = card ? card.offsetWidth + 20 : 300;
        rail!.scrollBy({ left: e.deltaY > 0 ? step : -step, behavior: 'smooth' });
      }
    }
    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => rail.removeEventListener('wheel', onWheel);
  }, []);

  // Auto-scroll: move one card → pause → repeat; stop on hover
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    function cardWidth() {
      const card = rail!.querySelector<HTMLElement>('.cat-rail-card');
      return card ? card.offsetWidth + 20 : 300;
    }

    function step() {
      if (pausedRef.current || !rail) return;

      const max = rail.scrollWidth - rail.clientWidth;
      const next = rail.scrollLeft + cardWidth();

      if (next >= max - 4) {
        // End reached — jump silently to start, then continue after a beat
        rail.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
        autoRef.current = setTimeout(step, 1800);
      } else {
        rail.scrollTo({ left: next, behavior: 'smooth' });
        // 800ms scroll animation + 1400ms pause = 2200ms per card
        autoRef.current = setTimeout(step, 2200);
      }
    }

    // Begin after a short initial delay
    autoRef.current = setTimeout(step, 1800);

    function pause() {
      pausedRef.current = true;
      if (autoRef.current) clearTimeout(autoRef.current);
    }
    function resume() {
      pausedRef.current = false;
      autoRef.current = setTimeout(step, 1200);
    }

    rail.addEventListener('mouseenter', pause);
    rail.addEventListener('mouseleave', resume);
    rail.addEventListener('touchstart', pause, { passive: true });

    return () => {
      if (autoRef.current) clearTimeout(autoRef.current);
      rail.removeEventListener('mouseenter', pause);
      rail.removeEventListener('mouseleave', resume);
      rail.removeEventListener('touchstart', pause);
    };
  }, []);

  const collectionCount = engagementCards.filter(
    (c) => !c.isLifePath && !CATEGORY_BADGES[c.value]
  ).length;

  function scrollByCard(dir: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>('.cat-rail-card');
    const step = card ? card.offsetWidth + 20 : 300;
    rail.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  return (
    <>
      <div className="cat-rail-wrap">
        <button
          type="button"
          className="cat-rail-arrow cat-rail-arrow--left"
          aria-label="Scroll left"
          onClick={() => scrollByCard(-1)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="cat-rail" ref={railRef}>
          {engagementCards.map((card) => (
            <RailCard key={card.value} card={card} />
          ))}
        </div>

        <button
          type="button"
          className="cat-rail-arrow cat-rail-arrow--right"
          aria-label="Scroll right"
          onClick={() => scrollByCard(1)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="cat-rail-cue">
        <span>Drag to explore</span>
        <span>{String(collectionCount).padStart(2, '0')} collections</span>
      </div>
      <div className="cat-rail-bar-wrap">
        <span className="cat-rail-bar-track">
          <span ref={fillRef} className="cat-rail-bar-fill" />
        </span>
      </div>

      <p className="categories-intro">
        Fourteen families, one philosophy. Each begins with a different idea
        of how gold should hold a diamond.
      </p>

      <div className="cat-view-all">
        <a href="/engagement-rings" className="cat-view-all-btn">
          View All 580+ Rings
        </a>
      </div>
    </>
  );
}

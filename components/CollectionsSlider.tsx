'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type CollectionCard = {
  img: string;
  collection: string;
  title: string;
  desc: string;
  href: string;
};

type Props = {
  cards: CollectionCard[];
};

const CARD_WIDTH = 308; // 280px card + 28px gap
const STEP_DURATION = 450; // ms each smooth scroll takes
const PAUSE_DURATION = 1100; // ms to pause between moves

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CollectionsSlider({ cards }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [doubled, setDoubled] = useState<CollectionCard[]>([...cards, ...cards]);

  // Shuffle once on mount (client-side only)
  useEffect(() => {
    const s = shuffle(cards);
    setDoubled([...s, ...s]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let paused = false;
    let animationFrame: number | null = null;
    let stepTimer: ReturnType<typeof setTimeout> | null = null;
    let pauseTimer: ReturnType<typeof setTimeout> | null = null;

    function clearTimers() {
      if (animationFrame !== null) { cancelAnimationFrame(animationFrame); animationFrame = null; }
      if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
      if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
    }

    function animateTo(target: number) {
      const slider = wrap;
      if (!slider) return;

      const start = slider.scrollLeft;
      const distance = target - start;
      const startedAt = performance.now();

      const frame = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / STEP_DURATION);
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        slider.scrollLeft = start + distance * eased;
        if (progress < 1 && !paused) {
          animationFrame = requestAnimationFrame(frame);
        } else {
          animationFrame = null;
        }
      };

      animationFrame = requestAnimationFrame(frame);
    }

    function doStep() {
      if (paused || !wrap) return;
      const half = wrap.scrollWidth / 2;
      const target = wrap.scrollLeft + CARD_WIDTH;

      if (target >= half) {
        wrap.scrollLeft = 0;
      } else {
        animateTo(target);
      }

      stepTimer = setTimeout(() => {
        pauseTimer = setTimeout(doStep, PAUSE_DURATION);
      }, STEP_DURATION);
    }

    const initTimer = setTimeout(doStep, 1200);

    const onEnter = () => { paused = true; clearTimers(); };
    const onLeave = () => {
      paused = false;
      pauseTimer = setTimeout(doStep, PAUSE_DURATION);
    };
    const onWheel = () => { paused = true; clearTimers(); pauseTimer = setTimeout(() => { paused = false; doStep(); }, 2500); };
    const onTouch = () => { paused = true; clearTimers(); };
    const onTouchEnd = () => { pauseTimer = setTimeout(() => { paused = false; doStep(); }, 2500); };

    wrap.addEventListener('mouseenter', onEnter);
    wrap.addEventListener('mouseleave', onLeave);
    wrap.addEventListener('wheel', onWheel, { passive: true });
    wrap.addEventListener('touchstart', onTouch, { passive: true });
    wrap.addEventListener('touchend', onTouchEnd);

    return () => {
      clearTimeout(initTimer);
      clearTimers();
      wrap.removeEventListener('mouseenter', onEnter);
      wrap.removeEventListener('mouseleave', onLeave);
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('touchstart', onTouch);
      wrap.removeEventListener('touchend', onTouchEnd);
    };
  }, [doubled.length]);

  return (
    <div className="ring-slider-wrap ring-slider-wrap--interactive" ref={wrapRef}>
      <div className="ring-slider-track ring-slider-track--manual">
        {doubled.map((card, i) => (
          <Link
            key={`${card.title}-${i}`}
            href={card.href}
            className="ring-slide"
            aria-hidden={i >= cards.length || undefined}
            tabIndex={i >= cards.length ? -1 : 0}
          >
            <div className="ring-slide-img">
              <Image src={card.img} alt={card.title} fill style={{ objectFit: 'cover' }} sizes="300px" />
            </div>
            <div className="ring-slide-body">
              <span className="ring-slide-collection">{card.collection}</span>
              <div className="ring-slide-title">{card.title}</div>
              <p className="ring-slide-desc">{card.desc}</p>
              <span className="ring-slide-cta">Explore →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

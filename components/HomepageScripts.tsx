'use client';

import { useEffect } from 'react';

// Hero reveal cadence — sped up per client request. The whole sequence
// now lands in ~2.6s (was ~10.2s): lines ~450ms apart, founder + scroll
// cues right after.
const HERO_SEQUENCE: { id: string; delay: number }[] = [
  { id: 'chLine1', delay: 200 },   // "The ring was not designed."
  { id: 'chLine2', delay: 700 },   // "It was received."
  { id: 'chDiv', delay: 1150 },
  { id: 'chLine3', delay: 1400 },  // philosophy line
  { id: 'heroFounder', delay: 1850 },
];

// Rotates one per day. The four brand-brief statements (§9) live here so the
// philosophy surfaces across the site without crowding the shopping path.
const DAILY_MESSAGES = [
  'We are already whole.',
  'You already are one.',
  'Waves are the ocean.',
  'Love is remembering.',
  'The way out is to go in.',
  'Marriage is the practice of love.',
  'The longest journey of a human is only 12 inches — from the mind to the heart.',
  'The ring is the reminder.',
  'Self love.',
  'You are the universe.',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function HomepageScripts() {
  useEffect(() => {
    // ── Hero cinematic reveal ─────────────────────────────────────────
    const timers: ReturnType<typeof setTimeout>[] = [];
    HERO_SEQUENCE.forEach(({ id, delay }) => {
      timers.push(
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
            el.style.transition =
              'opacity 0.55s ease, transform 0.55s ease, width 0.5s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            if (el.classList.contains('ch-divider')) el.style.width = '60px';
            el.classList.add('visible');
          }
        }, delay)
      );
    });

    // ── Generate stars in hero ────────────────────────────────────────
    const starsContainer = document.getElementById('stars');
    const createdStars: HTMLElement[] = [];
    if (starsContainer && starsContainer.children.length === 0) {
      for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        const size = Math.random() * 2 + 0.5;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.setProperty('--dur', Math.random() * 4 + 2 + 's');
        star.style.setProperty('--min-op', String(Math.random() * 0.3 + 0.1));
        starsContainer.appendChild(star);
        createdStars.push(star);
      }
    }

    // ── IntersectionObserver fade-ins ─────────────────────────────────
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.1 }
    );

    const targets = document.querySelectorAll(
      '.message-card, .triad-item, .pillar, .collection-card'
    );
    targets.forEach((el) => {
      const e = el as HTMLElement;
      e.style.opacity = '0';
      e.style.transform = 'translateY(24px)';
      e.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      observer.observe(e);
    });

    // ── Daily Truth rotation ──────────────────────────────────────────
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const msgIndex = dayOfYear % DAILY_MESSAGES.length;
    const msgEl = document.getElementById('dailyMessage');
    const dateEl = document.getElementById('dailyDate');
    if (msgEl) msgEl.textContent = `“${DAILY_MESSAGES[msgIndex]}”`;
    if (dateEl)
      dateEl.textContent =
        `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    const dailyTimer = setTimeout(() => msgEl?.classList.add('visible'), 300);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(dailyTimer);
      observer.disconnect();
      createdStars.forEach((s) => s.remove());
    };
  }, []);

  return null;
}

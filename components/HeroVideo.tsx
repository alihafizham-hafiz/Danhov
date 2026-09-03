'use client';

import { useEffect, useRef } from 'react';

// Loads and starts the hero film only after the page has settled (window
// `load`, or immediately if that already fired) instead of competing with
// the initial paint on mobile — `autoPlay` alone forces an eager fetch
// regardless of `preload="none"`.
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const start = () => {
      video.src = '/Vedios/Vedio_Hero.mp4';
      video.play().catch(() => {});
    };

    if (document.readyState === 'complete') {
      start();
    } else {
      window.addEventListener('load', start, { once: true });
      return () => window.removeEventListener('load', start);
    }
  }, []);

  return (
    <video
      ref={ref}
      className="hero-cine-video"
      muted
      loop
      playsInline
      preload="none"
      poster="/Vedios/image_2.png"
      aria-hidden="true"
    />
  );
}

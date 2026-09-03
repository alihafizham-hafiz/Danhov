'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface EditorialSplitProps {
  title?: string;
  description?: string;
  shopLinkText?: string;
  shopLinkHref?: string;
  mediaType?: 'video' | 'image';
  mediaSrc?: string;
  posterSrc?: string;
}

export default function EditorialSplitSection({
  title = 'One wire. Two lives. One again.',
  description = 'Every Abbraccio begins as a single continuous wire. It does not start as two pieces joined together. It starts as one. That one wire parts — and for a while it travels as two, side by side, each with its own line, its own turn, its own light. Then it returns. Not soldered. Not fused. Returned — to the one thing it always was.This is why the ring has no beginning and no end. Two people were never two. Marriage is not the joining of halves; it is the remembering of one.',
  shopLinkText = 'SHOP THE COLLECTION',
  shopLinkHref = '/fine-jewelry',
  mediaType = 'video',
  mediaSrc = '/Vedios/Vedio_white.mp4',
  posterSrc = '/Fallback_white.pngs',
}: EditorialSplitProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section className="ed-split-section">
      <div className="ed-split-inner">
        {/* Left Text Panel */}
        <div className="ed-split-content">
          <h2 className="ed-split-title">{title}</h2>
          <p className="ed-split-desc">{description}</p>
          <Link href={shopLinkHref} className="ed-split-link">
            {shopLinkText}
          </Link>
        </div>

        {/* Right Media Panel with Play Button */}
        <div className="ed-split-media-wrap" onClick={mediaType === 'video' ? togglePlay : undefined}>
          {mediaType === 'video' ? (
            <>
              <video
                ref={videoRef}
                src={mediaSrc}
                poster={posterSrc}
                className="ed-split-video"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
              <div className={`ed-split-play-badge ${isPlaying ? 'is-playing' : ''}`}>
                <span className="ed-split-play-icon">
                  {isPlaying ? '❚❚' : '▶'}
                </span>
              </div>
            </>
          ) : (
            <img src={mediaSrc} alt={title} className="ed-split-img" loading="lazy" />
          )}
        </div>
      </div>
    </section>
  );
}
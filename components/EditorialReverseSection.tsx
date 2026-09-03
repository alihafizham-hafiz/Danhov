'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface EditorialReverseProps {
  title?: string;
  description?: string;
  shopLinkText?: string;
  shopLinkHref?: string;
  mediaType?: 'video' | 'image';
  mediaSrc?: string;
  posterSrc?: string;
}

export default function EditorialReverseSection({
  title = "Dont pick a ring.Receive one.",
  description = "Most jewelers offer a catalog. DANHOV offers a process. Describe the ring you see within. Our guided creator helps shape your vision — and Jack's Los Angeles workshop brings it into gold and platinum.",
  shopLinkText = 'SHOP THE COLLECTION',
  shopLinkHref = '/fine-jewelry',
  mediaType = 'video',
  mediaSrc = '/Vedio_section.mp4',
  posterSrc = '',
}: EditorialReverseProps) {
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
    <section className="ed-rev-section">
      <div className="ed-rev-inner">
        {/* Left Media Panel (Exact 65% Width, touching left edge) */}
        <div className="ed-rev-media-wrap" onClick={mediaType === 'video' ? togglePlay : undefined}>
          {mediaType === 'video' ? (
            <>
              <video
                ref={videoRef}
                src={mediaSrc}
                poster={posterSrc}
                className="ed-rev-video"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
              <div className={`ed-rev-play-badge ${isPlaying ? 'is-playing' : ''}`}>
                <span className="ed-rev-play-icon">
                  {isPlaying ? '❚❚' : '▶'}
                </span>
              </div>
            </>
          ) : (
            <img src={mediaSrc} alt={title} className="ed-rev-img" loading="lazy" />
          )}
        </div>

        {/* Right Content Panel */}
        <div className="ed-rev-content">
          <h2 className="ed-rev-title">{title}</h2>
          <p className="ed-rev-desc">{description}</p>
          <Link href={shopLinkHref} className="ed-rev-link">
            {shopLinkText}
          </Link>
        </div>
      </div>
    </section>
  );
}
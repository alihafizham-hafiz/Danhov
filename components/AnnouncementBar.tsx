'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dnh_announcement_dismissed';

export default function AnnouncementBar({
  text = 'Complimentary Shipping on Every Order',
}: {
  text?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') setDismissed(true);
  }, []);

  if (dismissed) return null;

  return (
    <div className="announcement-bar" role="region" aria-label="Announcement">
      <p className="announcement-bar-text">{text}</p>
      <button
        type="button"
        className="announcement-bar-close"
        aria-label="Dismiss announcement"
        onClick={() => {
          sessionStorage.setItem(STORAGE_KEY, '1');
          setDismissed(true);
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
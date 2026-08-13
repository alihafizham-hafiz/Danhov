'use client';

import { useEffect, useState } from 'react';

/**
 * Full-screen brand splash shown on the *initial* page load (hard load / first
 * visit). Uses the same ring + mark as the in-app route loader, then fades out
 * once the page has loaded. Lives in the root layout, which persists across
 * client-side navigations, so it only appears on the first load — not on every
 * link click.
 */
export default function InitialLoader() {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const finish = () => setDone(true);
    let minTimer: ReturnType<typeof setTimeout> | undefined;
    if (document.readyState === 'complete') {
      minTimer = setTimeout(finish, 450); // brief minimum so it doesn't flash
    } else {
      window.addEventListener('load', finish, { once: true });
    }
    const cap = setTimeout(finish, 3500); // hard cap — never stick
    return () => {
      if (minTimer) clearTimeout(minTimer);
      clearTimeout(cap);
      window.removeEventListener('load', finish);
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 650); // remove after fade
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div className={`initial-loader${done ? ' is-done' : ''}`} aria-hidden="true">
      <div className="route-loader-stage" role="status" aria-label="Loading">
        <div className="route-loader-ringwrap">
          <svg className="route-loader-ring" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="80" stroke="#AC3438" strokeWidth="0.6" opacity="0.25" />
            <circle cx="100" cy="100" r="58" stroke="#AC3438" strokeWidth="0.8" opacity="0.4" />
            <circle cx="100" cy="100" r="36" stroke="#AC3438" strokeWidth="1" opacity="0.6" />
            <path d="M100 42 Q130 70 100 100 Q70 130 100 158" stroke="#AC3438" strokeWidth="0.8" fill="none" opacity="0.5" />
            <path d="M42 100 Q70 70 100 100 Q130 130 158 100" stroke="#AC3438" strokeWidth="0.8" fill="none" opacity="0.5" />
            <circle cx="100" cy="58" r="5" fill="#AC3438" opacity="0.7" />
            <circle cx="100" cy="142" r="3" fill="#AC3438" opacity="0.4" />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="route-loader-mark" src="/danhov-mark.png" alt="" width={643} height={824} />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  prefillEmail?: string;
  prefillName?: string;
  productHint?: string;
};

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/jack-70/30min';

export default function BookingModal({ open, onClose, prefillEmail, prefillName, productHint }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Inject the Calendly widget script once (idempotent — check first).
  useEffect(() => {
    if (!open || !CALENDLY_URL) return;
    const existing = document.getElementById('calendly-widget-script');
    if (existing) return;
    const s = document.createElement('script');
    s.id = 'calendly-widget-script';
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    document.body.appendChild(s);
  }, [open]);

  if (!open) return null;

  const url = CALENDLY_URL
    ? buildPrefillUrl(CALENDLY_URL, { email: prefillEmail, name: prefillName, productHint })
    : null;

  return (
    <div className="vmodal-backdrop" role="dialog" aria-label="Book a private consultation">
      <div className="vmodal vmodal-wide booking-modal">
        <button type="button" className="vmodal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h3 className="vmodal-title">Book a Private Consultation</h3>
        <p className="vmodal-sub">
          One-to-one with a DANHOV specialist over Zoom — to walk through your piece, your vision, every detail.
        </p>

        {url ? (
          <div
            className="calendly-inline-widget"
            data-url={url}
            style={{ minWidth: '320px', height: '640px', width: '100%' }}
          />
        ) : (
          <div className="booking-fallback">
            <p>Booking opens shortly — in the meantime please email or call us:</p>
            <p>
              <a href="mailto:care@danhov.com" className="booking-link">
                care@danhov.com
              </a>
              <br />
              <a
                href={`tel:${process.env.NEXT_PUBLIC_PHONE_TEL || '+14244214072'}`}
                className="booking-link"
              >
                {process.env.NEXT_PUBLIC_PHONE_DISPLAY || '(424) 421-4072'}
              </a>
            </p>
          </div>
        )}

        <p className="vmodal-foot">
          Powered by Calendly · Your booking syncs to Zoom and arrives by email within seconds.
        </p>
      </div>
    </div>
  );
}

function buildPrefillUrl(
  baseUrl: string,
  prefill: { email?: string; name?: string; productHint?: string }
): string {
  const u = new URL(baseUrl);
  if (prefill.email) u.searchParams.set('email', prefill.email);
  if (prefill.name) u.searchParams.set('name', prefill.name);
  if (prefill.productHint)
    u.searchParams.set('a1', `Interested in: ${prefill.productHint}`);
  // Brand the Calendly page subtly
  u.searchParams.set('primary_color', 'AC3438');
  u.searchParams.set('text_color', '3d2520');
  u.searchParams.set('background_color', 'fff8f6');
  return u.toString();
}

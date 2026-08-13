'use client';

import { useEffect, useState } from 'react';
import DepositButton from '@/components/DepositButton';
import { SHIPPING_FEE_USD } from '@/lib/shipping';

type MetalOption = {
  metal_used: string;
  metal_label: string;
  total_usd: number;
  price_display: string;
};

type PriceResp = {
  primary: MetalOption & { spot_fetched_at: string };
  options: MetalOption[];
  spot_fetched_at: string;
};

type LockResp = {
  quote_id: string;
  locked_price_usd: number;
  expires_at: string;
  metal: string;
};

type Status =
  | { kind: 'loading' }
  | { kind: 'price'; price: PriceResp }
  | { kind: 'locking' }
  | { kind: 'locked'; lock: LockResp }
  | { kind: 'error'; message: string };

const COLOR_SWATCH: Record<string, string> = {
  yellow: '#d4a853',
  white: 'linear-gradient(135deg,#f3ece4 0%,#d8d0c6 100%)',
  rose: '#e8a090',
};

function colorOf(metalKey: string): 'yellow' | 'white' | 'rose' {
  if (metalKey.includes('white')) return 'white';
  if (metalKey.includes('rose')) return 'rose';
  return 'yellow';
}

function purityOf(metalKey: string): '14k' | '18k' {
  return metalKey.startsWith('18k') ? '18k' : '14k';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export default function QuoteLockBox({ slug, sku }: { slug: string; sku: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [chosenMetal, setChosenMetal] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/price-quote?slug=${encodeURIComponent(slug)}`);
        if (!r.ok) throw new Error('Service unavailable');
        const data = (await r.json()) as PriceResp;
        if (!cancelled) {
          setStatus({ kind: 'price', price: data });
          setChosenMetal(data.primary.metal_used);
        }
      } catch {
        if (!cancelled)
          setStatus({
            kind: 'error',
            message: 'Live pricing temporarily unavailable.',
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  async function lockPrice() {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setStatus({ kind: 'error', message: 'Please enter a valid email.' });
      return;
    }
    setStatus({ kind: 'locking' });
    try {
      const r = await fetch('/api/lock-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email, metal_choice: chosenMetal }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? 'Could not lock the price.');
      }
      const lock = (await r.json()) as LockResp;
      setStatus({ kind: 'locked', lock });
    } catch (e: unknown) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Could not lock the price.',
      });
    }
  }

  const selected =
    status.kind === 'price'
      ? status.price.options.find((o) => o.metal_used === chosenMetal) ?? status.price.primary
      : null;

  // Group options into 14k / 18k tabs (DANHOV only sells these two purities)
  const purities = (status.kind === 'price' ? status.price.options : [])
    .map((o) => purityOf(o.metal_used))
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const selectedPurity = chosenMetal ? purityOf(chosenMetal) : '14k';

  return (
    <div className="quote-lock-box">
      <span className="quote-lock-label">Live pricing</span>

      {status.kind === 'loading' && (
        <p className="quote-lock-note">Computing live price…</p>
      )}

      {status.kind === 'price' && selected && (
        <>
          <div className="quote-lock-price-row">
            <span className="quote-lock-price">{selected.price_display}</span>
            <span className="quote-lock-metal">in {selected.metal_label}</span>
          </div>
          <p className="quote-lock-note">
            Based on today&apos;s gold spot price. Lock this price for 24 hours — no payment
            required.
          </p>

          {/* Purity tabs (only shown if both 14k and 18k are options) */}
          {purities.length > 1 && (
            <div className="quote-lock-purity">
              {purities.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`quote-lock-purity-btn${selectedPurity === p ? ' active' : ''}`}
                  onClick={() => {
                    const next = status.price.options.find(
                      (o) => purityOf(o.metal_used) === p && colorOf(o.metal_used) === colorOf(chosenMetal || '')
                    ) ?? status.price.options.find((o) => purityOf(o.metal_used) === p);
                    if (next) setChosenMetal(next.metal_used);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Color swatches */}
          <div className="quote-lock-colors">
            {status.price.options
              .filter((o) => purityOf(o.metal_used) === selectedPurity)
              .map((o) => {
                const c = colorOf(o.metal_used);
                return (
                  <button
                    key={o.metal_used}
                    type="button"
                    title={o.metal_label}
                    className={`quote-lock-swatch${
                      chosenMetal === o.metal_used ? ' active' : ''
                    }`}
                    style={{ background: COLOR_SWATCH[c] }}
                    onClick={() => setChosenMetal(o.metal_used)}
                    aria-label={o.metal_label}
                  />
                );
              })}
          </div>

          <div className="quote-lock-form">
            <input
              type="email"
              placeholder="your@email.com"
              className="quote-lock-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <button type="button" className="quote-lock-btn" onClick={lockPrice}>
              Lock this price for 24h →
            </button>
          </div>
        </>
      )}

      {status.kind === 'locking' && (
        <p className="quote-lock-note">Locking your price…</p>
      )}

      {status.kind === 'locked' && (
        <>
          <div className="quote-lock-price-row">
            <span className="quote-lock-price">
              ${status.lock.locked_price_usd.toLocaleString('en-US')}
            </span>
            <span className="quote-lock-metal">in {status.lock.metal.replace('_', ' ')}</span>
          </div>
          <p className="quote-lock-note">
            ✦ Locked for {formatCountdown(new Date(status.lock.expires_at).getTime() - now)}.
            Confirmation sent to {email}. Reference{' '}
            <strong>{status.lock.quote_id.slice(0, 8).toUpperCase()}</strong>.
          </p>
          <p className="quote-lock-disclosure">
            Insured shipping: ${SHIPPING_FEE_USD.toLocaleString('en-US')} · Checkout total:{' '}
            <strong>${(status.lock.locked_price_usd + SHIPPING_FEE_USD).toLocaleString('en-US')}</strong>
          </p>
          <DepositButton quoteId={status.lock.quote_id} email={email} />
          <span className="quote-lock-disclosure" style={{ marginTop: 4 }}>
            Production: 3 weeks. Secured by Authorize.Net.
          </span>
        </>
      )}

      {status.kind === 'error' && (
        <p className="quote-lock-note quote-lock-err">{status.message}</p>
      )}

      <span className="quote-lock-disclosure">
        Style {sku} · Price includes precious metal, craftsmanship, and stones.
        Final quote confirmed by a DANHOV specialist.
      </span>
    </div>
  );
}

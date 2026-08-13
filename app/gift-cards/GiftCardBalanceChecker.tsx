'use client';

import { useState } from 'react';

type CardInfo = {
  code: string;
  amount_usd: number;
  status: string;
  redeemed_at: string | null;
  recipient_name: string;
};

export default function GiftCardBalanceChecker() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CardInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function check() {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/gift-cards/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json() as { card?: CardInfo; error?: string };
      if (!res.ok || !json.card) {
        setError(json.error || 'Card not found.');
      } else {
        setResult(json.card);
      }
    } catch {
      setError('Could not check balance. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    pending: 'Pending payment',
    active: 'Active',
    redeemed: 'Redeemed',
    cancelled: 'Cancelled',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="DANHOV-XXXX-XXXX-XXXX"
          style={{
            flex: 1, border: '1px solid #d4c9c0', borderRadius: 6,
            padding: '9px 12px', fontSize: 13, fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
            outline: 'none', letterSpacing: '0.06em',
          }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
        />
        <button
          onClick={check}
          disabled={loading || !code.trim()}
          style={{
            padding: '9px 16px', background: '#1a1410', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", letterSpacing: '0.08em', whiteSpace: 'nowrap',
          }}
        >
          {loading ? '…' : 'Check'}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: '#AC3438', margin: 0 }}>{error}</p>}
      {result && (
        <div style={{ background: '#fff', border: '1px solid #ede8e2', borderRadius: 8, padding: '14px 16px', fontSize: 13 }}>
          <div style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", fontSize: 22, color: result.status === 'active' ? '#2a7a2a' : '#AC3438' }}>
            ${result.amount_usd.toLocaleString()}
          </div>
          <div style={{ color: '#6b5e57', marginTop: 4 }}>
            Status: <strong>{STATUS_LABEL[result.status] || result.status}</strong>
          </div>
          {result.status === 'redeemed' && result.redeemed_at && (
            <div style={{ fontSize: 11, color: '#9c8f86', marginTop: 2 }}>
              Redeemed {new Date(result.redeemed_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

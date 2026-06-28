'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Result = {
  sku: string;
  slug: string;
  name: string;
  collection: string | null;
  category: string;
  image: string | null;
  price_display: string | null;
  price_computed: string | null;
};

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const data = r.ok ? ((await r.json()) as { items: Result[] }) : { items: [] };
        setResults(data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, open]);

  if (!open) return null;

  const q = query.trim();
  const showResults = q.length >= 2;

  return (
    <div className="search-overlay" role="dialog" aria-label="Search the atelier">
      <div className="search-overlay-scrim" onClick={onClose} aria-hidden="true" />

      <div className="search-overlay-panel">
        <button type="button" className="search-overlay-close" aria-label="Close search" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="search-overlay-input-wrap">
          <svg className="search-overlay-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pieces, collections, styles…"
            className="search-overlay-input"
            autoComplete="off"
          />
        </div>

        {showResults && (
          <div className="search-overlay-body">
            {loading && <div className="search-overlay-loading">Searching…</div>}
            {!loading && results.length === 0 && (
              <div className="search-overlay-empty">Nothing found for &ldquo;{query}&rdquo;</div>
            )}
            {results.length > 0 && (
              <ul className="search-overlay-results">
                {results.map((r) => (
                  <li key={r.sku}>
                    <Link href={`/product/${r.slug}`} className="search-result" onClick={onClose}>
                      <div className="search-result-img">
                        {r.image ? (
                          <Image src={r.image} alt={r.name} width={56} height={56} style={{ objectFit: 'contain' }} unoptimized />
                        ) : (
                          <div className="search-result-img-fallback" aria-hidden="true">◯</div>
                        )}
                      </div>
                      <div className="search-result-meta">
                        <div className="search-result-name">{r.name}</div>
                        {(r.collection ?? r.category) && (
                          <div className="search-result-sub">{r.collection ?? r.category}</div>
                        )}
                      </div>
                      {(r.price_computed ?? r.price_display) && (
                        <div className="search-result-price">{r.price_computed ?? r.price_display}</div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

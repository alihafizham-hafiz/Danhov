'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = { sku: string; name: string };

export default function AdminSearchBar({
  defaultValue,
  category,
  perPage,
}: {
  defaultValue?: string;
  category?: string;
  perPage?: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 1) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/products/suggest?q=${encodeURIComponent(value.trim())}`);
        const json = await res.json();
        setSuggestions(json.results ?? []);
        setOpen((json.results ?? []).length > 0);
        setActiveIdx(-1);
      } catch { /* ignore */ }
    }, 180);
  }, [value]);

  function navigate(sku: string) {
    setOpen(false);
    router.push(`/admin/products/${sku}`);
  }

  function submit(q: string) {
    setOpen(false);
    const params = new URLSearchParams();
    params.set('q', q);
    if (category) params.set('category', category);
    if (perPage) params.set('per_page', String(perPage));
    router.push(`/admin/products?${params.toString()}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        navigate(suggestions[activeIdx].sku);
      } else {
        submit(value);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div className="adm-searchbar-wrap">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Search SKU, name, collection…"
        className="adm-input adm-toolbar-search"
        autoComplete="off"
      />
      {open && (
        <ul ref={listRef} className="adm-suggest-list">
          {suggestions.map((s, i) => (
            <li
              key={s.sku}
              className={`adm-suggest-item${i === activeIdx ? ' is-active' : ''}`}
              onMouseDown={() => navigate(s.sku)}
            >
              <span className="adm-suggest-sku">{s.sku}</span>
              <span className="adm-suggest-name">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="adm-btn adm-btn-primary"
        onClick={() => submit(value)}
      >
        Search
      </button>
    </div>
  );
}

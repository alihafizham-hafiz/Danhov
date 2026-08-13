'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  categoryLabel, categoryDot,
  PRIMARY_CATEGORIES, NATURAL_FANCY_CATEGORIES, LAB_FANCY_CATEGORIES,
} from '@/lib/diamond-categories';

// ── Types ─────────────────────────────────────────────────────────────────

type MarkupRow = {
  category: string;
  multiplier: number;
  updated_at: string;
};

type Diamond = {
  id: string;
  price: number | null;
  markup_price: number | null;
  diamond: {
    NivodaStockId: string | null;
    image: string | null;
    video: string | null;
    availability: string | null;
    certificate: {
      lab: string | null;
      certNumber: string | null;
      shape: string | null;
      carats: number | null;
      clarity: string | null;
      color: string | null;
      cut: string | null;
      polish: string | null;
      symmetry: string | null;
      pdfUrl: string | null;
    } | null;
  };
};

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ── Markup row ─────────────────────────────────────────────────────────────

function MarkupRowUI({ row, onSave }: { row: MarkupRow; onSave: (category: string, v: number) => Promise<void> }) {
  const [val, setVal] = useState(String(row.multiplier));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    const n = parseFloat(val);
    if (!n || n <= 0) return;
    setSaving(true);
    await onSave(row.category, n);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const dot = categoryDot(row.category);
  const dirty = parseFloat(val) !== row.multiplier;
  const pct = Math.round((row.multiplier - 1) * 100);
  const margin = row.multiplier > 0 ? Math.round((row.multiplier - 1) / row.multiplier * 100) : 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '12px 1fr auto auto',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      background: 'var(--adm-surface)',
      border: '1px solid var(--adm-line)',
      borderRadius: 6,
      transition: 'border-color 0.15s',
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, border: '1px solid rgba(0,0,0,0.12)', display: 'inline-block', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{categoryLabel(row.category)}</div>
        <div style={{ fontSize: 11, color: 'var(--adm-mute)', marginTop: 1 }}>
          Cost $100 → Sell {fmt(100 * row.multiplier)} &nbsp;·&nbsp; <strong style={{ color: '#1a7f4b' }}>+{pct}% markup</strong> &nbsp;·&nbsp; <strong style={{ color: '#1a7f4b' }}>{margin}% margin</strong>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--adm-mute)' }}>×</span>
        <input
          type="number"
          step="0.01"
          min="1"
          max="10"
          value={val}
          onChange={e => setVal(e.target.value)}
          style={{
            width: 64, padding: '5px 8px', fontSize: 13, border: '1px solid var(--adm-line)',
            borderRadius: 4, fontFamily: 'inherit', textAlign: 'center',
            background: dirty ? '#fffbf0' : 'var(--adm-bg)',
            outline: 'none',
          }}
        />
      </div>
      <button
        onClick={save}
        disabled={saving || !dirty}
        style={{
          padding: '5px 14px', fontSize: 12, borderRadius: 4,
          cursor: dirty ? 'pointer' : 'default',
          background: saved ? 'var(--adm-ok)' : dirty ? 'var(--adm-accent)' : 'transparent',
          color: (saved || dirty) ? '#fff' : 'var(--adm-mute)',
          border: '1px solid ' + (saved ? 'var(--adm-ok)' : dirty ? 'var(--adm-accent)' : 'var(--adm-line)'),
          transition: 'all 0.15s',
          opacity: saving ? 0.6 : 1,
          minWidth: 64,
          fontFamily: 'inherit',
        }}
      >
        {saved ? '✓ Saved' : saving ? '…' : 'Save'}
      </button>
    </div>
  );
}

// ── Diamond card ──────────────────────────────────────────────────────────

function DiamondCard({ d, multiplier }: { d: Diamond; multiplier: number }) {
  const cert = d.diamond.certificate;
  const wholesale = d.price ?? 0;
  const retail = Math.round(wholesale * multiplier);
  const imgSrc = d.diamond.image;

  return (
    <div style={{
      background: 'var(--adm-surface)', border: '1px solid var(--adm-line)', borderRadius: 6,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ background: '#f6f0eb', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt="Diamond" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <svg viewBox="0 0 80 80" style={{ width: 56, height: 56, opacity: 0.25 }}>
            <polygon points="40,8 68,26 68,54 40,72 12,54 12,26" fill="none" stroke="#AC3438" strokeWidth="2" />
            <polygon points="40,8 68,26 40,36 12,26" fill="none" stroke="#AC3438" strokeWidth="1.2" />
            <line x1="12" y1="26" x2="40" y2="72" stroke="#AC3438" strokeWidth="0.8" />
            <line x1="68" y1="26" x2="40" y2="72" stroke="#AC3438" strokeWidth="0.8" />
            <line x1="12" y1="54" x2="68" y2="54" stroke="#AC3438" strokeWidth="0.8" />
          </svg>
        )}
        {cert?.lab && (
          <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.05em' }}>
            {cert.lab}
          </span>
        )}
        {d.diamond.availability && d.diamond.availability !== 'AVAILABLE' && (
          <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(172,52,56,0.85)', color: '#fff', fontSize: 9, padding: '2px 5px', borderRadius: 3 }}>
            {d.diamond.availability}
          </span>
        )}
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{cert?.carats ?? '?'}ct</span>
          <span style={{ fontSize: 11, color: 'var(--adm-mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cert?.shape}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--adm-mute)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cert?.color && <span>{cert.color}</span>}
          {cert?.clarity && <span>{cert.clarity}</span>}
          {cert?.cut && <span>{cert.cut}</span>}
          {cert?.polish && <span title="Polish">{cert.polish}</span>}
        </div>
        {cert?.certNumber && (
          <div style={{ fontSize: 10, color: 'var(--adm-mute)', letterSpacing: '0.03em' }}>#{cert.certNumber}</div>
        )}
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--adm-line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--adm-mute)' }}>Nivoda cost</span>
            <span>{wholesale ? fmt(wholesale) : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
            <span style={{ color: 'var(--adm-mute)' }}>Sells for ×{multiplier}</span>
            <span style={{ fontWeight: 600, color: '#1a7f4b' }}>{wholesale ? fmt(retail) : '—'}</span>
          </div>
          {wholesale > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2, color: '#1a7f4b' }}>
              <span>Profit</span>
              <span>{fmt(retail - wholesale)} · {Math.round((multiplier - 1) / multiplier * 100)}% margin</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type DiamondType = 'natural' | 'lab_grown' | 'fancy';
const SHAPES = ['ROUND', 'OVAL', 'CUSHION', 'PRINCESS', 'EMERALD', 'PEAR', 'RADIANT', 'HEART', 'MARQUISE', 'ASSCHER'];
const PAGE_SIZE = 24;

export default function DiamondsPage() {
  const [markups, setMarkups] = useState<MarkupRow[]>([]);
  const [markupsLoading, setMarkupsLoading] = useState(true);
  const [markupMap, setMarkupMap] = useState<Record<string, number>>({});

  const [diamondType, setDiamondType] = useState<DiamondType>('natural');
  const [shape, setShape] = useState('ROUND');
  const [caratMin, setCaratMin] = useState('0.5');
  const [caratMax, setCaratMax] = useState('2.5');
  const [diamonds, setDiamonds] = useState<Diamond[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/diamond-markups')
      .then(r => r.json())
      .then((rows: MarkupRow[] | { error: string }) => {
        if (Array.isArray(rows)) {
          setMarkups(rows);
          const map: Record<string, number> = {};
          for (const r of rows) map[r.category] = Number(r.multiplier);
          setMarkupMap(map);
        }
        setMarkupsLoading(false);
      })
      .catch(() => setMarkupsLoading(false));
  }, []);

  async function handleSaveMarkup(category: string, multiplier: number) {
    const res = await fetch('/api/admin/diamond-markups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, multiplier }),
    });
    if (res.ok) {
      const updated = await res.json() as MarkupRow;
      setMarkups(prev => prev.map(r => r.category === category ? { ...r, multiplier: Number(updated.multiplier) } : r));
      setMarkupMap(prev => ({ ...prev, [category]: multiplier }));
    }
  }

  const searchDiamonds = useCallback(async (newOffset = 0) => {
    setSearching(true);
    setSearchErr(null);
    try {
      const filters: Record<string, unknown> = {
        shapes: [shape],
        sizes: { from: parseFloat(caratMin) || 0.5, to: parseFloat(caratMax) || 2.5 },
        availability: 'AVAILABLE',
      };
      if (diamondType === 'lab_grown') filters.labgrown = true;
      else if (diamondType === 'natural') filters.labgrown = false;

      const res = await fetch('/api/nivoda/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, limit: PAGE_SIZE, offset: newOffset, order: { type: 'price', direction: 'ASC' } }),
      });
      const data = await res.json() as { result?: { items?: Diamond[]; total_count?: number }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      setDiamonds(data.result?.items ?? []);
      setTotalCount(data.result?.total_count ?? 0);
      setOffset(newOffset);
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : 'Error searching diamonds');
    } finally {
      setSearching(false);
    }
  }, [shape, caratMin, caratMax, diamondType]);

  // Initial search on mount
  useEffect(() => { searchDiamonds(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getMultiplierForDisplay(): number {
    const key = diamondType === 'lab_grown' ? 'lab_grown' : diamondType === 'fancy' ? 'fancy_yellow' : 'natural';
    return markupMap[key] ?? 2.3;
  }

  const groupRows = (cats: readonly string[]) =>
    cats.map(c => markups.find(r => r.category === c)).filter(Boolean) as MarkupRow[];
  const primaryRows = groupRows(PRIMARY_CATEGORIES);
  const naturalFancyRows = groupRows(NATURAL_FANCY_CATEGORIES);
  const labFancyRows = groupRows(LAB_FANCY_CATEGORIES);

  function renderGrid(rows: MarkupRow[]) {
    const h = Math.ceil(rows.length / 2);
    const cols = [rows.slice(0, h), rows.slice(h)];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
        {cols.map((col, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {col.map(r => <MarkupRowUI key={r.category} row={r} onSave={handleSaveMarkup} />)}
          </div>
        ))}
      </div>
    );
  }
  const subhead = { fontSize: 11, fontWeight: 700 as const, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--adm-mute)', margin: '4px 0 10px' };

  return (
    <div className="adm-page">
      <div className="adm-page-head adm-page-head--with-actions">
        <div>
          <h1 className="adm-h1">Diamond Pricing</h1>
          <p className="adm-page-sub">Set markup multipliers per category · changes apply to the customer-facing diamond picker immediately</p>
        </div>
      </div>

      {/* Markup Settings */}
      <div className="adm-card">
        <div className="adm-card-head">
          <h2 className="adm-h2">Markup Multipliers</h2>
          <span style={{ fontSize: 12, color: 'var(--adm-mute)' }}>Retail = Nivoda cost × multiplier &nbsp;·&nbsp; markup% = profit over cost &nbsp;·&nbsp; margin% = profit share of retail</span>
        </div>

        {markupsLoading ? (
          <p style={{ color: 'var(--adm-mute)', fontSize: 13, margin: 0 }}>Loading…</p>
        ) : markups.length === 0 ? (
          <div style={{ background: '#fff8f0', border: '1px solid #f0d8c0', borderRadius: 4, padding: '14px 16px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Table not yet created in database</p>
            <p style={{ margin: '6px 0 10px', fontSize: 12, color: 'var(--adm-mute)' }}>
              Run the SQL below in your{' '}
              <a href="https://app.supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--adm-accent)' }}>
                Supabase SQL editor
              </a>{' '}
              to create the <code>diamond_markups</code> table, then refresh this page.
            </p>
            <pre style={{ margin: 0, fontSize: 11, background: '#f5f0ea', padding: '12px 14px', borderRadius: 4, overflowX: 'auto', whiteSpace: 'pre', lineHeight: 1.6 }}>
              {SQL_MIGRATION}
            </pre>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div>{renderGrid(primaryRows)}</div>
            <div>
              <div style={subhead}>Natural Fancy Colors</div>
              {renderGrid(naturalFancyRows)}
            </div>
            <div>
              <div style={subhead}>Lab-Grown Fancy Colors</div>
              {renderGrid(labFancyRows)}
            </div>
          </div>
        )}
      </div>

      {/* Diamond Browser */}
      <div className="adm-card">
        <div className="adm-card-head">
          <h2 className="adm-h2">Diamond Inventory</h2>
          <span style={{ fontSize: 12, color: 'var(--adm-mute)' }}>
            Live from Nivoda{totalCount > 0 ? ` · ${totalCount.toLocaleString()} stones` : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="adm-toolbar">
          <div style={{ display: 'flex', border: '1px solid var(--adm-line)', borderRadius: 4, overflow: 'hidden' }}>
            {(['natural', 'lab_grown', 'fancy'] as DiamondType[]).map(t => (
              <button
                key={t}
                onClick={() => setDiamondType(t)}
                style={{
                  padding: '5px 13px', fontSize: 12, border: 'none', cursor: 'pointer',
                  background: diamondType === t ? 'var(--adm-accent)' : 'transparent',
                  color: diamondType === t ? '#fff' : 'var(--adm-text)',
                  fontFamily: 'inherit', transition: 'all 0.12s',
                }}
              >
                {t === 'natural' ? 'Natural' : t === 'lab_grown' ? 'Lab-Grown' : 'Fancy'}
              </button>
            ))}
          </div>

          <select
            value={shape}
            onChange={e => setShape(e.target.value)}
            style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--adm-line)', borderRadius: 4, fontFamily: 'inherit', background: 'var(--adm-surface)', cursor: 'pointer' }}
          >
            {SHAPES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--adm-mute)' }}>Carat</span>
            <input
              type="number" step="0.1" min="0.1" max="20" value={caratMin}
              onChange={e => setCaratMin(e.target.value)}
              style={{ width: 58, padding: '4px 7px', fontSize: 12, border: '1px solid var(--adm-line)', borderRadius: 4, fontFamily: 'inherit', textAlign: 'center' }}
            />
            <span style={{ color: 'var(--adm-mute)' }}>–</span>
            <input
              type="number" step="0.1" min="0.1" max="20" value={caratMax}
              onChange={e => setCaratMax(e.target.value)}
              style={{ width: 58, padding: '4px 7px', fontSize: 12, border: '1px solid var(--adm-line)', borderRadius: 4, fontFamily: 'inherit', textAlign: 'center' }}
            />
          </div>

          <button
            onClick={() => searchDiamonds(0)}
            disabled={searching}
            style={{
              padding: '5px 18px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
              background: 'var(--adm-accent)', color: '#fff', border: 'none', fontFamily: 'inherit',
              opacity: searching ? 0.6 : 1,
            }}
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {searchErr && (
          <div style={{ background: '#fff0f0', border: '1px solid #f0c0c0', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: '#c04040' }}>
            {searchErr}
          </div>
        )}

        {searching ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--adm-mute)', fontSize: 13 }}>
            Loading diamonds…
          </div>
        ) : diamonds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--adm-mute)', fontSize: 13 }}>
            No results — try adjusting filters and click Search.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {diamonds.map(d => (
                <DiamondCard key={d.id} d={d} multiplier={getMultiplierForDisplay()} />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 8 }}>
              <button
                onClick={() => searchDiamonds(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0 || searching}
                style={{ padding: '5px 14px', fontSize: 12, borderRadius: 4, border: '1px solid var(--adm-line)', background: 'transparent', fontFamily: 'inherit', cursor: offset === 0 ? 'default' : 'pointer', opacity: offset === 0 ? 0.35 : 1 }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--adm-mute)' }}>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
              </span>
              <button
                onClick={() => searchDiamonds(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= totalCount || searching}
                style={{ padding: '5px 14px', fontSize: 12, borderRadius: 4, border: '1px solid var(--adm-line)', background: 'transparent', fontFamily: 'inherit', cursor: offset + PAGE_SIZE >= totalCount ? 'default' : 'pointer', opacity: offset + PAGE_SIZE >= totalCount ? 0.35 : 1 }}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const SQL_MIGRATION = `CREATE TABLE IF NOT EXISTS diamond_markups (
  category   text PRIMARY KEY,
  multiplier numeric(6,4) NOT NULL DEFAULT 2.3,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO diamond_markups (category, multiplier)
SELECT unnest(ARRAY['natural','lab_grown','fancy_yellow','fancy_pink','fancy_blue','fancy_green','fancy_orange','fancy_purple','fancy_brown','fancy_grey','fancy_black','fancy_white','fancy_violet','fancy_red','fancy_chameleon']), 2.3
ON CONFLICT (category) DO NOTHING;`;

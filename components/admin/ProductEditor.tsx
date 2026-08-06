'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  computeProductTotal,
  computeStoneBreakdown,
  pricePerCaratFromCt,
  DIAMOND_SHAPES,
  DENSITY_RATIO,
  RHODIUM_UPLIFT_DISPLAY,
  METAL_LABEL_DISPLAY,
  type StoneGroup,
} from '@/lib/stone-math';
import DiamondShapeIcon from '@/components/admin/DiamondShapeIcon';

// ── AdminThumb — graceful broken-image handling ──────────────────────────────
function AdminThumb({ src, size = 88 }: { src: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{ width: size, height: size, background: '#1e1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#666', flexShrink: 0 }}>
        missing
      </div>
    );
  }
  return (
    <Image src={src} alt="" width={size} height={size} unoptimized
      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
      onError={() => setFailed(true)} />
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

type LaborExtras = { three_d_run: number; rhodium: number; laser_engraving: number };

type Product = {
  sku: string;
  slug: string;
  name: string;
  collection: string | null;
  category: string;
  categories: string[] | null;
  metals: string[] | null;
  images: string[] | null;
  metal_images: Record<string, string[]> | null;
  price_display: string | null;
  description?: string | null;
  default_metal: string | null;
  gold_weight_g: number | null;
  markup_multiplier: number | null;
  base_labor_usd: number | null;
  diamond_labor_usd: number | null;
  stones_value_usd: number | null;
  stone_count_input: number | null;
  stone_size_mm: number | null;
  stone_groups: StoneGroup[] | null;
  // New multiplier-based labour + commission fields
  setting_multiplier: number | null;
  centre_diamond_group: StoneGroup | null;
  centre_multiplier: number | null;
  commission_rate: number | null;
  casting_labor_per_gram: number | null;
  accounting_cost_usd: number | null;
  custom_labor_usd: number | null;
  labor_extras: LaborExtras | null;
  is_active: boolean;
  sub_categories: string[] | null;
};

type LivePrices = {
  gold_per_gram_24k: number;
  platinum_per_gram_spot: number;
  iridium_per_gram_spot: number;
  fetched_at: string;
  cost_per_gram: Record<string, number>;
};

// ── Constants ────────────────────────────────────────────────────────────────

const METAL_OPTIONS = [
  'platinum',
  '14k_yellow', '14k_white', '14k_rose',
  '18k_yellow', '18k_white', '18k_rose',
];

// ── SKU autocomplete lookup ───────────────────────────────────────────────────
// First letter = collection code, second letter = category code.
// Type "AE" → Abbraccio + Engagement. Add new codes here as collections grow.
const SKU_COLLECTION: Record<string, string> = {
  A: 'Abbraccio',
  V: 'Voltaggio',
  C: 'Classico',
  N: 'Norme de Danhov',
  R: 'Carezza',
  P: 'Per Lei',
  T: 'Petalo',
  S: 'Solo Filo',
  E: 'Eleganza',
  O: 'Couture',
  U: 'Unito',
};
const SKU_CATEGORY: Record<string, string> = {
  E: 'engagement',
  W: 'wedding',
  F: 'fine',
  M: 'mens',
};

const SETTING_MULTIPLIER_PRESETS  = [4, 6, 8, 10];
const CENTRE_MULTIPLIER_PRESETS   = [25, 50, 75, 100];
const CASTING_LABOR_PRESETS       = [5, 10, 15, 20];
const MARKUP_MULTIPLIER_PRESETS   = [2, 3, 4, 5];
const CUSTOM_LABOR_PRESETS        = [50, 100, 200, 300, 500, 1000];

type Tab = 'identity' | 'images' | 'pricing';

const TABS: { id: Tab; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'images',   label: 'Images'   },
  { id: 'pricing',  label: 'Pricing'  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function blankStoneGroup(): StoneGroup {
  return { count: null, size_mm: null, length_mm: null, width_mm: null, shape: 'round', carat_each_override: null };
}

function groupEffectiveSize(g: StoneGroup): number | null {
  const l = g.length_mm ?? null;
  const w = g.width_mm ?? null;
  if (l != null && w != null) return (Number(l) + Number(w)) / 2;
  if (l != null) return Number(l);
  if (w != null) return Number(w);
  return g.size_mm ?? null;
}

function initialStoneGroups(p: {
  stone_groups: StoneGroup[] | null;
  stone_count_input: number | null;
  stone_size_mm: number | null;
}): StoneGroup[] {
  if (Array.isArray(p.stone_groups) && p.stone_groups.length > 0) {
    return p.stone_groups.map((g) => ({
      count: g?.count ?? null,
      size_mm: g?.size_mm ?? null,
      length_mm: g?.length_mm ?? g?.size_mm ?? null,
      width_mm: g?.width_mm ?? g?.size_mm ?? null,
      shape: g?.shape ?? 'round',
      carat_each_override: (g as StoneGroup)?.carat_each_override ?? null,
    }));
  }
  if (p.stone_count_input != null || p.stone_size_mm != null) {
    return [{
      count: p.stone_count_input,
      size_mm: p.stone_size_mm,
      length_mm: p.stone_size_mm,
      width_mm: p.stone_size_mm,
      shape: 'round',
    }];
  }
  return [blankStoneGroup()];
}

type Upload = {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductEditor({
  product,
  isNew = false,
}: {
  product: Product;
  isNew?: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [form, setForm] = useState<Product>({
    ...product,
    categories:           product.categories ?? [product.category],
    metals:               METAL_OPTIONS,   // all metals always
    default_metal:        'platinum',      // always priced in platinum
    images:               product.images ?? [],
    metal_images:         product.metal_images ?? {},
    sub_categories:       product.sub_categories ?? [],
    stone_count_input:    product.stone_count_input ?? null,
    stone_size_mm:        product.stone_size_mm ?? null,
    stone_groups:         initialStoneGroups(product),
    diamond_labor_usd:    product.diamond_labor_usd ?? null,
    accounting_cost_usd:  product.accounting_cost_usd ?? null,
    setting_multiplier:   product.setting_multiplier ?? 4,
    centre_diamond_group:   product.centre_diamond_group ?? blankStoneGroup(),
    centre_multiplier:      product.centre_multiplier ?? 50,
    commission_rate:        0,
    casting_labor_per_gram: product.casting_labor_per_gram ?? 10,
    custom_labor_usd: product.custom_labor_usd ?? null,
    // Snap to 4 for any legacy/unexpected value — only exact preset values are kept
    markup_multiplier: [2, 3, 4, 5].includes(product.markup_multiplier ?? 0)
      ? product.markup_multiplier
      : 4,
  });

  // Live metal prices fetched from /api/metal-prices
  const [livePrices, setLivePrices] = useState<LivePrices | null>(null);

  useEffect(() => {
    if (activeTab !== 'pricing') return;
    let cancelled = false;
    fetch('/api/metal-prices')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setLivePrices(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeTab]);

  // Stone / labour derived values
  const productTotal = useMemo(
    () =>
      computeProductTotal({
        stoneGroups:        form.stone_groups,
        weightInPlatinumG:  form.gold_weight_g,
        jewelleryLabourUsd: form.base_labor_usd,
        diamondLabourUsd:   form.diamond_labor_usd,
        defaultMetal:       form.default_metal,
      }),
    [form.stone_groups, form.gold_weight_g, form.base_labor_usd, form.diamond_labor_usd, form.default_metal],
  );

  const totalStoneCount = useMemo(
    () => (form.stone_groups ?? []).reduce((s, g) => s + (g.count ?? 0), 0),
    [form.stone_groups],
  );

  const settingLabour = useMemo(
    () => totalStoneCount * (form.setting_multiplier ?? 4),
    [totalStoneCount, form.setting_multiplier],
  );

  const centreCount   = form.centre_diamond_group?.count ?? 0;
  const centreLabour  = centreCount * (form.centre_multiplier ?? 50);
  const customLabour  = form.custom_labor_usd ?? 0;

  const [laborExtras, setLaborExtras] = useState<LaborExtras>({
    three_d_run:     (product.labor_extras?.three_d_run     ?? 30),
    rhodium:         (product.labor_extras?.rhodium         ?? 30),
    laser_engraving: (product.labor_extras?.laser_engraving ?? 20),
  });

  const extrasTotal  = laborExtras.three_d_run + laborExtras.rhodium + laborExtras.laser_engraving;
  const totalLabour  = settingLabour + centreLabour + customLabour + extrasTotal;

  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast,    setToast]    = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [uploads,  setUploads]  = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function updateStoneGroup(idx: number, patch: Partial<StoneGroup>) {
    setForm((f) => {
      const groups = (f.stone_groups ?? []).map((g, i) => i === idx ? { ...g, ...patch } : g);
      return { ...f, stone_groups: groups };
    });
  }

  function addStoneGroup() {
    setForm((f) => ({ ...f, stone_groups: [...(f.stone_groups ?? []), blankStoneGroup()] }));
  }

  function removeStoneGroup(idx: number) {
    setForm((f) => {
      const groups = (f.stone_groups ?? []).filter((_, i) => i !== idx);
      return { ...f, stone_groups: groups.length > 0 ? groups : [blankStoneGroup()] };
    });
  }

  function updateCentreGroup(patch: Partial<StoneGroup>) {
    setForm((f) => ({
      ...f,
      centre_diamond_group: { ...(f.centre_diamond_group ?? blankStoneGroup()), ...patch },
    }));
  }

  function flashToast(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    setSaving(true);
    try {
      const url    = isNew ? '/api/admin/products' : `/api/admin/products/${encodeURIComponent(product.sku)}`;
      const method = isNew ? 'POST' : 'PATCH';
      const cleanGroups = (form.stone_groups ?? [])
        .filter((g) => g.count != null || g.length_mm != null || g.width_mm != null || g.size_mm != null)
        .map((g) => ({ ...g, size_mm: groupEffectiveSize(g) }));
      const first = cleanGroups[0];
      // Clean centre diamond group
      const centreGroup = form.centre_diamond_group;
      const cleanCentre = (centreGroup?.count ?? 0) > 0
        ? { ...centreGroup, size_mm: groupEffectiveSize(centreGroup!) }
        : null;
      const payload = {
        ...form,
        stone_groups:         cleanGroups,
        stone_count_input:    first?.count ?? null,
        stone_size_mm:        first?.size_mm ?? null,
        base_labor_usd:       settingLabour,
        diamond_labor_usd:    centreLabour,
        setting_multiplier:     form.setting_multiplier,
        centre_diamond_group:   cleanCentre,
        centre_multiplier:      form.centre_multiplier,
        commission_rate:        0,
        markup_multiplier:      form.markup_multiplier ?? 4,
        casting_labor_per_gram: form.casting_labor_per_gram ?? 10,
        custom_labor_usd:       form.custom_labor_usd ?? null,
        labor_extras:           laborExtras,
        // Always available in all metals; platinum is the pricing base
        metals:               METAL_OPTIONS,
        default_metal:        'platinum',
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      const data = await res.json();
      flashToast('ok', isNew ? 'Product created' : 'Saved');
      if (isNew && data.sku) {
        router.push(`/admin/products/${encodeURIComponent(data.sku)}`);
      } else {
        router.refresh();
      }
    } catch (e: unknown) {
      flashToast('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${product.sku}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.sku)}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Delete failed (${res.status})`);
      }
      router.push('/admin/products');
      router.refresh();
    } catch (e: unknown) {
      flashToast('err', e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const items: Upload[] = Array.from(files).map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      progress: 0,
      status: 'uploading',
    }));
    setUploads((prev) => [...prev, ...items]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const file = Array.from(files)[i];
      try {
        const url = await uploadWithProgress(file, (pct) => {
          setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u)));
        });
        setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: 'done', progress: 100, url } : u)));
        setForm((f) => ({ ...f, images: [...(f.images ?? []), url] }));
      } catch (e) {
        setUploads((prev) => prev.map((u) =>
          u.id === item.id ? { ...u, status: 'error', error: e instanceof Error ? e.message : 'failed' } : u,
        ));
      }
    }
    setTimeout(() => { setUploads((prev) => prev.filter((u) => u.status === 'uploading')); }, 5000);
  }

  function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/upload');
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.url) return resolve(data.url);
            reject(new Error('No URL returned'));
          } catch { reject(new Error('Invalid response')); }
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try { const data = JSON.parse(xhr.responseText); if (data.error) msg = data.error; } catch {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      const fd = new FormData();
      fd.append('file', file);
      xhr.send(fd);
    });
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: (f.images ?? []).filter((_, i) => i !== idx) }));
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...(f.images ?? [])];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...f, images: arr };
    });
  }

  async function uploadMetalFiles(metal: string, files: FileList | File[]) {
    const items: Upload[] = Array.from(files).map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: `[${metal}] ${f.name}`,
      progress: 0,
      status: 'uploading',
    }));
    setUploads((prev) => [...prev, ...items]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const file = Array.from(files)[i];
      try {
        const url = await uploadWithProgress(file, (pct) => {
          setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u)));
        });
        setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: 'done', progress: 100, url } : u)));
        setForm((f) => {
          const map = { ...(f.metal_images ?? {}) };
          const arr = map[metal] ? [...map[metal]] : [];
          arr.push(url);
          map[metal] = arr;
          return { ...f, metal_images: map };
        });
      } catch (e) {
        setUploads((prev) => prev.map((u) =>
          u.id === item.id ? { ...u, status: 'error', error: e instanceof Error ? e.message : 'failed' } : u,
        ));
      }
    }
    setTimeout(() => { setUploads((prev) => prev.filter((u) => u.status === 'uploading')); }, 5000);
  }

  function removeMetalImage(metal: string, idx: number) {
    setForm((f) => {
      const map  = { ...(f.metal_images ?? {}) };
      const arr  = (map[metal] ?? []).filter((_, i) => i !== idx);
      if (arr.length === 0) delete map[metal]; else map[metal] = arr;
      return { ...f, metal_images: map };
    });
  }

  function moveMetalImage(metal: string, idx: number, dir: -1 | 1) {
    setForm((f) => {
      const map = { ...(f.metal_images ?? {}) };
      const arr = map[metal] ? [...map[metal]] : [];
      const j   = idx + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      map[metal] = arr;
      return { ...f, metal_images: map };
    });
  }

  function toggleMetal(m: string) {
    setForm((f) => {
      const s = new Set(f.metals ?? []);
      if (s.has(m)) s.delete(m); else s.add(m);
      return { ...f, metals: Array.from(s) };
    });
  }

  function toggleCategory(c: string) {
    setForm((f) => {
      const s = new Set(f.categories ?? []);
      if (s.has(c)) s.delete(c); else s.add(c);
      return { ...f, categories: Array.from(s) };
    });
  }

  function handleSkuChange(raw: string) {
    const upper = raw.toUpperCase();
    const col   = upper.length >= 1 ? SKU_COLLECTION[upper[0]] : undefined;
    const cat   = upper.length >= 2 ? SKU_CATEGORY[upper[1]]   : undefined;
    setForm((f) => ({
      ...f,
      sku:        raw,
      slug:       raw.toLowerCase(),
      collection: col ?? f.collection,
      category:   cat ?? f.category,
      categories: cat ? [cat] : f.categories,
    }));
  }

  const imageCount = (form.images ?? []).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="adm-editor">
      {toast && <div className={`adm-toast adm-toast--${toast.kind}`}>{toast.msg}</div>}

      {/* Tab bar */}
      <div className="adm-editor-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`adm-editor-tab${activeTab === t.id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === 'images' && imageCount > 0 && (
              <span className="adm-tab-count">{imageCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="adm-editor-body">

        {/* ══ IDENTITY TAB ════════════════════════════════════════════════ */}
        {activeTab === 'identity' && (
          <section className="adm-card">
            <header className="adm-card-head">
              <h2 className="adm-h2">Product Identity</h2>
              <span className={`adm-pill adm-pill--${form.is_active ? 'active' : 'inactive'}`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            </header>

            <div className="adm-fields adm-fields--3">
              <div className="adm-field">
                <span className="adm-field-label">SKU *</span>
                <input
                  className="adm-input adm-mono"
                  value={form.sku}
                  disabled={!isNew}
                  onChange={(e) => isNew ? handleSkuChange(e.target.value) : undefined}
                />
                {isNew && (
                  <span style={{ fontSize: 11, color: '#1a1410', marginTop: 4, display: 'block' }}>
                    First 2 letters auto-fill collection + category (e.g. AE → Abbraccio · Engagement). Always end with <strong>-PL</strong>.
                  </span>
                )}
              </div>
              <label className="adm-field">
                <span className="adm-field-label">Slug *</span>
                <input
                  className="adm-input adm-mono"
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value)}
                />
              </label>
              <label className="adm-field">
                <span className="adm-field-label">Collection</span>
                <input
                  className="adm-input"
                  value={form.collection ?? ''}
                  onChange={(e) => set('collection', e.target.value || null)}
                />
              </label>
            </div>

            {isNew && (
              <div style={{ background: '#faf6f1', border: '1px solid #e8ddd8', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 12, color: '#1a1410' }}>
                <strong style={{ color: '#1a1410' }}>SKU code reference</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px', marginTop: 6 }}>
                  {Object.entries(SKU_COLLECTION).map(([code, name]) => (
                    <span key={code}><strong>{code}</strong> = {name}</span>
                  ))}
                  <span style={{ gridColumn: '1/-1', marginTop: 4, color: '#AC3438' }}>
                    <strong>E</strong>=Engagement · <strong>W</strong>=Wedding · <strong>F</strong>=Fine Jewelry · <strong>M</strong>=Mens
                  </span>
                </div>
              </div>
            )}

            <div className="adm-fields">
              <label className="adm-field adm-field--full">
                <span className="adm-field-label">Ring Name *</span>
                <input
                  className="adm-input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </label>
            </div>

            {/* Category only — Display Price removed (live pricing from engine) */}
            <div className="adm-fields">
              <label className="adm-field">
                <span className="adm-field-label">Primary Category *</span>
                <select
                  className="adm-select"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  <option value="engagement">Engagement Rings</option>
                  <option value="wedding">Wedding Bands</option>
                  <option value="fine">Fine Jewelry</option>
                  <option value="mens">Men&apos;s</option>
                </select>
              </label>
            </div>

            <div className="adm-field">
              <span className="adm-field-label">Also Appears In</span>
              <div className="adm-chips" style={{ marginTop: 8 }}>
                {['engagement', 'wedding', 'fine', 'mens'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`adm-chip${(form.categories ?? []).includes(c) ? ' is-active' : ''}`}
                    onClick={() => toggleCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <label className="adm-field">
              <span className="adm-field-label">Description (internal note)</span>
              <textarea
                rows={3}
                className="adm-input"
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value || null)}
              />
            </label>

            <div className="adm-field">
              <label className="adm-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set('is_active', e.target.checked)}
                />
                <span>Visible on the live site</span>
              </label>
            </div>
          </section>
        )}

        {/* ══ IMAGES TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'images' && (
          <>
            <section className="adm-card">
              <header className="adm-card-head">
                <h2 className="adm-h2">Main Gallery</h2>
                <span className="adm-page-sub">
                  {imageCount > 0 ? `${imageCount} image${imageCount === 1 ? '' : 's'} · First is hero` : 'No images yet'}
                </span>
              </header>

              <div
                className={`adm-drop adm-drop--bar${dragOver ? ' is-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
                }}
                onClick={() => fileRef.current?.click()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 4v12m-6-6 6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Drop images or click to browse</span>
                <span className="adm-drop-hint">PNG · JPG · WebP · up to 12 MB each</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                  style={{ display: 'none' }}
                />
              </div>

              {uploads.length > 0 && (
                <ul className="adm-uploads">
                  {uploads.map((u) => (
                    <li key={u.id} className={`adm-upload adm-upload--${u.status}`}>
                      <div className="adm-upload-row">
                        <span className="adm-upload-name">{u.name}</span>
                        <span className="adm-upload-pct">
                          {u.status === 'uploading' && `${u.progress}%`}
                          {u.status === 'done' && '✓ Done'}
                          {u.status === 'error' && `✗ ${u.error}`}
                        </span>
                      </div>
                      <div className="adm-upload-bar"><div style={{ width: `${u.progress}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}

              {imageCount > 0 && (
                <div className="adm-thumb-strip">
                  {(form.images ?? []).map((src, i) => (
                    <div key={src + i} className="adm-thumb-item">
                      <AdminThumb src={src} />
                      {i === 0 && <span className="adm-gallery-tag">Hero</span>}
                      <div className="adm-thumb-actions">
                        <button type="button" className="adm-icon-btn" onClick={() => moveImage(i, -1)} disabled={i === 0} title="Move left">←</button>
                        <button type="button" className="adm-icon-btn" onClick={() => moveImage(i, 1)} disabled={i === imageCount - 1} title="Move right">→</button>
                        <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => removeImage(i)} title="Remove">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="adm-card">
              <header className="adm-card-head">
                <h2 className="adm-h2">Per-Metal Photos</h2>
                <span className="adm-page-sub">Override per variant — empty slots fall back to the main gallery above</span>
              </header>
              <div className="adm-metal-galleries">
                {METAL_OPTIONS.map((m) => {
                  const arr = form.metal_images?.[m] ?? [];
                  return (
                    <MetalGallerySlot
                      key={m}
                      metal={m}
                      images={arr}
                      onUpload={(files) => uploadMetalFiles(m, files)}
                      onRemove={(idx) => removeMetalImage(m, idx)}
                      onMove={(idx, dir) => moveMetalImage(m, idx, dir)}
                    />
                  );
                })}
              </div>
            </section>
          </>
        )}


        {/* ══ PRICING TAB ═════════════════════════════════════════════════ */}
        {activeTab === 'pricing' && (
          <>
            {/* ── Metal Specs ─────────────────────────────────────────── */}
            <section className="adm-card">
              <header className="adm-card-head">
                <h2 className="adm-h2">Metal Specs</h2>
              </header>
              <div className="adm-fields adm-fields--2">
                <label className="adm-field">
                  <span className="adm-field-label">Weight in Platinum (grams)</span>
                  <input
                    type="number" step="0.1" className="adm-input"
                    value={form.gold_weight_g ?? ''}
                    onChange={(e) => set('gold_weight_g', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
                <label className="adm-field">
                  <span className="adm-field-label">Casting Labor ($/gram of alloy weight)</span>
                  <div className="adm-chips" style={{ marginTop: 4 }}>
                    {CASTING_LABOR_PRESETS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`adm-chip${(form.casting_labor_per_gram ?? 10) === v ? ' is-active' : ''}`}
                        onClick={() => set('casting_labor_per_gram', v)}
                      >
                        ${v}/g
                      </button>
                    ))}
                  </div>
                </label>
              </div>
            </section>

            {/* ── Stone of the Ring ───────────────────────────────────── */}
            <section className="adm-card">
              <header className="adm-card-head">
                <h2 className="adm-h2">Stone of the Ring</h2>
              </header>

              <div className="adm-stone-groups">
                {(form.stone_groups ?? []).map((g, i) => (
                  <div className="adm-stone-group" key={i}>
                    <div className="adm-stone-group-head">
                      <span className="adm-field-label">
                        {i === 0 ? 'Stone Group' : `Group ${i + 1}`}
                      </span>
                      {(form.stone_groups ?? []).length > 1 && (
                        <button type="button" className="adm-link adm-link--danger" onClick={() => removeStoneGroup(i)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="adm-fields adm-fields--4">
                      <label className="adm-field">
                        <span className="adm-field-label">Count</span>
                        <input
                          type="number" step="1" min="0" className="adm-input"
                          value={g.count ?? ''}
                          onChange={(e) => updateStoneGroup(i, { count: e.target.value === '' ? null : Number(e.target.value) })}
                        />
                      </label>
                      <label className="adm-field">
                        <span className="adm-field-label">Length (mm)</span>
                        <input
                          type="number" step="0.05" min="0" className="adm-input"
                          value={g.length_mm ?? ''}
                          onChange={(e) => {
                            const length = e.target.value === '' ? null : Number(e.target.value);
                            const width  = g.width_mm ?? null;
                            const eff    = length != null && width != null ? (length + width) / 2 : (length ?? width);
                            updateStoneGroup(i, { length_mm: length, size_mm: eff });
                          }}
                        />
                      </label>
                      <label className="adm-field">
                        <span className="adm-field-label">Width (mm)</span>
                        <input
                          type="number" step="0.05" min="0" className="adm-input"
                          value={g.width_mm ?? ''}
                          onChange={(e) => {
                            const width  = e.target.value === '' ? null : Number(e.target.value);
                            const length = g.length_mm ?? null;
                            const eff    = length != null && width != null ? (length + width) / 2 : (width ?? length);
                            updateStoneGroup(i, { width_mm: width, size_mm: eff });
                          }}
                        />
                      </label>
                      <label className="adm-field">
                        <span className="adm-field-label">Shape</span>
                        <div className="adm-shape-select">
                          <DiamondShapeIcon shape={g.shape} className="adm-shape-select-icon" />
                          <select
                            className="adm-select adm-select--with-icon"
                            value={g.shape ?? 'round'}
                            onChange={(e) => updateStoneGroup(i, { shape: e.target.value })}
                          >
                            {DIAMOND_SHAPES.map((s) => (
                              <option key={s.slug} value={s.slug}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </label>
                    </div>
                    <StoneGroupReadout group={g} onUpdate={(patch) => updateStoneGroup(i, patch)} />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="adm-btn adm-btn--sm"
                style={{ marginTop: 12 }}
                onClick={addStoneGroup}
              >
                + Add Group
              </button>

              {/* Setting multiplier */}
              <div className="adm-multiplier-block" style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span className="adm-field-label" style={{ margin: 0 }}>Total stone count:</span>
                  <strong style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15 }}>{totalStoneCount}</strong>
                </div>
                <span className="adm-field-label">Setting Multiplier (×)</span>
                <div className="adm-chips" style={{ marginTop: 6, marginBottom: 8 }}>
                  {SETTING_MULTIPLIER_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`adm-chip${form.setting_multiplier === p ? ' is-active' : ''}`}
                      onClick={() => set('setting_multiplier', p)}
                    >
                      ×{p}
                    </button>
                  ))}
                </div>
                <div className="adm-dollar-wrap">
                  <input
                    type="number" step="1" min="1" className="adm-input"
                    value={form.setting_multiplier ?? ''}
                    onChange={(e) => set('setting_multiplier', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
                {totalStoneCount > 0 && (form.setting_multiplier ?? 0) > 0 && (
                  <p className="adm-stone-readout" style={{ marginTop: 8 }}>
                    Setting Labor: <strong>{totalStoneCount} × {form.setting_multiplier} = ${settingLabour.toLocaleString('en-US')}</strong>
                  </p>
                )}
              </div>
            </section>

            {/* ── Setting Centre Diamond ──────────────────────────────── */}
            <section className="adm-card">
              <header className="adm-card-head">
                <h2 className="adm-h2">Setting Centre Diamond</h2>
              </header>

              <div className="adm-stone-group">
                <div className="adm-fields adm-fields--4">
                  <label className="adm-field">
                    <span className="adm-field-label">Count</span>
                    <input
                      type="number" step="1" min="0" className="adm-input"
                      value={form.centre_diamond_group?.count ?? ''}
                      onChange={(e) => updateCentreGroup({ count: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </label>
                  <label className="adm-field">
                    <span className="adm-field-label">Length (mm)</span>
                    <input
                      type="number" step="0.05" min="0" className="adm-input"
                      value={form.centre_diamond_group?.length_mm ?? ''}
                      onChange={(e) => {
                        const length = e.target.value === '' ? null : Number(e.target.value);
                        const width  = form.centre_diamond_group?.width_mm ?? null;
                        const eff    = length != null && width != null ? (length + width) / 2 : (length ?? width);
                        updateCentreGroup({ length_mm: length, size_mm: eff });
                      }}
                    />
                  </label>
                  <label className="adm-field">
                    <span className="adm-field-label">Width (mm)</span>
                    <input
                      type="number" step="0.05" min="0" className="adm-input"
                      value={form.centre_diamond_group?.width_mm ?? ''}
                      onChange={(e) => {
                        const width  = e.target.value === '' ? null : Number(e.target.value);
                        const length = form.centre_diamond_group?.length_mm ?? null;
                        const eff    = length != null && width != null ? (length + width) / 2 : (width ?? length);
                        updateCentreGroup({ width_mm: width, size_mm: eff });
                      }}
                    />
                  </label>
                  <label className="adm-field">
                    <span className="adm-field-label">Shape</span>
                    <div className="adm-shape-select">
                      <DiamondShapeIcon shape={form.centre_diamond_group?.shape ?? null} className="adm-shape-select-icon" />
                      <select
                        className="adm-select adm-select--with-icon"
                        value={form.centre_diamond_group?.shape ?? 'round'}
                        onChange={(e) => updateCentreGroup({ shape: e.target.value })}
                      >
                        {DIAMOND_SHAPES.map((s) => (
                          <option key={s.slug} value={s.slug}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>
                <StoneGroupReadout group={form.centre_diamond_group ?? blankStoneGroup()} onUpdate={(patch) => updateCentreGroup(patch)} />
              </div>

              {/* Centre multiplier */}
              <div className="adm-multiplier-block" style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <span className="adm-field-label">Centre Multiplier (×)</span>
                <div className="adm-chips" style={{ marginTop: 6, marginBottom: 8 }}>
                  {CENTRE_MULTIPLIER_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`adm-chip${form.centre_multiplier === p ? ' is-active' : ''}`}
                      onClick={() => set('centre_multiplier', p)}
                    >
                      ×{p}
                    </button>
                  ))}
                </div>
                <div className="adm-dollar-wrap">
                  <input
                    type="number" step="1" min="1" className="adm-input"
                    value={form.centre_multiplier ?? ''}
                    onChange={(e) => set('centre_multiplier', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
                {centreCount > 0 && (form.centre_multiplier ?? 0) > 0 && (
                  <p className="adm-stone-readout" style={{ marginTop: 8 }}>
                    Centre Diamond Labor: <strong>{centreCount} × {form.centre_multiplier} = ${centreLabour.toLocaleString('en-US')}</strong>
                  </p>
                )}
              </div>
            </section>

            {/* ── Labor Summary ────────────────────────────────────────── */}
            <section className="adm-card">
              <header className="adm-card-head">
                <h2 className="adm-h2">Labor</h2>
              </header>
              <div className="adm-labour-split">
                <div className="adm-labour-field">
                  <span className="adm-field-label">Setting Labor (USD)</span>
                  <strong className="adm-labour-amount">${settingLabour.toLocaleString('en-US')}</strong>
                  <span className="adm-labour-formula">{totalStoneCount} stones × ${form.setting_multiplier ?? 4} each</span>
                </div>
                <div className="adm-labour-field">
                  <span className="adm-field-label">Setting Centre Diamond (USD)</span>
                  <strong className="adm-labour-amount">${centreLabour.toLocaleString('en-US')}</strong>
                  <span className="adm-labour-formula">{centreCount} stone × ${form.centre_multiplier ?? 50} each</span>
                </div>
              </div>

              {/* Custom labor input */}
              <div className="adm-custom-labour">
                <div className="adm-custom-labour-head">
                  <span className="adm-field-label" style={{ margin: 0 }}>Jewellery Labor</span>
                  {(form.custom_labor_usd ?? 0) > 0 && (
                    <button type="button" className="adm-labour-clear" onClick={() => set('custom_labor_usd', null)}>
                      Clear
                    </button>
                  )}
                </div>
                <div className="adm-dollar-wrap" style={{ marginTop: 10, marginBottom: 12 }}>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    placeholder="Enter any amount…"
                    className="adm-input"
                    value={form.custom_labor_usd ?? ''}
                    onChange={(e) => set('custom_labor_usd', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
                <div className="adm-labour-quick">
                  {CUSTOM_LABOR_PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`adm-labour-preset${(form.custom_labor_usd ?? 0) === v ? ' is-active' : ''}`}
                      onClick={() => set('custom_labor_usd', (form.custom_labor_usd ?? 0) === v ? null : v)}
                    >
                      ${v.toLocaleString('en-US')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra labor line items */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(
                  [
                    { key: 'three_d_run',     label: '3D Run',         defaultVal: 30 },
                    { key: 'rhodium',         label: 'Rhodium',        defaultVal: 30 },
                    { key: 'laser_engraving', label: 'Laser Engraving', defaultVal: 20 },
                  ] as { key: keyof LaborExtras; label: string; defaultVal: number }[]
                ).map(({ key, label, defaultVal }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="adm-field-label" style={{ margin: 0, minWidth: 140 }}>{label}</span>
                    <div className="adm-dollar-wrap" style={{ maxWidth: 120 }}>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder={String(defaultVal)}
                        className="adm-input"
                        value={laborExtras[key] ?? ''}
                        onChange={(e) =>
                          setLaborExtras((prev) => ({
                            ...prev,
                            [key]: e.target.value === '' ? 0 : Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--adm-mute)' }}>
                      ${laborExtras[key].toLocaleString('en-US')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="adm-labour-total">
                <span className="adm-field-label">Total Labor</span>
                <strong>
                  ${totalLabour.toLocaleString('en-US')}
                  {customLabour > 0 && (
                    <span style={{ fontWeight: 400, fontSize: 12, color: '#1a1410', marginLeft: 8 }}>
                      (incl. ${customLabour.toLocaleString('en-US')} custom)
                    </span>
                  )}
                </strong>
              </div>
            </section>

            {/* ── Auto-Calculated Totals ───────────────────────────────── */}
            <section className="adm-card">
              <header className="adm-card-head">
                <h2 className="adm-h2">Auto-Calculated Totals</h2>
                <span className="adm-page-sub">Updates live as you type above</span>
              </header>

              {/* Live spot indicator */}
              <div className="adm-spot-badge" style={{
                padding: '10px 14px',
                background: '#fff8f6',
                border: '1px solid #e8ddd8',
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 12,
                fontFamily: "'Cormorant Garamond', serif",
                color: '#1a1410',
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap' as const,
                alignItems: 'center',
              }}>
                {livePrices ? (
                  <>
                    <span style={{ color: '#AC3438', fontWeight: 600 }}>Live market ·</span>
                    <span><strong style={{ color: '#1a1410' }}>${livePrices.gold_per_gram_24k.toFixed(2)}/g</strong> 24k Gold</span>
                    <span><strong style={{ color: '#1a1410' }}>${livePrices.platinum_per_gram_spot.toFixed(2)}/g</strong> Pt spot</span>
                    <span><strong style={{ color: '#1a1410' }}>${livePrices.iridium_per_gram_spot?.toFixed(2) ?? '—'}/g</strong> Ir (manual)</span>
                    <span style={{ marginLeft: 'auto', color: '#1a1410' }}>
                      Updated {new Date(livePrices.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <span style={{ color: '#1a1410' }}>Fetching live metal prices…</span>
                )}
              </div>

              {/* Stones + Labor rows (same for every metal) */}
              {(() => {
                const defMetal       = form.default_metal ?? 'platinum';
                const defRatio       = DENSITY_RATIO[defMetal] ?? 1.0;
                const defWeight      = (form.gold_weight_g ?? 0) * defRatio;
                const perG           = form.casting_labor_per_gram ?? 10;
                const defCasting     = defWeight * perG;
                const defLabel       = METAL_LABEL_DISPLAY[defMetal] ?? defMetal.replace(/_/g, ' ');
                return (
                  <div className="adm-pricing-breakdown">
                    <div className="adm-pricing-row">
                      <span>Stones ({productTotal.total_carats > 0 ? `${fmtCt(productTotal.total_carats)} ct` : '—'})</span>
                      <strong>${Math.round(productTotal.total_stone_price_usd).toLocaleString('en-US')}</strong>
                    </div>
                    <div className="adm-pricing-row">
                      <span>Labor (setting + centre diamond)</span>
                      <strong>${totalLabour.toLocaleString('en-US')}</strong>
                    </div>
                    <div className="adm-pricing-row" style={{ color: '#1a1410', fontSize: 12 }}>
                      <span>Casting labor (${perG.toFixed(0)}/g × alloy weight — varies per metal)</span>
                      <strong style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1a1410' }}>
                        {defWeight > 0
                          ? `${defLabel}: ${defWeight.toFixed(2)}g × $${perG} = $${Math.round(defCasting)}`
                          : '—'}
                      </strong>
                    </div>
                  </div>
                );
              })()}

              {/* Per-metal price table — fixed column widths ensure header/data alignment */}
              {(form.gold_weight_g ?? 0) > 0 && (() => {
                const metalsToShow = (form.metals ?? []).length > 0 ? (form.metals ?? []) : METAL_OPTIONS;
                const markup       = form.markup_multiplier ?? 4;
                const COL = '1fr 160px 160px 90px 120px';
                return (
                  <div className="adm-metal-price-table" style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: COL,
                      padding: '8px 14px',
                      background: '#f5eeeb',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 11,
                      color: '#1a1410',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.07em',
                      fontWeight: 600,
                    }}>
                      <span>Metal</span>
                      <span style={{ textAlign: 'right' }}>Weight / Rate</span>
                      <span style={{ textAlign: 'right' }}>Metal + Casting</span>
                      <span style={{ textAlign: 'right' }}>Cost</span>
                      <span style={{ textAlign: 'right', color: '#AC3438' }}>Website Price</span>
                    </div>
                    {/* Rows */}
                    {metalsToShow.map((metal, idx) => {
                      // Color variants of the same karat use identical pricing (only color differs, not cost)
                      const pricingMetal  = /^14k/.test(metal) ? '14k_yellow' : /^18k/.test(metal) ? '18k_yellow' : metal;
                      const ratio         = DENSITY_RATIO[pricingMetal] ?? 1.0;
                      const metalWeight   = (form.gold_weight_g ?? 0) * ratio;
                      const costPerG      = livePrices?.cost_per_gram[pricingMetal] ?? 0;
                      const materialCost  = metalWeight * costPerG;
                      const castingLabor  = metalWeight * (form.casting_labor_per_gram ?? 10);
                      const rhodiumUplift = 0; // same for all color variants within a karat
                      const stoneCostVal  = form.stones_value_usd ?? productTotal.total_stone_price_usd;
                      const subTotal      = materialCost + castingLabor + stoneCostVal + totalLabour + rhodiumUplift;
                      const costTotal     = Math.round(subTotal / 10) * 10;
                      const websitePrice  = Math.round((costTotal * markup) / 10) * 10;
                      const label         = METAL_LABEL_DISPLAY[metal] ?? metal.replace(/_/g, ' ');
                      const isDefault     = metal === (form.default_metal ?? 'platinum');
                      return (
                        <div key={metal} style={{
                          display: 'grid',
                          gridTemplateColumns: COL,
                          padding: '10px 14px',
                          borderBottom: idx < metalsToShow.length - 1 ? '1px solid var(--border)' : 'none',
                          alignItems: 'center',
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 15,
                          background: isDefault ? '#fffaf8' : 'transparent',
                        }}>
                          <span style={{ color: '#1a1410', fontWeight: isDefault ? 600 : 400 }}>
                            {label}{isDefault ? ' ★' : ''}
                          </span>
                          <span style={{ color: '#1a1410', fontSize: 14, textAlign: 'right' }}>
                            {metalWeight.toFixed(2)}g{livePrices ? ` @ $${costPerG.toFixed(2)}/g` : ''}{pricingMetal !== metal ? ' *' : ''}
                          </span>
                          <span style={{ color: '#1a1410', fontSize: 14, textAlign: 'right' }}>
                            {livePrices ? `$${Math.round(materialCost).toLocaleString()} + $${Math.round(castingLabor).toLocaleString()}` : '—'}
                          </span>
                          <span style={{ color: '#1a1410', fontSize: 15, textAlign: 'right', fontWeight: 500 }}>
                            {livePrices ? `$${costTotal.toLocaleString('en-US')}` : '—'}
                          </span>
                          <strong style={{ color: livePrices ? '#AC3438' : '#bbb', fontSize: 16, textAlign: 'right' }}>
                            {livePrices ? `$${websitePrice.toLocaleString('en-US')}` : '—'}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Website Markup Multiplier — directly above Total Product Price */}
              {(form.gold_weight_g ?? 0) > 0 && (
                <div style={{
                  marginTop: 20,
                  padding: '14px 16px',
                  background: '#fdf9f7',
                  border: '1px solid #e8ddd8',
                  borderRadius: 6,
                  fontFamily: "'Cormorant Garamond', serif",
                }}>
                  <span className="adm-field-label" style={{ display: 'block', marginBottom: 8 }}>
                    Website Markup Multiplier
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
                    <div className="adm-chips" style={{ margin: 0 }}>
                      {MARKUP_MULTIPLIER_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`adm-chip${(form.markup_multiplier ?? 4) === p ? ' is-active' : ''}`}
                          onClick={() => set('markup_multiplier', p)}
                        >
                          ×{p}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number" step="0.1" min="1" className="adm-input"
                      style={{ maxWidth: 90 }}
                      value={form.markup_multiplier ?? ''}
                      onChange={(e) => set('markup_multiplier', e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <span style={{ fontSize: 12, color: '#1a1410' }}>
                      cost × multiplier = website price shown to customers
                    </span>
                  </div>
                </div>
              )}

              {/* Total Product Price summary */}
              {(form.gold_weight_g ?? 0) > 0 && livePrices && (() => {
                const defaultMetal  = form.default_metal ?? 'platinum';
                const ratio         = DENSITY_RATIO[defaultMetal] ?? 1.0;
                const metalWeight   = (form.gold_weight_g ?? 0) * ratio;
                const costPerG      = livePrices.cost_per_gram[defaultMetal] ?? 0;
                const materialCost  = metalWeight * costPerG;
                const castingLabor  = metalWeight * (form.casting_labor_per_gram ?? 10);
                const rhodiumUplift = RHODIUM_UPLIFT_DISPLAY[defaultMetal] ?? 0;
                const stoneCostVal  = form.stones_value_usd ?? productTotal.total_stone_price_usd;
                const subTotal      = materialCost + castingLabor + stoneCostVal + totalLabour + rhodiumUplift;
                const markup        = form.markup_multiplier ?? 4;
                const costTotal     = Math.round(subTotal / 10) * 10;
                const websitePrice  = Math.round((costTotal * markup) / 10) * 10;
                const label         = METAL_LABEL_DISPLAY[defaultMetal] ?? defaultMetal.replace(/_/g, ' ');
                return (
                  <div style={{
                    marginTop: 8,
                    padding: '16px 16px',
                    background: '#fff8f6',
                    border: '1px solid #AC3438',
                    borderRadius: 6,
                    fontFamily: "'Cormorant Garamond', serif",
                  }}>
                    <div style={{ fontSize: 11, color: '#1a1410', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 12 }}>
                      Total Product Price — {label} (default metal)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#1a1410', marginBottom: 3 }}>Product Cost</div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: '#1a1410' }}>
                          ${costTotal.toLocaleString('en-US')}
                        </div>
                      </div>
                      <div style={{ fontSize: 20, color: '#1a1410', fontWeight: 300, padding: '0 4px' }}>×{markup}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 1, height: 36, background: '#e8ddd8' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#1a1410', marginBottom: 3 }}>Website Price (shown to customers)</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#AC3438', letterSpacing: '-0.5px' }}>
                          ${websitePrice.toLocaleString('en-US')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Overrides */}
              <div className="adm-fields" style={{ marginTop: 20 }}>
                <label className="adm-field adm-field--full">
                  <span className="adm-field-label">Stone Value Override (leave blank to use auto)</span>
                  <div className="adm-dollar-wrap">
                    <input
                      type="number" step="50" className="adm-input"
                      value={form.stones_value_usd ?? ''}
                      onChange={(e) => set('stones_value_usd', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>
                </label>
                <label className="adm-field adm-field--full">
                  <span className="adm-field-label">Accounting Cost (USD)</span>
                  <div className="adm-dollar-wrap">
                    <input
                      type="number" step="10" className="adm-input"
                      value={form.accounting_cost_usd ?? ''}
                      onChange={(e) => set('accounting_cost_usd', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>
                </label>
              </div>
            </section>
          </>
        )}

      </div>{/* end .adm-editor-body */}

      {/* Sticky save/delete bar */}
      <div className="adm-sticky-bar">
        <div className="adm-sticky-bar-info">
          {form.sku
            ? <><span className="adm-mono">{form.sku}</span> &middot; {form.name || 'Untitled'}</>
            : 'New product'}
        </div>
        <div className="adm-sticky-bar-actions">
          {!isNew && (
            <button type="button" className="adm-btn adm-btn-danger" disabled={deleting} onClick={remove}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button type="button" className="adm-btn adm-btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format a carat value with enough decimal places to show meaningful
 * precision — no fixed rounding that would hide tiny stone weights.
 *   0.0038  →  "0.0038"   (4 dp)
 *   0.0912  →  "0.0912"   (4 dp)
 *   0.571   →  "0.571"    (3 dp)
 *   1.25    →  "1.25"     (2 dp)
 */
function fmtCt(ct: number): string {
  if (!ct || ct <= 0) return '0';
  if (ct < 0.001) return ct.toFixed(5);
  if (ct < 0.1)   return ct.toFixed(4);
  if (ct < 1)     return ct.toFixed(3);
  return ct.toFixed(2);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaratInput({
  autoValue,
  override,
  onCommit,
}: {
  autoValue: number;
  override: number | null;
  onCommit: (v: number | null) => void;
}) {
  const externalDisplay = override != null && override > 0
    ? fmtCt(override)
    : (autoValue > 0 ? fmtCt(autoValue) : '');
  const [draft, setDraft] = useState(externalDisplay);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(externalDisplay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalDisplay]);

  return (
    <input
      type="text"
      inputMode="decimal"
      className="adm-input"
      style={{ width: 76, padding: '3px 8px', fontSize: 13 }}
      value={draft}
      placeholder={autoValue > 0 ? fmtCt(autoValue) : '0'}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => { setFocused(true); e.target.select(); }}
      onBlur={() => {
        setFocused(false);
        const raw = draft.trim();
        const num = raw === '' ? null : Number(raw);
        const v = num != null && !isNaN(num) && num > 0 ? num : null;
        onCommit(v);
        setDraft(v != null ? fmtCt(v) : (autoValue > 0 ? fmtCt(autoValue) : ''));
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

function StoneGroupReadout({
  group,
  onUpdate,
}: {
  group: StoneGroup;
  onUpdate?: (patch: Partial<StoneGroup>) => void;
}) {
  const eff = groupEffectiveSize(group);
  const b   = computeStoneBreakdown(eff, group.count, group.shape, group.length_mm, group.width_mm);
  const hasOverride = group.carat_each_override != null && group.carat_each_override > 0;
  const caratEach   = hasOverride ? group.carat_each_override! : b.carat_per_stone;
  const count       = Math.max(0, Number(group.count ?? 0));
  const totalCt     = caratEach * count;
  const pricePerCt  = pricePerCaratFromCt(caratEach);
  const totalPrice  = totalCt * pricePerCt;

  if (!eff && !hasOverride) {
    return (
      <p className="adm-stone-readout adm-stone-readout--empty">
        Enter length &amp; width to estimate carats &amp; cost.
      </p>
    );
  }

  if (onUpdate) {
    return (
      <div className="adm-stone-readout adm-stone-readout--editable" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginTop: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CaratInput
            autoValue={b.carat_per_stone}
            override={group.carat_each_override ?? null}
            onCommit={(v) => onUpdate({ carat_each_override: v })}
          />
          <span style={{ fontSize: 12, color: '#1a1410', whiteSpace: 'nowrap' as const }}>ct each</span>
        </label>
        <span className="adm-stone-readout-sep">·</span>
        <span style={{ fontSize: 12 }}><strong>{fmtCt(totalCt)} ct</strong> total</span>
        <span className="adm-stone-readout-sep">·</span>
        <span style={{ fontSize: 12 }}>≈ <strong>${Math.round(totalPrice).toLocaleString('en-US')}</strong></span>
        {hasOverride && (
          <button
            type="button"
            style={{ fontSize: 10, color: '#AC3438', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            onClick={() => onUpdate({ carat_each_override: null })}
          >
            reset to auto
          </button>
        )}
      </div>
    );
  }

  return (
    <p className="adm-stone-readout">
      <span>{fmtCt(caratEach)} ct each</span>
      <span className="adm-stone-readout-sep">·</span>
      <span><strong>{fmtCt(totalCt)} ct</strong> total</span>
      <span className="adm-stone-readout-sep">·</span>
      <span>≈ <strong>${Math.round(totalPrice).toLocaleString('en-US')}</strong></span>
    </p>
  );
}

function MetalGallerySlot({
  metal,
  images,
  onUpload,
  onRemove,
  onMove,
}: {
  metal: string;
  images: string[];
  onUpload: (files: FileList | File[]) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const label = metal === 'platinum' ? 'Platinum' : metal.replace(/_/g, ' ');

  return (
    <div className="adm-metal-slot">
      <div className="adm-metal-slot-head">
        <h3 className="adm-h3 adm-metal-slot-title">{label}</h3>
        <span className="adm-page-sub">
          {images.length === 0 ? 'Uses main gallery' : `${images.length} image${images.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div
        className={`adm-drop adm-drop--compact${dragOver ? ' is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <span>+ Add photos for {label}</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && onUpload(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {images.length > 0 && (
        <div className="adm-thumb-strip">
          {images.map((src, i) => (
            <div key={src + i} className="adm-thumb-item">
              <AdminThumb src={src} />
              {i === 0 && <span className="adm-gallery-tag">Hero</span>}
              <div className="adm-thumb-actions">
                <button type="button" className="adm-icon-btn" onClick={() => onMove(i, -1)} disabled={i === 0} title="Move left">←</button>
                <button type="button" className="adm-icon-btn" onClick={() => onMove(i, 1)} disabled={i === images.length - 1} title="Move right">→</button>
                <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => onRemove(i)} title="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

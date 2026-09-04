'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  computeStoneBreakdown,
  pricePerCaratFromCt,
  effectiveSizeMm,
  DIAMOND_SHAPES,
  DENSITY_RATIO,
  METAL_LABEL_DISPLAY,
  type StoneGroup,
} from '@/lib/stone-math';
import DiamondShapeIcon from '@/components/admin/DiamondShapeIcon';
import { purchaseModeLabel } from '@/lib/product-purchase-mode';

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
  N: 'Norme de DANHOV',
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
  const [skuDialog, setSkuDialog] = useState(false);
  const [pendingSku, setPendingSku] = useState('');
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
    // Preserve the stored multiplier as-is, including custom (non-preset) values like 2.2
    markup_multiplier: product.markup_multiplier ?? 4,
  });

  // Raw text for the custom-multiplier box. Kept separate from form.markup_multiplier
  // so typing a decimal that passes through a preset integer (e.g. "2.2") doesn't clear.
  const [customMarkup, setCustomMarkup] = useState<string>(() => {
    const m = product.markup_multiplier;
    return m != null && !MARKUP_MULTIPLIER_PRESETS.includes(Number(m)) ? String(m) : '';
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

  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast,    setToast]    = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [uploads,  setUploads]  = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [costBreakOpen, setCostBreakOpen] = useState(false);
  const [allMetalsOpen, setAllMetalsOpen] = useState(false);
  const fileRef     = useRef<HTMLInputElement>(null);
  const mainStripRef = useRef<HTMLDivElement>(null);

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

      // If product belongs to a collection, propagate markup to all siblings
      let collectionMsg = '';
      const collection = form.collection;
      if (!isNew && collection) {
        const colRes = await fetch('/api/admin/collection-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection, markup_multiplier: form.markup_multiplier ?? 4 }),
        });
        if (colRes.ok) {
          const colData = await colRes.json();
          collectionMsg = ` · ×${form.markup_multiplier ?? 4} applied to all ${colData.updated} ${collection} products`;
        }
      }

      flashToast('ok', isNew ? 'Product created' : `Saved${collectionMsg}`);
      if (isNew && data.sku) {
        router.push(`/admin/products/${encodeURIComponent(data.sku)}`);
      } else if (!isNew && data.sku) {
        // SKU was renamed — navigate to new URL
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

      {/* SKU Rename dialog */}
      {skuDialog && (
        <div
          className="adm-lightbox-backdrop"
          onClick={() => setSkuDialog(false)}
        >
          <div
            className="adm-sku-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-sku-dialog-head">
              <span className="adm-sku-dialog-icon">⚠</span>
              <h3 className="adm-sku-dialog-title">Rename SKU</h3>
            </div>
            <p className="adm-sku-dialog-body">
              Renaming <strong>{product.sku}</strong> changes the product&apos;s primary identifier.
              Any existing orders or saved links using the old SKU will no longer resolve.
            </p>
            <label className="adm-sku-dialog-label">New SKU</label>
            <input
              className="adm-input adm-mono"
              value={pendingSku}
              onChange={(e) => setPendingSku(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pendingSku.trim() && pendingSku.trim() !== product.sku) {
                  set('sku', pendingSku.trim());
                  setSkuDialog(false);
                }
                if (e.key === 'Escape') setSkuDialog(false);
              }}
              autoFocus
            />
            <div className="adm-sku-dialog-actions">
              <button
                type="button"
                className="adm-btn"
                onClick={() => setSkuDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                disabled={!pendingSku.trim() || pendingSku.trim() === product.sku}
                onClick={() => {
                  set('sku', pendingSku.trim());
                  setSkuDialog(false);
                }}
              >
                Confirm Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightboxSrc && (
        <div
          className="adm-lightbox-backdrop"
          onClick={() => setLightboxSrc(null)}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="adm-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="adm-lightbox-close" onClick={() => setLightboxSrc(null)} aria-label="Close">✕</button>
        </div>
      )}

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
          </button>
        ))}
      </div>

      <div className="adm-editor-body">

        {/* ══ IDENTITY TAB ════════════════════════════════════════════════ */}
        {activeTab === 'identity' && (
          <>
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="adm-input adm-mono"
                    value={form.sku}
                    disabled={!isNew}
                    onChange={(e) => isNew ? handleSkuChange(e.target.value) : undefined}
                    style={{ flex: 1 }}
                  />
                  {!isNew && (
                    <button
                      type="button"
                      className="adm-btn"
                      style={{ flexShrink: 0, fontSize: 11, padding: '5px 10px' }}
                      onClick={() => { setPendingSku(form.sku); setSkuDialog(true); }}
                    >
                      Rename
                    </button>
                  )}
                </div>
                {!isNew && form.sku !== product.sku && (
                  <span style={{ fontSize: 11, color: '#AC3438', marginTop: 4, display: 'block' }}>
                    SKU will change to <strong>{form.sku}</strong> on save
                  </span>
                )}
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
              <div className="adm-field" style={{ justifyContent: 'end' }}>
                <span className="adm-field-label">Customer checkout</span>
                <span style={{ fontSize: 12, color: 'var(--adm-mute)', lineHeight: 1.45 }}>
                  {purchaseModeLabel(form.centre_diamond_group)}
                </span>
              </div>
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

          <div className="adm-tab-actions">
            <button type="button" className="adm-btn adm-btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
            {!isNew && (
              <button type="button" className="adm-btn adm-btn-danger" disabled={deleting} onClick={remove}>
                {deleting ? 'Deleting…' : 'Delete Product'}
              </button>
            )}
          </div>
          </>
        )}

        {/* ══ IMAGES TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'images' && (
          <>
            {/* Main Gallery */}
            <div className="adm-pe-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div className="adm-pe-card-head" style={{ margin: 0 }}>Main Gallery</div>
                <span style={{ fontSize: 11, color: '#999' }}>
                  {imageCount > 0 ? `${imageCount} image${imageCount === 1 ? '' : 's'} · first is hero` : 'No images yet'}
                </span>
              </div>

              <div
                className={`adm-drop adm-drop--compact${dragOver ? ' is-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
                }}
                onClick={() => fileRef.current?.click()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 4v12m-6-6 6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Drop images or click to browse</span>
                <span className="adm-drop-hint">PNG · JPG · WebP · up to 12 MB</span>
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
                <ul className="adm-uploads" style={{ marginTop: 10 }}>
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
                <div className="adm-img-rail" style={{ marginTop: 12 }}>
                  <button type="button" className="adm-img-arrow adm-img-arrow--left"
                    onClick={() => mainStripRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}
                    aria-label="Scroll left"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <div ref={mainStripRef} className="adm-thumb-strip">
                    {(form.images ?? []).map((src, i) => (
                      <div key={src + i} className="adm-thumb-item adm-thumb-item--clickable" onClick={() => setLightboxSrc(src)}>
                        <AdminThumb src={src} size={110} />
                        {i === 0 && <span className="adm-gallery-tag">Hero</span>}
                        <div className="adm-thumb-actions" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="adm-icon-btn" onClick={() => moveImage(i, -1)} disabled={i === 0} title="Move left">←</button>
                          <button type="button" className="adm-icon-btn" onClick={() => moveImage(i, 1)} disabled={i === imageCount - 1} title="Move right">→</button>
                          <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => removeImage(i)} title="Remove">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="adm-img-arrow adm-img-arrow--right"
                    onClick={() => mainStripRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
                    aria-label="Scroll right"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Per-Metal Photos */}
            <div className="adm-pe-card" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div className="adm-pe-card-head" style={{ margin: 0 }}>Per-Metal Photos</div>
                <span style={{ fontSize: 11, color: '#999' }}>Falls back to main gallery if empty</span>
              </div>
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
                      onZoom={(src) => setLightboxSrc(src)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="adm-tab-actions">
              <button type="button" className="adm-btn adm-btn-primary" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
              </button>
              {!isNew && (
                <button type="button" className="adm-btn adm-btn-danger" disabled={deleting} onClick={remove}>
                  {deleting ? 'Deleting…' : 'Delete Product'}
                </button>
              )}
            </div>
          </>
        )}


        {/* ══ PRICING TAB ═════════════════════════════════════════════════ */}
        {activeTab === 'pricing' && (
          <div style={{ fontFamily: "'Nunito Sans', sans-serif" }}>
            {/* ── 3-col grid ──────────────────────────────────────────── */}
            <div className="adm-pe-grid">

              {/* LEFT col: Metal Specs · Centre Diamond · Overrides */}
              <div className="adm-pe-col">

                {/* Casting Labor */}
                <div className="adm-pe-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                    <div className="adm-pe-card-head" style={{ margin: 0 }}>Casting Labor</div>
                    <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                      Casting&nbsp;
                      <strong style={{ fontSize: 14, color: '#1a1410', fontWeight: 700 }}>
                        ${Math.round((form.gold_weight_g ?? 0) * (form.casting_labor_per_gram ?? 10)).toLocaleString('en-US')}
                      </strong>
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <span className="adm-pe-label">Weight (PT) — grams</span>
                    <input
                      type="number" step="0.1" className="adm-input"
                      style={{ marginTop: 4, maxWidth: 110 }}
                      value={form.gold_weight_g ?? ''}
                      onChange={(e) => set('gold_weight_g', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <span className="adm-pe-label" style={{ marginBottom: 6 }}>Casting ($/g)</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 6 }}>
                      {CASTING_LABOR_PRESETS.map((v) => (
                        <button key={v} type="button"
                          className={`adm-pe-chip${(form.casting_labor_per_gram ?? 10) === v ? ' is-active' : ''}`}
                          onClick={() => set('casting_labor_per_gram', v)}
                        >
                          ${v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Setting · Centre Diamond */}
                <div className="adm-pe-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                    <div className="adm-pe-card-head" style={{ margin: 0 }}>Centre Diamond Setting Labor</div>
                    <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                      Labour&nbsp;
                      <strong style={{ fontSize: 14, color: '#1a1410', fontWeight: 700 }}>
                        ${centreLabour.toLocaleString('en-US')}
                      </strong>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div>
                      <span className="adm-pe-label">Count</span>
                      <input type="number" step="1" min="0" className="adm-input" style={{ marginTop: 3 }}
                        value={form.centre_diamond_group?.count ?? ''}
                        onChange={(e) => updateCentreGroup({ count: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <span className="adm-pe-label">Shape</span>
                      <div className="adm-shape-select" style={{ marginTop: 3 }}>
                        <DiamondShapeIcon shape={form.centre_diamond_group?.shape ?? null} className="adm-shape-select-icon" />
                        <select className="adm-select adm-select--with-icon"
                          value={form.centre_diamond_group?.shape ?? 'round'}
                          onChange={(e) => updateCentreGroup({ shape: e.target.value })}
                        >
                          {DIAMOND_SHAPES.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <span className="adm-pe-label">Length (mm)</span>
                      <input type="number" step="0.05" min="0" className="adm-input" style={{ marginTop: 3 }}
                        value={form.centre_diamond_group?.length_mm ?? ''}
                        onChange={(e) => {
                          const length = e.target.value === '' ? null : Number(e.target.value);
                          const width  = form.centre_diamond_group?.width_mm ?? null;
                          const eff    = length != null && width != null ? (length + width) / 2 : (length ?? width);
                          updateCentreGroup({ length_mm: length, size_mm: eff });
                        }}
                      />
                    </div>
                    <div>
                      <span className="adm-pe-label">Width (mm)</span>
                      <input type="number" step="0.05" min="0" className="adm-input" style={{ marginTop: 3 }}
                        value={form.centre_diamond_group?.width_mm ?? ''}
                        onChange={(e) => {
                          const width  = e.target.value === '' ? null : Number(e.target.value);
                          const length = form.centre_diamond_group?.length_mm ?? null;
                          const eff    = length != null && width != null ? (length + width) / 2 : (width ?? length);
                          updateCentreGroup({ width_mm: width, size_mm: eff });
                        }}
                      />
                    </div>
                  </div>
                  <StoneGroupReadout group={form.centre_diamond_group ?? blankStoneGroup()} onUpdate={(patch) => updateCentreGroup(patch)} />
                  <div style={{ borderTop: '1px solid var(--adm-line)', paddingTop: 12, marginTop: 12 }}>
                    <span className="adm-pe-label" style={{ marginBottom: 6 }}>Labour ×</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 6, marginBottom: 8, alignItems: 'center' }}>
                      {CENTRE_MULTIPLIER_PRESETS.map((p) => (
                        <button key={p} type="button"
                          className={`adm-pe-chip${form.centre_multiplier === p ? ' is-active' : ''}`}
                          onClick={() => set('centre_multiplier', p)}
                        >
                          ×{p}
                        </button>
                      ))}
                      <div className="adm-dollar-wrap" style={{ maxWidth: 70 }}>
                        <input type="number" step="1" min="1" className="adm-input"
                          value={form.centre_multiplier ?? ''}
                          onChange={(e) => set('centre_multiplier', e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </div>
                    </div>
                    {centreCount > 0 && (form.centre_multiplier ?? 0) > 0 && (
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {centreCount} × ${form.centre_multiplier ?? 50} =&nbsp;
                        <strong style={{ color: '#1a1410' }}>${centreLabour.toLocaleString('en-US')}</strong>
                      </div>
                    )}
                  </div>
                </div>

              </div>{/* end LEFT col */}

              {/* CENTER col: Stones + Labor */}
              <div className="adm-pe-col">

                {/* Stone group cards — one standalone card per group */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {(form.stone_groups ?? []).map((g, i) => {
                    const eff          = groupEffectiveSize(g);
                    const b            = computeStoneBreakdown(eff, g.count, g.shape, g.length_mm, g.width_mm);
                    const hasOverride  = g.carat_each_override != null && g.carat_each_override > 0;
                    const caratEach    = hasOverride ? g.carat_each_override! : b.carat_per_stone;
                    const count        = Math.max(0, Number(g.count ?? 0));
                    const totalCt      = caratEach * count;
                    const ppc          = pricePerCaratFromCt(caratEach);
                    const totalPrice   = totalCt * ppc;
                    const hasData      = eff != null || hasOverride;
                    const groupSetting = count * (form.setting_multiplier ?? 4);

                    return (
                      <div key={i} className="adm-pe-card" style={{ display: 'flex', flexDirection: 'column' as const, gap: 0, padding: 0, overflow: 'hidden' }}>

                        {/* Card header: title + combined total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 16px 0' }}>
                          <div className="adm-pe-card-head" style={{ margin: 0 }}>Stones Setting Labor</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            {(form.stone_groups ?? []).length > 1 && (
                              <button type="button" className="adm-link adm-link--danger" style={{ fontSize: 11 }} onClick={() => removeStoneGroup(i)}>
                                Remove
                              </button>
                            )}
                            {hasData && count > 0 && (
                              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                                Total&nbsp;
                                <strong style={{ fontSize: 14, color: '#1a1410', fontWeight: 700 }}>
                                  ${(Math.round(totalPrice) + groupSetting).toLocaleString('en-US')}
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Body: left inputs + right CT/price */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: 16, gap: 0 }}>

                          {/* Left */}
                          <div style={{ paddingRight: 14 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                              <div>
                                <span className="adm-pe-label">Count</span>
                                <input type="number" step="1" min="0" className="adm-input" style={{ marginTop: 3 }}
                                  value={g.count ?? ''}
                                  onChange={(e) => updateStoneGroup(i, { count: e.target.value === '' ? null : Number(e.target.value) })}
                                />
                              </div>
                              <div>
                                <span className="adm-pe-label">Length mm</span>
                                <input type="number" step="0.05" min="0" className="adm-input" style={{ marginTop: 3 }}
                                  value={g.length_mm ?? ''}
                                  onChange={(e) => {
                                    const length = e.target.value === '' ? null : Number(e.target.value);
                                    const width  = g.width_mm ?? null;
                                    const eff2   = length != null && width != null ? (length + width) / 2 : (length ?? width);
                                    updateStoneGroup(i, { length_mm: length, size_mm: eff2 });
                                  }}
                                />
                              </div>
                              <div>
                                <span className="adm-pe-label">Width mm</span>
                                <input type="number" step="0.05" min="0" className="adm-input" style={{ marginTop: 3 }}
                                  value={g.width_mm ?? ''}
                                  onChange={(e) => {
                                    const width  = e.target.value === '' ? null : Number(e.target.value);
                                    const length = g.length_mm ?? null;
                                    const eff2   = length != null && width != null ? (length + width) / 2 : (width ?? length);
                                    updateStoneGroup(i, { width_mm: width, size_mm: eff2 });
                                  }}
                                />
                              </div>
                              <div>
                                <span className="adm-pe-label">Shape</span>
                                <div className="adm-shape-select" style={{ marginTop: 3 }}>
                                  <DiamondShapeIcon shape={g.shape} className="adm-shape-select-icon" />
                                  <select className="adm-select adm-select--with-icon"
                                    value={g.shape ?? 'round'}
                                    onChange={(e) => updateStoneGroup(i, { shape: e.target.value })}
                                  >
                                    {DIAMOND_SHAPES.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right: CT + price */}
                          <div style={{ borderLeft: '1px solid var(--adm-line)', paddingLeft: 14, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', gap: 14, minWidth: 110 }}>
                            <div>
                              <span className="adm-pe-label" style={{ marginBottom: 4 }}>CT / Stone</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <CaratInput
                                  autoValue={b.carat_per_stone}
                                  override={g.carat_each_override ?? null}
                                  onCommit={(v) => updateStoneGroup(i, { carat_each_override: v })}
                                />
                                <span style={{ fontSize: 11, color: '#999' }}>ct</span>
                              </div>
                              {hasOverride && (
                                <button type="button"
                                  style={{ fontSize: 10, color: '#AC3438', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', marginTop: 3 }}
                                  onClick={() => updateStoneGroup(i, { carat_each_override: null })}
                                >reset auto</button>
                              )}
                            </div>
                            {hasData && count > 0 && (
                              <div>
                                <span className="adm-pe-label" style={{ marginBottom: 4 }}>Total</span>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1410', lineHeight: 1.2 }}>
                                  ${Math.round(totalPrice).toLocaleString('en-US')}
                                </div>
                                <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{fmtCt(totalCt)} ct</div>
                              </div>
                            )}
                          </div>

                        </div>

                        {/* Bottom: Setting bar */}
                        <div style={{ borderTop: '1px solid var(--adm-line)', background: '#faf7f5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' as const }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
                            <span className="adm-pe-label" style={{ margin: 0 }}>Setting ×</span>
                            {SETTING_MULTIPLIER_PRESETS.map((p) => (
                              <button key={p} type="button"
                                className={`adm-pe-chip${form.setting_multiplier === p ? ' is-active' : ''}`}
                                onClick={() => set('setting_multiplier', p)}
                              >
                                ×{p}
                              </button>
                            ))}
                            <div className="adm-dollar-wrap" style={{ maxWidth: 65 }}>
                              <input type="number" step="1" min="1" className="adm-input"
                                value={form.setting_multiplier ?? ''}
                                onChange={(e) => set('setting_multiplier', e.target.value === '' ? null : Number(e.target.value))}
                              />
                            </div>
                          </div>
                          <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' as const }}>
                            {count} × ${form.setting_multiplier ?? 4} = <strong style={{ color: '#1a1410' }}>${groupSetting.toLocaleString('en-US')}</strong>
                          </span>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Add group button */}
                <div>
                  <button type="button" className="adm-btn adm-btn--sm" onClick={addStoneGroup}>
                    + Add Stone Group
                  </button>
                </div>

                {/* Labor */}
                <div className="adm-pe-card">
                  {(() => {
                    const laborCardTotal = extrasTotal + customLabour;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                        <div className="adm-pe-card-head" style={{ margin: 0 }}>Labor</div>
                        <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                          Total&nbsp;
                          <strong style={{ fontSize: 14, color: '#1a1410', fontWeight: 700 }}>
                            ${laborCardTotal.toLocaleString('en-US')}
                          </strong>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3D Run · Rhodium · Laser Engraving */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--adm-line)' }}>
                    {([
                      { key: 'three_d_run' as keyof LaborExtras,     label: '3D Run',          defaultVal: 30 },
                      { key: 'rhodium' as keyof LaborExtras,          label: 'Rhodium',         defaultVal: 30 },
                      { key: 'laser_engraving' as keyof LaborExtras,  label: 'Laser Engraving', defaultVal: 20 },
                    ]).map(({ key, label, defaultVal }) => (
                      <div key={key}>
                        <span className="adm-pe-label" style={{ marginBottom: 4 }}>{label}</span>
                        <div className="adm-dollar-wrap" style={{ marginTop: 4 }}>
                          <input type="number" step="1" min="0" placeholder={String(defaultVal)} className="adm-input"
                            value={laborExtras[key] === 0 ? '' : laborExtras[key]}
                            onChange={(e) => setLaborExtras((prev) => ({
                              ...prev,
                              [key]: e.target.value === '' ? 0 : Number(e.target.value),
                            }))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Jewellery Labor */}
                  <div>
                    <span className="adm-pe-label" style={{ marginBottom: 8 }}>Jewellery Labor</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 6, marginBottom: 8 }}>
                      {CUSTOM_LABOR_PRESETS.map((v) => (
                        <button key={v} type="button"
                          className={`adm-pe-chip${(form.custom_labor_usd ?? 0) === v ? ' is-active' : ''}`}
                          onClick={() => set('custom_labor_usd', (form.custom_labor_usd ?? 0) === v ? null : v)}
                        >
                          ${v.toLocaleString('en-US')}
                        </button>
                      ))}
                    </div>
                    <div className="adm-dollar-wrap">
                      <input type="number" step="10" min="0" placeholder="Enter any amount…" className="adm-input"
                        value={form.custom_labor_usd ?? ''}
                        onChange={(e) => set('custom_labor_usd', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </div>
                  </div>

                </div>

              </div>{/* end CENTER col */}

              {/* RIGHT sidebar: Grand total breakdown */}
              <div className="adm-pe-sidebar">

                {/* Live market */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--adm-line)', background: '#faf7f5' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#AC3438', marginBottom: 8 }}>
                    Live Market
                  </div>
                  {livePrices ? (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#888' }}>24k Gold</span>
                        <strong style={{ color: '#1a1410' }}>${livePrices.gold_per_gram_24k.toFixed(2)}/g</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#888' }}>Pt spot</span>
                        <strong style={{ color: '#1a1410' }}>${livePrices.platinum_per_gram_spot.toFixed(2)}/g</strong>
                      </div>
                      {livePrices.iridium_per_gram_spot && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#888' }}>Ir (manual)</span>
                          <strong style={{ color: '#1a1410' }}>${livePrices.iridium_per_gram_spot.toFixed(2)}/g</strong>
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#bbb', marginTop: 2, textAlign: 'right' as const }}>
                        {new Date(livePrices.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#bbb' }}>Fetching prices…</div>
                  )}
                </div>

                {/* Itemized card totals */}
                {(() => {
                  const castingAmt    = Math.round((form.gold_weight_g ?? 0) * (form.casting_labor_per_gram ?? 10));
                  const laborCardAmt  = extrasTotal + customLabour;

                  // Stone Setting Labor: sum each group's card top-right directly
                  // (diamond price + setting labor per group — exactly what each card shows)
                  const stoneGroupsTotal = (form.stone_groups ?? []).reduce((sum, g) => {
                    const eff       = groupEffectiveSize(g);
                    const hasOvr    = g.carat_each_override != null && g.carat_each_override > 0;
                    if (!hasOvr && eff == null) return sum;
                    const b         = computeStoneBreakdown(eff, g.count, g.shape, g.length_mm, g.width_mm);
                    const caratEach = hasOvr ? g.carat_each_override! : b.carat_per_stone;
                    const cnt       = Math.max(0, Number(g.count ?? 0));
                    if (cnt === 0) return sum;
                    const totalPr   = caratEach * cnt * pricePerCaratFromCt(caratEach);
                    const grpSet    = cnt * (form.setting_multiplier ?? 4);
                    return sum + Math.round(totalPr) + grpSet;
                  }, 0);

                  const nonMetalSum   = castingAmt + centreLabour + stoneGroupsTotal + laborCardAmt;

                  const defaultMetal = form.default_metal ?? 'platinum';
                  const ratio        = DENSITY_RATIO[defaultMetal] ?? 1.0;
                  const metalWeight  = (form.gold_weight_g ?? 0) * ratio;
                  const costPerG     = livePrices?.cost_per_gram[defaultMetal] ?? 0;
                  const materialCost = Math.round(metalWeight * costPerG);
                  const markup       = form.markup_multiplier ?? 4;
                  const grandCost    = Math.round((nonMetalSum + materialCost) / 10) * 10;
                  const websitePrice = Math.round((grandCost * markup) / 10) * 10;
                  const label        = METAL_LABEL_DISPLAY[defaultMetal] ?? defaultMetal.replace(/_/g, ' ');

                  const rows: { label: string; amount: number }[] = [
                    { label: 'Casting Labor',              amount: castingAmt },
                    { label: 'Centre Diamond Setting Labor', amount: centreLabour },
                    { label: 'Stone Setting Labor',         amount: stoneGroupsTotal },
                    { label: 'Labor',                       amount: laborCardAmt },
                  ];

                  return (
                    <>
                      {/* Card totals list */}
                      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--adm-line)', background: '#fff' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#999', marginBottom: 10 }}>
                          Card Totals
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
                          {rows.map((r) => (
                            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--adm-line)' }}>
                              <span style={{ fontSize: 12, color: '#666' }}>{r.label}</span>
                              <strong style={{ fontSize: 13, color: '#1a1410' }}>
                                {r.amount > 0 ? `$${r.amount.toLocaleString('en-US')}` : '—'}
                              </strong>
                            </div>
                          ))}
                          {/* Metal material cost (live) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--adm-line)' }}>
                            <span style={{ fontSize: 12, color: '#666' }}>Metal ({label})</span>
                            <strong style={{ fontSize: 13, color: livePrices ? '#1a1410' : '#bbb' }}>
                              {livePrices ? `$${materialCost.toLocaleString('en-US')}` : '—'}
                            </strong>
                          </div>
                          {/* Grand subtotal */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1410' }}>Grand Total Cost</span>
                            <strong style={{ fontSize: 15, color: '#1a1410' }}>
                              {livePrices ? `$${grandCost.toLocaleString('en-US')}` : `$${Math.round(nonMetalSum / 10) * 10}`}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Website price */}
                      <div style={{ background: '#AC3438', padding: '16px 14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
                          {form.collection ? `${form.collection} · ` : ''}{label} Price
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.5px', marginBottom: 6 }}>
                          {livePrices ? `$${websitePrice.toLocaleString('en-US')}` : '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                          ${livePrices ? grandCost.toLocaleString('en-US') : '—'} × {markup} markup
                        </div>
                      </div>

                      {/* Markup multiplier */}
                      <div style={{ padding: '13px 14px', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#999' }}>
                            Markup Multiplier
                          </div>
                          {form.collection && (
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#AC3438', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                              {form.collection}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                          {MARKUP_MULTIPLIER_PRESETS.map((p) => (
                            <button key={p} type="button"
                              className={`adm-pe-chip${customMarkup === '' && (form.markup_multiplier ?? 4) === p ? ' is-active' : ''}`}
                              onClick={() => { setCustomMarkup(''); set('markup_multiplier', p); }}
                            >
                              ×{p}
                            </button>
                          ))}
                          <div style={{ maxWidth: 68 }}>
                            <input type="number" step="0.1" min="1" placeholder="×2.5" className="adm-input"
                              value={customMarkup}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCustomMarkup(v);
                                set('markup_multiplier', v === '' ? null : Number(v));
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#bbb' }}>
                          {form.collection
                            ? `Saving applies ×${form.markup_multiplier ?? 4} to all ${form.collection} products`
                            : 'cost × multiplier = website price'}
                        </div>
                      </div>
                    </>
                  );
                })()}

              </div>{/* end RIGHT sidebar */}

            </div>{/* end .adm-pe-grid */}

            {/* ── Bottom accordions: Cost Breakdown + All Metals ──────── */}
            <div className="adm-pe-bottom" style={{ marginTop: 14 }}>

              {/* Cost breakdown */}
              <div className="adm-pe-accordion">
                <button type="button" className="adm-pe-accordion-btn"
                  onClick={() => { setCostBreakOpen((o) => !o); setAllMetalsOpen((o) => !o); }}
                >
                  <span>↓ Cost Breakdown</span>
                  <span style={{ fontSize: 13, fontWeight: 400, letterSpacing: 0 }}>
                    {costBreakOpen ? '▲' : '▼'}
                  </span>
                </button>
                {costBreakOpen && (() => {
                  const platWeight  = form.gold_weight_g ?? 0;
                  const perG        = form.casting_labor_per_gram ?? 10;
                  const castingAmt  = platWeight * perG;
                  const stoneGroups = Array.isArray(form.stone_groups) ? form.stone_groups : [];
                  let cbStoneTotal  = 0;
                  const stoneRows = stoneGroups
                    .filter((g): g is StoneGroup => g != null && (g?.count ?? 0) > 0)
                    .map((g) => {
                      const szMm = effectiveSizeMm(g) ?? 0;
                      const b = computeStoneBreakdown(szMm, g.count, g.shape, g.length_mm, g.width_mm);
                      const caratEach = (g.carat_each_override != null && g.carat_each_override > 0) ? g.carat_each_override : b.carat_per_stone;
                      const cnt = Math.max(0, Number(g.count ?? 0));
                      const ppc = pricePerCaratFromCt(caratEach);
                      const diamondAmt = caratEach * cnt * ppc;
                      const settingAmt = cnt * (form.setting_multiplier ?? 4);
                      const cardTotal  = Math.round(diamondAmt) + settingAmt;
                      cbStoneTotal    += cardTotal;
                      const shapePart  = g.shape ? ` ${g.shape}` : '';
                      return {
                        label: `Stone Setting Labor${szMm > 0 ? ` (${szMm.toFixed(2)}mm${shapePart})` : shapePart ? ` (${shapePart})` : ''}`,
                        formula: `${cnt} × ${fmtCt(caratEach)} ct + ${cnt}×$${form.setting_multiplier ?? 4}`,
                        amount: cardTotal,
                      };
                    });
                  const subtotal = castingAmt + centreLabour + cbStoneTotal + customLabour + extrasTotal;
                  const rows: { label: string; formula: string; amount: number }[] = [
                    { label: 'Casting Labor', formula: platWeight > 0 ? `${platWeight}g × $${perG}/g` : '—', amount: castingAmt },
                    { label: 'Centre Diamond Setting Labor', formula: centreCount > 0 ? `${centreCount} × $${form.centre_multiplier ?? 50}` : '—', amount: centreLabour },
                    ...stoneRows,
                    { label: 'Jewellery Labor', formula: customLabour > 0 ? 'manual' : '—', amount: customLabour },
                    { label: '3D Run', formula: `$${laborExtras.three_d_run}`, amount: laborExtras.three_d_run },
                    { label: 'Rhodium', formula: `$${laborExtras.rhodium}`, amount: laborExtras.rhodium },
                    { label: 'Laser Engraving', formula: `$${laborExtras.laser_engraving}`, amount: laborExtras.laser_engraving },
                  ].filter(Boolean) as { label: string; formula: string; amount: number }[];
                  return (
                    <div className="adm-pe-accordion-body">
                      {rows.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--adm-line)', fontSize: 13 }}>
                          <div>
                            <span style={{ color: '#1a1410', fontWeight: 500 }}>{r.label}</span>
                            <span style={{ color: '#aaa', fontSize: 11, marginLeft: 8 }}>{r.formula}</span>
                          </div>
                          <strong style={{ color: '#1a1410', minWidth: 70, textAlign: 'right' as const }}>
                            {r.amount > 0 ? `$${Math.round(r.amount).toLocaleString('en-US')}` : '—'}
                          </strong>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0 0', fontSize: 14, fontWeight: 700 }}>
                        <span>Subtotal (excl. metal)</span>
                        <span style={{ color: '#AC3438' }}>${Math.round(subtotal).toLocaleString('en-US')}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* All metals + actions */}
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <div className="adm-pe-accordion">
                <button type="button" className="adm-pe-accordion-btn"
                  onClick={() => { setAllMetalsOpen((o) => !o); setCostBreakOpen((o) => !o); }}
                >
                  <span>All Metals</span>
                  <span style={{ fontSize: 13, fontWeight: 400, letterSpacing: 0 }}>
                    {allMetalsOpen ? '▲' : '▼'}
                  </span>
                </button>
                {allMetalsOpen && (form.gold_weight_g ?? 0) > 0 && livePrices && (() => {
                  const metalsToShow = (form.metals ?? []).length > 0 ? (form.metals ?? []) : METAL_OPTIONS;
                  const markup = form.markup_multiplier ?? 4;
                  const amStoneGroupsTotal = (form.stone_groups ?? []).reduce((sum, g) => {
                    const eff       = groupEffectiveSize(g);
                    const hasOvr    = g.carat_each_override != null && g.carat_each_override > 0;
                    if (!hasOvr && eff == null) return sum;
                    const b         = computeStoneBreakdown(eff, g.count, g.shape, g.length_mm, g.width_mm);
                    const caratEach = hasOvr ? g.carat_each_override! : b.carat_per_stone;
                    const cnt       = Math.max(0, Number(g.count ?? 0));
                    if (cnt === 0) return sum;
                    const grpSet    = cnt * (form.setting_multiplier ?? 4);
                    return sum + Math.round(caratEach * cnt * pricePerCaratFromCt(caratEach)) + grpSet;
                  }, 0);
                  const amLaborCardAmt = customLabour + extrasTotal;
                  return (
                    <div className="adm-pe-accordion-body">
                      {metalsToShow.map((metal) => {
                        const pricingMetal  = /^14k/.test(metal) ? '14k_yellow' : /^18k/.test(metal) ? '18k_yellow' : metal;
                        const ratio         = DENSITY_RATIO[pricingMetal] ?? 1.0;
                        const metalWeight   = (form.gold_weight_g ?? 0) * ratio;
                        const costPerG      = livePrices.cost_per_gram[pricingMetal] ?? 0;
                        const materialCost  = metalWeight * costPerG;
                        const castingLabor  = metalWeight * (form.casting_labor_per_gram ?? 10);
                        const subTotal      = materialCost + castingLabor + centreLabour + amStoneGroupsTotal + amLaborCardAmt;
                        const costTotal     = Math.round(subTotal / 10) * 10;
                        const websitePrice  = Math.round((costTotal * markup) / 10) * 10;
                        const label         = METAL_LABEL_DISPLAY[metal] ?? metal.replace(/_/g, ' ');
                        const isDefault     = metal === (form.default_metal ?? 'platinum');
                        return (
                          <div key={metal} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--adm-line)', fontSize: 13 }}>
                            <span style={{ color: isDefault ? '#1a1410' : '#666', fontWeight: isDefault ? 700 : 400 }}>
                              {label}{isDefault ? ' ★' : ''}
                            </span>
                            <div style={{ textAlign: 'right' as const }}>
                              <div style={{ fontSize: 11, color: '#aaa' }}>
                                {metalWeight.toFixed(2)}g{livePrices ? ` · $${costPerG.toFixed(2)}/g` : ''}
                                {pricingMetal !== metal ? ' *' : ''}
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 700, color: '#AC3438' }}>
                                ${websitePrice.toLocaleString('en-US')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!livePrices && (
                        <div style={{ padding: '10px 0', fontSize: 13, color: '#aaa' }}>
                          Waiting for live metal prices…
                        </div>
                      )}
                    </div>
                  );
                })()}
                {allMetalsOpen && (form.gold_weight_g ?? 0) === 0 && (
                  <div className="adm-pe-accordion-body" style={{ fontSize: 13, color: '#aaa', padding: '10px 16px 14px' }}>
                    Enter platinum weight above to see per-metal prices.
                  </div>
                )}
              </div>

              {/* Save / Delete */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                {!isNew && (
                  <button type="button" className="adm-btn adm-btn-danger" disabled={deleting} onClick={remove}>
                    {deleting ? 'Deleting…' : 'Delete Product'}
                  </button>
                )}
                <button type="button" className="adm-btn adm-btn-primary" disabled={saving} onClick={save}>
                  {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
                </button>
              </div>

              </div>{/* end all metals + actions column */}

            </div>{/* end bottom accordions */}

          </div>
        )}


      </div>{/* end .adm-editor-body */}

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
  onZoom,
}: {
  metal: string;
  images: string[];
  onUpload: (files: FileList | File[]) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onZoom?: (src: string) => void;
}) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
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
        <span>+ Add photos</span>
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
        <div className="adm-img-rail adm-img-rail--sm">
          <button type="button" className="adm-img-arrow adm-img-arrow--left"
            onClick={() => stripRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            aria-label="Scroll left"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div ref={stripRef} className="adm-thumb-strip">
            {images.map((src, i) => (
              <div key={src + i} className={`adm-thumb-item${onZoom ? ' adm-thumb-item--clickable' : ''}`} onClick={() => onZoom?.(src)}>
                <AdminThumb src={src} />
                {i === 0 && <span className="adm-gallery-tag">Hero</span>}
                <div className="adm-thumb-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="adm-icon-btn" onClick={() => onMove(i, -1)} disabled={i === 0} title="Move left">←</button>
                  <button type="button" className="adm-icon-btn" onClick={() => onMove(i, 1)} disabled={i === images.length - 1} title="Move right">→</button>
                  <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => onRemove(i)} title="Remove">✕</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="adm-img-arrow adm-img-arrow--right"
            onClick={() => stripRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            aria-label="Scroll right"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

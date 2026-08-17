'use client';

import { useRef, useState } from 'react';

type Stage = 'input' | 'generating' | 'error';

const CATEGORIES = [
  { value: '', label: 'Let AI decide' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'fine', label: 'Fine jewelry' },
  { value: 'mens', label: "Men's jewelry" },
];

export default function AIProductWizard({
  onDraftReady,
  onSwitchToManual,
}: {
  onDraftReady: (payload: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draft: any;
    imageUrl: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    labor: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing: any;
  }) => void;
  onSwitchToManual: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [platinumWeight, setPlatinumWeight] = useState<number>(4.0);
  const [stoneCount, setStoneCount] = useState<number>(1);
  const [stoneSizeMm, setStoneSizeMm] = useState<number>(5.0);
  const [categoryHint, setCategoryHint] = useState('');
  const [stage, setStage] = useState<Stage>('input');
  const [err, setErr] = useState<string | null>(null);
  const [stepMsg, setStepMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > 12 * 1024 * 1024) {
      setErr('Image must be under 12 MB.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErr(null);
  }

  async function uploadImage(f: File): Promise<string> {
    const form = new FormData();
    form.append('file', f);
    const r = await fetch('/api/admin/upload', { method: 'POST', body: form });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error || `Image upload failed (${r.status})`);
    }
    const data = await r.json();
    return data.url as string;
  }

  async function generate() {
    if (!file) { setErr('Upload a product photo first.'); return; }
    if (platinumWeight <= 0) { setErr('Platinum weight must be greater than 0.'); return; }
    if (stoneCount < 0) { setErr('Stone count cannot be negative.'); return; }
    setStage('generating');
    setErr(null);
    setStepMsg('Uploading photo…');
    try {
      // Step A: upload the image to Supabase
      const imageUrl = await uploadImage(file);

      // Step B: call the AI generator
      setStepMsg('Analysing the piece (Gemini Vision)…');
      const form = new FormData();
      form.append('image', file);
      form.append('platinum_weight_g', String(platinumWeight));
      form.append('stone_count', String(stoneCount));
      form.append('stone_size_mm', String(stoneSizeMm));
      if (categoryHint) form.append('category_hint', categoryHint);

      const r = await fetch('/api/admin/products/ai-generate', {
        method: 'POST',
        body: form,
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        const base = e.error || `AI generation failed (${r.status})`;
        throw new Error(e.detail ? `${base} — ${e.detail}` : base);
      }
      const data = await r.json() as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        draft: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labor: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pricing: any;
      };

      setStepMsg('Composing narrative (Claude Sonnet 4.6)…');
      // brief pause for UX so the user sees the step message
      await new Promise((res) => setTimeout(res, 350));

      // Attach the uploaded image into the draft
      const draft = {
        ...data.draft,
        images: [imageUrl],
      };

      onDraftReady({ draft, imageUrl, labor: data.labor, pricing: data.pricing });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Generation failed');
      setStage('error');
    }
  }

  return (
    <div className="adm-card adm-ai-wizard">
      <div className="adm-ai-head">
        <div>
          <h2 className="adm-h2" style={{ margin: 0 }}>
            <span className="adm-ai-sparkle">✦</span> AI-assisted product
          </h2>
          <p className="adm-page-sub" style={{ marginTop: 4 }}>
            Upload one photo, enter four numbers — the AI fills in name, collection, category,
            description, narrative, stone value, markup, and computes the live price.
          </p>
        </div>
        <button type="button" className="adm-link" onClick={onSwitchToManual}>
          Fill manually instead →
        </button>
      </div>

      <div className="adm-ai-body">
        {/* Photo */}
        <div
          className={`adm-ai-drop${preview ? ' has-image' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Product preview" />
          ) : (
            <>
              <div className="adm-ai-drop-mark">+</div>
              <div>Click or drop a product photo</div>
              <div className="adm-page-sub">JPG / PNG / WebP / HEIC · max 12 MB</div>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Inputs */}
        <div className="adm-grid-2">
          <label className="adm-field">
            <span>Weight (platinum, g)</span>
            <input
              type="number" step="0.01" min="0"
              className="adm-input"
              value={platinumWeight}
              onChange={(e) => setPlatinumWeight(Number(e.target.value))}
            />
            <span className="adm-field-hint">
              Will convert to gold equivalent via density ratio (×0.9).
            </span>
          </label>
          <label className="adm-field">
            <span>Stone count</span>
            <input
              type="number" step="1" min="0"
              className="adm-input"
              value={stoneCount}
              onChange={(e) => setStoneCount(Number(e.target.value))}
            />
          </label>
          <label className="adm-field">
            <span>Stone size (mm)</span>
            <input
              type="number" step="0.1" min="0"
              className="adm-input"
              value={stoneSizeMm}
              onChange={(e) => setStoneSizeMm(Number(e.target.value))}
            />
          </label>
          <label className="adm-field">
            <span>Category hint (optional)</span>
            <select
              className="adm-select"
              value={categoryHint}
              onChange={(e) => setCategoryHint(e.target.value)}
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        </div>

        {err && <div className="adm-ai-err">{err}</div>}

        <div className="adm-ai-actions">
          <button
            type="button"
            className="adm-btn adm-btn-primary adm-ai-generate"
            disabled={stage === 'generating' || !file}
            onClick={generate}
          >
            {stage === 'generating' ? (
              <>
                <span className="adm-ai-spinner" />
                {stepMsg || 'Generating…'}
              </>
            ) : (
              <>✦ Generate full product draft</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

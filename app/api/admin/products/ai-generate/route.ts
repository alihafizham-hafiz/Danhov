/**
 * AI-assisted product generation.
 *
 * Admin uploads a photo + provides minimal inputs (platinum weight,
 * stone count, stone size mm). We:
 *   1. Use Gemini 2.5 Pro Vision to analyse the photo and emit a
 *      structured JSON guess (name, slug, collection, category, default
 *      metal, sub-categories, descriptor terms, stone-value estimate,
 *      markup/labor suggestions, alt description text).
 *   2. Use Claude Sonnet 4.6 to write a sacred narrative + a customer-
 *      facing description from the Gemini guess + the platinum weight.
 *   3. Compute the gold-equivalent weight (density ratio) and the labor
 *      breakdown from the 5 labor categories.
 *   4. Compute the live price from the gold spot + breakdown.
 *
 * Returns a fully-populated product draft the admin can review + tweak
 * before saving.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { getAdmin } from '@/lib/admin-auth';
import {
  getGenAI,
  VISION_MODEL_PRIMARY,
  VISION_MODEL_FALLBACK,
  SAFETY_SETTINGS,
  bufferToPart,
} from '@/lib/gemini';
import { DANHOV_KNOWLEDGE } from '@/lib/danhov-knowledge';
import {
  computeLabor,
  platinumToGoldWeightG,
} from '@/lib/labor';
import { fetchLaborCategories } from '@/lib/labor-server';
import { computePrice, getAllSpots } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const COLLECTIONS = [
  'Abbraccio', 'Voltaggio', 'Classico', 'Norme de DANHOV',
  'Carezza', 'Per Lei', 'Petalo', 'Solo Filo',
  'Eleganza', 'Couture', 'Unito',
];
const CATEGORIES = ['engagement', 'wedding', 'fine', 'mens'] as const;
const SUB_BY_CATEGORY: Record<string, string[]> = {
  engagement: ['solitaire', 'halo', 'three-stone', 'tension', 'twist', 'pavé', 'vintage'],
  wedding: ['his-bands', 'her-bands', 'award-winners'],
  fine: ['earrings', 'pendants', 'rings', 'bands', 'limited'],
  mens: ['rings', 'bracelets', 'necklaces'],
};

const Fields = z.object({
  platinum_weight_g: z.coerce.number().min(0.01).max(500),
  stone_count: z.coerce.number().int().min(0).max(2000),
  stone_size_mm: z.coerce.number().min(0).max(50),
  category_hint: z.enum(CATEGORIES).optional(),
});

// Tolerant schema — we accept whatever Gemini returns and normalise it
// after parsing. Strict enums are the #1 source of "invalid shape" errors
// (vision often returns "platinum", "white gold", or a collection like
// "Solitaire" that isn't in our list).
const VisionGuess = z.object({
  name: z.string().min(1).max(200),
  collection: z.string().min(1).max(100),
  category: z.string().min(1).max(40),
  sub_categories: z.array(z.string()).max(10).optional().default([]),
  default_metal: z.string().min(1).max(60),
  short_description: z.string().min(20).max(1500),
  setting_style: z.string().min(2).max(120).optional().default('classic setting'),
  stone_type: z.string().min(2).max(120).optional().default('round-brilliant diamond'),
  stone_value_usd_estimate: z.coerce.number().min(0).max(500_000).optional().default(0),
  markup_multiplier_suggestion: z.coerce.number().min(1.5).max(8).optional().default(3.5),
  complexity_score: z.coerce.number().min(1).max(10).optional().default(5),
});

const VALID_METALS = [
  '14k_yellow', '14k_white', '14k_rose',
  '18k_yellow', '18k_white', '18k_rose',
] as const;
type ValidMetal = (typeof VALID_METALS)[number];

function normaliseMetal(raw: string): ValidMetal {
  const s = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Direct hits like "14kwhite", "18kyellow", "14k_rose"
  for (const m of VALID_METALS) {
    if (s.includes(m.replace('_', ''))) return m;
  }
  // Heuristic by color words
  const purity: '14k' | '18k' = s.includes('18') ? '18k' : '14k';
  if (s.includes('white') || s.includes('platinum')) return `${purity}_white` as ValidMetal;
  if (s.includes('rose') || s.includes('pink')) return `${purity}_rose` as ValidMetal;
  return `${purity}_yellow` as ValidMetal;
}

function normaliseCategory(raw: string): typeof CATEGORIES[number] {
  const s = raw.toLowerCase();
  if (s.includes('wedding') || s.includes('band')) return 'wedding';
  if (s.includes('men') || s.includes("men's")) return 'mens';
  if (s.includes('fine') || s.includes('earring') || s.includes('pendant') || s.includes('bracelet') || s.includes('necklace')) return 'fine';
  if (s.includes('engage') || s.includes('solitaire') || s.includes('halo') || s.includes('proposal')) return 'engagement';
  return 'engagement';
}

function normaliseCollection(raw: string): string {
  // Fuzzy match against the 11 collections; fall back to the raw string
  // (admin can change it in the editor anyway).
  const s = raw.toLowerCase().replace(/[^a-z]/g, '');
  for (const c of COLLECTIONS) {
    if (s.includes(c.toLowerCase().replace(/[^a-z]/g, ''))) return c;
  }
  // Some common visual cues → collection guesses
  if (s.includes('twist') || s.includes('swirl') || s.includes('embrace')) return 'Abbraccio';
  if (s.includes('tension') || s.includes('float')) return 'Voltaggio';
  if (s.includes('solitaire') || s.includes('classic')) return 'Classico';
  if (s.includes('petal') || s.includes('floral')) return 'Petalo';
  if (s.includes('thread') || s.includes('thin')) return 'Solo Filo';
  if (s.includes('couture') || s.includes('custom')) return 'Couture';
  return 'Classico';
}

function normaliseSubCategories(raw: string[], category: string): string[] {
  const valid = new Set(SUB_BY_CATEGORY[category] ?? []);
  return raw
    .map((s) => s.toLowerCase().replace(/[^a-z-]/g, ''))
    .filter((s) => valid.has(s))
    .slice(0, 4);
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form body' }, { status: 400 });
  }

  const file = form.get('image');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Product image required' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Image must be 1 B – ${MAX_BYTES} bytes` }, { status: 413 });
  }
  const mime = (file.type || 'image/jpeg').split(';')[0].toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    return NextResponse.json({ error: `Unsupported image type: ${mime}` }, { status: 415 });
  }

  const parsed = Fields.safeParse({
    platinum_weight_g: form.get('platinum_weight_g'),
    stone_count: form.get('stone_count'),
    stone_size_mm: form.get('stone_size_mm'),
    category_hint: form.get('category_hint') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid fields', detail: parsed.error.message }, { status: 400 });
  }
  const { platinum_weight_g, stone_count, stone_size_mm, category_hint } = parsed.data;

  // ── 1. Gemini Vision — structured product guess ────────────────────
  const buffer = Buffer.from(await file.arrayBuffer());

  const visionPrompt = `You are DANHOV's senior cataloguer. Analyse this product photograph and return a STRICT JSON object describing the piece. No prose. No markdown. JSON only.

The JSON MUST have exactly these keys (case-sensitive). Treat the enums as CLOSED — pick the closest valid value, never invent new ones:

- "name": string. The piece's proper name, e.g. "Abbraccio Twist Solitaire", "Voltaggio Tension Petite". Reference the collection idiom you see.
- "collection": MUST be exactly one of these 11 strings (case-sensitive): ${COLLECTIONS.join(' | ')}. If unsure, pick the closest by visible idiom (twist→Abbraccio, tension→Voltaggio, classic→Classico, floral→Petalo, intricate→Couture, etc).
- "category": MUST be exactly one of: ${CATEGORIES.join(' | ')}. (Engagement rings = "engagement". Wedding bands = "wedding". Pendants/earrings/bracelets/fashion = "fine". Anything obviously masculine = "mens".)
- "sub_categories": array of 0-4 short tags. For engagement use any of: ${SUB_BY_CATEGORY.engagement.join(', ')}. For wedding: ${SUB_BY_CATEGORY.wedding.join(', ')}. For fine: ${SUB_BY_CATEGORY.fine.join(', ')}. For mens: ${SUB_BY_CATEGORY.mens.join(', ')}.
- "default_metal": MUST be exactly one of: 14k_yellow | 14k_white | 14k_rose | 18k_yellow | 18k_white | 18k_rose. Never "platinum" — DANHOV doesn't use platinum, so if the piece looks platinum/silvery, return "14k_white" or "18k_white" instead. Yellow gold → *_yellow. Rose/pink gold → *_rose.
- "short_description": 60–120 words. Speak as DANHOV. Note the setting style, metal colour, stone presentation. Mention "handcrafted in Los Angeles in 14k or 18k gold" once. Plain prose, no bullet points.
- "setting_style": short phrase like "tension setting", "pavé halo", "four-prong solitaire", "channel band".
- "stone_type": short phrase like "round-brilliant diamond", "emerald-cut sapphire", "no centre stone".
- "stone_value_usd_estimate": number. The wholesale USD value of the stones in this piece, knowing there are ${stone_count} stones at ${stone_size_mm} mm. Lab-grown round-brilliant diamonds at 1.0mm ≈ $30 each; scales steeply with mm. Use 0 if no stones. Round to nearest 50.
- "markup_multiplier_suggestion": number between 2.5 and 5.5. Simple band → 2.5. Intricate pavé/halo → 4.5+. Couture → 5+.
- "complexity_score": integer 1–10.

Admin-entered context (use to ground numbers):
- Stones count: ${stone_count}
- Stone size: ${stone_size_mm} mm
- Weight (platinum equivalent): ${platinum_weight_g} g
${category_hint ? `- Admin hint — category: ${category_hint}` : ''}

If anything is unreadable, make your best DANHOV-aligned guess. Never refuse. JSON only — no markdown fences, no commentary.`;

  const genAI = getGenAI();
  let visionRaw = '';
  let lastVisionError: unknown = null;
  for (const model of [VISION_MODEL_PRIMARY, ...VISION_MODEL_FALLBACK]) {
    try {
      const m = genAI.getGenerativeModel({
        model,
        systemInstruction: DANHOV_KNOWLEDGE,
        generationConfig: { temperature: 0.4, maxOutputTokens: 1600, responseMimeType: 'application/json' },
        safetySettings: SAFETY_SETTINGS,
      });
      const result = await m.generateContent([
        bufferToPart(buffer, mime),
        { text: visionPrompt },
      ]);
      try {
        visionRaw = result.response.text();
      } catch {
        visionRaw = '';
      }
      if (visionRaw && visionRaw.trim()) break;
      lastVisionError = new Error(`${model}: empty`);
    } catch (e) {
      lastVisionError = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/429|503|404|quota|exceeded|unavailable/i.test(msg)) throw e;
    }
  }
  if (!visionRaw) {
    console.error('ai-generate: vision failed', lastVisionError);
    return NextResponse.json({ error: 'Vision analysis briefly unavailable. Try again.' }, { status: 503 });
  }

  const guessJson = safeParseJson(visionRaw);
  if (!guessJson) {
    console.error('ai-generate: vision returned non-JSON', visionRaw.slice(0, 800));
    return NextResponse.json(
      {
        error: 'AI returned an unreadable response. Please try again or fill the form manually.',
        detail: visionRaw.slice(0, 400),
      },
      { status: 502 }
    );
  }

  const guess = VisionGuess.safeParse(guessJson);
  if (!guess.success) {
    console.error(
      'ai-generate: vision JSON validation failed',
      guess.error.issues,
      JSON.stringify(guessJson).slice(0, 800)
    );
    return NextResponse.json(
      {
        error: 'AI returned an invalid product shape. Please try again or fill the form manually.',
        detail: guess.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      },
      { status: 502 }
    );
  }

  // Normalise the loosely-typed strings back to our internal options
  const rawCategory = guess.data.category;
  const category = normaliseCategory(rawCategory);
  const g = {
    ...guess.data,
    category,
    default_metal: normaliseMetal(guess.data.default_metal),
    collection: normaliseCollection(guess.data.collection),
    sub_categories: normaliseSubCategories(guess.data.sub_categories ?? [], category),
  };

  // ── 2. Compute gold weight + labor + price ─────────────────────────
  const goldWeightG = platinumToGoldWeightG(platinum_weight_g);
  const cats = await fetchLaborCategories();
  const labor = computeLabor(cats, {
    stone_count,
    metal_key: g.default_metal,
    engraving: '',
  });
  const baseLaborUsd = labor.total_usd;

  let priceBreakdown = null;
  let totalUsd = 0;
  try {
    const spots = await getAllSpots();
    priceBreakdown = computePrice(
      {
        default_metal:     g.default_metal,
        gold_weight_g:     goldWeightG,
        markup_multiplier: g.markup_multiplier_suggestion,
        base_labor_usd:    baseLaborUsd,
        stones_value_usd:  g.stone_value_usd_estimate,
      },
      spots,
      g.default_metal,
    );
    totalUsd = priceBreakdown.total_usd;
  } catch (e) {
    console.error('ai-generate: pricing failed', e);
  }

  // ── 3. Claude narrative + customer description ─────────────────────
  let narrative = '';
  let description = g.short_description;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const claudePrompt = `You're writing a DANHOV product page entry.

Piece:
- Name: ${g.name}
- Collection: ${g.collection}
- Setting: ${g.setting_style}
- Stone: ${g.stone_type} — ${stone_count} × ${stone_size_mm} mm
- Metal: ${g.default_metal.replace(/_/g, ' ')}
- Weight: ${platinum_weight_g} g (platinum equivalent)
- Vision cataloguer's draft description: """${g.short_description}"""

Return STRICT JSON:
{
  "description": "70–120 words. Refine the draft above. Speak as DANHOV — warm, knowing, no clichés, no superlatives. Reference the specific setting style and the metal's character. Mention handcrafted in Los Angeles once.",
  "narrative": "2–3 sentences (40–70 words). One sacred-narrative line woven naturally. Reference the collection by name and the meaning of the piece."
}`;

      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        temperature: 0.7,
        system: [
          {
            type: 'text' as const,
            text: DANHOV_KNOWLEDGE,
            cache_control: { type: 'ephemeral' as const },
          },
        ],
        messages: [{ role: 'user', content: claudePrompt }],
      });
      const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '';
      const parsedC = safeParseJson(text);
      if (parsedC && typeof parsedC.description === 'string' && typeof parsedC.narrative === 'string') {
        description = parsedC.description.trim();
        narrative = parsedC.narrative.trim();
      }
    } catch (e) {
      console.warn('ai-generate: claude narrative failed (using vision draft)', e);
    }
  }

  // ── 4. Build the product draft ─────────────────────────────────────
  const slug = slugify(g.name);
  const sku = (g.name.match(/[A-Z]/g)?.join('').slice(0, 3) || 'DH').padEnd(2, 'H') +
    Math.floor(100000 + Math.random() * 900000).toString();

  // Default metals array — same purity, the three colors
  const purity = g.default_metal.split('_')[0]; // '14k' or '18k'
  const metalsArray = ['yellow', 'white', 'rose'].map((c) => `${purity} ${c.charAt(0).toUpperCase() + c.slice(1)} Gold`);

  return NextResponse.json({
    draft: {
      sku,
      slug,
      name: g.name,
      collection: g.collection,
      category: g.category,
      categories: [g.category],
      sub_categories: g.sub_categories.length > 0 ? g.sub_categories : [],
      metals: metalsArray,
      default_metal: g.default_metal,
      description,
      narrative,
      images: [],
      platinum_weight_g,
      gold_weight_g: goldWeightG,
      stone_count,
      stone_size_mm,
      stones_value_usd: g.stone_value_usd_estimate,
      markup_multiplier: g.markup_multiplier_suggestion,
      base_labor_usd: baseLaborUsd,
      is_active: true,
      price_display: totalUsd > 0 ? `$${totalUsd.toLocaleString('en-US')}` : '',
    },
    labor,
    pricing: priceBreakdown,
    vision_guess: {
      setting_style: g.setting_style,
      stone_type: g.stone_type,
      complexity_score: g.complexity_score,
    },
  });
}

function safeParseJson(s: string): { [k: string]: unknown } | null {
  if (!s) return null;
  const cleaned = s.replace(/```json\n?|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

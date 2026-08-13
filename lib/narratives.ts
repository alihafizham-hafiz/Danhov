/**
 * Spiritual Messaging Engine (proposal §3.C).
 *
 * Per (product_slug, occasion) we cache a 2-3 sentence "sacred narrative"
 * + a short meta_description (≤155 chars for SEO snippets). On a cache
 * miss we generate via Claude using the DANHOV knowledge base, then
 * upsert into `product_narratives`.
 *
 * Anyone can read the cache (RLS allows it). Only this server function
 * can write — uses the service-role client.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { DANHOV_KNOWLEDGE } from '@/lib/danhov-knowledge';
import type { Product } from '@/lib/products';

export type Occasion =
  | 'engagement'
  | 'wedding'
  | 'anniversary'
  | 'self-love'
  | 'sacred-union'
  | 'just-because';

export const OCCASIONS: { value: Occasion; label: string; tone: string }[] = [
  { value: 'engagement', label: 'Engagement', tone: 'a promise made permanent' },
  { value: 'wedding', label: 'Wedding', tone: 'two souls becoming one' },
  { value: 'anniversary', label: 'Anniversary', tone: 'love deepened by time' },
  { value: 'self-love', label: 'Self Love', tone: 'a homecoming to yourself' },
  { value: 'sacred-union', label: 'Sacred Union', tone: 'spirit choosing spirit' },
  { value: 'just-because', label: 'Just Because', tone: 'the radiance of presence' },
];

export const DEFAULT_OCCASION: Occasion = 'engagement';

export function occasionForCategory(category: string): Occasion {
  if (category === 'wedding') return 'wedding';
  if (category === 'fine' || category === 'mens') return 'self-love';
  return 'engagement';
}

export type Narrative = {
  product_slug: string;
  occasion: Occasion;
  narrative: string;
  meta_description: string;
};

const SYSTEM_HINT = `${DANHOV_KNOWLEDGE}

────────────────────────────────────────────────────────────────────────
SACRED NARRATIVE WRITER

You generate two things for a single DANHOV product, given the product
details and the occasion the customer has in mind:

1. NARRATIVE — 2 to 3 elegant sentences (40–80 words). Weave one piece
   of DANHOV philosophy naturally. Reference the specific collection
   (e.g. "the Abbraccio embrace", "Voltaggio's held tension"). Speak
   to the *meaning* of the piece for the chosen occasion. Never mention
   "AI". Never list collections. Never use marketing clichés.

2. META — one sentence under 155 characters for the SEO snippet. Must
   include the product name and the brand DANHOV. Crisp, useful, no
   philosophy lines.

Reply as STRICT JSON:
{
  "narrative": "...",
  "meta": "..."
}`;

function narrativeGenerationEnabled(): boolean {
  const flag = process.env.NARRATIVE_GENERATION_ENABLED;
  return flag === '1' || flag?.toLowerCase() === 'true';
}

export async function getOrGenerateNarrative(
  product: Product,
  occasion: Occasion
): Promise<Narrative> {
  const client = createServiceClient();

  // 1) Cache hit?
  const { data: cached } = await client
    .from('product_narratives')
    .select('product_slug, occasion, narrative, meta_description')
    .eq('product_slug', product.slug)
    .eq('occasion', occasion)
    .maybeSingle();

  if (cached) {
    return {
      product_slug: cached.product_slug,
      occasion: cached.occasion as Occasion,
      narrative: cached.narrative,
      meta_description: cached.meta_description ?? '',
    };
  }

  // 2) Cache miss — return fallback immediately and generate in background
  // so the product page loads instantly instead of waiting for Claude.
  const fallback = staticFallback(product, occasion);

  // Fire-and-forget: generate + cache the real narrative asynchronously.
  // Next request will hit the cache and get the richer version.
  const occMeta = OCCASIONS.find((o) => o.value === occasion) || OCCASIONS[0];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && narrativeGenerationEnabled()) {
    (async () => {
      try {
        const anthropic = new Anthropic({ apiKey });
        const userPrompt = `Product:
  Name: ${product.name}
  SKU: ${product.sku}
  Collection: ${product.collection ?? '—'}
  Category: ${product.category}
  Metals available: ${product.metals?.join(', ') || '—'}

Occasion: ${occMeta.label} (${occMeta.tone})

Write the narrative + meta now.`;

        const resp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 800,
          temperature: 0.7,
          system: [{ type: 'text' as const, text: SYSTEM_HINT, cache_control: { type: 'ephemeral' as const } }],
          messages: [{ role: 'user', content: userPrompt }],
        });

        const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '';
        const parsed = safeParseJson(text);
        const narrative = (parsed?.narrative ?? '').toString().trim();
        const meta = (parsed?.meta ?? '').toString().trim().slice(0, 160);
        if (narrative && meta) {
          await client.from('product_narratives').upsert(
            { product_slug: product.slug, occasion, narrative, meta_description: meta },
            { onConflict: 'product_slug,occasion' }
          );
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn('narrative background generation skipped:', message);
      }
    })();
  }

  return fallback;
}

function staticFallback(product: Product, occasion: Occasion): Narrative {
  const occMeta = OCCASIONS.find((o) => o.value === occasion) || OCCASIONS[0];
  return {
    product_slug: product.slug,
    occasion,
    narrative: `The ${product.name} is handcrafted in Los Angeles to order, in 14k or 18k gold. A ${occMeta.tone}, made by master jewelers to be worn for a lifetime.`,
    meta_description: `${product.name} — DANHOV handcrafted ${product.collection ?? 'fine jewelry'}, made to order in Los Angeles in 14k or 18k gold.`.slice(0, 160),
  };
}

function safeParseJson(s: string): { narrative?: string; meta?: string } | null {
  // Claude sometimes wraps JSON in code fences — strip them
  const cleaned = s.replace(/```json\n?|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // attempt to find a JSON object substring
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

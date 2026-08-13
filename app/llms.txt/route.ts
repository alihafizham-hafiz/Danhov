/**
 * /llms.txt — emerging convention (https://llmstxt.org/) for telling
 * LLM crawlers what a site is about. Helps Perplexity, ChatGPT search,
 * Claude search, Bing copilot etc. return correct answers about DANHOV.
 *
 * Plain-text, markdown-ish, indexed automatically by the well-known LLMs.
 */

import { supabaseAnon } from '@/lib/supabase/anon';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

export async function GET() {
  const { data: products } = await supabaseAnon
    .from('products')
    .select('sku, slug, name, collection, category, price_display')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('collection', { ascending: true });

  const byCategory = new Map<string, typeof products>();
  for (const p of products ?? []) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }

  const CATEGORY_LABEL: Record<string, string> = {
    engagement: 'Engagement Rings',
    wedding: 'Wedding Bands',
    fine: 'Fine Jewelry',
    mens: "Men's Jewelry",
  };

  const body = `# DANHOV — Luxury Handcrafted Jewelry

> Founded 1984 in Los Angeles by master jeweler Jack Hovsepian. Every piece is handcrafted to order in 14k or 18k gold (yellow, white, rose). Lifetime craftsmanship warranty.

## What we are

DANHOV is a luxury jewelry house in Los Angeles. We do not mass-produce. Every ring is made to order — cast, set, polished and finished by master jewelers, many of whom have been with the house for over a decade.

## Metals

DANHOV specializes exclusively in **14k and 18k gold** in three colors: **yellow, white, rose**. We do not work in platinum, silver, or palladium. White-gold pieces include rhodium plating for brightness (first re-plating complimentary after 2–3 years).

## Pricing

Every product page shows a **live price** computed against today's 24k gold spot. Customers can lock the price for 24 hours by email — no deposit required to lock. The locked price is guaranteed regardless of market movement.

## Customisation

- Every size (½ and ¼ included)
- Every metal (14k or 18k, yellow / white / rose)
- Stone selection (diamonds: natural or lab-grown; gemstones available)
- Complimentary engraving (up to 25 characters)
- Production: 3 weeks

## Service

- Lifetime craftsmanship warranty
- Complimentary professional cleaning every 6–12 months
- Complimentary first resize within 60 days
- Complimentary first re-rhodium on white-gold pieces

## Sustainability

- Ranked #1 Most Sustainable Jewelry Brand
- 100% recycled gold — no newly-mined gold
- All diamonds and gemstones conflict-free and traced
- 1% of every purchase funds reforestation + clean water

## Collections

${Array.from(byCategory.entries())
  .map(([cat, list]) => {
    return `### ${CATEGORY_LABEL[cat] ?? cat}\n\n${(list ?? [])
      .map(
        (p) =>
          `- [${p.name}](${SITE_URL}/product/${p.slug}) — Style ${p.sku}${
            p.collection ? `, ${p.collection}` : ''
          }${p.price_display ? ` — ${p.price_display}` : ''}`
      )
      .join('\n')}`;
  })
  .join('\n\n')}

## Contact

- Email: care@danhov.com
- Phone: (424) 421-4072
- Atelier: Los Angeles, California (by private appointment)

## Sitemap

- ${SITE_URL}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

import { supabaseAnon } from '@/lib/supabase/anon';
import { localProductImageEntry } from '@/lib/local-product-images';
import CategoryGridClient, { type EngagementCard } from './CategoryGridClient';
import SectionCta from '@/components/SectionCta';

// ── Engagement collection definitions ─────────────────────────────────────

const COLLECTIONS = [
  {
    label: 'Abbraccio',
    value: 'abbraccio',
    meaning: 'The Embrace',
    body: "DANHOV's most iconic swirl settings — the stone held in a spiral embrace of gold.",
    href: '/collection/abbraccio',
  },
  {
    label: 'Voltaggio',
    value: 'voltaggio',
    meaning: 'The Voltage',
    body: 'Tension-set designs where the diamond is suspended by the energy of the ring itself.',
    href: '/collection/voltaggio',
  },
  {
    label: 'Classico',
    value: 'classico',
    meaning: 'The Classic',
    body: 'Timeless solitaire profiles refined over four decades of master craftsmanship in Los Angeles.',
    href: '/collection/classico',
  },
  {
    label: 'Norme de Danhov',
    value: 'norme',
    meaning: 'The Standard',
    body: "Foundational forms that define DANHOV's benchmark for excellence in gold work.",
    href: '/collection/norme',
  },
  {
    label: 'Carezza',
    value: 'carezza',
    meaning: 'The Caress',
    body: 'Delicate pavé and micro-setting work — softness woven into gold, touch made permanent.',
    href: '/collection/carezza',
  },
  {
    label: 'Per Lei',
    value: 'per-lei',
    meaning: 'For Her',
    body: 'Floral forms and feminine geometries, each piece created in devotion for singular women.',
    href: '/collection/per-lei',
  },
  {
    label: 'Petalo',
    value: 'petalo',
    meaning: 'The Petal',
    body: "Nature's most perfect architecture — organic petal forms blooming in 14k and 18k gold.",
    href: '/collection/petalo',
  },
  {
    label: 'Solo Filo',
    value: 'solo',
    meaning: 'Single Thread',
    body: 'A single continuous thread of gold — minimal, essential, unbroken as a promise.',
    href: '/collection/solo',
  },
  {
    label: 'Eleganza',
    value: 'eleganza',
    meaning: 'The Elegance',
    body: 'Refined simplicity. Designs that speak through restraint and perfection of proportion.',
    href: '/collection/eleganza',
  },
  {
    label: 'Couture',
    value: 'couture',
    meaning: 'The Sovereign',
    body: 'Statement pieces with presence. Worn not to become — but to declare what already is.',
    href: '/collection/couture',
  },
  {
    label: 'Unito',
    value: 'unito',
    meaning: 'United',
    body: 'Two forms joined as one. For love that is both distinct and inseparable.',
    href: '/collection/unito',
  },
  {
    label: 'The Life Path',
    value: 'life-path',
    meaning: 'Your Number, Your Sign',
    body: 'Enter the day you arrived. We calculate your life path number and your sign, then create an original design from both — a form no other birth date makes. Not your fate. A mirror.',
    href: '/life-path',
    isLifePath: true,
  },
];

// ── CDN pinned image helpers ───────────────────────────────────────────────

const CDN = 'https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62';

const PINNED_SKUS: Record<string, string> = {
  abbraccio: 'AE520UQ-18W',
  couture:   'CE500VQ-18W',
  voltaggio: 'VE508VH',
  classico:  'WE534UH-14W',
};

const CDN_FALLBACKS: Record<string, string> = {
  abbraccio: `${CDN}/a/e/ae520uq_r1_1_wg_1.jpg`,
  couture:   `${CDN}/r/1/r1_wg.jpg`,
  voltaggio: `${CDN}/t/e/tension_rush_2_v122_v2_wg_1.jpg`,
  classico:  `${CDN}/r/i/ring_2__25.png`,
};

// Metal sort order: platinum first, then white, yellow, rose
function metalPriority(key: string): number {
  if (key.includes('plat'))   return 0;
  if (key.includes('white'))  return 1;
  if (key.includes('yellow')) return 2;
  return 3;
}

// Pick the best metal and use ALL its angles for the cycling pool (same color, different views)
function buildImagesForProduct(
  sku: string | null,
  images: string[] | null,
  metalImages: Record<string, string[]> | null,
  cap = 8,
  exclude: string[] = []
): string[] {
  const local = localProductImageEntry(sku);
  const metalMap = local?.metal_images ?? metalImages ?? {};
  const sortedKeys = Object.keys(metalMap)
    .filter(k => (metalMap[k]?.length ?? 0) > 0)
    .sort((a, b) => metalPriority(a) - metalPriority(b));

  // Use all angles from the highest-priority metal that has images
  for (const key of sortedKeys) {
    const imgs = (metalMap[key] ?? []).filter(img => img && !exclude.includes(img));
    if (imgs.length > 0) {
      return [...new Set(imgs)].slice(0, cap);
    }
  }

  // Fallback: regular images
  const fallback = (local?.images ?? images ?? []).filter(img => !exclude.includes(img));
  return [...new Set(fallback)].slice(0, cap);
}

async function getCollectionImages(): Promise<Record<string, string[]>> {
  try {
    const { data: all } = await supabaseAnon
      .from('products')
      .select('sku, collection, images, metal_images')
      .filter('categories', 'cs', JSON.stringify(['engagement']))
      .eq('is_active', true)
      .not('collection', 'is', null);

    const rows = all ?? [];

    // Build per-collection index: best product (most combined images)
    const bestByCol: Record<string, { imgs: string[]; sku: string }> = {};
    for (const p of rows) {
      const col = (p.collection as string | null)?.toLowerCase().trim();
      if (!col) continue;
      const imgs = buildImagesForProduct(
        p.sku as string,
        p.images as string[] | null,
        p.metal_images as Record<string, string[]> | null,
      );
      if (imgs.length === 0) continue;
      if (!bestByCol[col] || imgs.length > bestByCol[col].imgs.length) {
        bestByCol[col] = { imgs, sku: p.sku as string };
      }
    }

    const map: Record<string, string[]> = {};

    // Pinned collections: prefer exact pinned SKU if it has ≥ 2 combined images
    for (const [colKey, pinnedSku] of Object.entries(PINNED_SKUS)) {
      const pinned = rows.find(p => (p.sku as string).toLowerCase() === pinnedSku.toLowerCase());
      const pinnedImgs = pinned
          ? buildImagesForProduct(
            pinned.sku as string,
            pinned.images as string[] | null,
            pinned.metal_images as Record<string, string[]> | null,
          )
        : null;

      if (pinnedImgs && pinnedImgs.length >= 2) {
        map[colKey] = pinnedImgs;
      } else if (bestByCol[colKey]) {
        map[colKey] = bestByCol[colKey].imgs;
      } else if (CDN_FALLBACKS[colKey]) {
        map[colKey] = [CDN_FALLBACKS[colKey]];
      }
    }

    // Non-pinned collections: use the best product
    const pinnedKeys = new Set(Object.keys(PINNED_SKUS));
    for (const [col, entry] of Object.entries(bestByCol)) {
      if (!pinnedKeys.has(col) && !map[col]) {
        map[col] = entry.imgs;
      }
    }

    return map;
  } catch {
    return Object.fromEntries(
      Object.entries(CDN_FALLBACKS).map(([k, v]) => [k, [v]])
    );
  }
}

// ── Category card preview images (Engagement / Fine / Men's) ──────────────

/**
 * Picks the product with the most combined images (metal variants + regular)
 * from the given category. The first image of each metal variant appears as
 * a cycling frame so the card animates through gold colours on hover.
 */
async function fetchCategoryPreviewImages(
  category: string,
  exclude: string[] = []
): Promise<string[]> {
  try {
    const { data } = await supabaseAnon
      .from('products')
      .select('sku, images, metal_images')
      .filter('categories', 'cs', JSON.stringify([category]))
      .eq('is_active', true);

    if (!data || data.length === 0) return [];

    let bestImages: string[] = [];

    for (const p of data) {
      const combined = buildImagesForProduct(
        p.sku as string,
        p.images as string[] | null,
        p.metal_images as Record<string, string[]> | null,
        6,
        exclude,
      );
      if (combined.length > bestImages.length) bestImages = combined;
    }

    return bestImages.slice(0, 6);
  } catch {
    return [];
  }
}

// ── Main component ─────────────────────────────────────────────────────────

export default async function CategoryCardsSection() {
  // Run all fetches in parallel; exclude already-used primary images across cards
  const [imageMap, engagementHeroImgs, mensData] = await Promise.all([
    getCollectionImages(),
    fetchCategoryPreviewImages('engagement'),
    supabaseAnon
      .from('products')
      .select('sku, images, metal_images')
      .eq('sku', 'RK500P')
      .single(),
  ]);
  const fineImgs = await fetchCategoryPreviewImages('fine', [engagementHeroImgs[0]].filter(Boolean));
  const mensImgs = buildImagesForProduct(
    mensData.data?.sku as string | null,
    mensData.data?.images as string[] | null,
    mensData.data?.metal_images as Record<string, string[]> | null,
  );

  const engagementCards: EngagementCard[] = COLLECTIONS.map((col) => {
    if (col.isLifePath) {
      return {
        label: col.label, value: col.value, meaning: col.meaning,
        body: col.body, href: col.href, images: ['/life-path.png'],
        linkLabel: 'Find Your Path', isLifePath: true,
      };
    }
    return {
      label: col.label, value: col.value, meaning: col.meaning,
      body: col.body, href: col.href,
      images: imageMap[col.value] ?? imageMap[col.label.toLowerCase()] ?? [],
      linkLabel: `Explore ${col.label}`,
      isLifePath: false,
    };
  });

  const categoryCards: EngagementCard[] = [
    {
      label: 'Engagement Rings',
      value: 'engagement-hero',
      meaning: 'The Beginning',
      body: 'Four decades. Twelve collections. One certainty — the ring you need already exists in a form only silence can reveal.',
      href: '/engagement-rings',
      images: engagementHeroImgs,
      linkLabel: 'Explore Engagement Rings',
      isLifePath: false,
    },
    {
      label: 'Fine Jewelry',
      value: 'fine',
      meaning: 'The Daily Beautiful',
      body: 'Designed to be worn every day. Small enough to forget. Beautiful enough to remember forever.',
      href: '/fine-jewelry',
      images: fineImgs,
      linkLabel: 'Browse Fine Jewelry',
      isLifePath: false,
    },
    {
      label: "Men's Jewelry",
      value: 'mens',
      meaning: 'The Worn Statement',
      body: 'A ring that carries a name. A band that asks nothing — and says everything.',
      href: '/mens',
      images: mensImgs,
      linkLabel: "Browse Men's Jewelry",
      isLifePath: false,
    },
  ];

  return (
    <section id="engagement-rings" className="categories-section">
      <div className="categories-inner">
        <div className="categories-header">
          <h2 className="section-title">The <em>Collections</em></h2>
        </div>

        <CategoryGridClient
          engagementCards={[...engagementCards, ...categoryCards]}
        />
      </div>
        <SectionCta label="Explore Collection" href="/engagement-rings" />
    </section>
  );
}

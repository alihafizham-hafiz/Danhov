/**
 * Synthetic fallback diamond catalog.
 *
 * The Ring Builder is a centrepiece of the experience — customers should
 * never see an empty results grid because Nivoda's staging endpoint is
 * slow or rate-limited. When the live call fails or times out, we filter
 * this catalog by the customer's criteria and serve those.
 *
 * Once Nivoda's production endpoint is live (or staging is responsive
 * again), the live response is preferred and these entries fall out of
 * sight automatically.
 *
 * Stones here have offer IDs prefixed with `fb-` so the holds + orders
 * routes can distinguish them from real Nivoda offers and route them
 * to the manual-commission path (specialist follow-up) instead of the
 * Pro API create_order mutation.
 */

import type { NivodaDiamond, NivodaSearchFilters, NivodaSearchOptions, NivodaSearchResult } from '@/lib/nivoda';

const SHAPES = [
  'Round', 'Oval', 'Cushion', 'Princess', 'Emerald',
  'Pear', 'Radiant', 'Heart', 'Marquise', 'Asscher',
] as const;
const CARAT_BUCKETS = [0.30, 0.50, 0.70, 1.00, 1.25, 1.50, 1.75, 2.00, 2.50, 3.00];

/**
 * Per-carat price ladder. Loose approximation of round-brilliant lab-grown
 * pricing — generous enough to feel real, conservative enough that no
 * customer can use a fallback price to argue an actual Nivoda quote.
 *
 * Color/clarity/cut adjustments apply on top.
 */
function basePricePerCarat(carat: number): number {
  if (carat <= 0.3) return 900;
  if (carat <= 0.5) return 1400;
  if (carat <= 0.7) return 2000;
  if (carat <= 1.0) return 3500;
  if (carat <= 1.25) return 4800;
  if (carat <= 1.5) return 6200;
  if (carat <= 2.0) return 8500;
  if (carat <= 2.5) return 12000;
  return 16000;
}

const COLOR_MULT: Record<string, number> = {
  D: 1.30, E: 1.22, F: 1.14, G: 1.06, H: 1.00, I: 0.92, J: 0.84, K: 0.76,
};
const CLARITY_MULT: Record<string, number> = {
  FL: 1.40, IF: 1.30, VVS1: 1.22, VVS2: 1.16, VS1: 1.10, VS2: 1.05, SI1: 0.95, SI2: 0.85,
};
const CUT_MULT: Record<string, number> = {
  EX: 1.10, ID: 1.12, VG: 1.00, G: 0.92,
};

function price(carat: number, color: string, clarity: string, cut: string): number {
  const base = basePricePerCarat(carat) * carat;
  const adj = base * (COLOR_MULT[color] ?? 1) * (CLARITY_MULT[clarity] ?? 1) * (CUT_MULT[cut] ?? 1);
  return Math.round(adj / 25) * 25; // round to $25
}

/**
 * Deterministic catalog generator. Walks a small product of dimensions
 * so we get good filter-combo coverage (around 100 entries).
 */
function buildCatalog(): NivodaDiamond[] {
  const items: NivodaDiamond[] = [];
  let seq = 0;

  // For each shape we sample a sparse but covering set
  for (const shape of SHAPES) {
    // Caret coverage: thin for less-common shapes, fuller for round/oval
    const carats = shape === 'Round' || shape === 'Oval'
      ? CARAT_BUCKETS
      : [0.50, 1.00, 1.50, 2.00];

    for (const carat of carats) {
      // For each carat, sample a few (color, clarity, cut) tuples
      const samples: Array<[string, string, string]> = [
        ['D', 'VVS1', 'EX'],
        ['E', 'VS1', 'EX'],
        ['F', 'VS2', 'ID'],
        ['G', 'SI1', 'EX'],
        ['H', 'VS1', 'VG'],
      ];

      for (const [color, clarity, cut] of samples) {
        seq++;
        const lab = seq % 3 === 0 ? 'IGI' : 'GIA';
        const carats4 = Math.round(carat * 100) / 100;
        const offer = `fb-${shape.toLowerCase()}-${seq.toString().padStart(3, '0')}`;

        items.push({
          id: offer,
          price: price(carat, color, clarity, cut),
          markup_price: Math.round(price(carat, color, clarity, cut) * 1.18),
          diamond: {
            id: offer,
            NivodaStockId: `FB-${seq}`,
            availability: 'AVAILABLE',
            image: null,
            video: null,
            certificate: {
              lab,
              certNumber: `${lab.toLowerCase()}-${1_000_000 + seq}`,
              shape,
              carats: carats4,
              clarity,
              color,
              cut,
              polish: cut === 'EX' ? 'EX' : 'VG',
              symmetry: cut === 'EX' ? 'EX' : 'VG',
              floInt: 'NON',
              width: null,
              length: null,
              depth: null,
              depthPercentage: null,
              table: null,
              pdfUrl: null,
            },
          },
        });
      }
    }
  }
  return items;
}

const CATALOG: NivodaDiamond[] = buildCatalog();

// Map our shape strings → Nivoda's enum strings for matching
const NIVODA_SHAPE_TO_DISPLAY: Record<string, string> = {
  ROUND: 'Round', OVAL: 'Oval', PRINCESS: 'Princess', CUSHION: 'Cushion',
  EMERALD: 'Emerald', PEAR: 'Pear', HEART: 'Heart', MARQUISE: 'Marquise',
  RADIANT: 'Radiant', ASSCHER: 'Asscher',
};

/**
 * Filter the synthetic catalog by the same shape that the live Nivoda
 * search would use. Returns a result envelope with the same shape as
 * NivodaSearchResult so callers can use it interchangeably.
 */
export function fallbackSearch(
  filters: NivodaSearchFilters,
  opts: NivodaSearchOptions = {}
): NivodaSearchResult {
  const limit = Math.min(opts.limit ?? 24, 50);
  const offset = Math.max(0, opts.offset ?? 0);

  const wantShapes = (filters.shapes ?? []).map(
    (s) => NIVODA_SHAPE_TO_DISPLAY[s] ?? s
  );
  const wantColors = new Set<string>((filters.color ?? []) as unknown as string[]);
  const wantClarities = new Set<string>((filters.clarity ?? []) as unknown as string[]);
  const wantCuts = new Set<string>((filters.cut ?? []) as unknown as string[]);

  let filtered = CATALOG.filter((d) => {
    const c = d.diamond.certificate;
    if (!c) return false;
    if (wantShapes.length && !wantShapes.includes(c.shape ?? '')) return false;
    if (filters.sizes) {
      const ct = c.carats ?? 0;
      if (ct < filters.sizes.from || ct > filters.sizes.to) return false;
    }
    if (wantColors.size && !wantColors.has(c.color ?? '')) return false;
    if (wantClarities.size && !wantClarities.has(c.clarity ?? '')) return false;
    if (wantCuts.size && !wantCuts.has(c.cut ?? '')) return false;
    return true;
  });

  // Sort
  const sortType = opts.order?.type ?? 'price';
  const sortDir = opts.order?.direction ?? 'ASC';
  filtered = filtered.sort((a, b) => {
    let av = 0, bv = 0;
    if (sortType === 'price') {
      av = a.markup_price ?? a.price ?? 0;
      bv = b.markup_price ?? b.price ?? 0;
    } else if (sortType === 'size') {
      av = a.diamond.certificate?.carats ?? 0;
      bv = b.diamond.certificate?.carats ?? 0;
    } else {
      av = a.markup_price ?? a.price ?? 0;
      bv = b.markup_price ?? b.price ?? 0;
    }
    return sortDir === 'DESC' ? bv - av : av - bv;
  });

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);
  return { total_count: total, items: page };
}

/**
 * Look up a single fallback diamond by its offer id (used by the review
 * page when the customer comes back from picking a fallback stone).
 */
export function fallbackGetById(offerId: string): NivodaDiamond | null {
  return CATALOG.find((d) => d.id === offerId) ?? null;
}

/**
 * True if a given offer id is one of ours (synthetic). Routes use this
 * to decide whether to call Nivoda's Pro API or fall back to a manual
 * specialist-follow-up flow.
 */
export function isFallbackOffer(id: string): boolean {
  return typeof id === 'string' && id.startsWith('fb-');
}

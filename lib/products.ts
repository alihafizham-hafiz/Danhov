import { supabaseAnon } from '@/lib/supabase/anon';

export type Product = {
  sku: string;
  slug: string;
  name: string;
  collection: string | null;
  category: string;            // primary category
  categories: string[];        // all listings this product appears in
  metals: string[];            // ['18k Yellow Gold', 'White Gold', ...] — available options
  default_metal: string | null; // e.g. '18k_yellow' — the metal shown in the photo
  images: string[];            // [url, ...] — may be empty (fallback gallery)
  /** Per-metal gallery overrides keyed by metal slug. When a customer
   *  picks a metal swatch, the gallery shows metal_images[that_metal]
   *  if it exists and is non-empty; otherwise it falls back to images. */
  metal_images: Record<string, string[]> | null;
  price_display: string | null;
  /** Live-computed price from the pricing engine (USD). Populated server-side
   *  when the product has pricing inputs configured; undefined otherwise.
   *  Always takes precedence over price_display for display and sorting. */
  price_computed?: number;
  sub_categories: string[];    // ['her-bands', 'award-winners', ...]
  is_active: boolean;
};

/**
 * Fetch all products that belong to a given category.
 * Uses the JSONB `categories` array so multi-category products (e.g. unisex
 * wedding bands shown under both /wedding-bands and /mens) show up correctly.
 */
export async function fetchAllActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabaseAnon
    .from('products')
    .select('sku, slug, name, collection, category, categories, metals, default_metal, images, metal_images, price_display, sub_categories, is_active')
    .eq('is_active', true)
    .order('sku', { ascending: true });

  if (error) {
    console.error('fetchAllActiveProducts error:', error);
    return [];
  }
  return (data ?? []) as Product[];
}

/** Lightweight slug query used only by static param generation. */
export async function fetchAllActiveProductSlugs(): Promise<string[]> {
  const { data, error } = await supabaseAnon
    .from('products')
    .select('slug')
    .eq('is_active', true)
    .order('slug', { ascending: true });

  if (error) {
    console.error('fetchAllActiveProductSlugs error:', error);
    return [];
  }
  return (data ?? []).map((row) => row.slug as string);
}

/** Lightweight category slug query used only by static param generation. */
export async function fetchActiveProductSlugsByCategory(category: string): Promise<string[]> {
  const { data, error } = await supabaseAnon
    .from('products')
    .select('slug')
    .filter('categories', 'cs', JSON.stringify([category]))
    .eq('is_active', true)
    .order('slug', { ascending: true });

  if (error) {
    console.error('fetchActiveProductSlugsByCategory error:', error);
    return [];
  }
  return (data ?? []).map((row) => row.slug as string);
}

export async function fetchProductsByCategory(category: string, limit?: number): Promise<Product[]> {
  // JSONB array contains — use explicit `cs` filter with a JSON-stringified value
  let query = supabaseAnon
    .from('products')
    .select('sku, slug, name, collection, category, categories, metals, default_metal, images, metal_images, price_display, sub_categories, is_active')
    .filter('categories', 'cs', JSON.stringify([category]))
    .eq('is_active', true)
    .order('sku', { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('fetchProductsByCategory error:', error);
    return [];
  }
  return (data ?? []) as Product[];
}

// Collection slug → database display name
const COLLECTION_SLUG_TO_NAME: Record<string, string> = {
  abbraccio:  'Abbraccio',
  voltaggio:  'Voltaggio',
  classico:   'Classico',
  norme:      'Norme de Danhov',
  carezza:    'Carezza',
  'per-lei':  'Per Lei',
  petalo:     'Petalo',
  solo:       'Solo Filo',
  eleganza:   'Eleganza',
  couture:    'Couture',
  unito:      'Unito',
};

/**
 * Fetch ALL active products that belong to a given collection, across
 * every category (engagement, wedding, fine, mens, etc.).
 */
export async function fetchProductsByCollection(collectionSlug: string): Promise<Product[]> {
  const collectionName = COLLECTION_SLUG_TO_NAME[collectionSlug] ?? collectionSlug;

  const { data, error } = await supabaseAnon
    .from('products')
    .select('sku, slug, name, collection, category, categories, metals, default_metal, images, metal_images, price_display, sub_categories, is_active')
    .ilike('collection', collectionName)
    .eq('is_active', true)
    .order('sku', { ascending: true });

  if (error) {
    console.error('fetchProductsByCollection error:', error);
    return [];
  }
  return (data ?? []) as Product[];
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabaseAnon
    .from('products')
    .select('sku, slug, name, collection, category, categories, metals, default_metal, images, metal_images, price_display, sub_categories, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('fetchProductBySlug error:', error);
    return null;
  }
  return (data as Product) ?? null;
}

/**
 * Like fetchProductBySlug, but also pulls the pricing inputs needed by
 * the live-price engine (default_metal, weights, markup, labor, stones).
 * Use from server-side code that needs to compute today's price.
 */
export type ProductWithPricing = Product & {
  default_metal:           string | null;
  gold_weight_g:           number | null;
  markup_multiplier:       number | null;
  base_labor_usd:          number | null;
  diamond_labor_usd:       number | null;
  casting_labor_per_gram:  number | null;
  custom_labor_usd:        number | null;
  labor_extras:            {
    three_d_run?: number | null;
    rhodium?: number | null;
    laser_engraving?: number | null;
  } | null;
  stones_value_usd:        number | null;
  stone_groups:            import('@/lib/stone-math').StoneGroup[] | null;
  commission_rate:         number | null;
};

const PRICING_COLS =
  'sku, slug, name, collection, category, categories, metals, default_metal, images, metal_images, price_display, sub_categories, is_active, gold_weight_g, markup_multiplier, base_labor_usd, diamond_labor_usd, casting_labor_per_gram, custom_labor_usd, labor_extras, stones_value_usd, stone_groups, commission_rate';

/** Like fetchProductsByCategory but includes all pricing-engine fields. */
export async function fetchProductsWithPricingByCategory(category: string): Promise<ProductWithPricing[]> {
  const { data, error } = await supabaseAnon
    .from('products')
    .select(PRICING_COLS)
    .filter('categories', 'cs', JSON.stringify([category]))
    .eq('is_active', true)
    .order('sku', { ascending: true });
  if (error) { console.error('fetchProductsWithPricingByCategory error:', error); return []; }
  return (data ?? []) as ProductWithPricing[];
}

/** Like fetchProductsByCollection but includes all pricing-engine fields. */
export async function fetchProductsWithPricingByCollection(collectionSlug: string): Promise<ProductWithPricing[]> {
  const collectionName = COLLECTION_SLUG_TO_NAME[collectionSlug] ?? collectionSlug;
  const { data, error } = await supabaseAnon
    .from('products')
    .select(PRICING_COLS)
    .ilike('collection', collectionName)
    .eq('is_active', true)
    .order('sku', { ascending: true });
  if (error) { console.error('fetchProductsWithPricingByCollection error:', error); return []; }
  return (data ?? []) as ProductWithPricing[];
}

export async function fetchProductWithPricingBySlug(
  slug: string
): Promise<ProductWithPricing | null> {
  const { data, error } = await supabaseAnon
    .from('products')
    .select(
      'sku, slug, name, collection, category, categories, metals, images, metal_images, price_display, sub_categories, is_active, default_metal, gold_weight_g, markup_multiplier, base_labor_usd, diamond_labor_usd, casting_labor_per_gram, custom_labor_usd, labor_extras, stones_value_usd, stone_groups, commission_rate'
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('fetchProductWithPricingBySlug error:', error);
    return null;
  }
  return (data as ProductWithPricing) ?? null;
}

/** Strip trailing metal/karat suffix from a SKU to get the base design key. */
function baseDesignSku(sku: string | null | undefined): string {
  if (!sku) return `__no_sku__${Math.random()}`;
  return sku.replace(/-\d*[a-z]+$/i, '').toLowerCase();
}

/**
 * Fetch related products for a product detail page.
 * Priority: same collection first, then same category to fill remaining slots.
 * Deduplicates by base SKU so metal variants of the same ring don't fill all 4 slots.
 * Always returns exactly `limit` unique designs (or fewer if insufficient data).
 */
export async function fetchRelatedProducts(
  currentSlug: string,
  collection: string | null,
  category: string,
  limit = 4
): Promise<Product[]> {
  const results: Product[] = [];
  const seenSlugs = new Set([currentSlug]);
  const seenBaseSkus = new Set<string>();

  const COLS = 'sku, slug, name, collection, category, categories, metals, default_metal, images, metal_images, price_display, sub_categories, is_active';

  function addUnique(rows: Product[]): void {
    for (const p of rows) {
      if (results.length >= limit) break;
      if (seenSlugs.has(p.slug)) continue;
      const base = baseDesignSku(p.sku);
      if (seenBaseSkus.has(base)) continue;
      seenSlugs.add(p.slug);
      seenBaseSkus.add(base);
      results.push(p);
    }
  }

  // 1. Same collection — fetch generous pool so dedup still yields `limit` results
  if (collection) {
    const { data } = await supabaseAnon
      .from('products')
      .select(COLS)
      .ilike('collection', collection)
      .eq('is_active', true)
      .neq('slug', currentSlug)
      .limit(limit * 8);
    addUnique((data ?? []) as Product[]);
  }

  // 2. Fill remaining from same category (different collection is fine here)
  if (results.length < limit) {
    const { data } = await supabaseAnon
      .from('products')
      .select(COLS)
      .filter('categories', 'cs', JSON.stringify([category]))
      .eq('is_active', true)
      .neq('slug', currentSlug)
      .limit(limit * 8);
    addUnique((data ?? []) as Product[]);
  }

  return results.slice(0, limit);
}

/**
 * Derive a filter slug from the display collection name using the
 * page's collections list (e.g. "Norme de Danhov" → "norme").
 */
export function collectionToSlug(
  displayName: string | null,
  collections: { label: string; value: string }[]
): string | null {
  if (!displayName) return null;
  const lower = displayName.toLowerCase();
  return (
    collections.find((c) => c.label.toLowerCase() === lower)?.value ?? null
  );
}

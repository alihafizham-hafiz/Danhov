import { supabaseAnon } from '@/lib/supabase/anon';
import { withLocalProductImages, withLocalProductImageList } from '@/lib/local-product-images';

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  collection: string | null;
  category: string;
  categories: string[];
  metals: string[];
  default_metal: string | null;
  images: string[];
  metal_images: Record<string, string[]> | null;
  price_display: string | null;
  price_computed?: number;
  sub_categories: string[];
  is_active: boolean;
};

const COLS = 'id, sku, slug, name, collection, category, categories, metals, default_metal, images, metal_images, price_display, sub_categories, is_active';

export const fetchAllActiveProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabaseAnon
    .from('products')
    .select(COLS)
    .eq('is_active', true)
    .order('sku', { ascending: true });
  if (error) { console.error('fetchAllActiveProducts error:', error); return []; }
  return withLocalProductImageList((data ?? []) as Product[]);
};

export const fetchAllActiveProductSlugs = async (): Promise<{ slug: string }[]> => {
  const { data, error } = await supabaseAnon
    .from('products')
    .select('slug')
    .eq('is_active', true)
    .order('slug', { ascending: true });
  if (error) { console.error('fetchAllActiveProductSlugs error:', error); return []; }
  return (data ?? []) as { slug: string }[];
};

export const fetchProductsByCategory = async (category: string, limit?: number): Promise<Product[]> => {
  let query = supabaseAnon
    .from('products')
    .select(COLS)
    .filter('categories', 'cs', JSON.stringify([category]))
    .eq('is_active', true)
    .order('sku', { ascending: true });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) { console.error('fetchProductsByCategory error:', error); return []; }
  return withLocalProductImageList((data ?? []) as Product[]);
};

export const fetchProductSlugsByCategory = async (category: string): Promise<{ slug: string }[]> => {
  const { data, error } = await supabaseAnon
    .from('products')
    .select('slug')
    .filter('categories', 'cs', JSON.stringify([category]))
    .eq('is_active', true)
    .order('slug', { ascending: true });
  if (error) { console.error('fetchProductSlugsByCategory error:', error); return []; }
  return (data ?? []) as { slug: string }[];
};

// Collection slug → database display name
const COLLECTION_SLUG_TO_NAME: Record<string, string> = {
  abbraccio:  'Abbraccio',
  voltaggio:  'Voltaggio',
  classico:   'Classico',
  norme:      'Norme de DANHOV',
  carezza:    'Carezza',
  'per-lei':  'Per Lei',
  petalo:     'Petalo',
  solo:       'Solo Filo',
  eleganza:   'Eleganza',
  couture:    'Couture',
  unito:      'Unito',
};

export const fetchProductsByCollection = async (collectionSlug: string): Promise<Product[]> => {
  const collectionName = COLLECTION_SLUG_TO_NAME[collectionSlug] ?? collectionSlug;
  const { data, error } = await supabaseAnon
    .from('products')
    .select(COLS)
    .ilike('collection', collectionName)
    .eq('is_active', true)
    .order('sku', { ascending: true });
  if (error) { console.error('fetchProductsByCollection error:', error); return []; }
  return withLocalProductImageList((data ?? []) as Product[]);
};

export const fetchProductBySlug = async (slug: string): Promise<Product | null> => {
  const { data, error } = await supabaseAnon
    .from('products')
    .select(COLS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) { console.error('fetchProductBySlug error:', error); return null; }
  return data ? withLocalProductImages(data as Product) : null;
};

export type ProductWithPricing = Product & {
  default_metal: string | null;
  gold_weight_g: number | null;
  markup_multiplier: number | null;
  base_labor_usd: number | null;
  casting_labor_per_gram: number | null;
  custom_labor_usd: number | null;
  stones_value_usd: number | null;
  stone_groups: import('@/lib/stone-math').StoneGroup[] | null;
  commission_rate: number | null;
  centre_diamond_group: import('@/lib/stone-math').StoneGroup | null;
};

// Removed 'diamond_labor_usd' and 'labor_extras' since they don't exist in your table columns
const PRICING_COLS =
  'id, sku, slug, name, collection, category, categories, metals, default_metal, images, metal_images, price_display, sub_categories, is_active, gold_weight_g, markup_multiplier, base_labor_usd, casting_labor_per_gram, custom_labor_usd, stones_value_usd, stone_groups, commission_rate, centre_diamond_group';
export const fetchProductsWithPricingByCategory = async (category: string): Promise<ProductWithPricing[]> => {
  const { data, error } = await supabaseAnon
    .from('products')
    .select(PRICING_COLS)
    .filter('categories', 'cs', JSON.stringify([category]))
    .eq('is_active', true)
    .order('sku', { ascending: true });
  if (error) { console.error('fetchProductsWithPricingByCategory error:', error); return []; }
  return withLocalProductImageList((data ?? []) as ProductWithPricing[]);
};

export const fetchProductsWithPricingByCollection = async (collectionSlug: string): Promise<ProductWithPricing[]> => {
  const collectionName = COLLECTION_SLUG_TO_NAME[collectionSlug] ?? collectionSlug;
  const { data, error } = await supabaseAnon
    .from('products')
    .select(PRICING_COLS)
    .ilike('collection', collectionName)
    .eq('is_active', true)
    .order('sku', { ascending: true });
  if (error) { console.error('fetchProductsWithPricingByCollection error:', error); return []; }
  return withLocalProductImageList((data ?? []) as ProductWithPricing[]);
};

export const fetchProductWithPricingBySlug = async (slug: string): Promise<ProductWithPricing | null> => {
  const { data, error } = await supabaseAnon
    .from('products')
    .select(PRICING_COLS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) { console.error('fetchProductWithPricingBySlug error:', error); return null; }
  return data ? withLocalProductImages(data as ProductWithPricing) : null;
};

export const fetchRelatedProducts = async (currentSlug: string, collection: string | null, category: string, limit = 4): Promise<Product[]> => {
  const results: Product[] = [];
  const seenSlugs = new Set([currentSlug]);
  const seenBaseSkus = new Set<string>();

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

  if (collection) {
    const { data } = await supabaseAnon.from('products').select(COLS).ilike('collection', collection).eq('is_active', true).neq('slug', currentSlug).limit(limit * 8);
    addUnique(withLocalProductImageList((data ?? []) as Product[]));
  }
  if (results.length < limit) {
    const { data } = await supabaseAnon.from('products').select(COLS).filter('categories', 'cs', JSON.stringify([category])).eq('is_active', true).neq('slug', currentSlug).limit(limit * 8);
    addUnique(withLocalProductImageList((data ?? []) as Product[]));
  }
  return results.slice(0, limit);
};

function baseDesignSku(sku: string | null | undefined): string {
  if (!sku) return `__no_sku__${Math.random()}`;
  return sku.replace(/-\d*[a-z]+$/i, '').toLowerCase();
}

export function collectionToSlug(displayName: string | null, collections: { label: string; value: string }[]): string | null {
  if (!displayName) return null;
  const lower = displayName.toLowerCase();
  return collections.find((c) => c.label.toLowerCase() === lower)?.value ?? null;
}


// navbar 

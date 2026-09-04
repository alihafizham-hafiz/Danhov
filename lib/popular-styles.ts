import { localProductImageEntry, resolveProductImage } from '@/lib/local-product-images';
import type { Product } from '@/lib/products';

export type PopularStyleProductRow = {
  id?: string;
  sku?: string;
  slug?: string | null;
  name?: string | null;
  collection?: string | null;
  price_display?: string | null;
  images?: string[] | null;
  category?: string | null;
  default_metal?: string | null;
  metals?: string[] | string | null;
  metal_images?: Record<string, string[]> | string | null;
  description?: string | null;
  is_active?: boolean;
  [key: string]: unknown;
};

export type PopularStyleProductItem = {
  id: string;
  name: string;
  collection: string;
  price?: string;
  image: string;
  href: string;
  slug?: string;
  product?: Product;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=80';

export function normalizePopularStyleProducts(rows: PopularStyleProductRow[] = []): PopularStyleProductItem[] {
  const usedImages = new Set<string>();

  const mapped = rows
    .filter((row) => row?.name)
    .slice(0, 8)
    .map((row) => {
      const manifestImages = localProductImageEntry(row.sku)?.images ?? [];
      const candidates = [...manifestImages, ...(row.images ?? [])].filter(Boolean);
      const image = candidates.find((candidate) => !usedImages.has(candidate))
        ?? resolveProductImage(row.sku, row.images)
        ?? FALLBACK_IMAGE;
      usedImages.add(image);

      return {
        id: String(row.id ?? row.sku ?? row.slug ?? Math.random()),
        name: row.name as string,
        collection: row.collection || 'DANHOV',
        price: row.price_display ?? undefined,
        image,
        href: row.slug ? `/product/${row.slug}` : '/fine-jewelry',
        slug: row.slug ?? undefined,
        product: row as Product,
      };
    });

  return mapped.length ? mapped : [];
}

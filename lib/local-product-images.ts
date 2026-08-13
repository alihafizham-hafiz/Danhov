import imageManifest from '@/data/product-image-manifest.json';
import type { Product, ProductWithPricing } from '@/lib/products';

type ManifestEntry = {
  images?: string[];
  metal_images?: Record<string, string[]>;
};

type Manifest = Record<string, ManifestEntry>;

const manifest = imageManifest as Manifest;
const METAL_SUFFIX_RE = /-(?:14|18)?[A-Z]+$/i;
const LEGACY_DANHOV_MEDIA_RE = /^https?:\/\/(?:www\.)?danhov\.com\/media\/catalog\//i;
const SKU_IMAGE_ALIASES: Record<string, string> = {
  // Current catalog SKUs replaced the legacy one-letter Tubetto suffixes.
  TB101UA: 'TB101-A',
  TB101UH: 'TB101-H',
};

function baseSku(sku: string | null | undefined): string {
  return String(sku ?? '').replace(METAL_SUFFIX_RE, '').toUpperCase();
}

function manifestEntryForSku(sku: string): ManifestEntry | null {
  const normalized = sku.toUpperCase();
  return manifest[normalized]
    ?? manifest[SKU_IMAGE_ALIASES[normalized]]
    ?? manifest[baseSku(normalized)]
    ?? null;
}

export function localProductImageEntry(sku: string | null | undefined): ManifestEntry | null {
  return sku ? manifestEntryForSku(sku) : null;
}

function firstManifestImageList(entry: ManifestEntry | null): string[] | null {
  if (entry?.images?.length) return entry.images;

  const firstMetalImages = Object.values(entry?.metal_images ?? {}).find((urls) => urls.length > 0);
  return firstMetalImages?.length ? firstMetalImages : null;
}

function dropLegacyDanhovMedia(urls: string[] | null | undefined): string[] {
  return (urls ?? []).filter((url) => !LEGACY_DANHOV_MEDIA_RE.test(url));
}

export function firstLocalProductImage(sku: string | null | undefined): string | null {
  return firstManifestImageList(localProductImageEntry(sku))?.[0] ?? null;
}

export function resolveProductImage(
  sku: string | null | undefined,
  fallbackImages: string[] | null | undefined,
): string | null {
  return firstLocalProductImage(sku) ?? dropLegacyDanhovMedia(fallbackImages)[0] ?? null;
}

function mergeMetalImages(
  productMetalImages: Record<string, string[]> | null | undefined,
  localMetalImages: Record<string, string[]> | undefined,
): Record<string, string[]> | null {
  const merged: Record<string, string[]> = {};

  for (const [key, urls] of Object.entries(productMetalImages ?? {})) {
    if (Array.isArray(urls) && urls.length > 0) merged[key] = urls;
  }
  for (const [key, urls] of Object.entries(localMetalImages ?? {})) {
    if (Array.isArray(urls) && urls.length > 0) merged[key] = urls;
  }

  return Object.keys(merged).length > 0 ? merged : productMetalImages ?? null;
}

export function withLocalProductImages<T extends Product | ProductWithPricing>(product: T): T {
  const entry = manifestEntryForSku(product.sku);
  const fallbackImages = dropLegacyDanhovMedia(product.images);
  if (!entry) {
    return fallbackImages === product.images ? product : { ...product, images: fallbackImages };
  }

  const localImages = firstManifestImageList(entry);

  return {
    ...product,
    images: localImages?.length ? localImages : fallbackImages,
    metal_images: mergeMetalImages(product.metal_images, entry.metal_images),
  };
}

export function withLocalProductImageList<T extends Product | ProductWithPricing>(products: T[]): T[] {
  return products.map(withLocalProductImages);
}

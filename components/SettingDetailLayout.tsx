'use client';

import { useState } from 'react';
import SettingGallery from '@/components/SettingGallery';
import SettingDetailClient from '@/components/SettingDetailClient';
import { requiresCenterStone } from '@/lib/product-purchase-mode';

interface ProductInfo {
  slug: string;
  sku: string;
  name: string;
  collection: string | null;
  metals: string[];
  price_display: string | null;
  centre_diamond_group?: { count?: number | null } | null;
}

interface Props {
  product: ProductInfo;
  pricemap?: Record<string, number>;
  defaultMetal: string | null;
  images: string[];
  metalImages: Record<string, string[]>;
  diamondId?: string;
  diamondsParam?: string | null;
}

function normaliseMetalKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const karat = value.match(/\b(14|18)\s*k\b/)?.[1];
  const isRose = value.includes('rose') || value.includes('pink');
  const isWhite = value.includes('white');
  const isYellow = value.includes('yellow') || (!isRose && !isWhite && value.includes('gold'));
  const isPlatinum = value.includes('plat');

  if (isPlatinum) return 'platinum';
  if (karat && isRose) return `${karat}k_rose`;
  if (karat && isWhite) return `${karat}k_white`;
  if (karat && isYellow) return `${karat}k_yellow`;
  return null;
}

export default function SettingDetailLayout({ product, pricemap, defaultMetal, images, metalImages, diamondId, diamondsParam }: Props) {
  const normalisedMetalImages: Record<string, string[]> = {};
  for (const [key, imgs] of Object.entries(metalImages ?? {})) {
    const metalKey = normaliseMetalKey(key);
    if (metalKey && imgs.length > 0) normalisedMetalImages[metalKey] = imgs;
  }
  const defaultMetalKey = normaliseMetalKey(defaultMetal);
  if (defaultMetalKey && images.length > 0 && !(normalisedMetalImages[defaultMetalKey]?.length)) {
    normalisedMetalImages[defaultMetalKey] = images;
  }
  const availableMetals = ['platinum', '14k_white', '18k_white', '14k_yellow', '18k_yellow', '14k_rose', '18k_rose']
    .filter((key) => (normalisedMetalImages[key]?.length ?? 0) > 0);
  const initialMetal = defaultMetalKey && availableMetals.includes(defaultMetalKey)
    ? defaultMetalKey
    : availableMetals[0] ?? '';
  const [metal, setMetal] = useState(initialMetal);

  // Use metal-specific images when available, fall back to default product images
  const activeImages =
    metal && normalisedMetalImages[metal] && normalisedMetalImages[metal].length > 0
      ? normalisedMetalImages[metal]
      : images;

  return (
    <div className="sd-layout">
      <SettingGallery images={activeImages} name={product.name} />
      <SettingDetailClient
        product={{ ...product, metals: availableMetals }}
        pricemap={pricemap}
        metal={metal}
        onMetalChange={setMetal}
        diamondId={diamondId}
        diamondsParam={diamondsParam}
        requiresCenterStone={requiresCenterStone(product.centre_diamond_group)}
      />
    </div>
  );
}

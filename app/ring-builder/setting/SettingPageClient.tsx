'use client';

import ListingPage from '@/components/ListingPage';
import type { Product } from '@/lib/products';
import CollectionsSlider, { type CollectionCard } from '@/components/CollectionsSlider';

const COLLECTIONS = [
  { label: 'Abbraccio',       value: 'abbraccio' },
  { label: 'Voltaggio',       value: 'voltaggio' },
  { label: 'Classico',        value: 'classico' },
  { label: 'Norme de DANHOV', value: 'norme' },
  { label: 'Carezza',         value: 'carezza' },
  { label: 'Per Lei',         value: 'per-lei' },
  { label: 'Petalo',          value: 'petalo' },
  { label: 'Solo Filo',       value: 'solo' },
  { label: 'Eleganza',        value: 'eleganza' },
  { label: 'Couture',         value: 'couture' },
  { label: 'Unito',           value: 'unito' },
];

interface Props {
  products: Product[];
  dSuffix: string;
  hasDiamond: boolean;
}

export default function SettingPageClient({ products, dSuffix, hasDiamond }: Props) {
  const sliderCards: CollectionCard[] = products.slice(0, 12).map((product) => {
    const images = Array.isArray(product.images)
      ? product.images
      : (() => {
          try {
            const parsed = JSON.parse(product.images);
            return Array.isArray(parsed) ? parsed : [product.images];
          } catch {
            return [product.images];
          }
        })();

    return {
      img: images[0] || '/images/placeholder-product.jpg',
      collection: product.collection || 'DANHOV',
      title: product.name,
      desc: 'Handcrafted in Los Angeles.',
      href: `/ring-builder/setting/${product.slug}${dSuffix}`,
    };
  });

  return (
    <>
      {sliderCards.length > 0 && <CollectionsSlider cards={sliderCards} />}
      <ListingPage
        category="engagement"
        title="Choose Your Setting"
        subtitle={
          hasDiamond
            ? 'Your diamond is ready — now find its home.'
            : 'Every DANHOV setting is handcrafted in Los Angeles.'
        }
        collections={COLLECTIONS}
        showMetalFilter
        aiPrompt="I'm in the ring builder choosing a setting. Can you help me pick one for my style?"
        philosophyStripe={{
          quote: '"Every ring is a <span>living geometry</span> — an eternal circle holding the infinite story of two souls becoming one."',
        }}
        products={products}
        initialCollection="all"
        cardHref={(slug) => `/ring-builder/setting/${slug}${dSuffix}`}
        showWishlist={false}
        showLifePathTeaser={false}
      />
    </>
  );
}

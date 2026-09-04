import type { Metadata } from 'next';
import ListingPage from '@/components/ListingPage';
import ListingSchema from '@/components/ListingSchema';
import PageBlocks from '@/components/PageBlocks';
import { 
  fetchProductsWithPricingByCategory, 
  fetchProductsWithPricingByCollection 
} from '@/lib/products';
import { computeListingPriceMap } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Engagement Rings · Handcrafted Spiral Settings',
  description:
    'Engagement rings handcrafted in Los Angeles since 1984 — Abbraccio swirl settings, Voltaggio tension designs, Classico solitaires, Per Lei florals, and more. 14k or 18k gold. Lifetime warranty.',
  alternates: {
    canonical: '/engagement-rings',
  },
};

export const revalidate = 300;

const COLLECTIONS = [
  { label: 'Abbraccio', value: 'abbraccio' },
  { label: 'Voltaggio', value: 'voltaggio' },
  { label: 'Classico', value: 'classico' },
  { label: 'Norme de DANHOV', value: 'norme' },
  { label: 'Carezza', value: 'carezza' },
  { label: 'Per Lei', value: 'per-lei' },
  { label: 'Petalo', value: 'petalo' },
  { label: 'Solo Filo', value: 'solo' },
  { label: 'Eleganza', value: 'eleganza' },
  { label: 'Couture', value: 'couture' },
  { label: 'Unito', value: 'unito' },
];

type PageProps = {
  searchParams: Promise<{ collection?: string }>;
};

export default async function EngagementRingsPage({ searchParams }: PageProps) {
  const DB_CATEGORY = 'engagement';
  const resolvedParams = await searchParams;
  const selectedCollectionSlug = resolvedParams?.collection;

  let rawProducts;
  if (selectedCollectionSlug) {
    rawProducts = await fetchProductsWithPricingByCollection(selectedCollectionSlug);
  } else {
    rawProducts = await fetchProductsWithPricingByCategory(DB_CATEGORY);
  }

  const priceMap = await computeListingPriceMap(rawProducts);

  const products = rawProducts.map((product) => ({
    ...product,
    price_computed: priceMap[product.sku],
  }));

  return (
    <>
      <ListingSchema
        category="engagement"
        title="Engagement Rings"
      />

      <ListingPage
        category={DB_CATEGORY}
        title="Engagement Rings"
        subtitle="Sacred geometry. Eternal love."
        collections={COLLECTIONS}
        showMetalFilter
        aiPrompt="I'm browsing engagement rings and could use help finding the right style for me."
        philosophyStripe={{
          quote:
            '"Every ring is a <span>living geometry</span> — an eternal circle holding the infinite story of two souls becoming one."',
        }}
        products={products as any}
      />

      {/* <PageBlocks pageSlug="engagement-rings" /> */}
    </>
  );
}
import type { Metadata } from 'next';
import ListingPage from '@/components/ListingPage';
import ListingSchema from '@/components/ListingSchema';
import PageBlocks from '@/components/PageBlocks';
import { fetchProductsWithPricingByCategory } from '@/lib/products';
import { computeListingPriceMap } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Fine Jewelry · Pendants, Earrings, Bracelets & Rings',
  description:
    'Fine jewelry handcrafted in Los Angeles — pendants, earrings, bracelets, bands, and rings. Every piece in 14k or 18k gold, made to order. Lifetime craftsmanship warranty.',
  alternates: { canonical: '/fine-jewelry' },
};

export const revalidate = 300;

const COLLECTIONS = [
  { label: 'Earrings', value: 'earrings' },
  { label: 'Pendants', value: 'pendants' },
  { label: 'Rings', value: 'rings' },
  { label: 'Bands', value: 'bands' },
  { label: 'Limited Edition', value: 'limited' },
];

export default async function FineJewelryPage() {
  const DB_CATEGORY = 'fine';
  const rawProducts = await fetchProductsWithPricingByCategory(DB_CATEGORY);
  const priceMap = await computeListingPriceMap(rawProducts);
  const products = rawProducts.map(p => ({ ...p, price_computed: priceMap[p.sku] }));
  return (
    <>
      <ListingSchema category="fine" title="Fine Jewelry" />
      <ListingPage
      category={DB_CATEGORY}
      title="Fine Jewelry"
      subtitle="Every piece, a sacred story."
      collections={COLLECTIONS}
      showMetalFilter={false}
      aiPrompt="I'm exploring fine jewelry and could use some advice on finding the perfect piece."
      philosophyStripe={{
        quote:
          '“Every piece is a <span>living poem</span> — shaped by hand, held by light, worn as a sacred promise.”',
      }}
      products={products}
    />
    <PageBlocks pageSlug="fine-jewelry" />
    </>
  );
}

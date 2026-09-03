import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListingPage from '@/components/ListingPage';
import ListingSchema from '@/components/ListingSchema';
import PageBlocks from '@/components/PageBlocks';
import { fetchProductsWithPricingByCategory } from '@/lib/products';
import { computeListingPriceMap } from '@/lib/pricing';
import { MENS_ENABLED } from '@/lib/feature-flags';

export const metadata: Metadata = {
  title: "Men's Jewelry · Rings, Bracelets & Necklaces",
  description:
    "Men's jewelry handcrafted in Los Angeles — signet rings, bracelets, necklaces, and pendants in 14k or 18k gold. Made to order with a lifetime warranty.",
  alternates: { canonical: '/mens' },
};

export const revalidate = 300;

export default async function MensPage() {
  if (!MENS_ENABLED) notFound();

  const DB_CATEGORY = 'mens';
  const rawProducts = await fetchProductsWithPricingByCategory(DB_CATEGORY);
  const priceMap = await computeListingPriceMap(rawProducts);
  const products = rawProducts.map(p => ({ ...p, price_computed: priceMap[p.sku] }));
  return (
    <>
      <ListingSchema category="mens" title="Men's Jewelry" />
      <ListingPage
      category={DB_CATEGORY}
      title="Men's Jewelry"
      subtitle="Strength. Refined."
      showMetalFilter={false}
      aiPrompt="I'm looking at men's jewelry from DANHOV. Can you help me find something that suits me?"
      philosophyStripe={{
        quote:
          'Every piece is <span>handcrafted in Los Angeles</span> — designed for the man who understands that true strength is quiet, and true luxury endures.',
      }}
      products={products}
    />
    <PageBlocks pageSlug="mens" />
    </>
  );
}

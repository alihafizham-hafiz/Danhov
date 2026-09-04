import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListingPage from '@/components/ListingPage';
import { fetchProductsWithPricingByCollection } from '@/lib/products';
import { computeListingPriceMap } from '@/lib/pricing';

// ── Collection registry ───────────────────────────────────────────────────
// Each entry defines the page title, eyebrow (meaning), subtitle, and the
// AI advisor opening message. These are displayed as a proper collection
// landing page regardless of which product categories the pieces belong to.
const COLLECTION_META: Record<string, {
  displayName: string;
  meaning: string;
  subtitle: string;
  aiPrompt: string;
}> = {
  abbraccio: {
    displayName: 'Abbraccio',
    meaning: 'The Embrace',
    subtitle: 'DANHOV\'s most iconic swirl settings — the stone held in a spiral embrace of gold.',
    aiPrompt: "I'm exploring the Abbraccio collection — DANHOV's signature swirl embrace settings. Can you help me find the right piece for me?",
  },
  voltaggio: {
    displayName: 'Voltaggio',
    meaning: 'The Voltage',
    subtitle: 'Tension-set designs where the diamond is suspended by the pure energy of the ring itself.',
    aiPrompt: "I'm drawn to Voltaggio — the tension-set collection where the stone floats in the ring's energy. What should I know before choosing one?",
  },
  classico: {
    displayName: 'Classico',
    meaning: 'The Classic',
    subtitle: 'Timeless solitaire profiles refined over four decades of master craftsmanship in Los Angeles.',
    aiPrompt: "I love the Classico collection's timeless solitaires. Help me find my ideal setting — I want something that will look beautiful forever.",
  },
  norme: {
    displayName: 'Norme de DANHOV',
    meaning: 'The Standard',
    subtitle: 'Foundational forms that define DANHOV\'s benchmark for excellence in gold work.',
    aiPrompt: "I'm exploring Norme de DANHOV — the foundational forms. Can you explain what sets these apart and help me find the right piece?",
  },
  carezza: {
    displayName: 'Carezza',
    meaning: 'The Caress',
    subtitle: 'Delicate pavé and micro-setting work — softness woven into gold, touch made permanent.',
    aiPrompt: "The Carezza collection's delicate pavé work caught my attention. Help me find the right style and understand my options for customization.",
  },
  'per-lei': {
    displayName: 'Per Lei',
    meaning: 'For Her',
    subtitle: 'Floral forms and feminine geometries — each piece created in devotion for singular women.',
    aiPrompt: "I'm drawn to the Per Lei / U Collection — the floral, feminine designs. I'd love to understand the meaning behind the U shape and find the right piece.",
  },
  petalo: {
    displayName: 'Petalo',
    meaning: 'The Petal',
    subtitle: 'Nature\'s most perfect architecture — organic petal forms blooming in 14k and 18k gold.',
    aiPrompt: "The Petalo collection's petal forms are beautiful. Help me choose the right size, metal, and setting for my lifestyle.",
  },
  solo: {
    displayName: 'Solo Filo',
    meaning: 'Single Thread',
    subtitle: 'A single continuous thread of gold — minimal, essential, unbroken as a promise.',
    aiPrompt: "Solo Filo's single continuous thread of gold speaks to me. What customization options are available and how does the thread design wear over time?",
  },
  eleganza: {
    displayName: 'Eleganza',
    meaning: 'The Elegance',
    subtitle: 'Refined simplicity. Designs that speak through restraint and perfection of proportion.',
    aiPrompt: "I want refined simplicity — help me explore the Eleganza collection and find a piece that feels effortless and timeless.",
  },
  couture: {
    displayName: 'Couture',
    meaning: 'The Sovereign',
    subtitle: 'Statement pieces with presence. Worn not to become — but to declare what already is.',
    aiPrompt: "I'm looking for a statement piece from the Couture collection. Help me understand what's available and what makes these pieces different.",
  },
  unito: {
    displayName: 'Unito',
    meaning: 'United',
    subtitle: 'Two forms joined as one. For love that is both distinct and inseparable.',
    aiPrompt: "The Unito collection — two forms joined as one — speaks to me. What options are available and how are these pieces made?",
  },
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const meta = COLLECTION_META[params.slug];
  if (!meta) return {};
  return {
    title: `${meta.displayName} · ${meta.meaning} · DANHOV`,
    description: `${meta.subtitle} Handcrafted in Los Angeles since 1984.`,
    alternates: { canonical: `/collection/${params.slug}` },
  };
}

export const revalidate = 300;

export default async function CollectionPage({
  params,
}: {
  params: { slug: string };
}) {
  const meta = COLLECTION_META[params.slug];
  if (!meta) return notFound();

  const rawProducts = await fetchProductsWithPricingByCollection(params.slug);
  const priceMap = await computeListingPriceMap(rawProducts);
  const products = rawProducts.map(p => ({ ...p, price_computed: priceMap[p.sku] }));

  return (
    <ListingPage
      category="collection"
      title={meta.displayName}
      subtitle={meta.subtitle}
      eyebrow={meta.meaning}
      showMetalFilter
      aiPrompt={meta.aiPrompt}
      products={products}
    />
  );
}

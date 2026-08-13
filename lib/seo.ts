/**
 * SEO + structured-data helpers.
 *
 * Each builder returns a plain JSON-LD object — embed it in a page via
 * <script type="application/ld+json" dangerouslySetInnerHTML={{ __html:
 * JSON.stringify(buildXyz(...)) }} />.
 */

import type { Product as DanhovProduct } from '@/lib/products';

function normalizeSiteUrl(value: string | undefined): string {
  const cleaned = value
    ?.replace(/\\r|\\n/g, '')
    .replace(/[\r\n\t ]+/g, '')
    .replace(/\/+$/, '');

  if (!cleaned) return 'https://danhov.com';

  try {
    const url = new URL(cleaned);
    return url.origin;
  } catch {
    return 'https://danhov.com';
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const BRAND = {
  name: 'DANHOV',
  legalName: 'DANHOV Fine Jewelry',
  tagline: 'Handcrafted Luxury Jewelry · Est. 1984',
  founder: 'Jack Hovsepian',
  founded: '1984',
  city: 'Los Angeles',
  region: 'CA',
  country: 'US',
  phone: process.env.NEXT_PUBLIC_PHONE_TEL || '+14244214072',
  email: 'care@danhov.com',
  logo: `${SITE_URL}/danhov-logo-transparent.png`,
};

// ── Organization ─────────────────────────────────────────────────────────
export function buildOrganization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    alternateName: BRAND.legalName,
    url: SITE_URL,
    logo: BRAND.logo,
    foundingDate: BRAND.founded,
    founder: { '@type': 'Person', name: BRAND.founder },
    description:
      'DANHOV is a luxury handcrafted jewelry house founded in 1984 in Los Angeles. Every piece is made to order in 14k or 18k gold.',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: BRAND.phone,
        email: BRAND.email,
        areaServed: 'Worldwide',
        availableLanguage: ['English'],
      },
    ],
    sameAs: [
      'https://www.instagram.com/danhov',
      'https://www.pinterest.com/danhov',
      'https://www.danhov.com',
    ],
  };
}

// ── LocalBusiness ────────────────────────────────────────────────────────
export function buildLocalBusiness() {
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: BRAND.name,
    image: BRAND.logo,
    url: SITE_URL,
    telephone: BRAND.phone,
    email: BRAND.email,
    priceRange: '$$$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: BRAND.city,
      addressRegion: BRAND.region,
      addressCountry: BRAND.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 34.0522,
      longitude: -118.2437,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '10:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '11:00',
        closes: '17:00',
      },
    ],
    paymentAccepted: ['Credit Card', 'Bank Transfer'],
    currenciesAccepted: 'USD',
  };
}

// ── WebSite (with sitelinks search box) ──────────────────────────────────
export function buildWebSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL,
    name: BRAND.name,
    publisher: { '@type': 'Organization', name: BRAND.name, url: SITE_URL },
  };
}

// ── BreadcrumbList ───────────────────────────────────────────────────────
export function buildBreadcrumb(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

// ── Product ──────────────────────────────────────────────────────────────
export function buildProduct(
  product: DanhovProduct,
  priceUsd: number,
  description: string
) {
  const url = `${SITE_URL}/product/${product.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    sku: product.sku,
    mpn: product.sku,
    image: product.images?.[0] ? [product.images[0]] : undefined,
    brand: { '@type': 'Brand', name: BRAND.name },
    category: humanizeCategory(product.category),
    material: product.metals?.join(', '),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: priceUsd.toFixed(2),
      availability: 'https://schema.org/MadeToOrder',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: BRAND.name },
      priceValidUntil: oneMonthFromNow(),
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Handmade in',
        value: 'Los Angeles, California',
      },
      {
        '@type': 'PropertyValue',
        name: 'Warranty',
        value: 'Lifetime craftsmanship warranty',
      },
    ],
  };
}

// ── FAQ Page ─────────────────────────────────────────────────────────────
export function buildFAQ(items: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

function humanizeCategory(slug: string): string {
  switch (slug) {
    case 'engagement':
      return 'Engagement Rings';
    case 'wedding':
      return 'Wedding Bands';
    case 'fine':
      return 'Fine Jewelry';
    case 'mens':
      return "Men's Jewelry";
    default:
      return slug;
  }
}

function oneMonthFromNow(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

// ── Helpers for inline use ───────────────────────────────────────────────
export function jsonLdScript(obj: unknown): {
  __html: string;
} {
  return { __html: JSON.stringify(obj) };
}

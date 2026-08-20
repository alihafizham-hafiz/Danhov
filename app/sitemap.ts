import type { MetadataRoute } from 'next';
import { supabaseAnon } from '@/lib/supabase/anon';
import { SITE_URL } from '@/lib/seo';
import { MENS_ENABLED } from '@/lib/feature-flags';

export const revalidate = 3600; // re-build hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/engagement-rings`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/wedding-bands`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/fine-jewelry`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...(MENS_ENABLED ? [{ url: `${SITE_URL}/mens`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 }] : []),
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const { data: products } = await supabaseAnon
    .from('products')
    .select('slug')
    .eq('is_active', true);

  const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${SITE_URL}/product/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticUrls, ...productUrls];
}

/**
 * Editable site content.
 *
 * Every editable string in the public site has a `key` (e.g.
 * "homepage.hero.eyebrow"), a `category` (which page it belongs to)
 * and a `default` (rendered when the DB row doesn't exist yet).
 *
 * Public pages call `getContent(key)` on the server which reads from
 * the `site_content` table. The admin Page Content editor lists every
 * key in DEFAULTS and lets the admin override the value.
 */

import { supabaseAnon } from '@/lib/supabase/anon';

export type ContentDef = {
  key: string;
  category: string;
  label: string;
  default: string;
  multiline?: boolean;
};

export const CONTENT_DEFS: ContentDef[] = [
  // Homepage
  { key: 'homepage.hero.eyebrow', category: 'Homepage', label: 'Hero eyebrow', default: 'DANHOV — Est. 1984 — The Oneness Collection' },
  { key: 'homepage.philosophy.eyebrow', category: 'Homepage', label: 'Philosophy section eyebrow', default: 'The Philosophy of Oneness' },
  { key: 'homepage.philosophy.title', category: 'Homepage', label: 'Philosophy section title', default: 'The same force that shapes galaxies, shapes love.', multiline: true },
  { key: 'homepage.philosophy.body', category: 'Homepage', label: 'Philosophy section body', default: "From the arms of the Milky Way to the vortex of water in a cup — the spiral is the universe's oldest signature. DANHOV rings carry this truth in every curve, every setting, every stone.", multiline: true },
  { key: 'homepage.appointment.title', category: 'Homepage', label: 'Appointment section title', default: 'Book a Virtual Appointment' },
  { key: 'homepage.appointment.body', category: 'Homepage', label: 'Appointment section body', default: "Meet one-to-one with a DANHOV jewelry specialist. We'll guide you through every detail — from sacred geometry to stone selection — from the comfort of your home.", multiline: true },
  { key: 'homepage.newsletter.title', category: 'Homepage', label: 'Newsletter title', default: 'Join the Oneness Circle' },
  { key: 'homepage.newsletter.sub', category: 'Homepage', label: 'Newsletter subtitle', default: 'Spiritual teachings · New collections · Exclusive events · Stories of love' },

  // Listing pages
  { key: 'engagement.subtitle', category: 'Engagement Rings', label: 'Page subtitle', default: 'Sacred geometry. Eternal love.' },
  { key: 'engagement.philosophy_quote', category: 'Engagement Rings', label: 'Philosophy stripe (HTML allowed)', default: '"Every ring is a <span>living geometry</span> — an eternal circle holding the infinite story of two souls becoming one."', multiline: true },
  { key: 'wedding.subtitle', category: 'Wedding Bands', label: 'Page subtitle', default: 'Bound. Together. Forever.' },
  { key: 'wedding.philosophy_quote', category: 'Wedding Bands', label: 'Philosophy stripe', default: 'Every band is a <span>promise made permanent</span> — handcrafted in Los Angeles, worn for a lifetime.', multiline: true },
  { key: 'fine.subtitle', category: 'Fine Jewelry', label: 'Page subtitle', default: 'Every piece, a sacred story.' },
  { key: 'fine.philosophy_quote', category: 'Fine Jewelry', label: 'Philosophy stripe', default: '"Every piece is a <span>living poem</span> — shaped by hand, held by light, worn as a sacred promise."', multiline: true },
  { key: 'mens.subtitle', category: "Men's Jewelry", label: 'Page subtitle', default: 'Strength. Refined.' },
  { key: 'mens.philosophy_quote', category: "Men's Jewelry", label: 'Philosophy stripe', default: 'Every piece is <span>handcrafted in Los Angeles</span> — designed for the man who understands that true strength is quiet, and true luxury endures.', multiline: true },

  // Contact / Footer
  { key: 'site.phone_display', category: 'Site-wide', label: 'Phone (display)', default: '(424) 421-4072' },
  { key: 'site.phone_tel', category: 'Site-wide', label: 'Phone (tel: link)', default: '+14244214072' },
  { key: 'site.email', category: 'Site-wide', label: 'Contact email', default: 'care@danhov.com' },
  { key: 'site.tagline', category: 'Site-wide', label: 'Footer tagline (HTML allowed)', default: '"Waves are the ocean."<br/>Sacred geometry. Eternal love.<br/>Handcrafted in Los Angeles since 1984.', multiline: true },
];

const DEFAULTS = new Map(CONTENT_DEFS.map((d) => [d.key, d.default]));

/**
 * Server-side getter — looks up a single key. Falls back to the default
 * if the DB doesn't have it.
 */
export async function getContent(key: string): Promise<string> {
  const { data } = await supabaseAnon
    .from('site_content')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return (data?.value as string) ?? DEFAULTS.get(key) ?? '';
}

/**
 * Server-side bulk getter (one round-trip). Returns a Map keyed by `key`.
 */
export async function getContentMap(keys: string[]): Promise<Map<string, string>> {
  const { data } = await supabaseAnon
    .from('site_content')
    .select('key, value')
    .in('key', keys);
  const map = new Map<string, string>();
  for (const k of keys) map.set(k, DEFAULTS.get(k) ?? '');
  for (const row of data ?? []) map.set(row.key as string, row.value as string);
  return map;
}

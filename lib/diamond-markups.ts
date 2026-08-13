import { createServiceClient } from '@/lib/supabase/server';
import { DIAMOND_MARKUP_DEFAULTS } from '@/lib/diamond-categories';

export { DIAMOND_MARKUP_DEFAULTS };

/**
 * Read per-category diamond markups straight from the database, merged over the
 * defaults. Read directly (not via an HTTP self-fetch) so it never depends on
 * NEXT_PUBLIC_SITE_URL and always reflects the latest admin change.
 *
 * Categories: natural, lab_grown, fancy_<color> (natural fancy),
 * lab_fancy_<color> (lab-grown fancy).
 */
export async function getDiamondMarkups(): Promise<Record<string, number>> {
  try {
    const sb = createServiceClient();
    const { data } = await sb.from('diamond_markups').select('category, multiplier');
    const markups = { ...DIAMOND_MARKUP_DEFAULTS };
    for (const row of (data ?? [])) markups[row.category as string] = Number(row.multiplier);
    return markups;
  } catch {
    return { ...DIAMOND_MARKUP_DEFAULTS };
  }
}

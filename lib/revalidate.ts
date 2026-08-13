import { revalidatePath } from 'next/cache';

/**
 * Purge the entire storefront cache so admin edits to products, diamonds,
 * pricing, collections, or content reflect on the live site immediately.
 *
 * `revalidatePath('/', 'layout')` invalidates every route that renders under
 * the root layout (product pages, category/listing pages, homepage, etc.).
 * Admin writes are infrequent, so a full purge is the safest guarantee that
 * "every change shows".
 */
export function revalidateStorefront(): void {
  try {
    revalidatePath('/', 'layout');
  } catch {
    // no-op — never let a cache purge break the admin write it follows
  }
}

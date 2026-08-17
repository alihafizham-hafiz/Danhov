import { RAW_SKU_TOKEN_TO_BASE, BASE_SKU_TO_TARGET } from '@/lib/legacy-redirects';

/**
 * Resolve a legacy SKU token (e.g. "AE507UQ-14R", "VE536P-14R-MQ") to the
 * base SKU used as the key into BASE_SKU_TO_TARGET. Tries the exact token
 * first (covers every variant actually seen in the GSC export), then falls
 * back to stripping a trailing metal/shape suffix for tokens not in that
 * exact list — new metal variants of an already-known SKU, for example.
 */
export function resolveBaseSku(token: string): string | null {
  const upper = token.toUpperCase();
  if (RAW_SKU_TOKEN_TO_BASE[upper]) return RAW_SKU_TOKEN_TO_BASE[upper];
  if (BASE_SKU_TO_TARGET[upper]) return upper;

  // Strip up to two trailing "-XXX" suffix segments (metal code, then
  // center-stone-shape code) and retry each step.
  let candidate = upper;
  for (let i = 0; i < 2; i++) {
    const stripped = candidate.replace(/-[A-Z0-9]{1,6}$/, '');
    if (stripped === candidate) break;
    candidate = stripped;
    if (BASE_SKU_TO_TARGET[candidate]) return candidate;
    if (RAW_SKU_TOKEN_TO_BASE[candidate]) return RAW_SKU_TOKEN_TO_BASE[candidate];
  }
  return null;
}

/**
 * Legacy Magento URLs indexed by Google that now 404 on this site — see
 * lib/legacy-redirects.ts for where this data comes from. Returns a
 * redirect destination, or null if this isn't a legacy URL we recognize.
 *
 * Old ring-builder setting URLs always resolve to *something* — either the
 * matched product, or the generic /ring-builder start page for SKUs that no
 * longer exist in the catalog — since a discontinued setting is still the
 * same functional area (choosing a setting), not a dead end.
 */
export function resolveLegacyRedirect(pathname: string): string | null {
  if (pathname === '/home') return '/';

  // Old ring-builder setting URLs: /ringbuilder/index/settingPost/sku/<TOKEN>/...
  const rb = pathname.match(/^\/ringbuilder\/index\/settingPost\/sku\/([^/]+)/i);
  if (rb) {
    const base = resolveBaseSku(rb[1]);
    const target = base ? BASE_SKU_TO_TARGET[base] : undefined;
    return target ?? '/ring-builder';
  }

  // Old direct product-slug URLs: /danhov-<name>-<sku>[-<metal>]
  if (pathname.startsWith('/danhov-')) {
    const lastSegment = pathname.split('/').pop() ?? '';
    // Try progressively shorter trailing token groups against the SKU maps
    // (the SKU could be the last 1, 2, or 3 hyphen-separated chunks).
    const parts = lastSegment.split('-');
    for (let take = 3; take >= 1; take--) {
      if (parts.length < take) continue;
      const candidate = parts.slice(-take).join('-');
      const base = resolveBaseSku(candidate);
      const target = base ? BASE_SKU_TO_TARGET[base] : undefined;
      if (target) return target;
    }
  }

  return null;
}

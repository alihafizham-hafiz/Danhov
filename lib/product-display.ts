/**
 * Strips metal suffix from a product name for clean display.
 *
 * Examples:
 *   "DANHOV Abbraccio Swirl Band in 14k with Black Rhodium"          → "DANHOV Abbraccio Swirl Band"
 *   "DANHOV Per Lei Asscher Engagement Ring in 14k White Gold"        → "DANHOV Per Lei Asscher Engagement Ring"
 *   "DANHOV Abbraccio Handmade Engagement Ring in Platinum"           → "DANHOV Abbraccio Handmade Engagement Ring"
 *   "Abbraccio Engagement Ring"                                        → "Abbraccio Engagement Ring"
 */
export function stripMetalSuffix(name: string): string {
  return name
    // Strip only the metal suffix ("in 14k...", "in Platinum", etc.) — keep the descriptive name intact
    .replace(
      /\s+in\s+(14k|18k|platinum|white\s+gold|yellow\s+gold|rose\s+gold|silver|palladium).*$/i,
      ''
    )
    .trim();
}

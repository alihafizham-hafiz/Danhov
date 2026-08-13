// Client-safe diamond category definitions & pricing-key logic.
// No server imports here so it can be used in the browser (DiamondPicker) and
// on the server (markup lookups) alike.

export const FANCY_COLORS = [
  'yellow', 'pink', 'blue', 'green', 'orange', 'purple', 'brown',
  'grey', 'black', 'white', 'violet', 'red', 'chameleon',
] as const;

export type FancyColor = typeof FANCY_COLORS[number];

/** Resolve the markup category key for a stone: natural / lab_grown / fancy_* / lab_fancy_*. */
export function diamondCategoryKey(labgrown: boolean, fancyColor?: string | null): string {
  const c = fancyColor ? fancyColor.toLowerCase() : '';
  if (labgrown) return c ? `lab_fancy_${c}` : 'lab_grown';
  return c ? `fancy_${c}` : 'natural';
}

// Every markup category key the system knows about.
export const PRIMARY_CATEGORIES = ['natural', 'lab_grown'] as const;
export const NATURAL_FANCY_CATEGORIES = FANCY_COLORS.map(c => `fancy_${c}`);
export const LAB_FANCY_CATEGORIES = FANCY_COLORS.map(c => `lab_fancy_${c}`);
export const ALL_MARKUP_CATEGORIES: string[] = [
  ...PRIMARY_CATEGORIES, ...NATURAL_FANCY_CATEGORIES, ...LAB_FANCY_CATEGORIES,
];

// Fallback multipliers used only when a DB row is missing.
// Natural (colorless and fancy) = 1.25×; everything lab-grown (colorless and fancy) = 4×.
export const DIAMOND_MARKUP_DEFAULTS: Record<string, number> =
  Object.fromEntries(ALL_MARKUP_CATEGORIES.map(k => [k, k.startsWith('lab') ? 4 : 1.25]));

const COLOR_LABEL: Record<string, string> = {
  yellow: 'Yellow', pink: 'Pink', blue: 'Blue', green: 'Green', orange: 'Orange',
  purple: 'Purple', brown: 'Brown (Cognac)', grey: 'Grey', black: 'Black',
  white: 'White', violet: 'Violet', red: 'Red', chameleon: 'Chameleon',
};

const COLOR_DOT: Record<string, string> = {
  yellow: '#e9c463', pink: '#f1b7a3', blue: '#7eb8e0', green: '#8bc98e',
  orange: '#e8914a', purple: '#b089c8', brown: '#a07850', grey: '#b0aea8',
  black: '#2c2c2c', white: '#f0eeeb', violet: '#9b7fc4', red: '#c04040',
  chameleon: '#7db86c',
};

/** Human label for any category key. */
export function categoryLabel(key: string): string {
  if (key === 'natural') return 'Natural Diamonds';
  if (key === 'lab_grown') return 'Lab-Grown Diamonds';
  if (key.startsWith('lab_fancy_')) return `${COLOR_LABEL[key.slice(10)] ?? key} (Lab)`;
  if (key.startsWith('fancy_')) return `${COLOR_LABEL[key.slice(6)] ?? key} (Natural)`;
  return key;
}

/** Swatch color for any category key. */
export function categoryDot(key: string): string {
  if (key === 'natural') return '#e8e4de';
  if (key === 'lab_grown') return '#b0e0ff';
  if (key.startsWith('lab_fancy_')) return COLOR_DOT[key.slice(10)] ?? '#ccc';
  if (key.startsWith('fancy_')) return COLOR_DOT[key.slice(6)] ?? '#ccc';
  return '#ccc';
}

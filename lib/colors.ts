export const colors = {
  hireMeGreen: '#10b981',
  hireMeText: '#0a0a0a',
} as const;

/**
 * Curated palette of brand-safe accent colors, in the spirit of the
 * `#8b5cf6` accent used in `ProjectOverviewCard`. Used as a fallback panel
 * background for projects that don't have a cover image.
 */
export const projectColorPalette: string[] = [
  '#8b5cf6', // violet
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#0ea5e9', // sky
  '#14b8a6', // teal
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
];

/** Returns a random color from the curated palette. */
export function pickRandomColor(): string {
  const index = Math.floor(Math.random() * projectColorPalette.length);
  return projectColorPalette[index];
}

/**
 * Deterministically hashes a project id to a palette entry, so the same id
 * always maps to the same color.
 */
export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash += id.charCodeAt(i);
  }
  const index = hash % projectColorPalette.length;
  return projectColorPalette[index];
}

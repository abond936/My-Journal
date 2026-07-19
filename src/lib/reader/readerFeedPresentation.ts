import type { Card } from '@/lib/types/card';

/** Closed feed tile shell aspect for Story, Gallery, Quote, and Question (navigate/static). */
export const SQUARE_FEED_TILE_ASPECT = '1/1';

/**
 * Approximate flex cover-band aspect inside a square feed tile (image area only).
 * Tile is 1:1; chip strip is 2rem; title band is one line + padding — image band ~78% of tile height.
 */
export const SQUARE_FEED_TILE_COVER_BAND_ASPECT = '13/10';

/** Prefer direct card tags; fall back to denormalized dimensional arrays for feed lists. */
export function resolveFeedTileDirectTagIds(
  card: Pick<Card, 'tags' | 'who' | 'what' | 'when' | 'where'>
): string[] {
  if (Array.isArray(card.tags) && card.tags.length > 0) {
    return card.tags;
  }
  return Array.from(
    new Set(
      [...(card.who ?? []), ...(card.what ?? []), ...(card.when ?? []), ...(card.where ?? [])].filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    )
  );
}

export function usesSquareFeedTile(cardType: string, displayMode: string): boolean {
  // Question Reveal changes interaction, not the closed question-face geometry.
  if (displayMode === 'inline') return cardType === 'qa';
  if (displayMode === 'static') return cardType === 'callout';
  if (cardType === 'callout') return false;
  return cardType === 'story' || cardType === 'gallery' || cardType === 'quote' || cardType === 'qa';
}

/** Main feed grid only; compact discovery/rails (`size="small"`) omit the bottom chip strip. */
export function showFeedTileChipStrip(
  squareFeedTile: boolean,
  size: 'small' | 'medium' | 'large'
): boolean {
  return squareFeedTile && size !== 'small';
}

/** Closed square feed tile presentation variant for data attributes / tests. */
export function getFeedTileVariant(
  squareFeedTile: boolean,
  size: 'small' | 'medium' | 'large'
): 'grid' | 'rail' | undefined {
  if (!squareFeedTile) return undefined;
  return size === 'small' ? 'rail' : 'grid';
}

import type { Card } from '@/lib/types/card';

/** Closed feed tile shell aspect for Story, Gallery, Quote, and Question (navigate/static). */
export const SQUARE_FEED_TILE_ASPECT = '1/1';

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
  if (displayMode === 'inline') return false;
  if (cardType === 'callout') return false;
  return cardType === 'story' || cardType === 'gallery' || cardType === 'quote' || cardType === 'qa';
}

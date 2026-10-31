import type { Card } from '@/lib/types/card';

/**
 * Legacy Cards predate an explicit Feed decision and remain visible for compatibility.
 * Only an authored false value removes a published Card from freeform Reader surfaces.
 */
export function isCardIncludedInFeed(card: Pick<Card, 'feedIncluded'>): boolean {
  return card.feedIncluded !== false;
}

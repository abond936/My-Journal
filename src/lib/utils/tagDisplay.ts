// Utility functions for display logic around tags
// This isolates logic so UI components remain clean.

import { Card } from '@/lib/types/card';
import { OrganizedTags } from '@/lib/types/tag';

/**
 * Returns, for each dimension, ONLY the tags that were directly selected on the card.
 * It does this by intersecting the dimension array with card.tags (direct list).
 */
export function getCoreTagsByDimension(card: Card): OrganizedTags {
  const direct = new Set(card.tags ?? []);
  const pick = (arr?: string[]) => (arr ?? []).filter(id => direct.has(id));

  return {
    who:        pick(card.who),
    what:       pick(card.what),
    when:       pick(card.when),
    where:      pick(card.where),
    reflection: pick(card.reflection),
  };
} 
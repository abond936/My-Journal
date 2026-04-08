// Utility functions for display logic around tags
// This isolates logic so UI components remain clean.

import { OrganizedTags } from '@/lib/types/tag';

/** Card or media: direct `tags` plus derived dimensional arrays (intersection = direct tags per dimension). */
export type DirectDimensionalTagSource = {
  tags?: string[];
  who?: string[];
  what?: string[];
  when?: string[];
  where?: string[];
};

export const DIMENSION_ORDER = ['who', 'what', 'when', 'where'] as const;
export type TagDimension = (typeof DIMENSION_ORDER)[number];

export const DIMENSION_LABEL: Record<TagDimension, string> = {
  who: 'Who',
  what: 'What',
  when: 'When',
  where: 'Where',
};

/**
 * Returns, for each dimension, ONLY the tags that were directly selected on the record.
 * Intersects each dimensional array with `tags` (the direct assignment list).
 */
export function getCoreTagsByDimension(source: DirectDimensionalTagSource): OrganizedTags {
  const direct = new Set(source.tags ?? []);
  const pick = (arr?: string[]) => (arr ?? []).filter(id => direct.has(id));

  return {
    who: pick(source.who),
    what: pick(source.what),
    when: pick(source.when),
    where: pick(source.where),
  };
}

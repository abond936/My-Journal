import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin } from '@dnd-kit/core';

/**
 * Prefer pointer targets over distance. When the pointer is inside multiple droppables,
 * prefer `parent:*` (nest on title) over `insertBefore:*` (sibling order) so reparenting to an
 * ancestor is not stolen by insert bands along the path. `tree-root` is a sibling strip below the
 * list (not wrapping rows), so it no longer needs deprioritization. Falls back to closestCenter when
 * the pointer is not inside any droppable.
 */
export const curatedTreeCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const parentHits = pointerHits.filter((c) => String(c.id).startsWith('parent:'));
    if (parentHits.length > 0) return parentHits;

    const insertHits = pointerHits.filter((c) => String(c.id).startsWith('insertBefore:'));
    if (insertHits.length > 0) return insertHits;

    return pointerHits;
  }
  return closestCenter(args);
};

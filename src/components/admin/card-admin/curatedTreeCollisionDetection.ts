import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin } from '@dnd-kit/core';

/**
 * Prefer pointer targets over distance. When the pointer is inside `insertBefore:*`,
 * use that (not `tree-root` / sortable rects that also contain the point).
 * Falls back to closestCenter when the pointer is not inside any droppable.
 */
export const curatedTreeCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const insertHits = pointerHits.filter((c) => String(c.id).startsWith('insertBefore:'));
    if (insertHits.length > 0) return insertHits;

    const parentHits = pointerHits.filter((c) => String(c.id).startsWith('parent:'));
    if (parentHits.length > 0) return parentHits;

    const withoutTreeRoot = pointerHits.filter((c) => c.id !== 'tree-root');
    if (withoutTreeRoot.length > 0) return withoutTreeRoot;

    return pointerHits;
  }
  return closestCenter(args);
};

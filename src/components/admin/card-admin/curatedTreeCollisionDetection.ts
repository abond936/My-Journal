import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin, rectIntersection } from '@dnd-kit/core';
import {
  classifyStudioDragId,
  filterStudioHitsByDomain,
  prioritizeCollectionHits,
} from '@/lib/dnd/studioDragContract';

/**
 * Prefer pointer targets over distance. When the pointer is inside multiple droppables,
 * prioritize shell zones first (`unparented`, `tree-root`) so side-panel drops are not stolen
 * by lingering tree row droppables, then prefer `parent:*` (nest on title) over
 * `insertBefore:*` (sibling order) so reparenting to an ancestor is not stolen by insert
 * bands along the path. Falls back to closestCenter when the pointer is not inside any droppable.
 *
 * Note: Studio shares one DndContext across multiple panes; this ordering keeps intent stable
 * when several droppable rects overlap during cross-pane drags.
 */
/**
 * Prefer pointer targets over distance. When the pointer is inside multiple droppables,
 * prefer `parent:*` (nest on title) over `insertBefore:*` (sibling order) so reparenting to an
 * ancestor is not stolen by insert bands along the path.
 */
export const curatedTreeCollisionDetection: CollisionDetection = (args) => {
  const activeId = args.active?.id != null ? String(args.active.id) : '';
  const domain = classifyStudioDragId(activeId);
  const pointerHits = filterStudioHitsByDomain(pointerWithin(args), domain);
  if (pointerHits.length > 0) {
    if (domain === 'collections') return prioritizeCollectionHits(pointerHits);
    return pointerHits;
  }
  const rectHits = filterStudioHitsByDomain(rectIntersection(args), domain);
  if (rectHits.length > 0) {
    if (domain === 'collections') return prioritizeCollectionHits(rectHits);
    return rectHits;
  }
  if (domain === 'collections') {
    // Avoid guessing to a tree row when no concrete card-domain target is actually hit.
    return [];
  }
  return filterStudioHitsByDomain(closestCenter(args), domain);
};

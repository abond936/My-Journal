import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin, rectIntersection } from '@dnd-kit/core';
import {
  filterCollectionsHits,
  parseCollectionsCardDragId,
  prioritizeCollectionsHits,
} from '@/lib/dnd/collectionsDragContract';
import {
  classifyStudioRightColumnDragId,
  filterStudioRightColumnHits,
  prioritizeStudioRightColumnHits,
} from '@/lib/dnd/studioRightColumnDragContract';

/**
 * Collections-only collision policy: prefer concrete structural targets under the pointer
 * and do not guess a tree row when no valid collections target is actually hit.
 */
export const collectionsCollisionDetection: CollisionDetection = (args) => {
  const activeId = args.active?.id != null ? String(args.active.id) : '';
  if (parseCollectionsCardDragId(activeId)) {
    const pointerHits = filterCollectionsHits(pointerWithin(args));
    if (pointerHits.length > 0) {
      return prioritizeCollectionsHits(pointerHits);
    }

    const rectHits = filterCollectionsHits(rectIntersection(args));
    if (rectHits.length > 0) {
      return prioritizeCollectionsHits(rectHits);
    }

    return [];
  }

  const rightDomain = classifyStudioRightColumnDragId(activeId);
  if (rightDomain === 'other') return [];

  const pointerHits = filterStudioRightColumnHits(pointerWithin(args), rightDomain);
  if (pointerHits.length > 0) {
    return prioritizeStudioRightColumnHits(pointerHits, rightDomain);
  }

  const rectHits = filterStudioRightColumnHits(rectIntersection(args), rightDomain);
  if (rectHits.length > 0) {
    return prioritizeStudioRightColumnHits(rectHits, rightDomain);
  }

  return prioritizeStudioRightColumnHits(filterStudioRightColumnHits(closestCenter(args), rightDomain), rightDomain);
};

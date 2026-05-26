import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin, rectIntersection } from '@dnd-kit/core';
import {
  classifyStudioRightColumnDragId,
  filterStudioRightColumnHits,
  prioritizeStudioRightColumnHits,
} from '@/lib/dnd/studioRightColumnDragContract';

export const studioRightColumnCollisionDetection: CollisionDetection = (args) => {
  const activeId = args.active?.id != null ? String(args.active.id) : '';
  const domain = classifyStudioRightColumnDragId(activeId);
  if (domain === 'other') return [];

  const pointerHits = filterStudioRightColumnHits(pointerWithin(args), domain);
  if (pointerHits.length > 0) {
    return prioritizeStudioRightColumnHits(pointerHits, domain);
  }

  const rectHits = filterStudioRightColumnHits(rectIntersection(args), domain);
  if (rectHits.length > 0) {
    return prioritizeStudioRightColumnHits(rectHits, domain);
  }

  return prioritizeStudioRightColumnHits(filterStudioRightColumnHits(closestCenter(args), domain), domain);
};

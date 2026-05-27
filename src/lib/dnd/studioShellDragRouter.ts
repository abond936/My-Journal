import type { Collision, CollisionDetection } from '@dnd-kit/core';
import { pointerWithin } from '@dnd-kit/core';
import { parseCollectionsCardDragId } from '@/lib/dnd/collectionsDragContract';
import { filterCollectionsHits, prioritizeCollectionsHits } from '@/lib/dnd/collectionsDragContract';
import {
  classifyStudioRightColumnDragId,
  shouldReuseLastOverOnDrop,
} from '@/lib/dnd/studioRightColumnDragContract';
import { studioRightColumnCollisionDetection } from '@/components/admin/studio/studioRightColumnCollisionDetection';

/**
 * Shared Studio-shell drag router.
 *
 * One DnD framework remains mounted at the shell level, but structural tree/root drags and
 * right-column relationship drags are delegated to different owner rules instead of competing in
 * one generic collision policy.
 */
export const studioShellCollisionDetection: CollisionDetection = (args) => {
  const activeId = args.active?.id != null ? String(args.active.id) : '';

  if (parseCollectionsCardDragId(activeId)) {
    const pointerHits = filterCollectionsHits(pointerWithin(args));
    if (pointerHits.length > 0) {
      return prioritizeCollectionsHits(pointerHits);
    }
    return [] as Collision[];
  }

  return studioRightColumnCollisionDetection(args);
};

export function resolveStudioShellExternalDropId(args: {
  activeId: string;
  rawOverId: string | null;
  lastValidOverId: string | null;
}): string | null {
  if (args.rawOverId) return args.rawOverId;
  const domain = classifyStudioRightColumnDragId(args.activeId);
  if (!shouldReuseLastOverOnDrop(domain)) return null;
  return args.lastValidOverId;
}

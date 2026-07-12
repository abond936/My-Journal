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

/**
 * Local gallery reorder targets only.
 * Do not treat `drop:cover` as reusable — that is an assignment target and must not
 * commit from a stale hover when the pointer is released outside a live target.
 */
export function isLocalGalleryReorderDropId(dropId: string | null | undefined): boolean {
  if (!dropId) return false;
  return (
    dropId.startsWith('gallery:') ||
    dropId === 'gallery:end' ||
    dropId === 'drop:gallery'
  );
}

export function resolveStudioShellExternalDropId(args: {
  activeId: string;
  rawOverId: string | null;
  lastValidOverId: string | null;
}): string | null {
  if (args.rawOverId) return args.rawOverId;
  const domain = classifyStudioRightColumnDragId(args.activeId);

  // Gallery local reorder mirrors studioChild: pointerWithin often clears `over` on drop
  // even when the last hover was a valid gallery row / end zone. Reuse that last local
  // target only — never reuse assignment targets like drop:cover.
  if (domain === 'gallery' && isLocalGalleryReorderDropId(args.lastValidOverId)) {
    return args.lastValidOverId;
  }

  if (!shouldReuseLastOverOnDrop(domain)) return null;
  return args.lastValidOverId;
}

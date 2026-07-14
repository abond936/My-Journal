import type { Collision } from '@dnd-kit/core';
import { isStoryPileDropId } from '@/lib/dnd/studioPileDragContract';

export type StudioRightColumnDragDomain = 'source' | 'gallery' | 'studioChild' | 'collectionCard' | 'other';

const SOURCE_COMPOSE_DROP_PRIORITY = ['drop:cover', 'drop:gallery', 'drop:body'] as const;

export function classifyStudioRightColumnDragId(activeId: string): StudioRightColumnDragDomain {
  if (activeId.startsWith('source:')) return 'source';
  if (activeId.startsWith('gallery:')) return 'gallery';
  if (activeId.startsWith('studioChild:')) return 'studioChild';
  if (activeId.startsWith('card:')) return 'collectionCard';
  return 'other';
}

export function acceptsStudioRightColumnDrop(dropId: string, domain: StudioRightColumnDragDomain): boolean {
  switch (domain) {
    case 'source':
      return (
        dropId === 'drop:cover' ||
        dropId === 'drop:gallery' ||
        dropId === 'drop:body' ||
        isStoryPileDropId(dropId)
      );
    case 'gallery':
      return dropId === 'drop:cover' || dropId.startsWith('gallery:');
    case 'studioChild':
      return dropId.startsWith('studioChild:') || dropId.startsWith('studioChildAfter:');
    case 'collectionCard':
      return dropId.startsWith('studio-parent:');
    default:
      return false;
  }
}

export function filterStudioRightColumnHits(
  hits: Collision[],
  domain: StudioRightColumnDragDomain
): Collision[] {
  return hits.filter((collision) => acceptsStudioRightColumnDrop(String(collision.id), domain));
}

export function prioritizeStudioRightColumnHits(
  hits: Collision[],
  domain: StudioRightColumnDragDomain
): Collision[] {
  if (hits.length === 0) return hits;

  if (domain === 'source') {
    for (const dropId of SOURCE_COMPOSE_DROP_PRIORITY) {
      const matches = hits.filter((collision) => String(collision.id) === dropId);
      if (matches.length > 0) return matches;
    }
    const pileHits = hits.filter((collision) => isStoryPileDropId(String(collision.id)));
    if (pileHits.length > 0) return pileHits;
    return hits;
  }

  if (domain === 'gallery') {
    const coverHits = hits.filter((collision) => String(collision.id) === 'drop:cover');
    if (coverHits.length > 0) return coverHits;
    const galleryHits = hits.filter((collision) => String(collision.id).startsWith('gallery:'));
    if (galleryHits.length > 0) return galleryHits;
    return hits;
  }

  if (domain === 'studioChild') {
    const childHits = hits.filter((collision) => String(collision.id).startsWith('studioChild:'));
    if (childHits.length > 0) return childHits;
    const endHits = hits.filter((collision) => String(collision.id).startsWith('studioChildAfter:'));
    if (endHits.length > 0) return endHits;
  }

  if (domain === 'collectionCard') {
    const parentHits = hits.filter((collision) => String(collision.id).startsWith('studio-parent:'));
    if (parentHits.length > 0) return parentHits;
  }

  return hits;
}

/**
 * For cross-pane assignment/append drags, releasing outside a live target must not reuse
 * an earlier hover target. Child reorder keeps the small tolerance because it remains
 * a local reorder interaction inside one destination surface.
 *
 * Gallery domain stays `false` here so assignment targets (e.g. `drop:cover`) are never
 * reused via this broad gate. Local gallery reorder reuse is handled narrowly in
 * `resolveStudioShellExternalDropId` (gallery row / end / append-zone ids only).
 */
export function shouldReuseLastOverOnDrop(domain: StudioRightColumnDragDomain): boolean {
  return domain === 'studioChild';
}

/**
 * Cross-pane assignment targets are explicit and visually separate, so only local child reorder
 * keeps geometric fallback once the pointer has left a live target.
 */
export function shouldUseRectIntersectionFallback(domain: StudioRightColumnDragDomain): boolean {
  return domain === 'studioChild';
}

/**
 * `closestCenter` is too permissive for cross-pane assignment drags because it can keep
 * selecting a relationship target even after the pointer has returned to a non-target pane.
 * Keep it only for local child reorder, where a small amount of tolerance is useful.
 */
export function shouldUseClosestCenterFallback(domain: StudioRightColumnDragDomain): boolean {
  return domain === 'studioChild';
}

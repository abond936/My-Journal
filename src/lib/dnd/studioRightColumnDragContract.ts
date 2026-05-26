import type { Collision } from '@dnd-kit/core';

export type StudioRightColumnDragDomain = 'source' | 'gallery' | 'studioChild' | 'collectionCard' | 'other';

const SOURCE_DROP_PRIORITY = ['drop:cover', 'drop:gallery', 'drop:body'] as const;

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
      return dropId === 'drop:cover' || dropId === 'drop:gallery' || dropId === 'drop:body';
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
    for (const dropId of SOURCE_DROP_PRIORITY) {
      const matches = hits.filter((collision) => String(collision.id) === dropId);
      if (matches.length > 0) return matches;
    }
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

import type { Collision } from '@dnd-kit/core';

export type StudioDragDomain = 'collections' | 'media' | 'compose' | 'tags' | 'upload' | 'other';

export type StudioCollectionCardDragData = {
  domain: 'collections';
  kind: 'card';
  cardId: string;
  sourceParentId?: string;
  sourceIsRoot?: boolean;
};

export type StudioMediaSourceDragData = {
  domain: 'media';
  kind: 'media-source';
  mediaId: string;
};

export type StudioComposeGalleryDragData = {
  domain: 'compose';
  kind: 'gallery-item';
  mediaId: string;
};

export type StudioComposeChildDragData = {
  domain: 'compose';
  kind: 'child-item';
  childId: string;
  parentCardId?: string;
};

export type StudioDragData =
  | StudioCollectionCardDragData
  | StudioMediaSourceDragData
  | StudioComposeGalleryDragData
  | StudioComposeChildDragData;

export function buildStudioCollectionCardDragData(
  cardId: string,
  options?: Pick<StudioCollectionCardDragData, 'sourceParentId' | 'sourceIsRoot'>
): StudioCollectionCardDragData {
  return {
    domain: 'collections',
    kind: 'card',
    cardId,
    ...(options?.sourceParentId ? { sourceParentId: options.sourceParentId } : {}),
    ...(options?.sourceIsRoot ? { sourceIsRoot: true } : {}),
  };
}

export function isStudioCollectionCardDragData(value: unknown): value is StudioCollectionCardDragData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<StudioCollectionCardDragData>;
  return data.domain === 'collections' && data.kind === 'card' && typeof data.cardId === 'string';
}

const COLLECTION_SHELL_DROP_IDS = new Set(['unparented', 'tree-root']);

export function classifyStudioDragId(activeId: string): StudioDragDomain {
  if (activeId.startsWith('card:')) return 'collections';
  if (activeId.startsWith('source:')) return 'media';
  if (activeId.startsWith('gallery:') || activeId.startsWith('studioChild:')) return 'compose';
  return 'other';
}

export function parseCollectionCardDragId(activeId: string): string | null {
  return activeId.startsWith('card:') ? activeId.slice('card:'.length) : null;
}

export function acceptsStudioDomain(dropId: string, domain: StudioDragDomain): boolean {
  switch (domain) {
    case 'collections':
      return (
        dropId === 'unparented' ||
        dropId.startsWith('unparented-row:') ||
        dropId === 'tree-root' ||
        dropId.startsWith('parent:') ||
        dropId.startsWith('studio-parent:') ||
        dropId.startsWith('insertBefore:')
      );
    case 'media':
      return dropId === 'drop:cover' || dropId === 'drop:gallery' || dropId === 'drop:body';
    case 'compose':
      return (
        dropId === 'drop:cover' ||
        dropId.startsWith('gallery:') ||
        dropId.startsWith('studioChild:') ||
        dropId.startsWith('studioChildAfter:')
      );
    default:
      return true;
  }
}

export function prioritizeCollectionHits(hits: Collision[]): Collision[] {
  if (hits.length === 0) return hits;

  const shellHits = hits.filter((collision) => {
    const id = String(collision.id);
    return COLLECTION_SHELL_DROP_IDS.has(id) || id.startsWith('unparented-row:');
  });
  if (shellHits.length > 0) return shellHits;

  const studioParentHits = hits.filter((collision) => String(collision.id).startsWith('studio-parent:'));
  if (studioParentHits.length > 0) return studioParentHits;

  const parentHits = hits.filter((collision) => String(collision.id).startsWith('parent:'));
  if (parentHits.length > 0) return parentHits;

  const insertHits = hits.filter((collision) => String(collision.id).startsWith('insertBefore:'));
  if (insertHits.length > 0) return insertHits;

  return hits;
}

export function filterStudioHitsByDomain(
  hits: Collision[],
  domain: StudioDragDomain
): Collision[] {
  return hits.filter((collision) => acceptsStudioDomain(String(collision.id), domain));
}

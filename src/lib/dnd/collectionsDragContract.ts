import type { Collision } from '@dnd-kit/core';

export type CollectionsCardDragData = {
  domain: 'collections';
  kind: 'card';
  cardId: string;
  sourceParentId?: string;
  sourceIsRoot?: boolean;
};

const COLLECTION_SHELL_DROP_IDS = new Set(['unparented', 'tree-root']);

export function buildCollectionsCardDragData(
  cardId: string,
  options?: Pick<CollectionsCardDragData, 'sourceParentId' | 'sourceIsRoot'>
): CollectionsCardDragData {
  return {
    domain: 'collections',
    kind: 'card',
    cardId,
    ...(options?.sourceParentId ? { sourceParentId: options.sourceParentId } : {}),
    ...(options?.sourceIsRoot ? { sourceIsRoot: true } : {}),
  };
}

export function isCollectionsCardDragData(value: unknown): value is CollectionsCardDragData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CollectionsCardDragData>;
  return data.domain === 'collections' && data.kind === 'card' && typeof data.cardId === 'string';
}

export function parseCollectionsCardDragId(activeId: string): string | null {
  return activeId.startsWith('card:') ? activeId.slice('card:'.length) : null;
}

export function isCollectionsDropId(dropId: string): boolean {
  return (
    dropId === 'unparented' ||
    dropId.startsWith('unparented-row:') ||
    dropId === 'tree-root' ||
    dropId.startsWith('parent:') ||
    dropId.startsWith('studio-parent:') ||
    dropId.startsWith('insertBefore:')
  );
}

export function filterCollectionsHits(hits: Collision[]): Collision[] {
  return hits.filter((collision) => isCollectionsDropId(String(collision.id)));
}

export function prioritizeCollectionsHits(hits: Collision[]): Collision[] {
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

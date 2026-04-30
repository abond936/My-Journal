import type { Card } from '@/lib/types/card';
import {
  buildChildrenIdsWithInsertBefore,
  normalizeCuratedChildIds,
  wouldAttachChildCreateCuratedCycle,
} from '@/lib/utils/curatedCollectionTree';

function cloneCards(cards: Card[]): Card[] {
  return cards.map((c) => ({
    ...c,
    childrenIds: [...normalizeCuratedChildIds(c.childrenIds)],
  }));
}

function findParent(next: Card[], parentId: string): Card | undefined {
  return next.find((card) => card.docId === parentId);
}

/** Remove one specific parent-child edge. */
export function optimisticDetachChildFromParent(cards: Card[], childId: string, parentId: string): Card[] | null {
  const next = cloneCards(cards);
  const parent = findParent(next, parentId);
  if (!parent) return null;
  const before = normalizeCuratedChildIds(parent.childrenIds);
  if (!before.includes(childId)) return null;
  parent.childrenIds = before.filter((id) => id !== childId);
  return next;
}

/** Backward-compatible alias for callers that only know the active parent context. */
export function optimisticDetachChild(cards: Card[], childId: string, parentId?: string): Card[] | null {
  if (!parentId) return null;
  return optimisticDetachChildFromParent(cards, childId, parentId);
}

/** Append `childId` as last child of `parentId` without detaching it from other parents. */
export function optimisticAttachChildAsLast(cards: Card[], childId: string, parentId: string): Card[] | null {
  if (childId === parentId) return null;
  if (wouldAttachChildCreateCuratedCycle(cards, childId, parentId)) return null;
  const next = cloneCards(cards);
  const parent = findParent(next, parentId);
  if (!parent) return null;
  const existing = normalizeCuratedChildIds(parent.childrenIds);
  if (existing.includes(childId)) return null;
  parent.childrenIds = [...existing, childId];
  return next;
}

/** Insert `childId` before `beforeSiblingId` under a known parent. */
export function optimisticInsertChildBeforeSibling(
  cards: Card[],
  childId: string,
  beforeSiblingId: string,
  parentId: string
): Card[] | null {
  if (!childId || !beforeSiblingId || childId === beforeSiblingId) return null;
  if (wouldAttachChildCreateCuratedCycle(cards, childId, parentId)) return null;
  const next = cloneCards(cards);
  const parent = findParent(next, parentId);
  if (!parent) return null;
  parent.childrenIds = buildChildrenIdsWithInsertBefore(parent.childrenIds, childId, beforeSiblingId);
  return next;
}

export function optimisticSetCollectionRoot(
  cards: Card[],
  cardId: string,
  updates: Partial<Pick<Card, 'isCollectionRoot' | 'collectionRootOrder'>>
): Card[] | null {
  const next = cloneCards(cards);
  const card = next.find((entry) => entry.docId === cardId);
  if (!card) return null;
  if (Object.prototype.hasOwnProperty.call(updates, 'isCollectionRoot')) {
    card.isCollectionRoot = updates.isCollectionRoot === true;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'collectionRootOrder')) {
    card.collectionRootOrder = updates.collectionRootOrder;
  }
  if (card.isCollectionRoot !== true) {
    delete card.collectionRootOrder;
  }
  return next;
}

export function optimisticReorderCollectionRoots(cards: Card[], orderedRootIds: string[]): Card[] | null {
  if (orderedRootIds.length === 0) return null;
  const next = cloneCards(cards);
  const rootIds = new Set(orderedRootIds);
  let foundAny = false;

  orderedRootIds.forEach((rootId, index) => {
    const card = next.find((entry) => entry.docId === rootId);
    if (!card) return;
    foundAny = true;
    card.isCollectionRoot = true;
    card.collectionRootOrder = index * 10;
  });

  if (!foundAny) return null;

  for (const card of next) {
    if (card.docId && rootIds.has(card.docId) && card.isCollectionRoot !== true) {
      card.isCollectionRoot = true;
    }
  }

  return next;
}

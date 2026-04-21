import type { Card } from '@/lib/types/card';
import {
  buildChildrenIdsWithInsertBefore,
  buildRootDocIdListWithInsertBefore,
  compareCuratedRootCards,
  nextCuratedRootOrderForAppend,
  normalizeCuratedChildIds,
  wouldAttachChildCreateCuratedCycle,
} from '@/lib/utils/curatedCollectionTree';

function cloneCards(cards: Card[]): Card[] {
  return cards.map((c) => ({
    ...c,
    childrenIds: [...normalizeCuratedChildIds(c.childrenIds)],
  }));
}

function buildParentByChild(cards: Card[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of cards) {
    if (!p.docId) continue;
    for (const cid of normalizeCuratedChildIds(p.childrenIds)) {
      map.set(cid, p.docId);
    }
  }
  return map;
}

/** Same rooted list rule as Collections `rootedCollections`. */
function listRootedCollections(cards: Card[]): Card[] {
  const parentByChild = buildParentByChild(cards);
  const list = cards.filter((card) => {
    if (!card.docId || parentByChild.has(card.docId)) return false;
    const children = normalizeCuratedChildIds(card.childrenIds);
    return children.length > 0 || card.curatedRoot === true;
  });
  list.sort(compareCuratedRootCards);
  return list;
}

/** Remove `childId` from whichever parent currently lists it. */
export function optimisticDetachChild(cards: Card[], childId: string): Card[] | null {
  const parentByChild = buildParentByChild(cards);
  const parentId = parentByChild.get(childId);
  if (!parentId) return null;
  const next = cloneCards(cards);
  const parent = next.find((c) => c.docId === parentId);
  if (!parent) return null;
  parent.childrenIds = normalizeCuratedChildIds(parent.childrenIds).filter((id) => id !== childId);
  if (normalizeCuratedChildIds(parent.childrenIds).length === 0) {
    parent.curatedRoot = true;
  }
  return next;
}

/** Append `childId` as last child of `parentId`; detach from any previous parent; clear curated root on child. */
export function optimisticAttachChildAsLast(cards: Card[], childId: string, parentId: string): Card[] | null {
  if (childId === parentId) return null;
  if (wouldAttachChildCreateCuratedCycle(cards, childId, parentId)) return null;
  const parentByChild = buildParentByChild(cards);
  if (parentByChild.get(childId) === parentId) return null;
  if (!cards.some((c) => c.docId === parentId)) return null;
  const next = cloneCards(cards);
  const strippedFrom = new Set<string>();
  for (const c of next) {
    const before = normalizeCuratedChildIds(c.childrenIds);
    if (before.includes(childId) && c.docId) strippedFrom.add(c.docId);
    c.childrenIds = before.filter((id) => id !== childId);
  }
  for (const id of strippedFrom) {
    const c = next.find((x) => x.docId === id);
    if (c && normalizeCuratedChildIds(c.childrenIds).length === 0) {
      c.curatedRoot = true;
    }
  }
  const parent = next.find((c) => c.docId === parentId);
  if (!parent) return null;
  const existing = normalizeCuratedChildIds(parent.childrenIds);
  parent.childrenIds = [...existing, childId];
  const child = next.find((c) => c.docId === childId);
  if (child) child.curatedRoot = false;
  return next;
}

/** Insert `childId` before `beforeSiblingId` under the same parent as `beforeSiblingId`, or reorder roots if sibling is root. */
export function optimisticInsertChildBeforeSibling(
  cards: Card[],
  childId: string,
  beforeSiblingId: string
): Card[] | null {
  if (!childId || !beforeSiblingId || childId === beforeSiblingId) return null;
  const parentByChild = buildParentByChild(cards);
  if (parentByChild.get(beforeSiblingId) === childId) return null;
  const parentId = parentByChild.get(beforeSiblingId);
  if (!parentId) {
    return optimisticInsertRootBefore(cards, childId, beforeSiblingId);
  }
  if (!cards.some((c) => c.docId === parentId)) return null;
  const next = cloneCards(cards);
  const strippedFrom = new Set<string>();
  for (const c of next) {
    const before = normalizeCuratedChildIds(c.childrenIds);
    if (before.includes(childId) && c.docId) strippedFrom.add(c.docId);
    c.childrenIds = before.filter((id) => id !== childId);
  }
  for (const id of strippedFrom) {
    const c = next.find((x) => x.docId === id);
    if (c && normalizeCuratedChildIds(c.childrenIds).length === 0) {
      c.curatedRoot = true;
    }
  }
  const parent = next.find((c) => c.docId === parentId);
  if (!parent) return null;
  parent.childrenIds = buildChildrenIdsWithInsertBefore(parent.childrenIds, childId, beforeSiblingId);
  const child = next.find((c) => c.docId === childId);
  if (child) child.curatedRoot = false;
  return next;
}

/** Move `childId` into curated roots before `beforeRootId`, matching `handleInsertRootBefore` PATCH shape. */
export function optimisticInsertRootBefore(cards: Card[], childId: string, beforeRootId: string): Card[] | null {
  if (!beforeRootId || childId === beforeRootId) return null;
  const parentByChild = buildParentByChild(cards);
  const rooted = listRootedCollections(cards);
  const rootIds = rooted.map((r) => r.docId!);
  const newRootIds = buildRootDocIdListWithInsertBefore(rootIds, childId, beforeRootId);
  const next = cloneCards(cards);
  const currentParentId = parentByChild.get(childId);
  if (currentParentId) {
    const p = next.find((c) => c.docId === currentParentId);
    if (p) {
      p.childrenIds = normalizeCuratedChildIds(p.childrenIds).filter((id) => id !== childId);
      if (normalizeCuratedChildIds(p.childrenIds).length === 0) {
        p.curatedRoot = true;
      }
    }
  }
  newRootIds.forEach((id, idx) => {
    const card = next.find((c) => c.docId === id);
    if (card) {
      card.curatedRootOrder = idx * 10;
      if (id === childId) card.curatedRoot = true;
    }
  });
  return next;
}

/** Detach from parent (if any) and promote `childId` to a curated root with next append order. */
export function optimisticPromoteToRootAppend(cards: Card[], childId: string): Card[] | null {
  const parentByChild = buildParentByChild(cards);
  const next = cloneCards(cards);
  const currentParentId = parentByChild.get(childId);
  if (currentParentId) {
    const p = next.find((c) => c.docId === currentParentId);
    if (p) {
      p.childrenIds = normalizeCuratedChildIds(p.childrenIds).filter((id) => id !== childId);
      if (normalizeCuratedChildIds(p.childrenIds).length === 0) {
        p.curatedRoot = true;
      }
    }
  }
  const rooted = listRootedCollections(next);
  const nextOrder = nextCuratedRootOrderForAppend(rooted, childId);
  const child = next.find((c) => c.docId === childId);
  if (!child) return null;
  child.curatedRoot = true;
  child.curatedRootOrder = nextOrder;
  return next;
}

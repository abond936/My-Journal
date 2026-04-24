import type { Card } from '@/lib/types/card';

/** Same semantics as `@dnd-kit/sortable` `arrayMove` - kept local so this module stays server-safe. */
function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}

/** Dedupe while preserving first-seen order (matches Firestore `childrenIds` semantics). */
export function normalizeCuratedChildIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  ids.forEach((raw) => {
    if (typeof raw !== 'string') return;
    const id = raw.trim();
    if (!id) return;
    seen.add(id);
  });
  return Array.from(seen);
}

/**
 * True if attaching `childId` under `parentId` would make `parentId` a descendant of `childId`
 * (including `parentId === childId`). Walks `childrenIds` from `childId` downward.
 */
export function wouldAttachChildCreateCuratedCycle(cards: Card[], childId: string, parentId: string): boolean {
  if (!childId || !parentId || childId === parentId) return true;
  const byId = new Map<string, Card>();
  for (const c of cards) {
    if (c.docId) byId.set(c.docId, c);
  }
  const stack = [childId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === parentId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const card = byId.get(id);
    if (!card) continue;
    for (const cid of normalizeCuratedChildIds(card.childrenIds)) {
      stack.push(cid);
    }
  }
  return false;
}

/** Insert `childId` immediately before `beforeSiblingId` in a parent's `childrenIds` (deduped, stable). */
export function buildChildrenIdsWithInsertBefore(
  parentChildrenIds: unknown,
  childId: string,
  beforeSiblingId: string
): string[] {
  const base = normalizeCuratedChildIds(parentChildrenIds).filter((id) => id !== childId);
  const idx = base.indexOf(beforeSiblingId);
  if (idx < 0) return [...base, childId];
  return [...base.slice(0, idx), childId, ...base.slice(idx)];
}

/** Insert `childId` before `beforeRootId` in the ordered root doc-id list. */
export function buildRootDocIdListWithInsertBefore(
  orderedRootIds: readonly string[],
  childId: string,
  beforeRootId: string
): string[] {
  const base = orderedRootIds.filter((id) => id !== childId);
  const idx = base.indexOf(beforeRootId);
  if (idx < 0) return [...base, childId];
  return [...base.slice(0, idx), childId, ...base.slice(idx)];
}

/** Next explicit root order when appending a new root after existing roots (10-spaced sequence). */
export function nextCollectionRootOrderForAppend(rootedCards: Card[], excludeChildId?: string): number {
  let max = 0;
  for (const c of rootedCards) {
    if (excludeChildId && c.docId === excludeChildId) continue;
    const order = c.collectionRootOrder;
    if (typeof order === 'number' && !Number.isNaN(order)) max = Math.max(max, order);
  }
  return max + 10;
}

/**
 * Sort key for top-level collection roots.
 * Lower `collectionRootOrder` first. Cards without the field sort by title A-Z, then `docId`.
 */
export function compareCollectionRootCards(a: Card, b: Card): number {
  const oa = a.collectionRootOrder;
  const ob = b.collectionRootOrder;
  const aHas = typeof oa === 'number' && !Number.isNaN(oa);
  const bHas = typeof ob === 'number' && !Number.isNaN(ob);
  if (aHas && bHas && oa !== ob) return oa - ob;
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  const titleA = (a.title || a.subtitle || 'Untitled').toLowerCase();
  const titleB = (b.title || b.subtitle || 'Untitled').toLowerCase();
  const titleCompare = titleA.localeCompare(titleB);
  if (titleCompare !== 0) return titleCompare;
  return (a.docId || '').localeCompare(b.docId || '');
}

export function buildParentIdsByChild(cards: Card[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const parent of cards) {
    if (!parent.docId) continue;
    for (const childId of normalizeCuratedChildIds(parent.childrenIds)) {
      const existing = map.get(childId);
      if (existing) {
        existing.push(parent.docId);
      } else {
        map.set(childId, [parent.docId]);
      }
    }
  }
  return map;
}

export function getParentIdsForCard(cards: Card[], childId: string): string[] {
  return buildParentIdsByChild(cards).get(childId) ?? [];
}

/** Ordered top-level collection roots. A root may also appear as a child elsewhere. */
export function listCollectionRootCards(cards: Card[]): Card[] {
  return cards
    .filter((card) => card.docId && card.isCollectionRoot === true)
    .sort(compareCollectionRootCards);
}

export type CuratedTreePatchFn = (cardId: string, payload: Partial<Card>) => Promise<void>;

export type CuratedDropIntent =
  | { kind: 'none' }
  | { kind: 'orphaned' }
  | { kind: 'tree-root' }
  | { kind: 'insert-before'; beforeId: string }
  | { kind: 'parent'; parentId: string };

/** Normalize DnD `over.id` to one collection-tree action. */
export function resolveCuratedDropIntent(overId: string | null): CuratedDropIntent {
  if (!overId) return { kind: 'none' };
  if (overId === 'orphaned') return { kind: 'orphaned' };
  if (overId.startsWith('orphaned-row:')) return { kind: 'orphaned' };
  if (overId === 'unparented') return { kind: 'orphaned' };
  if (overId.startsWith('unparented-row:')) return { kind: 'orphaned' };
  if (overId === 'tree-root') return { kind: 'tree-root' };
  if (overId.startsWith('insertBefore:')) {
    const beforeId = overId.slice('insertBefore:'.length);
    return beforeId ? { kind: 'insert-before', beforeId } : { kind: 'none' };
  }
  if (overId.startsWith('parent:')) {
    const parentId = overId.slice('parent:'.length);
    return parentId ? { kind: 'parent', parentId } : { kind: 'none' };
  }
  if (overId.startsWith('studio-parent:')) {
    const parentId = overId.slice('studio-parent:'.length);
    return parentId ? { kind: 'parent', parentId } : { kind: 'none' };
  }
  return { kind: 'none' };
}

/**
 * Reorder siblings under one shared parent, or reorder top-level roots.
 * No-op if the two cards do not share a parent and are not both roots.
 */
export async function persistCuratedSiblingReorder(
  activeCardId: string,
  overCardId: string,
  parentIdsByChild: Map<string, string[]>,
  rootedCollections: Card[],
  cardById: Map<string, Card>,
  patchCard: CuratedTreePatchFn
): Promise<void> {
  if (activeCardId === overCardId) return;

  const activeParents = parentIdsByChild.get(activeCardId) ?? [];
  const overParents = parentIdsByChild.get(overCardId) ?? [];
  const sharedParent = activeParents.find((parentId) => overParents.includes(parentId));
  const bothRoots = activeParents.length === 0 && overParents.length === 0;
  if (!sharedParent && !bothRoots) return;

  const parentKey = bothRoots ? '__root__' : sharedParent!;

  if (parentKey === '__root__') {
    const ids = rootedCollections.map((c) => c.docId!).filter(Boolean);
    const oldIndex = ids.indexOf(activeCardId);
    const newIndex = ids.indexOf(overCardId);
    if (oldIndex < 0 || newIndex < 0) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    await Promise.all(newIds.map((id, idx) => patchCard(id, { collectionRootOrder: idx * 10 })));
    return;
  }

  const parent = cardById.get(parentKey);
  if (!parent?.docId) return;
  const children = normalizeCuratedChildIds(parent.childrenIds);
  const oldIndex = children.indexOf(activeCardId);
  const newIndex = children.indexOf(overCardId);
  if (oldIndex < 0 || newIndex < 0) return;
  const newOrder = arrayMove(children, oldIndex, newIndex);
  await patchCard(parent.docId, { childrenIds: newOrder });
}

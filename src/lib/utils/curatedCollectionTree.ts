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
  | { kind: 'insert-before'; beforeId: string; parentId: string | null }
  | { kind: 'parent'; parentId: string };

export type CuratedMoveSource = {
  sourceParentId?: string;
  sourceIsRoot?: boolean;
};

export type CuratedMutationStep =
  | { kind: 'detach-parent'; parentId: string; childId: string }
  | { kind: 'append-parent'; parentId: string; childId: string }
  | { kind: 'insert-before'; parentId: string; childId: string; beforeSiblingId: string }
  | { kind: 'clear-root'; cardId: string }
  | { kind: 'set-root'; cardId: string; rootOrder: number };

export const CURATED_ROOT_DROP_PARENT_KEY = '__root__';

export function buildCuratedInsertBeforeDropId(beforeId: string, parentId: string | null): string {
  const parentKey = parentId && parentId.length > 0 ? parentId : CURATED_ROOT_DROP_PARENT_KEY;
  return `insertBefore:${parentKey}:${beforeId}`;
}

/** Normalize DnD `over.id` to one collection-tree action. */
export function resolveCuratedDropIntent(
  overId: string | null,
  overData?: unknown
): CuratedDropIntent {
  if (overData && typeof overData === 'object') {
    const data = overData as {
      dropKind?: string;
      parentId?: string | null;
      beforeCardId?: string;
      parentCardId?: string;
    };
    if (data.dropKind === 'orphaned') return { kind: 'orphaned' };
    if (data.dropKind === 'tree-root') return { kind: 'tree-root' };
    if (data.dropKind === 'parent' && typeof data.parentCardId === 'string' && data.parentCardId) {
      return { kind: 'parent', parentId: data.parentCardId };
    }
    if (data.dropKind === 'insert-before' && typeof data.beforeCardId === 'string' && data.beforeCardId) {
      return {
        kind: 'insert-before',
        beforeId: data.beforeCardId,
        parentId: typeof data.parentId === 'string' && data.parentId ? data.parentId : null,
      };
    }
  }

  if (!overId) return { kind: 'none' };
  if (overId === 'orphaned') return { kind: 'orphaned' };
  if (overId.startsWith('orphaned-row:')) return { kind: 'orphaned' };
  if (overId === 'unparented') return { kind: 'orphaned' };
  if (overId.startsWith('unparented-row:')) return { kind: 'orphaned' };
  if (overId === 'tree-root') return { kind: 'tree-root' };
  if (overId.startsWith('insertBefore:')) {
    const raw = overId.slice('insertBefore:'.length);
    const splitAt = raw.indexOf(':');
    if (splitAt > 0) {
      const parentKey = raw.slice(0, splitAt);
      const beforeId = raw.slice(splitAt + 1);
      if (!beforeId) return { kind: 'none' };
      return {
        kind: 'insert-before',
        beforeId,
        parentId: parentKey === CURATED_ROOT_DROP_PARENT_KEY ? null : parentKey,
      };
    }
    return raw ? { kind: 'insert-before', beforeId: raw, parentId: null } : { kind: 'none' };
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

export function deriveCuratedMutationPlan(args: {
  childId: string;
  intent: CuratedDropIntent;
  source?: CuratedMoveSource;
  rootedCollectionIds: readonly string[];
}): CuratedMutationStep[] {
  const { childId, intent, source, rootedCollectionIds } = args;
  if (!childId) return [];

  const sourceParentId = source?.sourceParentId;
  const sourceIsRoot = source?.sourceIsRoot === true;
  const steps: CuratedMutationStep[] = [];

  switch (intent.kind) {
    case 'none':
      return [];
    case 'orphaned':
      if (sourceParentId) {
        return [{ kind: 'detach-parent', parentId: sourceParentId, childId }];
      }
      if (sourceIsRoot) {
        return [{ kind: 'clear-root', cardId: childId }];
      }
      return [];
    case 'tree-root': {
      const reorderedRootIds = rootedCollectionIds.filter((id) => id !== childId);
      reorderedRootIds.push(childId);
      if (sourceParentId) {
        steps.push({ kind: 'detach-parent', parentId: sourceParentId, childId });
      }
      steps.push({ kind: 'set-root', cardId: childId, rootOrder: reorderedRootIds.indexOf(childId) * 10 });
      return steps;
    }
    case 'insert-before':
      if (!intent.parentId) {
        const reorderedRootIds = buildRootDocIdListWithInsertBefore(rootedCollectionIds, childId, intent.beforeId);
        if (sourceParentId) {
          steps.push({ kind: 'detach-parent', parentId: sourceParentId, childId });
        }
        steps.push({ kind: 'set-root', cardId: childId, rootOrder: reorderedRootIds.indexOf(childId) * 10 });
        return steps;
      }
      if (sourceParentId && sourceParentId !== intent.parentId) {
        steps.push({ kind: 'detach-parent', parentId: sourceParentId, childId });
      }
      if (sourceIsRoot) {
        steps.push({ kind: 'clear-root', cardId: childId });
      }
      steps.push({
        kind: 'insert-before',
        parentId: intent.parentId,
        childId,
        beforeSiblingId: intent.beforeId,
      });
      return steps;
    case 'parent':
      if (sourceParentId && sourceParentId !== intent.parentId) {
        steps.push({ kind: 'detach-parent', parentId: sourceParentId, childId });
      }
      if (sourceIsRoot) {
        steps.push({ kind: 'clear-root', cardId: childId });
      }
      if (sourceParentId === intent.parentId) return steps;
      steps.push({ kind: 'append-parent', parentId: intent.parentId, childId });
      return steps;
  }
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

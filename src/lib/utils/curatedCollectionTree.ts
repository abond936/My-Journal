import type { Card } from '@/lib/types/card';

/** Same semantics as `@dnd-kit/sortable` `arrayMove` — kept local so this module stays server-safe (no dnd-kit → React in API routes). */
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

/** Insert `childId` before `beforeRootId` in the ordered root doc-id list (curated top-level). */
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

/** Next `curatedRootOrder` when appending a new root after existing roots (10-spaced sequence). */
export function nextCuratedRootOrderForAppend(rootedCards: Card[], excludeChildId?: string): number {
  let max = 0;
  for (const c of rootedCards) {
    if (excludeChildId && c.docId === excludeChildId) continue;
    const o = c.curatedRootOrder;
    if (typeof o === 'number' && !Number.isNaN(o)) max = Math.max(max, o);
  }
  return max + 10;
}

/**
 * Sort key for top-level curated collection entries (admin tree roots, sidebar groups, collection list).
 * Lower `curatedRootOrder` first. Cards without the field sort by title A–Z, then `docId`.
 */
export function compareCuratedRootCards(a: Card, b: Card): number {
  const oa = a.curatedRootOrder;
  const ob = b.curatedRootOrder;
  const aHas = typeof oa === 'number' && !Number.isNaN(oa);
  const bHas = typeof ob === 'number' && !Number.isNaN(ob);
  if (aHas && bHas && oa !== ob) return oa - ob;
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  const titleA = (a.title || a.subtitle || 'Untitled').toLowerCase();
  const titleB = (b.title || b.subtitle || 'Untitled').toLowerCase();
  const t = titleA.localeCompare(titleB);
  if (t !== 0) return t;
  return (a.docId || '').localeCompare(b.docId || '');
}

/** Ordered top-level curated cards when a fixed master node is configured. */
export function listCuratedTopLevelFromMaster(cards: Card[], masterId: string): Card[] {
  const byId = new Map<string, Card>();
  for (const c of cards) {
    if (c.docId) byId.set(c.docId, c);
  }
  const master = byId.get(masterId);
  if (!master) return [];
  return normalizeCuratedChildIds(master.childrenIds)
    .map((id) => byId.get(id))
    .filter((c): c is Card => Boolean(c));
}

/** All descendants reachable from the master's direct children (excludes the master itself). */
export function collectCuratedSubtreeIdsFromMaster(cards: Card[], masterId: string): Set<string> {
  const byId = new Map<string, Card>();
  for (const c of cards) {
    if (c.docId) byId.set(c.docId, c);
  }
  const master = byId.get(masterId);
  if (!master) return new Set<string>();
  const included = new Set<string>();
  const stack = normalizeCuratedChildIds(master.childrenIds);
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (included.has(id)) continue;
    included.add(id);
    const node = byId.get(id);
    if (!node) continue;
    normalizeCuratedChildIds(node.childrenIds).forEach((cid) => stack.push(cid));
  }
  return included;
}

export type CuratedTreePatchFn = (cardId: string, payload: Partial<Card>) => Promise<void>;

export type CuratedDropIntent =
  | { kind: 'none' }
  | { kind: 'unparented' }
  | { kind: 'tree-root' }
  | { kind: 'insert-before'; beforeId: string }
  | { kind: 'parent'; parentId: string };

/** Normalize DnD `over.id` to one curated-tree action. */
export function resolveCuratedDropIntent(overId: string | null): CuratedDropIntent {
  if (!overId) return { kind: 'none' };
  if (overId === 'unparented') return { kind: 'unparented' };
  if (overId.startsWith('unparented-row:')) return { kind: 'unparented' };
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
 * Reorder siblings under the same parent, or reorder top-level curated roots (`__root__`).
 * No-op if the two cards are not siblings at the same tree level.
 *
 * `patchCard` should reject on non-OK HTTP responses; wrap `fetch` + JSON with
 * `throwIfJsonApiFailed` from `@/lib/utils/httpJsonApiErrors` so `AppError` `message` / `code`
 * from the cards API propagate to the UI.
 */
export async function persistCuratedSiblingReorder(
  activeCardId: string,
  overCardId: string,
  parentByChild: Map<string, string>,
  rootedCollections: Card[],
  cardById: Map<string, Card>,
  patchCard: CuratedTreePatchFn
): Promise<void> {
  if (activeCardId === overCardId) return;

  const pActive = parentByChild.get(activeCardId);
  const pOver = parentByChild.get(overCardId);
  if (pActive !== pOver) return;

  const parentKey = pActive === undefined && pOver === undefined ? '__root__' : pActive;

  if (parentKey === '__root__') {
    const ids = rootedCollections.map((c) => c.docId!);
    const oldIndex = ids.indexOf(activeCardId);
    const newIndex = ids.indexOf(overCardId);
    if (oldIndex < 0 || newIndex < 0) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    await Promise.all(newIds.map((id, idx) => patchCard(id, { curatedRootOrder: idx * 10 })));
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

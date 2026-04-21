import type { Card } from '@/lib/types/card';
import { collectCuratedSubtreeIdsFromMaster, normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';

/** Merge a large admin snapshot with fresher paginated rows (same rules as CollectionsManagerPanel). */
export function mergeCardCatalogs(allCards: Card[], paginated: Card[]): Card[] {
  const byId = new Map<string, Card>();
  for (const c of allCards) {
    if (c.docId) byId.set(c.docId, c);
  }
  for (const c of paginated) {
    if (!c.docId) continue;
    const prev = byId.get(c.docId);
    if (!prev) {
      byId.set(c.docId, c);
      continue;
    }
    const merged: Card = { ...prev, ...c };
    if (!Object.hasOwn(c, 'childrenIds')) merged.childrenIds = prev.childrenIds;
    if (!Object.hasOwn(c, 'curatedRoot')) merged.curatedRoot = prev.curatedRoot;
    if (!Object.hasOwn(c, 'curatedRootOrder')) merged.curatedRootOrder = prev.curatedRootOrder;
    byId.set(c.docId, merged);
  }
  return Array.from(byId.values());
}

function buildParentByChild(catalog: Card[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const parent of catalog) {
    if (!parent.docId) continue;
    normalizeCuratedChildIds(parent.childrenIds).forEach((childId) => map.set(childId, parent.docId));
  }
  return map;
}

function buildChildIdSet(catalog: Card[]): Set<string> {
  const set = new Set<string>();
  catalog.forEach((card) => normalizeCuratedChildIds(card.childrenIds).forEach((id) => set.add(id)));
  return set;
}

export type CuratedTreeAttachCandidateOptions = {
  curatedTreeMasterId: string | null;
  /** Same role as Collections `cardMatchesSidebar` (type + sidebar tag dimensions + title search from feed). */
  matchesFilters: (card: Card) => boolean;
  statusFilter: 'all' | 'draft' | 'published';
};

/**
 * Cards eligible to attach into the curated tree (aligned with Collections **unparented** list).
 * Requires a merged catalog that includes `childrenIds` / `curatedRoot` for relevant cards.
 */
export function listCuratedTreeAttachCandidates(
  catalog: Card[],
  opts: CuratedTreeAttachCandidateOptions
): Card[] {
  const { curatedTreeMasterId, matchesFilters, statusFilter } = opts;
  const parentByChild = buildParentByChild(catalog);
  const childIdSet = buildChildIdSet(catalog);
  const cardById = new Map(catalog.map((c) => [c.docId, c]));
  const masterCard = curatedTreeMasterId ? cardById.get(curatedTreeMasterId) ?? null : null;
  const useMasterTree = Boolean(curatedTreeMasterId && masterCard?.docId);
  const masterSubtreeIds =
    useMasterTree && curatedTreeMasterId
      ? collectCuratedSubtreeIdsFromMaster(catalog, curatedTreeMasterId)
      : new Set<string>();

  const list = catalog.filter((card) => {
    if (!card.docId) return false;
    if (!matchesFilters(card)) return false;
    if (statusFilter !== 'all' && card.status !== statusFilter) return false;

    if (useMasterTree && curatedTreeMasterId) {
      if (card.docId === curatedTreeMasterId) return false;
      if (masterSubtreeIds.has(card.docId)) return false;
      return true;
    }

    if (parentByChild.has(card.docId)) return false;
    if (childIdSet.has(card.docId)) return false;
    if (card.curatedRoot === true) return false;
    return true;
  });

  list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  return list;
}

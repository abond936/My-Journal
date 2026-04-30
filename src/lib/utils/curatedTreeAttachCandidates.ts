import type { Card } from '@/lib/types/card';
import { buildParentIdsByChild } from '@/lib/utils/curatedCollectionTree';

/** Merge a large admin snapshot with fresher paginated rows. */
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
    if (!Object.hasOwn(c, 'isCollectionRoot')) merged.isCollectionRoot = prev.isCollectionRoot;
    if (!Object.hasOwn(c, 'collectionRootOrder')) merged.collectionRootOrder = prev.collectionRootOrder;
    byId.set(c.docId, merged);
  }
  return Array.from(byId.values());
}

export type CuratedTreeAttachCandidateOptions = {
  matchesFilters: (card: Card) => boolean;
  statusFilter: 'all' | 'draft' | 'published';
};

/**
 * Studio cards pane now shows the full card catalog; attaching is one action, not the identity of the pane.
 */
export function listCuratedTreeAttachCandidates(
  catalog: Card[],
  opts: CuratedTreeAttachCandidateOptions
): Card[] {
  const { matchesFilters, statusFilter } = opts;
  return catalog
    .filter((card) => {
      if (!card.docId) return false;
      if (!matchesFilters(card)) return false;
      if (statusFilter !== 'all' && card.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

export function listOrphanedCards(catalog: Card[]): Card[] {
  const parentIdsByChild = buildParentIdsByChild(catalog);
  return catalog.filter((card) => {
    if (!card.docId) return false;
    if (card.isCollectionRoot === true) return false;
    return (parentIdsByChild.get(card.docId) ?? []).length === 0;
  });
}

import type { Card } from '@/lib/types/card';
import {
  listCuratedTreeAttachCandidates,
  listOrphanedCards,
} from '@/lib/utils/curatedTreeAttachCandidates';

describe('listCuratedTreeAttachCandidates', () => {
  const matchesFilters = () => true;

  it('returns the full filtered card catalog for the Studio cards pane', () => {
    const cards: Card[] = [
      { docId: 'root-1', isCollectionRoot: true, childrenIds: ['child-1'] } as Card,
      { docId: 'child-1', childrenIds: [] } as Card,
      { docId: 'outside-1', childrenIds: [] } as Card,
      { docId: 'outside-2', status: 'draft', childrenIds: [] } as Card,
    ];

    const ids = listCuratedTreeAttachCandidates(cards, {
      matchesFilters,
      statusFilter: 'all',
    }).map((card) => card.docId);

    expect(ids).toEqual(['root-1', 'child-1', 'outside-1', 'outside-2']);
  });
});

describe('listOrphanedCards', () => {
  it('returns cards with no parents and no root marker', () => {
    const cards: Card[] = [
      { docId: 'root-1', isCollectionRoot: true, childrenIds: ['child-1'] } as Card,
      { docId: 'parent-2', childrenIds: ['child-1'] } as Card,
      { docId: 'child-1', childrenIds: [] } as Card,
      { docId: 'orphan-1', childrenIds: [] } as Card,
    ];

    expect(listOrphanedCards(cards).map((card) => card.docId)).toEqual(['parent-2', 'orphan-1']);
  });
});

import type { Card } from '@/lib/types/card';
import {
  buildChildrenIdsWithInsertBefore,
  buildParentIdsByChild,
  buildRootDocIdListWithInsertBefore,
  getParentIdsForCard,
  listCollectionRootCards,
  normalizeCuratedChildIds,
  nextCollectionRootOrderForAppend,
  wouldAttachChildCreateCuratedCycle,
} from '@/lib/utils/curatedCollectionTree';

describe('normalizeCuratedChildIds', () => {
  it('dedupes while preserving first-seen order, trims, drops empty', () => {
    expect(normalizeCuratedChildIds(['b', ' a ', '', 'b', '  '])).toEqual(['b', 'a']);
  });

  it('returns [] for non-arrays', () => {
    expect(normalizeCuratedChildIds(undefined)).toEqual([]);
    expect(normalizeCuratedChildIds(null)).toEqual([]);
    expect(normalizeCuratedChildIds({})).toEqual([]);
  });
});

describe('wouldAttachChildCreateCuratedCycle', () => {
  const cards: Card[] = [
    { docId: 'A', childrenIds: ['B'] } as Card,
    { docId: 'B', childrenIds: ['C'] } as Card,
    { docId: 'C', childrenIds: [] } as Card,
    { docId: 'X', childrenIds: ['Y'] } as Card,
    { docId: 'Y', childrenIds: [] } as Card,
  ];

  it('returns true when the new parent lies under the child subtree (would create a cycle)', () => {
    expect(wouldAttachChildCreateCuratedCycle(cards, 'A', 'C')).toBe(true);
  });

  it('returns false for unrelated attach', () => {
    expect(wouldAttachChildCreateCuratedCycle(cards, 'Y', 'A')).toBe(false);
  });
});

describe('buildChildrenIdsWithInsertBefore', () => {
  it('inserts before sibling when present', () => {
    expect(buildChildrenIdsWithInsertBefore(['a', 'b', 'c'], 'x', 'b')).toEqual(['a', 'x', 'b', 'c']);
  });
});

describe('buildRootDocIdListWithInsertBefore', () => {
  it('moves existing id before target root', () => {
    expect(buildRootDocIdListWithInsertBefore(['r1', 'r2', 'r3'], 'r3', 'r1')).toEqual(['r3', 'r1', 'r2']);
  });
});

describe('nextCollectionRootOrderForAppend', () => {
  it('returns max order + 10, excluding optional id', () => {
    const roots = [
      { docId: 'a', collectionRootOrder: 10 } as Card,
      { docId: 'b', collectionRootOrder: 50 } as Card,
    ];
    expect(nextCollectionRootOrderForAppend(roots)).toBe(60);
    expect(nextCollectionRootOrderForAppend(roots, 'b')).toBe(20);
  });
});

describe('multi-parent helpers', () => {
  const cards: Card[] = [
    { docId: 'root-2', isCollectionRoot: true, collectionRootOrder: 10, childrenIds: [] } as Card,
    { docId: 'root-1', isCollectionRoot: true, collectionRootOrder: 20, childrenIds: ['child-1'] } as Card,
    { docId: 'alt-parent', childrenIds: ['child-1'] } as Card,
    { docId: 'child-1', childrenIds: ['grandchild-1'] } as Card,
    { docId: 'grandchild-1', childrenIds: [] } as Card,
  ];

  it('lists roots from the explicit root marker in order', () => {
    expect(listCollectionRootCards(cards).map((c) => c.docId)).toEqual(['root-2', 'root-1']);
  });

  it('returns no roots when none are explicitly marked', () => {
    const legacyCards: Card[] = [
      { docId: 'master', childrenIds: ['child-1'] } as Card,
      { docId: 'child-1', childrenIds: [] } as Card,
    ];
    expect(listCollectionRootCards(legacyCards).map((c) => c.docId)).toEqual([]);
  });

  it('returns all parents for a shared child', () => {
    const parentIdsByChild = buildParentIdsByChild(cards);
    expect(parentIdsByChild.get('child-1')).toEqual(['root-1', 'alt-parent']);
    expect(getParentIdsForCard(cards, 'child-1')).toEqual(['root-1', 'alt-parent']);
  });
});

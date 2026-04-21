import type { Card } from '@/lib/types/card';
import {
  buildChildrenIdsWithInsertBefore,
  buildRootDocIdListWithInsertBefore,
  normalizeCuratedChildIds,
  nextCuratedRootOrderForAppend,
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

  it('returns true for self or missing ids', () => {
    expect(wouldAttachChildCreateCuratedCycle(cards, 'A', 'A')).toBe(true);
    expect(wouldAttachChildCreateCuratedCycle(cards, '', 'A')).toBe(true);
    expect(wouldAttachChildCreateCuratedCycle(cards, 'A', '')).toBe(true);
  });
});

describe('buildChildrenIdsWithInsertBefore', () => {
  it('inserts before sibling when present', () => {
    expect(buildChildrenIdsWithInsertBefore(['a', 'b', 'c'], 'x', 'b')).toEqual(['a', 'x', 'b', 'c']);
  });

  it('appends when sibling missing', () => {
    expect(buildChildrenIdsWithInsertBefore(['a'], 'x', 'missing')).toEqual(['a', 'x']);
  });
});

describe('buildRootDocIdListWithInsertBefore', () => {
  it('moves existing id before target root', () => {
    expect(buildRootDocIdListWithInsertBefore(['r1', 'r2', 'r3'], 'r3', 'r1')).toEqual(['r3', 'r1', 'r2']);
  });
});

describe('nextCuratedRootOrderForAppend', () => {
  it('returns max order + 10, excluding optional id', () => {
    const roots = [
      { docId: 'a', curatedRootOrder: 10 } as Card,
      { docId: 'b', curatedRootOrder: 50 } as Card,
    ];
    expect(nextCuratedRootOrderForAppend(roots)).toBe(60);
    expect(nextCuratedRootOrderForAppend(roots, 'b')).toBe(20);
  });
});

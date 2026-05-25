import type { Card } from '@/lib/types/card';
import {
  buildCuratedInsertBeforeDropId,
  buildChildrenIdsWithInsertBefore,
  buildParentIdsByChild,
  buildRootDocIdListWithInsertBefore,
  CURATED_ROOT_DROP_PARENT_KEY,
  deriveCuratedMutationPlan,
  getParentIdsForCard,
  listCollectionRootCards,
  normalizeCuratedChildIds,
  nextCollectionRootOrderForAppend,
  resolveCuratedDropIntent,
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

describe('resolveCuratedDropIntent', () => {
  it('preserves branch parent context for insert-before targets', () => {
    const dropId = buildCuratedInsertBeforeDropId('child-2', 'parent-1');
    expect(resolveCuratedDropIntent(dropId)).toEqual({
      kind: 'insert-before',
      beforeId: 'child-2',
      parentId: 'parent-1',
    });
  });

  it('treats encoded root insert-before targets as top-level reorder', () => {
    const dropId = buildCuratedInsertBeforeDropId('root-2', null);
    expect(dropId).toBe(`insertBefore:${CURATED_ROOT_DROP_PARENT_KEY}:root-2`);
    expect(resolveCuratedDropIntent(dropId)).toEqual({
      kind: 'insert-before',
      beforeId: 'root-2',
      parentId: null,
    });
  });

  it('prefers structured droppable data when available', () => {
    expect(
      resolveCuratedDropIntent('insertBefore:wrong-parent:wrong-child', {
        dropKind: 'insert-before',
        parentId: 'actual-parent',
        beforeCardId: 'actual-child',
      })
    ).toEqual({
      kind: 'insert-before',
      beforeId: 'actual-child',
      parentId: 'actual-parent',
    });
  });
});

describe('deriveCuratedMutationPlan', () => {
  const rootedCollectionIds = ['root-1', 'root-2'];

  it('moves a child from one parent to another parent branch', () => {
    expect(
      deriveCuratedMutationPlan({
        childId: 'child-1',
        intent: { kind: 'parent', parentId: 'parent-new' },
        source: { sourceParentId: 'parent-old' },
        rootedCollectionIds,
      })
    ).toEqual([
      { kind: 'detach-parent', parentId: 'parent-old', childId: 'child-1' },
      { kind: 'append-parent', parentId: 'parent-new', childId: 'child-1' },
    ]);
  });

  it('promotes a nested child to top-level root and removes the old branch edge', () => {
    expect(
      deriveCuratedMutationPlan({
        childId: 'child-1',
        intent: { kind: 'tree-root' },
        source: { sourceParentId: 'parent-old' },
        rootedCollectionIds,
      })
    ).toEqual([
      { kind: 'detach-parent', parentId: 'parent-old', childId: 'child-1' },
      { kind: 'set-root', cardId: 'child-1', rootOrder: 20 },
    ]);
  });

  it('drops before a sibling in a specific target branch', () => {
    expect(
      deriveCuratedMutationPlan({
        childId: 'child-1',
        intent: { kind: 'insert-before', beforeId: 'child-2', parentId: 'parent-new' },
        source: { sourceParentId: 'parent-old' },
        rootedCollectionIds,
      })
    ).toEqual([
      { kind: 'detach-parent', parentId: 'parent-old', childId: 'child-1' },
      { kind: 'insert-before', parentId: 'parent-new', childId: 'child-1', beforeSiblingId: 'child-2' },
    ]);
  });

  it('moves a root card into a parent branch and clears root status', () => {
    expect(
      deriveCuratedMutationPlan({
        childId: 'root-2',
        intent: { kind: 'parent', parentId: 'parent-new' },
        source: { sourceIsRoot: true },
        rootedCollectionIds,
      })
    ).toEqual([
      { kind: 'clear-root', cardId: 'root-2' },
      { kind: 'append-parent', parentId: 'parent-new', childId: 'root-2' },
    ]);
  });

  it('reorders roots before another root without clearing root status', () => {
    expect(
      deriveCuratedMutationPlan({
        childId: 'root-2',
        intent: { kind: 'insert-before', beforeId: 'root-1', parentId: null },
        source: { sourceIsRoot: true },
        rootedCollectionIds,
      })
    ).toEqual([{ kind: 'set-root', cardId: 'root-2', rootOrder: 0 }]);
  });

  it('detaches only the current parent on orphan drop', () => {
    expect(
      deriveCuratedMutationPlan({
        childId: 'child-1',
        intent: { kind: 'orphaned' },
        source: { sourceParentId: 'parent-old' },
        rootedCollectionIds,
      })
    ).toEqual([{ kind: 'detach-parent', parentId: 'parent-old', childId: 'child-1' }]);
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

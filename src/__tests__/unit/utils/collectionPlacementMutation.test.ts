import type { Collection, CollectionPlacement } from '@/lib/types/collection';
import {
  buildCollectionPlacementMutationPlan,
  CollectionPlacementMutationError,
} from '@/lib/utils/collectionPlacementMutation';

const now = 1_000;

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    docId: 'my-life',
    title: 'My Life',
    lifecycle: 'draft',
    recordState: 'active',
    structureRevision: 3,
    order: 10,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function placement(
  docId: string,
  cardId: string,
  role: CollectionPlacement['role'],
  order: number,
  parentPlacementId: string | null = null
): CollectionPlacement {
  return {
    docId,
    collectionId: 'my-life',
    cardId,
    parentPlacementId,
    role,
    order,
    createdAt: 1,
    updatedAt: 1,
  };
}

const current = [
  placement('chapter-a', 'card-a', 'chapter', 10),
  placement('story-a', 'story', 'card', 10, 'chapter-a'),
  placement('chapter-b', 'card-b', 'chapter', 20),
  placement('story-b', 'story', 'card', 10, 'chapter-b'),
];

function proposedFrom(placements: CollectionPlacement[]) {
  return placements.map(({ docId, cardId, parentPlacementId, role, order }) => ({
    docId,
    cardId,
    parentPlacementId,
    role,
    order,
  }));
}

describe('buildCollectionPlacementMutationPlan', () => {
  it('creates one revisioned, recoverable atomic plan while preserving reused Card identity', () => {
    const proposed = proposedFrom(current).map((item) =>
      item.docId === 'chapter-b' ? { ...item, order: 5 } : item
    );
    const plan = buildCollectionPlacementMutationPlan({
      collection: collection(),
      currentPlacements: current,
      proposedPlacements: proposed,
      existingCardIds: new Set(['card-a', 'card-b', 'story']),
      expectedStructureRevision: 3,
      now,
    });
    expect(plan).toMatchObject({
      changed: true,
      nextRevision: 4,
      deletePlacementIds: [],
      upserts: [expect.objectContaining({ docId: 'chapter-b', order: 5, updatedAt: now })],
      operation: expect.objectContaining({
        kind: 'collection-structure-replace',
        previousRevision: 3,
        nextRevision: 4,
        placementCount: 4,
      }),
    });
    expect(plan.operation?.beforePlacements).toHaveLength(4);
    expect(proposed.filter((item) => item.cardId === 'story')).toHaveLength(2);
  });

  it('does not create an operation or advance the revision for an identical graph', () => {
    const plan = buildCollectionPlacementMutationPlan({
      collection: collection(),
      currentPlacements: current,
      proposedPlacements: proposedFrom(current),
      existingCardIds: new Set(['card-a', 'card-b', 'story']),
      expectedStructureRevision: 3,
      now,
    });
    expect(plan).toEqual({
      changed: false,
      nextRevision: 3,
      upserts: [],
      deletePlacementIds: [],
      operation: null,
    });
  });

  it('refuses the inactive migration shadow', () => {
    expect(() => buildCollectionPlacementMutationPlan({
      collection: collection({ recordState: 'shadow' }),
      currentPlacements: current,
      proposedPlacements: proposedFrom(current),
      existingCardIds: new Set(['card-a', 'card-b', 'story']),
      expectedStructureRevision: 3,
      now,
    })).toThrow(expect.objectContaining<Partial<CollectionPlacementMutationError>>({
      code: 'COLLECTION_NOT_ACTIVE',
    }));
  });

  it('refuses a stale Studio revision', () => {
    expect(() => buildCollectionPlacementMutationPlan({
      collection: collection(),
      currentPlacements: current,
      proposedPlacements: proposedFrom(current),
      existingCardIds: new Set(['card-a', 'card-b', 'story']),
      expectedStructureRevision: 2,
      now,
    })).toThrow(expect.objectContaining<Partial<CollectionPlacementMutationError>>({
      code: 'COLLECTION_REVISION_CONFLICT',
    }));
  });

  it('rejects missing Cards, illegal depth, and duplicate sibling order before any write', () => {
    const invalid = proposedFrom(current);
    invalid[1] = { ...invalid[1], cardId: 'missing', role: 'section', parentPlacementId: null };
    invalid[2] = { ...invalid[2], order: 10 };
    expect(() => buildCollectionPlacementMutationPlan({
      collection: collection(),
      currentPlacements: current,
      proposedPlacements: invalid,
      existingCardIds: new Set(['card-a', 'card-b', 'story']),
      expectedStructureRevision: 3,
      now,
    })).toThrow(expect.objectContaining<Partial<CollectionPlacementMutationError>>({
      code: 'COLLECTION_STRUCTURE_INVALID',
    }));
  });

  it('plans removed placements without deleting their canonical Cards', () => {
    const proposed = proposedFrom(current).filter((item) => item.docId !== 'story-b');
    const plan = buildCollectionPlacementMutationPlan({
      collection: collection(),
      currentPlacements: current,
      proposedPlacements: proposed,
      existingCardIds: new Set(['card-a', 'card-b', 'story']),
      expectedStructureRevision: 3,
      now,
    });
    expect(plan.deletePlacementIds).toEqual(['story-b']);
    expect(plan.operation?.beforePlacements.find((item) => item.docId === 'story-b')).toMatchObject({
      cardId: 'story',
    });
  });
});

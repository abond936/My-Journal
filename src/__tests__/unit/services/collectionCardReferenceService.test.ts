import {
  assertCardHasNoCollectionPlacements,
  hasActiveCollectionPlacement,
} from '@/lib/services/collections/collectionCardReferenceService';

function fixture(placements: Array<{ id: string; collectionId: string }>) {
  const query = { collection: 'collection_placements', field: 'cardId', value: 'card-1' };
  const firestore = {
    collection: jest.fn(() => ({
      where: jest.fn(() => query),
    })),
  };
  const transaction = {
    get: jest.fn(async () => ({
      empty: placements.length === 0,
      docs: placements.map((placement) => ({
        id: placement.id,
        data: () => ({ collectionId: placement.collectionId, cardId: 'card-1' }),
      })),
    })),
  };
  return { firestore: firestore as never, transaction: transaction as never };
}

describe('assertCardHasNoCollectionPlacements', () => {
  it('allows deletion when no durable placement references the Card', async () => {
    const { firestore, transaction } = fixture([]);
    await expect(assertCardHasNoCollectionPlacements({
      firestore,
      transaction,
      cardId: 'card-1',
    })).resolves.toBeUndefined();
  });

  it('blocks deletion and reports every affected Collection placement', async () => {
    const { firestore, transaction } = fixture([
      { id: 'placement-b', collectionId: 'collection-2' },
      { id: 'placement-a', collectionId: 'collection-1' },
      { id: 'placement-c', collectionId: 'collection-1' },
    ]);
    await expect(assertCardHasNoCollectionPlacements({
      firestore,
      transaction,
      cardId: 'card-1',
    })).rejects.toMatchObject({
      code: 'COLLECTION_PLACEMENT_REFERENCE',
      details: {
        cardId: 'card-1',
        placementCount: 3,
        placementIds: ['placement-a', 'placement-b', 'placement-c'],
        collectionIds: ['collection-1', 'collection-2'],
      },
    });
  });
});

describe('hasActiveCollectionPlacement', () => {
  function destinationFixture(args: {
    placements: Array<{ id: string; collectionId: string }>;
    collections: Record<string, { recordState?: string; lifecycle?: string } | undefined>;
  }) {
    const query = { collection: 'collection_placements', field: 'cardId', value: 'card-1' };
    const firestore = {
      collection: jest.fn((collectionName: string) => ({
        where: jest.fn(() => query),
        doc: jest.fn((id: string) => ({ id, collectionName })),
      })),
    };
    const transaction = {
      get: jest.fn(async () => ({
        empty: args.placements.length === 0,
        docs: args.placements.map((placement) => ({
          id: placement.id,
          data: () => ({ collectionId: placement.collectionId, cardId: 'card-1' }),
        })),
      })),
      getAll: jest.fn(async (...refs: Array<{ id: string }>) =>
        refs.map((ref) => ({
          id: ref.id,
          exists: Boolean(args.collections[ref.id]),
          data: () => args.collections[ref.id],
        }))
      ),
    };
    return { firestore: firestore as never, transaction: transaction as never };
  }

  it('accepts placement in an active draft Collection', async () => {
    const { firestore, transaction } = destinationFixture({
      placements: [{ id: 'placement-1', collectionId: 'collection-1' }],
      collections: { 'collection-1': { recordState: 'active', lifecycle: 'draft' } },
    });
    await expect(hasActiveCollectionPlacement({
      firestore,
      transaction,
      cardId: 'card-1',
    })).resolves.toBe(true);
  });

  it('rejects placements whose Collection is shadowed or missing', async () => {
    const { firestore, transaction } = destinationFixture({
      placements: [
        { id: 'placement-1', collectionId: 'collection-shadow' },
        { id: 'placement-2', collectionId: 'collection-missing' },
      ],
      collections: { 'collection-shadow': { recordState: 'shadow', lifecycle: 'published' } },
    });
    await expect(hasActiveCollectionPlacement({
      firestore,
      transaction,
      cardId: 'card-1',
    })).resolves.toBe(false);
  });
});

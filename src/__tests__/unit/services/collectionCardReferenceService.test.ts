import { assertCardHasNoCollectionPlacements } from '@/lib/services/collections/collectionCardReferenceService';

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

import { promoteCollectionStructure } from '@/lib/services/collections/collectionStructurePromotionService';

function docSnapshot(id: string, data: Record<string, unknown>) {
  return { id, exists: true, data: () => data };
}

describe('promoteCollectionStructure', () => {
  it('atomically creates only the target Collection, copied placements, and operation', async () => {
    let generatedPlacement = 0;
    const sourceCollection = {
      title: 'My Life', lifecycle: 'published', recordState: 'active', structureRevision: 4,
      authorityRevision: 1, order: 10, createdAt: 1, updatedAt: 1,
    };
    const sourcePlacements = [
      { id: 'chapter', data: { collectionId: 'my-life', cardId: 'chapter-card', role: 'chapter', order: 10, createdAt: 1, updatedAt: 1 } },
      { id: 'section', data: { collectionId: 'my-life', cardId: 'section-card', parentPlacementId: 'chapter', role: 'section', order: 10, createdAt: 1, updatedAt: 1 } },
      { id: 'story', data: { collectionId: 'my-life', cardId: 'story-card', parentPlacementId: 'section', role: 'card', order: 10, createdAt: 1, updatedAt: 1 } },
    ];
    const create = jest.fn();
    const refs = {
      collections: { kind: 'collections-query', doc: jest.fn((id?: string) => ({ kind: 'collection-doc', id: id ?? 'new-collection' })) },
      collection_placements: {
        kind: 'placements-query',
        doc: jest.fn((id?: string) => ({ kind: 'placement-doc', id: id ?? `new-placement-${++generatedPlacement}` })),
        where: jest.fn(() => ({ kind: 'source-placements-query' })),
      },
      cards: { kind: 'cards-query', doc: jest.fn((id: string) => ({ kind: 'card-doc', id })) },
      collection_structure_operations: {
        kind: 'operations-query', doc: jest.fn((id: string) => ({ kind: 'operation-doc', id })),
      },
    };
    const transaction = {
      get: jest.fn(async (ref: { kind: string; id?: string }) => {
        if (ref.kind === 'collection-doc') {
          return docSnapshot(ref.id!, sourceCollection);
        }
        if (ref.kind === 'collections-query') {
          return { docs: [docSnapshot('my-life', sourceCollection)] };
        }
        if (ref.kind === 'source-placements-query') {
          return { docs: sourcePlacements.map((item) => docSnapshot(item.id, item.data)) };
        }
        throw new Error(`Unexpected transaction read ${ref.kind}`);
      }),
      getAll: jest.fn(async (...cardRefs: Array<{ id: string }>) =>
        cardRefs.map((ref) => ({ id: ref.id, exists: true }))
      ),
      create,
    };
    const firestore = {
      collection: jest.fn((name: keyof typeof refs) => refs[name]),
      runTransaction: jest.fn(async (callback: (value: typeof transaction) => unknown) => callback(transaction)),
    } as never;

    const result = await promoteCollectionStructure({
      sourceCollectionId: 'my-life', sourcePlacementId: 'chapter', expectedStructureRevision: 4,
      title: ' Growing Up ', now: 100, firestore,
    });

    expect(result.collection).toMatchObject({
      docId: 'new-collection', title: 'Growing Up', introductionCardId: 'chapter-card',
      lifecycle: 'draft', recordState: 'active', order: 20,
    });
    expect(result.placements).toEqual([
      expect.objectContaining({ cardId: 'section-card', role: 'chapter', parentPlacementId: null }),
      expect.objectContaining({ cardId: 'story-card', role: 'card', parentPlacementId: 'new-placement-1' }),
    ]);
    expect(create).toHaveBeenCalledTimes(4);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'collection-doc', id: 'new-collection' }),
      result.collection
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'operation-doc', id: 'promote-new-collection' }),
      result.operation
    );
    expect(create.mock.calls.some(([, value]) => value === sourceCollection)).toBe(false);
  });
});

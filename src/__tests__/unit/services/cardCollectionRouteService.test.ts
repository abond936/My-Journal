const mockGetReaderStructure = jest.fn();

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));
jest.mock('@/lib/services/collections/collectionProjectionReadService', () => ({
  getReaderCollectionStructure: (...args: unknown[]) => mockGetReaderStructure(...args),
}));

import { getReaderValidCollectionRoutesByCard } from '@/lib/services/collections/cardCollectionRouteService';

function doc(id: string, data: Record<string, unknown>, exists = true) {
  return { id, exists, data: () => data };
}

describe('cardCollectionRouteService', () => {
  it('discovers both placed and introduction Collection routes and excludes invalid routes', async () => {
    mockGetReaderStructure.mockImplementation(async ({ collectionId }: { collectionId: string }) =>
      collectionId === 'invalid-book' ? null : ({} as never));
    const collections = {
      'placed-book': doc('placed-book', { title: 'Placed', lifecycle: 'published', recordState: 'active' }),
      'intro-book': doc('intro-book', { title: 'Introduction', lifecycle: 'published', recordState: 'active' }),
      'invalid-book': doc('invalid-book', { title: 'Invalid', lifecycle: 'published', recordState: 'active' }),
    };
    const firestore = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn((id: string) => ({ name, id })),
        where: jest.fn((field: string) => ({
          get: jest.fn().mockResolvedValue(field === 'cardId'
            ? { docs: [
                doc('placement-1', { cardId: 'card-1', collectionId: 'placed-book' }),
                doc('placement-2', { cardId: 'card-1', collectionId: 'invalid-book' }),
              ] }
            : { docs: [doc('intro-book', { introductionCardId: 'card-1' })] }),
        })),
      })),
      getAll: jest.fn(async (...refs: Array<{ id: keyof typeof collections }>) =>
        refs.map((ref) => collections[ref.id])),
    };

    const result = await getReaderValidCollectionRoutesByCard({
      cardIds: ['card-1'],
      firestore: firestore as never,
    });

    expect(result.get('card-1')?.map((collection) => collection.docId)).toEqual([
      'intro-book', 'placed-book',
    ]);
  });
});

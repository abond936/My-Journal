const mockGetReaderStructure = jest.fn();
const mockGetCollectionRoutes = jest.fn();

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));
jest.mock('@/lib/services/collections/collectionProjectionReadService', () => ({
  getReaderCollectionStructure: (...args: unknown[]) => mockGetReaderStructure(...args),
}));
jest.mock('@/lib/services/collections/cardCollectionRouteService', () => ({
  getReaderValidCollectionRoutesByCard: (...args: unknown[]) => mockGetCollectionRoutes(...args),
}));

import { getAudienceGroupMembershipImpact } from '@/lib/services/audienceGroupImpactService';

function doc(id: string, data: Record<string, unknown>, exists = true) {
  return { id, exists, data: () => data };
}

describe('audienceGroupImpactService', () => {
  it('shows exact gains and losses across live Collection and Card access unions', async () => {
    const family = doc('family', { name: 'Family', memberContactIds: ['alex'], createdAt: 1, updatedAt: 1 });
    const book = {
      docId: 'book', title: 'Family Book', lifecycle: 'published', recordState: 'active',
      audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
    };
    const directCard = {
      docId: 'direct', title: 'Direct Story', status: 'published', feedIncluded: true,
      audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
    };
    const collectionCard = { docId: 'in-book', title: 'Book Story', status: 'published', feedIncluded: false };
    const sharedPhotos = {
      title: 'Family Photos', mediaIds: ['media-1'], lifecycle: 'published', revision: 1,
      order: 10, createdAt: 1, updatedAt: 2,
      audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
    };
    mockGetReaderStructure.mockResolvedValue({ collection: book, cards: [collectionCard], placements: [] });
    mockGetCollectionRoutes.mockResolvedValue(new Map([
      ['direct', []],
      ['in-book', [book]],
    ]));
    const firestore = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(family) })),
        get: jest.fn().mockResolvedValue(name === 'audience_groups' ? { docs: [family] } : { docs: [] }),
        where: jest.fn((field: string) => ({
          get: jest.fn().mockResolvedValue(
            name === 'journal_users'
              ? { docs: [
                  doc('alex', { displayName: 'Alex', role: 'viewer', disabled: false }),
                  doc('blair', { displayName: 'Blair', role: 'viewer', disabled: false }),
                ], size: 2 }
              : name === 'cards' && field === 'audience.groupIds'
                ? { docs: [doc('direct', directCard)], size: 1 }
                : name === 'collections' && field === 'audience.groupIds'
                  ? { docs: [doc('book', book)], size: 1 }
                  : name === 'shared_media_collections' && field === 'audience.groupIds'
                    ? { docs: [doc('family-photos', sharedPhotos)], size: 1 }
                  : { docs: [], size: 0 }
          ),
        })),
      })),
    };

    const impact = await getAudienceGroupMembershipImpact({
      groupId: 'family',
      proposedMemberContactIds: ['blair'],
      firestore: firestore as never,
    });

    expect(impact).toMatchObject({
      addedMembers: [{ contactId: 'blair', displayName: 'Blair', enabled: true }],
      removedMembers: [{ contactId: 'alex', displayName: 'Alex', enabled: true }],
      referencedCardAudiences: 1,
      referencedCollectionAudiences: 1,
      referencedSharedMediaCollectionAudiences: 1,
      collections: [{
        id: 'book',
        gainingReaders: [{ contactId: 'blair', displayName: 'Blair' }],
        losingReaders: [{ contactId: 'alex', displayName: 'Alex' }],
      }],
      sharedMediaCollections: [{
        id: 'family-photos',
        gainingReaders: [{ contactId: 'blair', displayName: 'Blair' }],
        losingReaders: [{ contactId: 'alex', displayName: 'Alex' }],
      }],
      cards: [
        expect.objectContaining({ id: 'in-book' }),
        expect.objectContaining({ id: 'direct' }),
      ],
    });
  });
});

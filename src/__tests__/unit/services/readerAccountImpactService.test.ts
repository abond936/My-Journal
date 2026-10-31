const mockGetReaderStructure = jest.fn();

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));
jest.mock('@/lib/services/collections/collectionProjectionReadService', () => ({
  getReaderCollectionStructure: (...args: unknown[]) => mockGetReaderStructure(...args),
}));

import {
  getProspectiveReaderAccessImpact,
  getReaderAccountAccessImpact,
} from '@/lib/services/readerAccountImpactService';

function doc(id: string, data: Record<string, unknown>, exists = true) {
  return { id, exists, data: () => data };
}

describe('readerAccountImpactService', () => {
  it('lists the exact Reader-visible Collections and effective Card union lost on disable', async () => {
    const cards = [
      doc('all-card', { title: 'All Readers', status: 'published', feedIncluded: true }),
      doc('family-card', { title: 'Family Feed', status: 'published', feedIncluded: true,
        audience: { allContacts: false, groupIds: ['family'], contactIds: [] } }),
      doc('book-card', { title: 'Book Only', status: 'published', feedIncluded: false }),
      doc('blocked-card', { title: 'Friends Only', status: 'published', feedIncluded: true,
        audience: { allContacts: false, groupIds: ['friends'], contactIds: [] } }),
    ];
    const familyBook = {
      docId: 'family-book', title: 'Family Book', lifecycle: 'published', recordState: 'active',
      audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
    };
    mockGetReaderStructure.mockResolvedValue({
      collection: familyBook,
      placements: [],
      cards: [{ docId: 'book-card', title: 'Book Only', status: 'published', feedIncluded: false }],
    });
    const firestore = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(doc('alex', {
          username: 'alex', displayName: 'Alex', role: 'viewer', disabled: false,
        })) })),
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(
            name === 'audience_groups' ? { docs: [doc('family', {})] }
              : name === 'cards' ? { docs: cards }
                : name === 'collections' ? { docs: [doc('family-book', familyBook)] }
                  : { docs: [] }
          ),
        })),
      })),
    };

    const impact = await getReaderAccountAccessImpact({
      contactId: 'alex', proposedDisabled: true, firestore: firestore as never,
    });

    expect(impact).toMatchObject({
      displayName: 'Alex', currentDisabled: false, proposedDisabled: true, effect: 'lose',
      collections: [{ id: 'family-book', title: 'Family Book' }],
      cards: [
        { id: 'all-card', title: 'All Readers' },
        { id: 'book-card', title: 'Book Only' },
        { id: 'family-card', title: 'Family Feed' },
      ],
    });
  });

  it('limits a prospective Reader to legacy and all-enabled routes', async () => {
    const cards = [
      doc('legacy', { title: 'Legacy Story', status: 'published', feedIncluded: true }),
      doc('selected', { title: 'Selected Story', status: 'published', feedIncluded: true,
        audience: { allContacts: false, groupIds: [], contactIds: ['existing-reader'] } }),
    ];
    const allBook = { docId: 'all-book', title: 'All Book', lifecycle: 'published', recordState: 'active' };
    const selectedBook = { docId: 'selected-book', title: 'Selected Book', lifecycle: 'published', recordState: 'active',
      audience: { allContacts: false, groupIds: [], contactIds: ['existing-reader'] } };
    mockGetReaderStructure.mockImplementation(async ({ collectionId }: { collectionId: string }) => ({
      collection: collectionId === 'all-book' ? allBook : selectedBook,
      placements: [], cards: [],
    }));
    const firestore = {
      collection: jest.fn((name: string) => ({
        where: jest.fn(() => ({ get: jest.fn().mockResolvedValue(
          name === 'cards' ? { docs: cards }
            : name === 'collections' ? { docs: [doc('all-book', allBook), doc('selected-book', selectedBook)] }
              : { docs: [] }
        ) })),
      })),
    };

    await expect(getProspectiveReaderAccessImpact(firestore as never)).resolves.toEqual({
      effect: 'gain',
      cards: [{ id: 'legacy', title: 'Legacy Story' }],
      collections: [{ id: 'all-book', title: 'All Book' }],
    });
  });
});

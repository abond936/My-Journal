import {
  getCardAudienceImpact,
  resolveAudienceReaderIds,
} from '@/lib/services/audienceImpactService';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));

function doc(id: string, data: Record<string, unknown>, exists = true) {
  return { id, exists, data: () => data };
}

describe('audienceImpactService', () => {
  it('resolves enabled group and individual members without duplication', () => {
    expect([...resolveAudienceReaderIds({
      audience: { allContacts: false, groupIds: ['family'], contactIds: ['reader-2'] },
      enabledReaderIds: new Set(['reader-1', 'reader-2']),
      groups: [{ docId: 'family', memberContactIds: ['reader-1', 'reader-2', 'disabled'] }],
    })].sort()).toEqual(['reader-1', 'reader-2']);
  });

  it('combines the proposed standalone audience with active published Collection routes', async () => {
    const snapshots = {
      cards: doc('card-1', { status: 'published', feedIncluded: true }),
      journal_users: {
        docs: [
          doc('reader-1', { displayName: 'Alex', role: 'viewer', disabled: false }),
          doc('reader-2', { displayName: 'Blair', role: 'viewer', disabled: false }),
          doc('disabled', { displayName: 'Casey', role: 'viewer', disabled: true }),
        ],
      },
      audience_groups: { docs: [doc('family', { memberContactIds: ['reader-2', 'disabled'] })] },
      collection_placements: { docs: [doc('placement-1', { cardId: 'card-1', collectionId: 'collection-1' })] },
    };
    const firestore = {
      collection: jest.fn((name: keyof typeof snapshots | 'collections') => ({
        doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(snapshots.cards) })),
        where: jest.fn(() => ({ get: jest.fn().mockResolvedValue(snapshots[name as keyof typeof snapshots]) })),
        get: jest.fn().mockResolvedValue(snapshots[name as keyof typeof snapshots]),
      })),
      getAll: jest.fn().mockResolvedValue([
        doc('collection-1', {
          title: 'Family Book', lifecycle: 'published', recordState: 'active',
          audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
        }),
      ]),
    };

    const result = await getCardAudienceImpact(
      'card-1',
      { allContacts: false, groupIds: [], contactIds: ['reader-1'] },
      firestore as never
    );

    expect(result).toEqual({
      basis: 'current_after_save',
      standaloneIncluded: true,
      effectiveReaders: [
        { contactId: 'reader-1', displayName: 'Alex' },
        { contactId: 'reader-2', displayName: 'Blair' },
      ],
      otherRoutes: [{
        collectionId: 'collection-1',
        title: 'Family Book',
        readers: [{ contactId: 'reader-2', displayName: 'Blair' }],
      }],
    });
  });
});

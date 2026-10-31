import {
  getCardAudienceImpact,
  getCollectionAudienceImpact,
  resolveAudienceReaderIds,
} from '@/lib/services/audienceImpactService';
import { getReaderCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import { getReaderValidCollectionRoutesByCard } from '@/lib/services/collections/cardCollectionRouteService';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));
jest.mock('@/lib/services/collections/collectionProjectionReadService', () => ({
  getReaderCollectionStructure: jest.fn(),
}));
jest.mock('@/lib/services/collections/cardCollectionRouteService', () => ({
  getReaderValidCollectionRoutesByCard: jest.fn(),
}));

const getReaderStructure = getReaderCollectionStructure as jest.MockedFunction<typeof getReaderCollectionStructure>;
const getCollectionRoutes = getReaderValidCollectionRoutesByCard as jest.MockedFunction<typeof getReaderValidCollectionRoutesByCard>;

function doc(id: string, data: Record<string, unknown>, exists = true) {
  return { id, exists, data: () => data };
}

describe('audienceImpactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getReaderStructure.mockResolvedValue({} as never);
    getCollectionRoutes.mockResolvedValue(new Map());
  });
  it('resolves enabled group and individual members without duplication', () => {
    expect([...resolveAudienceReaderIds({
      audience: { allContacts: false, groupIds: ['family'], contactIds: ['reader-2'] },
      enabledReaderIds: new Set(['reader-1', 'reader-2']),
      groups: [{ docId: 'family', memberContactIds: ['reader-1', 'reader-2', 'disabled'] }],
    })].sort()).toEqual(['reader-1', 'reader-2']);
  });

  it('combines the proposed standalone audience with active published Collection routes', async () => {
    getCollectionRoutes.mockResolvedValue(new Map([['card-1', [{
      docId: 'collection-1', title: 'Family Book', lifecycle: 'published', recordState: 'active',
      audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
    } as never]]]));
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
      gainingReaders: [],
      losingReaders: [],
      otherRoutes: [{
        collectionId: 'collection-1',
        title: 'Family Book',
        readers: [{ contactId: 'reader-2', displayName: 'Blair' }],
      }],
    });
  });

  it('reports exact losses when standalone Feed inclusion is removed', async () => {
    getCollectionRoutes.mockResolvedValue(new Map());
    const snapshots = {
      cards: doc('card-1', {
        status: 'published', feedIncluded: true,
        audience: { allContacts: false, groupIds: [], contactIds: ['reader-1', 'reader-2'] },
      }),
      journal_users: { docs: [
        doc('reader-1', { displayName: 'Alex', disabled: false }),
        doc('reader-2', { displayName: 'Blair', disabled: false }),
      ] },
      audience_groups: { docs: [] },
    };
    const firestore = {
      collection: jest.fn((name: keyof typeof snapshots) => ({
        doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(snapshots.cards) })),
        where: jest.fn(() => ({ get: jest.fn().mockResolvedValue(snapshots[name]) })),
        get: jest.fn().mockResolvedValue(snapshots[name]),
      })),
    };

    const result = await getCardAudienceImpact(
      'card-1',
      { allContacts: false, groupIds: [], contactIds: ['reader-1', 'reader-2'] },
      firestore as never,
      false
    );

    expect(result).toMatchObject({
      standaloneIncluded: false,
      effectiveReaders: [],
      gainingReaders: [],
      losingReaders: [
        { contactId: 'reader-1', displayName: 'Alex' },
        { contactId: 'reader-2', displayName: 'Blair' },
      ],
    });
  });

  it('omits a Collection route that is not reader-valid', async () => {
    getReaderStructure.mockResolvedValue(null);
    const snapshots = {
      cards: doc('card-1', { status: 'published', feedIncluded: false }),
      journal_users: { docs: [doc('reader-1', { displayName: 'Alex', disabled: false })] },
      audience_groups: { docs: [] },
      collection_placements: { docs: [doc('placement-1', { collectionId: 'broken-book' })] },
    };
    const firestore = {
      collection: jest.fn((name: keyof typeof snapshots | 'collections') => ({
        doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(snapshots.cards) })),
        where: jest.fn(() => ({ get: jest.fn().mockResolvedValue(snapshots[name as keyof typeof snapshots]) })),
        get: jest.fn().mockResolvedValue(snapshots[name as keyof typeof snapshots]),
      })),
      getAll: jest.fn().mockResolvedValue([
        doc('broken-book', { title: 'Broken Book', lifecycle: 'published', recordState: 'active' }),
      ]),
    };

    await expect(getCardAudienceImpact(
      'card-1',
      { allContacts: true, groupIds: [], contactIds: [] },
      firestore as never
    )).resolves.toMatchObject({ effectiveReaders: [], otherRoutes: [] });
  });

  it('previews every placed Card across the proposed Collection and its other routes', async () => {
    getCollectionRoutes.mockResolvedValue(new Map([
      ['card-1', [{
        docId: 'other-book', title: 'Other Book', lifecycle: 'published', recordState: 'active',
        audience: { allContacts: false, groupIds: [], contactIds: ['reader-1'] },
      } as never]],
      ['card-2', []],
      ['missing-card', []],
    ]));
    const collections = {
      'collection-1': doc('collection-1', {
        title: 'Family Archive', lifecycle: 'draft', recordState: 'active',
      }),
      'other-book': doc('other-book', {
        title: 'Other Book', lifecycle: 'published', recordState: 'active',
        audience: { allContacts: false, groupIds: [], contactIds: ['reader-1'] },
      }),
    };
    const cards = {
      'card-1': doc('card-1', { title: 'Beach Story', status: 'published', feedIncluded: false }),
      'card-2': doc('card-2', {
        title: 'Birthday Story', status: 'draft', feedIncluded: true,
        audience: { allContacts: false, groupIds: [], contactIds: ['reader-1'] },
      }),
    };
    const firestore = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn((id: string) => ({
          name,
          id,
          get: jest.fn().mockResolvedValue(name === 'collections'
            ? collections[id as keyof typeof collections]
            : cards[id as keyof typeof cards]),
        })),
        where: jest.fn((field: string, _operator: string, value: unknown) => ({
          get: jest.fn().mockResolvedValue(
            name === 'journal_users'
              ? { docs: [
                  doc('reader-1', { displayName: 'Alex', role: 'viewer', disabled: false }),
                  doc('reader-2', { displayName: 'Blair', role: 'viewer', disabled: false }),
                ] }
              : field === 'collectionId'
                ? { docs: [
                    doc('placement-1', { collectionId: 'collection-1', cardId: 'card-1' }),
                    doc('placement-2', { collectionId: 'collection-1', cardId: 'card-2' }),
                    doc('placement-missing', { collectionId: 'collection-1', cardId: 'missing-card' }),
                  ] }
                : { docs: (value as string[]).includes('card-1')
                    ? [doc('other-placement', { collectionId: 'other-book', cardId: 'card-1' })]
                    : [] },
          ),
        })),
        get: jest.fn().mockResolvedValue(name === 'audience_groups'
          ? { docs: [doc('family', { memberContactIds: ['reader-2'] })] }
          : { docs: [] }),
      })),
      getAll: jest.fn(async (...refs: Array<{ name: string; id: string }>) => refs.map((ref) =>
        ref.name === 'collections'
          ? collections[ref.id as keyof typeof collections] ?? doc(ref.id, {}, false)
          : cards[ref.id as keyof typeof cards] ?? doc(ref.id, {}, false)
      )),
    };

    const result = await getCollectionAudienceImpact(
      'collection-1',
      { allContacts: false, groupIds: ['family'], contactIds: [] },
      firestore as never
    );

    expect(result).toMatchObject({
      basis: 'if_published_and_reader_valid',
      proposedRouteReaders: [{ contactId: 'reader-2', displayName: 'Blair' }],
      missingCardIds: ['missing-card'],
      cards: [
        {
          cardId: 'card-1', title: 'Beach Story', status: 'published',
          effectiveReaders: [
            { contactId: 'reader-1', displayName: 'Alex' },
            { contactId: 'reader-2', displayName: 'Blair' },
          ],
          routes: [
            expect.objectContaining({ kind: 'this_collection', title: 'Family Archive' }),
            expect.objectContaining({ kind: 'other_collection', title: 'Other Book' }),
          ],
        },
        {
          cardId: 'card-2', title: 'Birthday Story', status: 'draft',
          effectiveReaders: [
            { contactId: 'reader-1', displayName: 'Alex' },
            { contactId: 'reader-2', displayName: 'Blair' },
          ],
          routes: [
            expect.objectContaining({ kind: 'this_collection', title: 'Family Archive' }),
            expect.objectContaining({ kind: 'standalone_feed', title: 'standalone Feed' }),
          ],
        },
      ],
    });
  });
});

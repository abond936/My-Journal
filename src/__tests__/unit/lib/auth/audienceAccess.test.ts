import {
  audienceAllowsContact,
  canReadCardForAudience,
  filterCardsForAudience,
  filterCollectionsForAudience,
} from '@/lib/auth/audienceAccess';
import { getReaderValidCollectionRoutesByCard } from '@/lib/services/collections/cardCollectionRouteService';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));
jest.mock('@/lib/services/collections/cardCollectionRouteService', () => ({
  getReaderValidCollectionRoutesByCard: jest.fn(),
}));

const getCollectionRoutes = getReaderValidCollectionRoutesByCard as jest.MockedFunction<typeof getReaderValidCollectionRoutesByCard>;

type Row = { id: string; data: Record<string, unknown> };

function snapshot(rows: Row[]) {
  return { docs: rows.map((row) => ({ id: row.id, data: () => row.data })) };
}

function firestoreFixture(args: {
  groupIds?: string[];
  placements?: Row[];
  collections?: Row[];
}) {
  const collection = jest.fn((name: string) => ({
    where: jest.fn(() => ({
      get: jest.fn(async () => {
        if (name === 'audience_groups') {
          return snapshot((args.groupIds ?? []).map((id) => ({ id, data: {} })));
        }
        if (name === 'collection_placements') return snapshot(args.placements ?? []);
        if (name === 'collections') return snapshot(args.collections ?? []);
        return snapshot([]);
      }),
    })),
  }));
  return { collection };
}

describe('audience access', () => {
  const viewer = { user: { id: 'reader-1', role: 'viewer' } } as never;
  const admin = { user: { id: 'admin-1', role: 'admin' } } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    getCollectionRoutes.mockResolvedValue(new Map());
  });

  it('preserves legacy all-enabled-reader access and resolves explicit union choices', () => {
    const context = { contactId: 'reader-1', groupIds: new Set(['family']) };
    expect(audienceAllowsContact(undefined, context)).toBe(true);
    expect(
      audienceAllowsContact({ allContacts: true, groupIds: [], contactIds: [] }, context)
    ).toBe(true);
    expect(
      audienceAllowsContact({ allContacts: false, groupIds: ['family'], contactIds: [] }, context)
    ).toBe(true);
    expect(
      audienceAllowsContact({ allContacts: false, groupIds: [], contactIds: ['reader-1'] }, context)
    ).toBe(true);
    expect(
      audienceAllowsContact({ allContacts: false, groupIds: ['friends'], contactIds: [] }, context)
    ).toBe(false);
  });

  it('unions standalone Card and authorized Collection routes while preserving order', async () => {
    getCollectionRoutes.mockResolvedValue(new Map([
      ['collection-card', [{
        docId: 'family-book', title: 'Family Book', lifecycle: 'published', recordState: 'active',
        audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
      } as never]],
      ['blocked-card', [{
        docId: 'friends-book', title: 'Friends Book', lifecycle: 'published', recordState: 'active',
        audience: { allContacts: false, groupIds: ['friends'], contactIds: [] },
      } as never]],
    ]));
    const firestore = firestoreFixture({
      groupIds: ['family'],
      placements: [
        { id: 'placement-1', data: { cardId: 'collection-card', collectionId: 'family-book' } },
        { id: 'placement-2', data: { cardId: 'blocked-card', collectionId: 'friends-book' } },
      ],
      collections: [
        {
          id: 'family-book',
          data: {
            lifecycle: 'published',
            recordState: 'active',
            audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
          },
        },
        {
          id: 'friends-book',
          data: {
            lifecycle: 'published',
            recordState: 'active',
            audience: { allContacts: false, groupIds: ['friends'], contactIds: [] },
          },
        },
      ],
    });
    const cards = [
      { docId: 'standalone-card', status: 'published', feedIncluded: true },
      { docId: 'collection-card', status: 'published', feedIncluded: false },
      { docId: 'blocked-card', status: 'published', feedIncluded: false },
      { docId: 'draft-card', status: 'draft', feedIncluded: true },
    ] as never;

    const allowed = await filterCardsForAudience(viewer, cards, firestore as never);

    expect(allowed.map((card) => card.docId)).toEqual(['standalone-card', 'collection-card']);
    await expect(
      canReadCardForAudience(viewer, cards[1], firestore as never)
    ).resolves.toBe(true);
  });

  it('filters Collection navigation by its own audience and fails closed without contact identity', async () => {
    const firestore = firestoreFixture({ groupIds: ['family'] });
    const collections = [
      {
        docId: 'legacy',
        lifecycle: 'published',
        recordState: 'active',
      },
      {
        docId: 'friends',
        lifecycle: 'published',
        recordState: 'active',
        audience: { allContacts: false, groupIds: ['friends'], contactIds: [] },
      },
    ] as never;

    await expect(
      filterCollectionsForAudience(viewer, collections, firestore as never)
    ).resolves.toEqual([collections[0]]);
    await expect(
      filterCollectionsForAudience(
        { user: { role: 'viewer' } } as never,
        collections,
        firestore as never
      )
    ).resolves.toEqual([]);
  });

  it('does not inherit direct Card access from an incomplete published Collection', async () => {
    const firestore = firestoreFixture({
      placements: [{ id: 'placement-1', data: { cardId: 'placed-card', collectionId: 'broken-book' } }],
      collections: [{
        id: 'broken-book',
        data: { lifecycle: 'published', recordState: 'active' },
      }],
    });
    const card = { docId: 'placed-card', status: 'published', feedIncluded: false } as never;

    await expect(filterCardsForAudience(viewer, [card], firestore as never)).resolves.toEqual([]);
    expect(getCollectionRoutes).toHaveBeenCalledWith({ cardIds: ['placed-card'], firestore });
  });

  it('inherits direct Card access through a reader-valid Collection introduction route', async () => {
    const firestore = firestoreFixture({ groupIds: ['family'] });
    getCollectionRoutes.mockResolvedValue(new Map([['introduction-card', [{
      docId: 'family-book', title: 'Family Book', lifecycle: 'published', recordState: 'active',
      introductionCardId: 'introduction-card',
      audience: { allContacts: false, groupIds: ['family'], contactIds: [] },
    } as never]]]));
    const card = { docId: 'introduction-card', status: 'published', feedIncluded: false } as never;

    await expect(filterCardsForAudience(viewer, [card], firestore as never)).resolves.toEqual([card]);
  });

  it('keeps administrator access independent of audience fields', async () => {
    const firestore = firestoreFixture({});
    const card = {
      docId: 'draft-card',
      status: 'draft',
      audience: { allContacts: false, groupIds: [], contactIds: [] },
    } as never;
    await expect(filterCardsForAudience(admin, [card], firestore as never)).resolves.toEqual([card]);
    expect(firestore.collection).not.toHaveBeenCalled();
  });
});

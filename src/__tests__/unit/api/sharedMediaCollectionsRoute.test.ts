import { getServerSession } from 'next-auth/next';
import { GET as listCollections } from '@/app/api/shared-media-collections/route';
import { GET as getCollection } from '@/app/api/shared-media-collections/[id]/route';
import { filterSharedMediaCollectionsForAudience } from '@/lib/auth/audienceAccess';
import {
  getSharedMediaCollection,
  listSharedMediaCollections,
} from '@/lib/services/sharedMediaCollectionService';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/audienceAccess', () => ({
  filterSharedMediaCollectionsForAudience: jest.fn(),
}));
jest.mock('@/lib/services/sharedMediaCollectionService', () => ({
  listSharedMediaCollections: jest.fn(),
  getSharedMediaCollection: jest.fn(),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const session = getServerSession as jest.MockedFunction<typeof getServerSession>;
const filter = filterSharedMediaCollectionsForAudience as jest.MockedFunction<typeof filterSharedMediaCollectionsForAudience>;
const list = listSharedMediaCollections as jest.MockedFunction<typeof listSharedMediaCollections>;
const get = getSharedMediaCollection as jest.MockedFunction<typeof getSharedMediaCollection>;
const request = { url: 'https://example.test/api/shared-media-collections' } as Request;

const collection = {
  docId: 'family-photos', title: 'Family Photos', description: 'Selected memories',
  mediaIds: ['media-1'], audience: { allContacts: true, groupIds: [], contactIds: [] },
  lifecycle: 'published', revision: 1, order: 10, createdAt: 1, updatedAt: 2,
} as const;

describe('Reader Shared Media Collection routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects anonymous list access', async () => {
    session.mockResolvedValue(null);
    const response = await listCollections();
    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it('lists only audience-authorized published sets without exposing Media ids', async () => {
    session.mockResolvedValue({ user: { id: 'viewer', role: 'viewer' } } as never);
    list.mockResolvedValue([collection]);
    filter.mockResolvedValue([collection]);

    const response = await listCollections();
    expect(await response.json()).toEqual({
      ok: true,
      collections: [{
        docId: 'family-photos', title: 'Family Photos', description: 'Selected memories',
        mediaCount: 1, order: 10,
      }],
    });
  });

  it('returns display-only Media through the protected Reader delivery route', async () => {
    session.mockResolvedValue({ user: { id: 'viewer', role: 'viewer' } } as never);
    get.mockResolvedValue({
      collection,
      media: [{
        docId: 'media-1', filename: 'family.jpg', caption: 'At the lake',
        storagePath: 'private/media-1.jpg', storageUrl: 'https://storage.example/private',
        width: 1200, height: 800,
      } as never],
    });
    filter.mockResolvedValue([collection]);

    const response = await getCollection(request, { params: Promise.resolve({ id: 'family-photos' }) });
    const body = await response.json() as { collection: { media: Array<Record<string, unknown>> } };

    expect(response.status).toBe(200);
    expect(body.collection.media).toEqual([{
      docId: 'media-1', filename: 'family.jpg', caption: 'At the lake', width: 1200, height: 800,
      url: '/api/reader/media/media-1?rendition=reader',
    }]);
    expect(body.collection.media[0]).not.toHaveProperty('storagePath');
    expect(body.collection.media[0]).not.toHaveProperty('storageUrl');
  });

  it('fails closed with not found when the set is outside the Reader audience', async () => {
    session.mockResolvedValue({ user: { id: 'viewer', role: 'viewer' } } as never);
    get.mockResolvedValue({ collection, media: [] });
    filter.mockResolvedValue([]);

    const response = await getCollection(request, { params: Promise.resolve({ id: 'family-photos' }) });
    expect(response.status).toBe(404);
  });
});

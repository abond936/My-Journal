import { getServerSession } from 'next-auth/next';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: {
        set: jest.fn(),
      },
      json: async () => data,
    }),
  },
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('@/lib/config/typesense', () => ({
  isTypesenseConfigured: jest.fn(() => false),
}));

jest.mock('@/lib/services/typesenseMediaService', () => ({
  ensureMediaCollection: jest.fn(),
  searchMediaTypesense: jest.fn(),
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(),
}));

import { getAdminApp } from '@/lib/config/firebase/admin';
import { GET } from '@/app/api/media/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedGetAdminApp = getAdminApp as jest.MockedFunction<typeof getAdminApp>;

function makeMediaDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  };
}

function makeRequest(url: string) {
  return {
    method: 'GET',
    url,
    headers: {
      get: jest.fn(),
    },
  } as never;
}

describe('GET /api/media fallback text search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({ user: { role: 'admin' } } as never);
  });

  it('matches caption text without requiring Typesense', async () => {
    const mediaQuery = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          makeMediaDoc('media-1', {
            filename: 'photo-1.jpg',
            width: 100,
            height: 100,
            size: 1000,
            contentType: 'image/jpeg',
            storageUrl: 'https://example.test/photo-1.jpg',
            storagePath: 'images/photo-1.jpg',
            source: 'local',
            sourcePath: '/albums/photo-1.jpg',
            caption: 'Summer picnic',
            createdAt: 2,
            updatedAt: 2,
          }),
          makeMediaDoc('media-2', {
            filename: 'photo-2.jpg',
            width: 100,
            height: 100,
            size: 1000,
            contentType: 'image/jpeg',
            storageUrl: 'https://example.test/photo-2.jpg',
            storagePath: 'images/photo-2.jpg',
            source: 'local',
            sourcePath: '/albums/photo-2.jpg',
            caption: 'Winter walk',
            createdAt: 1,
            updatedAt: 1,
          }),
        ],
      }),
    };
    const tagsQuery = {
      select: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'media') return mediaQuery;
        if (name === 'tags') return tagsQuery;
        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    mockedGetAdminApp.mockReturnValue({
      firestore: () => firestore,
      storage: () => ({
        bucket: () => ({ name: 'test-bucket' }),
      }),
    } as never);

    const res = await GET(makeRequest('https://example.test/api/media?limit=40&search=picnic'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.media).toHaveLength(1);
    expect(payload.media[0].docId).toBe('media-1');
    expect(tagsQuery.select).toHaveBeenCalledWith('name');
  });

  it('matches tag names without requiring Typesense', async () => {
    const mediaQuery = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          makeMediaDoc('media-1', {
            filename: 'photo-1.jpg',
            width: 100,
            height: 100,
            size: 1000,
            contentType: 'image/jpeg',
            storageUrl: 'https://example.test/photo-1.jpg',
            storagePath: 'images/photo-1.jpg',
            source: 'local',
            sourcePath: '/albums/photo-1.jpg',
            tags: ['tag-family'],
            filterTags: { 'tag-family': true },
            createdAt: 2,
            updatedAt: 2,
          }),
          makeMediaDoc('media-2', {
            filename: 'photo-2.jpg',
            width: 100,
            height: 100,
            size: 1000,
            contentType: 'image/jpeg',
            storageUrl: 'https://example.test/photo-2.jpg',
            storagePath: 'images/photo-2.jpg',
            source: 'local',
            sourcePath: '/albums/photo-2.jpg',
            tags: ['tag-travel'],
            filterTags: { 'tag-travel': true },
            createdAt: 1,
            updatedAt: 1,
          }),
        ],
      }),
    };
    const tagsQuery = {
      select: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          makeMediaDoc('tag-family', { name: 'Family' }),
          makeMediaDoc('tag-travel', { name: 'Travel' }),
        ],
      }),
    };
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'media') return mediaQuery;
        if (name === 'tags') return tagsQuery;
        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    mockedGetAdminApp.mockReturnValue({
      firestore: () => firestore,
      storage: () => ({
        bucket: () => ({ name: 'test-bucket' }),
      }),
    } as never);

    const res = await GET(makeRequest('https://example.test/api/media?limit=40&search=family'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.media).toHaveLength(1);
    expect(payload.media[0].docId).toBe('media-1');
  });

  it('applies dimensional presence to the complete fallback population', async () => {
    const mediaQuery = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          makeMediaDoc('media-with-who', {
            filename: 'with-who.jpg',
            width: 100,
            height: 100,
            size: 1000,
            contentType: 'image/jpeg',
            storageUrl: 'https://example.test/with-who.jpg',
            storagePath: 'images/with-who.jpg',
            source: 'local',
            who: ['person-1'],
            createdAt: 2,
            updatedAt: 2,
          }),
          makeMediaDoc('media-empty-who', {
            filename: 'empty-who.jpg',
            width: 100,
            height: 100,
            size: 1000,
            contentType: 'image/jpeg',
            storageUrl: 'https://example.test/empty-who.jpg',
            storagePath: 'images/empty-who.jpg',
            source: 'local',
            who: [],
            createdAt: 1,
            updatedAt: 1,
          }),
        ],
      }),
    };
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'media') return mediaQuery;
        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    mockedGetAdminApp.mockReturnValue({
      firestore: () => firestore,
      storage: () => ({ bucket: () => ({ name: 'test-bucket' }) }),
    } as never);

    const res = await GET(makeRequest('https://example.test/api/media?limit=40&whoPresence=hasAny'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.media.map((item: { docId: string }) => item.docId)).toEqual(['media-with-who']);
  });

  it('applies codification, unresolved, batch, folder, and metadata filters on the server', async () => {
    const mediaQuery = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          makeMediaDoc('matching-media', {
            source: 'local',
            sourcePath: '/Trips/Charleston/photo.jpg',
            importBatchId: 'batch-1',
            metadataImport: { attempted: true, outcome: 'found', foundFields: ['caption'] },
            hasWho: true,
            hasWhat: false,
            hasWhen: true,
            hasWhere: true,
            createdAt: 2,
          }),
          makeMediaDoc('complete-media', {
            source: 'local',
            sourcePath: '/Trips/Charleston/complete.jpg',
            importBatchId: 'batch-1',
            metadataImport: { attempted: true, outcome: 'found', foundFields: ['caption'] },
            hasWho: true,
            hasWhat: true,
            hasWhen: true,
            hasWhere: true,
            createdAt: 1,
          }),
        ],
      }),
    };
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'media') return mediaQuery;
        throw new Error(`Unexpected collection ${name}`);
      }),
    };
    mockedGetAdminApp.mockReturnValue({
      firestore: () => firestore,
      storage: () => ({ bucket: () => ({ name: 'test-bucket' }) }),
    } as never);

    const res = await GET(
      makeRequest(
        'https://example.test/api/media?limit=40&codification=incomplete&unresolvedDimension=what&importBatchId=batch-1&importFolder=Charleston&metadataOutcome=found'
      )
    );
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.media.map((item: { docId: string }) => item.docId)).toEqual(['matching-media']);
  });

  it('filters the complete media population by exact source-byte matches', async () => {
    const identityQuery = {
      get: jest.fn().mockResolvedValue({
        docs: [
          makeMediaDoc('match-a', { contentIdentity: { algorithm: 'sha256', basis: 'source-bytes', digest: 'same' } }),
          makeMediaDoc('match-b', { contentIdentity: { algorithm: 'sha256', basis: 'source-bytes', digest: 'same' } }),
          makeMediaDoc('unique', { contentIdentity: { algorithm: 'sha256', basis: 'source-bytes', digest: 'different' } }),
        ],
      }),
    };
    const mediaQuery = {
      select: jest.fn().mockReturnValue(identityQuery),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          makeMediaDoc('match-a', { createdAt: 3 }),
          makeMediaDoc('match-b', { createdAt: 2 }),
          makeMediaDoc('unique', { createdAt: 1 }),
        ],
      }),
    };
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'media') return mediaQuery;
        throw new Error(`Unexpected collection ${name}`);
      }),
    };
    mockedGetAdminApp.mockReturnValue({
      firestore: () => firestore,
      storage: () => ({ bucket: () => ({ name: 'test-bucket' }) }),
    } as never);

    const res = await GET(makeRequest('https://example.test/api/media?limit=40&matchStatus=matches'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.media.map((item: { docId: string }) => item.docId)).toEqual(['match-a', 'match-b']);
    expect(mediaQuery.select).toHaveBeenCalledWith('contentIdentity');
  });
});

import { getServerSession } from 'next-auth/next';
import { GET as listCollections } from '@/app/api/collections/route';
import { GET as getCollection } from '@/app/api/collections/[id]/route';
import {
  getReaderCollectionStructure,
  listReaderCollections,
} from '@/lib/services/collections/collectionProjectionReadService';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));
jest.mock('@/lib/services/collections/collectionProjectionReadService', () => ({
  listReaderCollections: jest.fn(),
  getReaderCollectionStructure: jest.fn(),
}));

const session = getServerSession as jest.MockedFunction<typeof getServerSession>;
const list = listReaderCollections as jest.MockedFunction<typeof listReaderCollections>;
const get = getReaderCollectionStructure as jest.MockedFunction<typeof getReaderCollectionStructure>;
const request = { url: 'https://example.test/api/collections' } as Request;

describe('Reader Collection routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects anonymous access', async () => {
    session.mockResolvedValue(null);
    const response = await listCollections(request);
    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it('gives viewers only the published list', async () => {
    session.mockResolvedValue({ user: { id: 'viewer', role: 'viewer' } } as never);
    list.mockResolvedValue([]);
    const response = await listCollections(request);
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith({ includeDrafts: false });
  });

  it('allows the author to inspect an active draft structure', async () => {
    session.mockResolvedValue({ user: { id: 'admin', role: 'admin' } } as never);
    get.mockResolvedValue({
      collection: { docId: 'my-life', lifecycle: 'draft' } as never,
      placements: [],
      cards: [],
    });
    const response = await getCollection(request, { params: Promise.resolve({ id: 'my-life' }) });
    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith({ collectionId: 'my-life', includeDrafts: true });
  });

  it('returns not found when reader visibility fails closed', async () => {
    session.mockResolvedValue({ user: { id: 'viewer', role: 'viewer' } } as never);
    get.mockResolvedValue(null);
    const response = await getCollection(request, { params: Promise.resolve({ id: 'my-life' }) });
    expect(response.status).toBe(404);
  });
});

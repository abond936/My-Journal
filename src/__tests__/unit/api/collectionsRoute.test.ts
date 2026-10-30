import { getServerSession } from 'next-auth/next';
import { GET } from '@/app/api/admin/collections/route';
import { listActiveCollections } from '@/lib/services/collections/collectionProjectionReadService';

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
  listActiveCollections: jest.fn(),
}));

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const listCollections = listActiveCollections as jest.MockedFunction<typeof listActiveCollections>;

describe('GET /api/admin/collections', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a viewer before reading Collections', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'viewer' } } as never);
    const response = await GET();
    expect(response.status).toBe(403);
    expect(listCollections).not.toHaveBeenCalled();
  });

  it('returns only the active Collections supplied by the read owner', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    listCollections.mockResolvedValue([
      { docId: 'my-life', title: 'My Life', recordState: 'active', order: 10 } as never,
    ]);
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      collections: [{ docId: 'my-life', recordState: 'active' }],
    });
  });
});

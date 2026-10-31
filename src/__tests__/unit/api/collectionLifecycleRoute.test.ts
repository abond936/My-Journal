const mockGetServerSession = jest.fn();
const mockUpdateLifecycle = jest.fn();

jest.mock('next-auth/next', () => ({ getServerSession: (...args: unknown[]) => mockGetServerSession(...args) }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/readerAccess', () => ({ isAdminSession: (session: unknown) => Boolean(session) }));
jest.mock('@/lib/services/collections/collectionLifecycleService', () => ({
  updateCollectionLifecycle: (...args: unknown[]) => mockUpdateLifecycle(...args),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { PATCH } from '@/app/api/admin/collections/[id]/lifecycle/route';
import { AppError, ErrorCode } from '@/lib/types/error';

function request(body: unknown) {
  return { json: async () => body } as Request;
}

describe('Collection lifecycle route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { role: 'admin' } });
  });

  it('publishes through the Collection lifecycle owner', async () => {
    const collection = { docId: 'collection-1', lifecycle: 'published' };
    mockUpdateLifecycle.mockResolvedValue(collection);
    const response = await PATCH(request({ lifecycle: 'published' }), {
      params: Promise.resolve({ id: 'collection-1' }),
    });
    expect(response.status).toBe(200);
    expect(mockUpdateLifecycle).toHaveBeenCalledWith({
      collectionId: 'collection-1', lifecycle: 'published',
    });
    expect(await response.json()).toEqual({ ok: true, collection });
  });

  it('returns publication-integrity details as a conflict', async () => {
    mockUpdateLifecycle.mockRejectedValue(new AppError(
      ErrorCode.COLLECTION_PUBLICATION_INTEGRITY,
      'This Collection cannot be published yet.',
      { issues: [{ code: 'cards-draft', count: 1 }] }
    ));
    const response = await PATCH(request({ lifecycle: 'published' }), {
      params: Promise.resolve({ id: 'collection-1' }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: ErrorCode.COLLECTION_PUBLICATION_INTEGRITY,
      details: { issues: [{ code: 'cards-draft', count: 1 }] },
    });
  });

  it('rejects non-administrators before mutation', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const response = await PATCH(request({ lifecycle: 'published' }), {
      params: Promise.resolve({ id: 'collection-1' }),
    });
    expect(response.status).toBe(403);
    expect(mockUpdateLifecycle).not.toHaveBeenCalled();
  });
});

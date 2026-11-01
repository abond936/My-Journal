import { getServerSession } from 'next-auth/next';
import { POST } from '@/app/api/admin/collections/[id]/promote/route';
import { promoteCollectionStructure } from '@/lib/services/collections/collectionStructurePromotionService';
import { CollectionStructurePromotionError } from '@/lib/utils/collectionStructurePromotion';

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
jest.mock('@/lib/services/collections/collectionStructurePromotionService', () => ({
  promoteCollectionStructure: jest.fn(),
}));

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const promote = promoteCollectionStructure as jest.MockedFunction<typeof promoteCollectionStructure>;
const context = { params: Promise.resolve({ id: 'my-life' }) };
const request = (body: unknown) => ({ json: async () => body }) as Request;

describe('POST /api/admin/collections/[id]/promote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a viewer before creating any records', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'viewer' } } as never);
    const response = await POST(request({}), context);
    expect(response.status).toBe(403);
    expect(promote).not.toHaveBeenCalled();
  });

  it('creates a private draft Collection through the promotion owner', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    promote.mockResolvedValue({
      collection: { docId: 'childhood', title: 'Childhood', lifecycle: 'draft', recordState: 'active' },
      placements: [{ docId: 'copy-one' }],
      operation: { docId: 'promote-childhood' },
    } as never);

    const response = await POST(request({
      sourcePlacementId: 'part-childhood', expectedStructureRevision: 4, title: ' Childhood ',
    }), context);

    expect(response.status).toBe(201);
    expect(promote).toHaveBeenCalledWith({
      sourceCollectionId: 'my-life', sourcePlacementId: 'part-childhood',
      expectedStructureRevision: 4, title: 'Childhood',
    });
    await expect(response.json()).resolves.toMatchObject({
      ok: true, collection: { docId: 'childhood', lifecycle: 'draft' }, placementCount: 1,
    });
  });

  it('returns a conflict when the source view is stale', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    promote.mockRejectedValue(new CollectionStructurePromotionError(
      'SOURCE_COLLECTION_REVISION_CONFLICT', 'The source changed.'
    ));

    const response = await POST(request({
      sourcePlacementId: 'part-childhood', expectedStructureRevision: 3, title: 'Childhood',
    }), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false, code: 'SOURCE_COLLECTION_REVISION_CONFLICT',
    });
  });
});

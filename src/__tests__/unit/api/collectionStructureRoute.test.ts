import { getServerSession } from 'next-auth/next';
import { GET, PUT } from '@/app/api/admin/collections/[id]/structure/route';
import { replaceCollectionPlacementStructure } from '@/lib/services/collections/collectionPlacementMutationService';
import { getActiveCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import { CollectionPlacementMutationError } from '@/lib/utils/collectionPlacementMutation';

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
jest.mock('@/lib/services/collections/collectionPlacementMutationService', () => ({
  replaceCollectionPlacementStructure: jest.fn(),
}));
jest.mock('@/lib/services/collections/collectionProjectionReadService', () => ({
  getActiveCollectionStructure: jest.fn(),
}));

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const replaceStructure = replaceCollectionPlacementStructure as jest.MockedFunction<
  typeof replaceCollectionPlacementStructure
>;
const getActiveStructure = getActiveCollectionStructure as jest.MockedFunction<
  typeof getActiveCollectionStructure
>;

function request(body: unknown) {
  return { json: async () => body } as Request;
}

const context = { params: Promise.resolve({ id: 'my-life' }) };

describe('PUT /api/admin/collections/[id]/structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a viewer before the mutation owner is called', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'viewer' } } as never);
    const response = await PUT(request({ expectedStructureRevision: 0, placements: [] }), context);
    expect(response.status).toBe(403);
    expect(replaceStructure).not.toHaveBeenCalled();
  });

  it('hides inactive or missing Collections from the Studio structure reader', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    getActiveStructure.mockResolvedValue(null);
    const response = await GET(request(null), context);
    expect(response.status).toBe(404);
    expect(getActiveStructure).toHaveBeenCalledWith('my-life');
  });

  it('returns one active structure to an administrator', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    getActiveStructure.mockResolvedValue({
      collection: { docId: 'my-life', title: 'My Life', recordState: 'active' } as never,
      placements: [{ docId: 'chapter-1' }] as never,
      cards: [{ docId: 'card-1', title: 'Childhood' }] as never,
    });
    const response = await GET(request(null), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      collection: { docId: 'my-life', recordState: 'active' },
      placements: [{ docId: 'chapter-1' }],
    });
  });

  it('passes one complete revisioned graph to the mutation owner', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    replaceStructure.mockResolvedValue({
      changed: true,
      nextRevision: 4,
      upserts: [],
      deletePlacementIds: [],
      operation: { docId: 'operation-1' } as never,
    });
    const placements = [{
      docId: 'chapter-1',
      cardId: 'card-1',
      parentPlacementId: null,
      role: 'chapter',
      order: 10,
    }];
    const response = await PUT(request({ expectedStructureRevision: 3, placements }), context);
    expect(response.status).toBe(200);
    expect(replaceStructure).toHaveBeenCalledWith({
      collectionId: 'my-life',
      expectedStructureRevision: 3,
      placements,
    });
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      changed: true,
      structureRevision: 4,
      operationId: 'operation-1',
    });
  });

  it('maps inactive shadow and stale revision failures to conflicts', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    replaceStructure.mockRejectedValue(new CollectionPlacementMutationError(
      'COLLECTION_NOT_ACTIVE',
      'The Collection placement graph is not active for Studio authoring.'
    ));
    const response = await PUT(request({ expectedStructureRevision: 0, placements: [] }), context);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'COLLECTION_NOT_ACTIVE' });
  });

  it('rejects malformed graph input before the mutation owner is called', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    const response = await PUT(request({ expectedStructureRevision: -1, placements: 'invalid' }), context);
    expect(response.status).toBe(400);
    expect(replaceStructure).not.toHaveBeenCalled();
  });
});

import { getServerSession } from 'next-auth/next';
import { POST } from '@/app/api/admin/collections/[id]/authority/route';
import { transitionCollectionAuthority } from '@/lib/services/collections/collectionAuthorityService';
import { CollectionAuthorityTransitionError } from '@/lib/utils/collectionAuthorityTransition';

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
jest.mock('@/lib/services/collections/collectionAuthorityService', () => ({
  transitionCollectionAuthority: jest.fn(),
}));

const session = getServerSession as jest.MockedFunction<typeof getServerSession>;
const transition = transitionCollectionAuthority as jest.MockedFunction<typeof transitionCollectionAuthority>;
const context = { params: Promise.resolve({ id: 'my-life' }) };
const body = {
  desiredState: 'active',
  expectedStructureRevision: 0,
  expectedAuthorityRevision: 0,
  confirmCollectionId: 'my-life',
};

describe('POST /api/admin/collections/[id]/authority', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a viewer before the authority owner is called', async () => {
    session.mockResolvedValue({ user: { role: 'viewer' } } as never);
    const response = await POST({ json: async () => body } as Request, context);
    expect(response.status).toBe(403);
    expect(transition).not.toHaveBeenCalled();
  });

  it('requires the explicit Collection identity confirmation', async () => {
    session.mockResolvedValue({ user: { role: 'admin' } } as never);
    const response = await POST({ json: async () => ({ ...body, confirmCollectionId: 'other' }) } as Request, context);
    expect(response.status).toBe(400);
    expect(transition).not.toHaveBeenCalled();
  });

  it('passes both revisions and the desired selector state to the authority owner', async () => {
    session.mockResolvedValue({ user: { role: 'admin' } } as never);
    transition.mockResolvedValue({
      changed: true,
      nextAuthorityRevision: 1,
      patch: {} as never,
      operation: { docId: 'authority-my-life-1-active' } as never,
    });
    const response = await POST({ json: async () => body } as Request, context);
    expect(response.status).toBe(200);
    expect(transition).toHaveBeenCalledWith({
      collectionId: 'my-life',
      desiredState: 'active',
      expectedStructureRevision: 0,
      expectedAuthorityRevision: 0,
    });
    await expect(response.json()).resolves.toMatchObject({
      authorityRevision: 1,
      operationId: 'authority-my-life-1-active',
    });
  });

  it('reports stale authority and parity failures without changing the selector', async () => {
    session.mockResolvedValue({ user: { role: 'admin' } } as never);
    transition.mockRejectedValue(new CollectionAuthorityTransitionError(
      'COLLECTION_ACTIVATION_NOT_READY',
      'The shadow is stale.'
    ));
    const response = await POST({ json: async () => body } as Request, context);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: 'COLLECTION_ACTIVATION_NOT_READY' });
  });
});

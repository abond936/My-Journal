import type { NextRequest } from 'next/server';

const getTagByIdMock = jest.fn();
const updateTagMock = jest.fn();
const mutateTagHierarchyMock = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn(async () => ({ user: { role: 'admin' } })) }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/readerAccess', () => ({
  isAdminSession: jest.fn(() => true),
  isAuthenticatedSession: jest.fn(() => true),
}));
jest.mock('@/lib/config/firebase/admin', () => ({ getAdminApp: jest.fn(() => ({})) }));
jest.mock('@/lib/firebase/tagService', () => ({
  getTagById: (...args: unknown[]) => getTagByIdMock(...args),
  updateTag: (...args: unknown[]) => updateTagMock(...args),
  deleteTag: jest.fn(),
}));
jest.mock('@/lib/services/tagHierarchyMutationService', () => ({
  mutateTagHierarchy: (...args: unknown[]) => mutateTagHierarchyMock(...args),
}));

describe('governed tag hierarchy routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTagByIdMock.mockResolvedValue({
      docId: 'alan', name: 'Alan', dimension: 'who', parentId: 'family', path: ['who', 'family'],
    });
    mutateTagHierarchyMock.mockResolvedValue({ operationId: 'operation-1' });
  });

  it('routes rename through the governed reconciler', async () => {
    const { PATCH } = await import('@/app/api/tags/[id]/route');
    const response = await PATCH(
      { json: async () => ({ name: 'Alan Bond' }) } as unknown as NextRequest,
      { params: Promise.resolve({ id: 'alan' }) }
    );
    expect(response.status).toBe(200);
    expect(mutateTagHierarchyMock).toHaveBeenCalledWith({ kind: 'rename', tagId: 'alan', name: 'Alan Bond' });
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('keeps non-structural edits on the narrow update path', async () => {
    const { PATCH } = await import('@/app/api/tags/[id]/route');
    const response = await PATCH(
      { json: async () => ({ order: 20 }) } as unknown as NextRequest,
      { params: Promise.resolve({ id: 'alan' }) }
    );
    expect(response.status).toBe(200);
    expect(mutateTagHierarchyMock).not.toHaveBeenCalled();
    expect(updateTagMock).toHaveBeenCalledWith('alan', { order: 20 });
  });

  it('routes reparent through the governed reconciler', async () => {
    const { POST } = await import('@/app/api/tags/[id]/reparent/route');
    const response = await POST(
      { json: async () => ({ newParentId: 'friends' }) } as Request,
      { params: Promise.resolve({ id: 'alan' }) }
    );
    expect(response.status).toBe(200);
    expect(mutateTagHierarchyMock).toHaveBeenCalledWith({
      kind: 'reparent', tagId: 'alan', newParentId: 'friends',
    });
  });

  it('reports a cycle as a non-retryable conflict', async () => {
    mutateTagHierarchyMock.mockRejectedValueOnce(new Error('Cycle detected in tag tree'));
    const { POST } = await import('@/app/api/tags/[id]/reparent/route');
    const response = await POST(
      { json: async () => ({ newParentId: 'alan-old' }) } as Request,
      { params: Promise.resolve({ id: 'alan' }) }
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'TAG_REPARENT_CYCLE', retryable: false,
    });
  });

  it('rejects legacy unqualified deletion', async () => {
    const { DELETE } = await import('@/app/api/tags/[id]/route');
    const response = await DELETE(
      { json: async () => null } as unknown as NextRequest,
      { params: Promise.resolve({ id: 'alan' }) }
    );
    expect(response.status).toBe(409);
    expect(mutateTagHierarchyMock).not.toHaveBeenCalled();
  });

  it('routes explicit remove-everywhere through the governed reconciler', async () => {
    const { DELETE } = await import('@/app/api/tags/[id]/route');
    const response = await DELETE(
      { json: async () => ({ mode: 'remove-everywhere', promoteChildren: true }) } as unknown as NextRequest,
      { params: Promise.resolve({ id: 'alan' }) }
    );
    expect(response.status).toBe(200);
    expect(mutateTagHierarchyMock).toHaveBeenCalledWith({
      kind: 'remove', tagId: 'alan', promoteChildren: true,
    });
  });

  it('routes an explicit merge through the governed reconciler', async () => {
    const { DELETE } = await import('@/app/api/tags/[id]/route');
    const response = await DELETE(
      { json: async () => ({ mode: 'merge', targetTagId: 'friends' }) } as unknown as NextRequest,
      { params: Promise.resolve({ id: 'alan' }) }
    );
    expect(response.status).toBe(200);
    expect(mutateTagHierarchyMock).toHaveBeenCalledWith({
      kind: 'merge', tagId: 'alan', targetTagId: 'friends',
    });
  });
});

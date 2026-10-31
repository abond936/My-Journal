import { getServerSession } from 'next-auth/next';
import { GET, POST } from '@/app/api/admin/audience-groups/route';
import { DELETE, PATCH } from '@/app/api/admin/audience-groups/[id]/route';
import {
  createAudienceGroup,
  deleteAudienceGroup,
  listAudienceGroups,
  updateAudienceGroup,
} from '@/lib/services/audienceGroupService';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/services/audienceGroupService', () => ({
  createAudienceGroup: jest.fn(),
  deleteAudienceGroup: jest.fn(),
  listAudienceGroups: jest.fn(),
  updateAudienceGroup: jest.fn(),
}));
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    constructor(_body?: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200;
    }
    static json(data: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, json: async () => data };
    }
  }
  return { NextResponse: MockNextResponse };
});

const session = getServerSession as jest.MockedFunction<typeof getServerSession>;
const list = listAudienceGroups as jest.MockedFunction<typeof listAudienceGroups>;
const create = createAudienceGroup as jest.MockedFunction<typeof createAudienceGroup>;
const update = updateAudienceGroup as jest.MockedFunction<typeof updateAudienceGroup>;
const remove = deleteAudienceGroup as jest.MockedFunction<typeof deleteAudienceGroup>;
const admin = { user: { id: 'admin', role: 'admin' } } as never;

function request(body: unknown) {
  return { json: async () => body } as Request;
}

describe('audience group routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects non-administrators', async () => {
    session.mockResolvedValue({ user: { id: 'reader', role: 'viewer' } } as never);
    expect((await GET()).status).toBe(403);
    expect((await POST(request({ name: 'Family' }))).status).toBe(403);
  });

  it('lists and creates groups for the author', async () => {
    session.mockResolvedValue(admin);
    list.mockResolvedValue([]);
    create.mockResolvedValue({ docId: 'family', name: 'Family' } as never);

    expect(await (await GET()).json()).toEqual({ groups: [] });
    const response = await POST(request({ name: 'Family', memberContactIds: ['reader-1'] }));
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ name: 'Family', memberContactIds: ['reader-1'] });
  });

  it('updates a group and blocks deletion when references remain', async () => {
    session.mockResolvedValue(admin);
    update.mockResolvedValue({ docId: 'family', name: 'Close family' } as never);
    const context = { params: Promise.resolve({ id: 'family' }) };

    const patch = await PATCH(
      request({ name: 'Close family', memberContactIds: [] }),
      context
    );
    expect(patch.status).toBe(200);

    remove.mockRejectedValue(
      new Error('Remove this group from every Card and Collection audience before deleting it.')
    );
    const deletion = await DELETE(request(null), context);
    expect(deletion.status).toBe(409);
  });
});

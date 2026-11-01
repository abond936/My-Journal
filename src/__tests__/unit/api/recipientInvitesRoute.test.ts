import { getServerSession } from 'next-auth/next';
import { POST } from '@/app/api/admin/recipient-invites/route';
import {
  createGuestRecipientInvite,
  reissueGuestRecipientInvite,
} from '@/lib/auth/recipientInvites';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/recipientInvites', () => ({
  createGuestRecipientInvite: jest.fn(),
  reissueGuestRecipientInvite: jest.fn(),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const session = jest.mocked(getServerSession);
const create = jest.mocked(createGuestRecipientInvite);
const reissue = jest.mocked(reissueGuestRecipientInvite);

function request(body: unknown) {
  return {
    json: async () => body,
    nextUrl: { origin: 'https://stories.example' },
  } as never;
}

describe('recipient invitation route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects non-administrators', async () => {
    session.mockResolvedValue({ user: { id: 'reader', role: 'viewer' } } as never);
    expect((await POST(request({ kind: 'create', email: 'guest@example.com' }))).status).toBe(403);
  });

  it('returns a fragment-only link for a newly created guest', async () => {
    session.mockResolvedValue({ user: { id: 'admin', role: 'admin' } } as never);
    create.mockResolvedValue({ recipientId: 'guest-1', inviteToken: 'private token', expiresAt: 123 });

    const response = await POST(request({ kind: 'create', email: 'GUEST@example.com', displayName: 'Guest' }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      recipientId: 'guest-1',
      inviteUrl: 'https://stories.example/invite#token=private%20token',
      expiresAt: 123,
    });
  });

  it('reissues a link for an existing guest', async () => {
    session.mockResolvedValue({ user: { id: 'admin', role: 'admin' } } as never);
    reissue.mockResolvedValue({ recipientId: 'guest-1', inviteToken: 'next', expiresAt: 456 });
    expect((await POST(request({ kind: 'reissue', recipientId: 'guest-1' }))).status).toBe(200);
    expect(reissue).toHaveBeenCalledWith('guest-1');
  });
});

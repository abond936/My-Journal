import { POST } from '@/app/api/admin/audience-groups/[id]/impact/route';
import { getAudienceGroupMembershipImpact } from '@/lib/services/audienceGroupImpactService';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/readerAccess', () => ({ isAdminSession: jest.fn() }));
jest.mock('@/lib/services/audienceGroupImpactService', () => ({
  getAudienceGroupMembershipImpact: jest.fn(),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { getServerSession } from 'next-auth/next';
import { isAdminSession } from '@/lib/auth/readerAccess';

const impact = getAudienceGroupMembershipImpact as jest.MockedFunction<typeof getAudienceGroupMembershipImpact>;
const session = getServerSession as jest.MockedFunction<typeof getServerSession>;
const admin = isAdminSession as jest.MockedFunction<typeof isAdminSession>;
const context = { params: Promise.resolve({ id: 'family' }) };
const request = (body: unknown) => ({ json: async () => body }) as Request;

describe('audience-group impact route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    session.mockResolvedValue({ user: { role: 'admin' } } as never);
    admin.mockReturnValue(true);
  });

  it('returns the read-only membership impact', async () => {
    impact.mockResolvedValue({ groupId: 'family', cards: [], collections: [] } as never);
    const response = await POST(request({ memberContactIds: ['reader-1'] }), context);
    expect(response.status).toBe(200);
    expect(impact).toHaveBeenCalledWith({ groupId: 'family', proposedMemberContactIds: ['reader-1'] });
  });

  it('rejects non-administrators', async () => {
    admin.mockReturnValue(false);
    const response = await POST(request({ memberContactIds: [] }), context);
    expect(response.status).toBe(403);
    expect(impact).not.toHaveBeenCalled();
  });
});

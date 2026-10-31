const mockGetServerSession = jest.fn();
const mockGetImpact = jest.fn();

jest.mock('next-auth/next', () => ({ getServerSession: (...args: unknown[]) => mockGetServerSession(...args) }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/readerAccess', () => ({ isAdminSession: (session: unknown) => Boolean(session) }));
jest.mock('@/lib/services/audienceImpactService', () => ({
  getCardAudienceImpact: (...args: unknown[]) => mockGetImpact(...args),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { POST } from '@/app/api/admin/cards/[id]/audience-impact/route';

function request(body: unknown) {
  return { json: async () => body } as Request;
}

describe('Card audience impact route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { role: 'admin' } });
  });

  it('returns the read-only combined impact for a proposed audience', async () => {
    const audience = { allContacts: false, groupIds: [], contactIds: ['reader-1'] };
    const impact = {
      basis: 'current_after_save', standaloneIncluded: true,
      effectiveReaders: [{ contactId: 'reader-1', displayName: 'Alex' }], otherRoutes: [],
    };
    mockGetImpact.mockResolvedValue(impact);
    const response = await POST(request(audience), { params: Promise.resolve({ id: 'card-1' }) });
    expect(response.status).toBe(200);
    expect(mockGetImpact).toHaveBeenCalledWith('card-1', audience);
    expect(await response.json()).toEqual({ impact });
  });

  it('rejects non-administrators before calculating impact', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const response = await POST(request({ allContacts: true }), { params: Promise.resolve({ id: 'card-1' }) });
    expect(response.status).toBe(403);
    expect(mockGetImpact).not.toHaveBeenCalled();
  });
});

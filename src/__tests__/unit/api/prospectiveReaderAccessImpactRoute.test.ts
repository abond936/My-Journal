const mockGetServerSession = jest.fn();
const mockGetImpact = jest.fn();

jest.mock('next-auth/next', () => ({ getServerSession: (...args: unknown[]) => mockGetServerSession(...args) }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/readerAccess', () => ({ isAdminSession: (session: unknown) => Boolean(session) }));
jest.mock('@/lib/services/readerAccountImpactService', () => ({
  getProspectiveReaderAccessImpact: (...args: unknown[]) => mockGetImpact(...args),
}));
jest.mock('next/server', () => ({
  NextResponse: { json: (data: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200, json: async () => data,
  }) },
}));

import { GET } from '@/app/api/admin/journal-users/prospective-access-impact/route';

describe('prospective Reader access-impact route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin', role: 'admin' } });
  });

  it('returns inherited access for a new enabled Reader', async () => {
    const impact = { effect: 'gain', cards: [], collections: [] };
    mockGetImpact.mockResolvedValue(impact);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ impact });
  });

  it('rejects anonymous access', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
    expect(mockGetImpact).not.toHaveBeenCalled();
  });
});

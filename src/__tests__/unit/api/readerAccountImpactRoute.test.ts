const mockGetServerSession = jest.fn();
const mockGetImpact = jest.fn();

jest.mock('next-auth/next', () => ({ getServerSession: (...args: unknown[]) => mockGetServerSession(...args) }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/readerAccess', () => ({ isAdminSession: (session: unknown) => Boolean(session) }));
jest.mock('@/lib/services/readerAccountImpactService', () => ({
  getReaderAccountAccessImpact: (...args: unknown[]) => mockGetImpact(...args),
}));
jest.mock('next/server', () => ({
  NextResponse: { json: (data: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200, json: async () => data,
  }) },
}));

import { POST } from '@/app/api/admin/journal-users/[id]/access-impact/route';

const request = (body: unknown) => ({ json: async () => body }) as Request;
const context = { params: Promise.resolve({ id: 'reader-1' }) };

describe('Reader account access-impact route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin', role: 'admin' } });
  });

  it('returns the exact read-only impact', async () => {
    const impact = { contactId: 'reader-1', effect: 'lose', cards: [], collections: [] };
    mockGetImpact.mockResolvedValue(impact);
    const response = await POST(request({ disabled: true }), context);
    expect(response.status).toBe(200);
    expect(mockGetImpact).toHaveBeenCalledWith({ contactId: 'reader-1', proposedDisabled: true });
    expect(await response.json()).toEqual({ impact });
  });

  it('rejects anonymous access before calculating', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const response = await POST(request({ disabled: true }), context);
    expect(response.status).toBe(403);
    expect(mockGetImpact).not.toHaveBeenCalled();
  });
});

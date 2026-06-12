import { getServerSession } from 'next-auth/next';
import { diagnoseTypesenseProjection } from '@/lib/services/typesenseReconciliation';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('@/lib/services/typesenseReconciliation', () => ({
  diagnoseTypesenseProjection: jest.fn(),
}));

import { GET } from '@/app/api/admin/maintenance/typesense-status/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedDiagnose = diagnoseTypesenseProjection as jest.MockedFunction<typeof diagnoseTypesenseProjection>;
const adminSession = { user: { role: 'admin' } } as Awaited<ReturnType<typeof getServerSession>>;

describe('GET /api/admin/maintenance/typesense-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 for non-admin callers', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const res = await GET({} as Request);
    expect(res.status).toBe(403);
    expect(mockedDiagnose).not.toHaveBeenCalled();
  });

  it('returns reconciliation report for admin callers', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedDiagnose.mockResolvedValueOnce({
      configured: true,
      checkedAt: 1,
      healthy: true,
      cards: null,
      media: null,
      recentSyncFailures: [],
      repairHint: 'ok',
    });

    const res = await GET({} as Request);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.report.healthy).toBe(true);
  });
});

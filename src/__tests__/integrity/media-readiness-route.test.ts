import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  auditLegacyMediaReadiness,
  retryMediaReadiness,
} from '@/lib/services/images/imageImportService';

jest.mock('next/server', () => {
  const NextResponse = function NextResponse(_body?: unknown, init?: { status?: number }) {
    return { status: init?.status ?? 200, json: async () => _body };
  } as unknown as { json: (data: unknown, init?: { status?: number }) => unknown };
  NextResponse.json = (data: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: async () => data,
  });
  return { NextResponse };
});

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/services/images/imageImportService', () => ({
  auditLegacyMediaReadiness: jest.fn(),
  retryMediaReadiness: jest.fn(),
}));

import { GET } from '@/app/api/admin/media/readiness/audit/route';
import { POST } from '@/app/api/admin/media/readiness/[id]/retry/route';

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedAudit = auditLegacyMediaReadiness as jest.MockedFunction<typeof auditLegacyMediaReadiness>;
const mockedRetry = retryMediaReadiness as jest.MockedFunction<typeof retryMediaReadiness>;
const adminSession = { user: { role: 'admin' } } as Awaited<ReturnType<typeof getServerSession>>;

function request(body: unknown = {}): NextRequest {
  return { json: async () => body } as NextRequest;
}

describe('media readiness admin routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('protects the read-only audit from anonymous access', async () => {
    mockedSession.mockResolvedValueOnce(null);
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(mockedAudit).not.toHaveBeenCalled();
  });

  it('returns readiness audit counts for an administrator', async () => {
    mockedSession.mockResolvedValueOnce(adminSession);
    mockedAudit.mockResolvedValueOnce({ total: 10, assessed: 2, unassessed: 8, ready: 1, pending: 0, failed: 1 });
    const response = await GET(request());
    await expect(response.json()).resolves.toMatchObject({ total: 10, unassessed: 8 });
  });

  it('rejects unsupported retry stages before calling the service', async () => {
    mockedSession.mockResolvedValueOnce(adminSession);
    const response = await POST(request({ stages: ['unknown'] }), {
      params: Promise.resolve({ id: 'media-1' }),
    });
    expect(response.status).toBe(400);
    expect(mockedRetry).not.toHaveBeenCalled();
  });

  it('retries the requested failed stages against the existing media id', async () => {
    mockedSession.mockResolvedValueOnce(adminSession);
    mockedRetry.mockResolvedValueOnce({ docId: 'media-1' } as Awaited<ReturnType<typeof retryMediaReadiness>>);
    const response = await POST(request({ stages: ['readerRendition', 'searchIndex'] }), {
      params: Promise.resolve({ id: 'media-1' }),
    });
    expect(mockedRetry).toHaveBeenCalledWith('media-1', ['readerRendition', 'searchIndex']);
    await expect(response.json()).resolves.toMatchObject({ media: { docId: 'media-1' } });
  });
});

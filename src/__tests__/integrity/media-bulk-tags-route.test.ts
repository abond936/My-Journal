import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { bulkApplyMediaTags } from '@/lib/services/images/imageImportService';
import { deleteMediaWithCardCleanup, recomputeCardsMediaSignalsForMediaIds } from '@/lib/services/cardService';

jest.mock('next/server', () => {
  const NextResponse = function NextResponse(_body?: unknown, init?: { status?: number }) {
    return {
      status: init?.status ?? 200,
      json: async () => _body,
    };
  } as unknown as { json: (data: unknown, init?: { status?: number }) => { status: number; json: () => Promise<unknown> } };
  NextResponse.json = (data: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: async () => data,
  });
  return { NextResponse };
});

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('@/lib/services/images/imageImportService', () => ({
  bulkApplyMediaTags: jest.fn(),
  patchMediaDocument: jest.fn(),
}));

jest.mock('@/lib/services/cardService', () => ({
  recomputeCardsMediaSignalsForMediaIds: jest.fn(),
  deleteMediaWithCardCleanup: jest.fn(),
}));

import { POST } from '@/app/api/admin/media/tags/route';
import { DELETE } from '@/app/api/images/[id]/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedBulkApplyMediaTags = bulkApplyMediaTags as jest.MockedFunction<typeof bulkApplyMediaTags>;
const mockedRecomputeCardsMediaSignalsForMediaIds =
  recomputeCardsMediaSignalsForMediaIds as jest.MockedFunction<typeof recomputeCardsMediaSignalsForMediaIds>;
const mockedDeleteMediaWithCardCleanup =
  deleteMediaWithCardCleanup as jest.MockedFunction<typeof deleteMediaWithCardCleanup>;

describe('POST /api/admin/media/tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBulkApplyMediaTags.mockResolvedValue({ updatedIds: [] });
  });

  it('returns 403 when user is not admin', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null as any);
    const req = {
      json: async () => ({ mediaIds: ['m1'], tags: ['t1'], mode: 'add' }),
    } as NextRequest;

    const res = await POST(req);
    const payload = await res.json();
    expect(res.status).toBe(403);
    expect(payload).toMatchObject({ code: 'AUTH_FORBIDDEN' });
    expect(mockedBulkApplyMediaTags).not.toHaveBeenCalled();
  });

  it('uses bulk service path and recomputes affected cards once', async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { role: 'admin' } } as any);
    mockedBulkApplyMediaTags.mockResolvedValueOnce({ updatedIds: ['m1', 'm2'] });
    const req = {
      json: async () => ({ mediaIds: ['m1', 'm2'], tags: ['t1'], mode: 'add' }),
    } as NextRequest;

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedBulkApplyMediaTags).toHaveBeenCalledWith(['m1', 'm2'], ['t1'], 'add');
    expect(mockedRecomputeCardsMediaSignalsForMediaIds).toHaveBeenCalledWith(['m1', 'm2']);
    expect(payload.updated).toBe(2);
  });
});

describe('DELETE /api/images/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when user is not admin', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null as any);

    const req = {} as NextRequest;
    const res = await DELETE(req, { params: Promise.resolve({ id: 'media-1' }) });
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload).toMatchObject({ code: 'AUTH_FORBIDDEN' });
    expect(mockedDeleteMediaWithCardCleanup).not.toHaveBeenCalled();
  });

  it('returns 409 with stable code when delete is blocked by unresolved references', async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { role: 'admin' } } as any);
    mockedDeleteMediaWithCardCleanup.mockRejectedValueOnce(
      new Error('Cannot delete media media-1; unresolved card references remain: card-a')
    );

    const req = {} as NextRequest;
    const res = await DELETE(req, { params: Promise.resolve({ id: 'media-1' }) });
    const payload = await res.json();

    expect(res.status).toBe(409);
    expect(payload).toMatchObject({
      message: 'Cannot delete media asset because references still exist.',
      code: 'MEDIA_DELETE_BLOCKED_REFERENCES',
    });
  });
});

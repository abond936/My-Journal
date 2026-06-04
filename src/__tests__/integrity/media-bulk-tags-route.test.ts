import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { bulkApplyMediaTags } from '@/lib/services/images/imageImportService';
import {
  deleteMediaWithCardCleanup,
  recomputeCardsMediaSignalsForMedia,
  recomputeCardsMediaSignalsForMediaIds,
} from '@/lib/services/cardService';
import { patchMediaDocument } from '@/lib/services/images/imageImportService';

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

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'media-1',
            data: () => ({ caption: 'Updated media' }),
          }),
        })),
      })),
    })),
  })),
}));

jest.mock('@/lib/services/images/imageImportService', () => ({
  bulkApplyMediaTags: jest.fn(),
  patchMediaDocument: jest.fn(),
}));

jest.mock('@/lib/services/cardService', () => ({
  recomputeCardsMediaSignalsForMedia: jest.fn(),
  recomputeCardsMediaSignalsForMediaIds: jest.fn(),
  deleteMediaWithCardCleanup: jest.fn(),
}));

import { POST } from '@/app/api/admin/media/tags/route';
import { DELETE, PATCH } from '@/app/api/images/[id]/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedBulkApplyMediaTags = bulkApplyMediaTags as jest.MockedFunction<typeof bulkApplyMediaTags>;
const mockedPatchMediaDocument = patchMediaDocument as jest.MockedFunction<typeof patchMediaDocument>;
const mockedRecomputeCardsMediaSignalsForMedia =
  recomputeCardsMediaSignalsForMedia as jest.MockedFunction<typeof recomputeCardsMediaSignalsForMedia>;
const mockedRecomputeCardsMediaSignalsForMediaIds =
  recomputeCardsMediaSignalsForMediaIds as jest.MockedFunction<typeof recomputeCardsMediaSignalsForMediaIds>;
const mockedDeleteMediaWithCardCleanup =
  deleteMediaWithCardCleanup as jest.MockedFunction<typeof deleteMediaWithCardCleanup>;
const adminSession = { user: { role: 'admin' } } as Awaited<ReturnType<typeof getServerSession>>;

describe('POST /api/admin/media/tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBulkApplyMediaTags.mockResolvedValue({ updatedIds: [] });
  });

  it('returns 403 when user is not admin', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);
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
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedBulkApplyMediaTags.mockResolvedValueOnce({ updatedIds: ['m1', 'm2'] });
    const req = {
      json: async () => ({ mediaIds: ['m1', 'm2'], tags: ['t1'], mode: 'add' }),
    } as NextRequest;

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedBulkApplyMediaTags).toHaveBeenCalledWith(['m1', 'm2'], {
      tagIds: ['t1'],
      mode: 'add',
    });
    expect(mockedRecomputeCardsMediaSignalsForMediaIds).toHaveBeenCalledWith(['m1', 'm2']);
    expect(payload.updated).toBe(2);
  });

  it('accepts subject-only bulk media updates', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedBulkApplyMediaTags.mockResolvedValueOnce({ updatedIds: ['m1'] });
    const req = {
      json: async () => ({ mediaIds: ['m1'], subjectTagId: 'siblings' }),
    } as NextRequest;

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedBulkApplyMediaTags).toHaveBeenCalledWith(['m1'], {
      subjectTagId: 'siblings',
      subjectTagIdProvided: true,
    });
    expect(mockedRecomputeCardsMediaSignalsForMediaIds).toHaveBeenCalledWith(['m1']);
    expect(payload).toMatchObject({ ok: true, updated: 1 });
  });
});

describe('DELETE /api/images/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when user is not admin', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const req = {} as NextRequest;
    const res = await DELETE(req, { params: Promise.resolve({ id: 'media-1' }) });
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload).toMatchObject({ code: 'AUTH_FORBIDDEN' });
    expect(mockedDeleteMediaWithCardCleanup).not.toHaveBeenCalled();
  });

  it('returns 409 with stable code when delete is blocked by unresolved references', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
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

describe('PATCH /api/images/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts subject-only media patches without recomputing card media signals', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedPatchMediaDocument.mockResolvedValueOnce();

    const req = {
      json: async () => ({ subjectTagId: 'siblings' }),
    } as NextRequest;

    const res = await PATCH(req, { params: Promise.resolve({ id: 'media-1' }) });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedPatchMediaDocument).toHaveBeenCalledWith('media-1', { subjectTagId: 'siblings' });
    expect(mockedRecomputeCardsMediaSignalsForMedia).not.toHaveBeenCalled();
    expect(mockedRecomputeCardsMediaSignalsForMediaIds).not.toHaveBeenCalled();
    expect(payload).toMatchObject({ ok: true });
  });
});

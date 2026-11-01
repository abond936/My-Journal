import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { replaceMediaAssetContent } from '@/lib/services/images/imageImportService';
import { reviewReplacementMetadata } from '@/lib/services/images/replacementMetadataReviewService';

jest.mock('next/server', () => {
  const NextResponse = function NextResponse(_body?: unknown, init?: { status?: number }) {
    return {
      status: init?.status ?? 200,
      json: async () => _body,
    };
  } as unknown as {
    json: (
      data: unknown,
      init?: { status?: number }
    ) => { status: number; json: () => Promise<unknown> };
  };
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
  replaceMediaAssetContent: jest.fn(),
}));

jest.mock('@/lib/services/images/replacementMetadataReviewService', () => ({
  reviewReplacementMetadata: jest.fn(),
}));

import { POST, PUT } from '@/app/api/images/[id]/replace/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedReplaceMediaAssetContent =
  replaceMediaAssetContent as jest.MockedFunction<typeof replaceMediaAssetContent>;
const mockedReviewReplacementMetadata =
  reviewReplacementMetadata as jest.MockedFunction<typeof reviewReplacementMetadata>;

const adminSession = { user: { role: 'admin' } } as Awaited<ReturnType<typeof getServerSession>>;

function makeRequest(file?: File, confirmed = false): NextRequest {
  const formData = new FormData();
  if (file) formData.set('file', file);
  if (confirmed) formData.set('sameUnderlyingMedia', 'true');
  return {
    formData: async () => formData,
  } as NextRequest;
}

function makeImageFile(
  contents: string,
  name = 'updated.webp',
  type = 'image/webp'
): File {
  const file = new File([contents], name, { type });
  const bytes = Buffer.from(contents, 'utf8');
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return file;
}

describe('POST /api/images/[id]/replace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when user is not admin', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'media-1' }) });
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload).toMatchObject({ code: 'AUTH_FORBIDDEN' });
    expect(mockedReplaceMediaAssetContent).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is provided', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'media-1' }) });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload).toMatchObject({ code: 'MEDIA_REPLACE_FILE_REQUIRED' });
    expect(mockedReplaceMediaAssetContent).not.toHaveBeenCalled();
  });

  it('returns 400 when a non-image file is provided', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);

    const file = makeImageFile('hello', 'notes.txt', 'text/plain');
    const res = await POST(makeRequest(file), { params: Promise.resolve({ id: 'media-1' }) });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload).toMatchObject({ code: 'MEDIA_REPLACE_FILE_TYPE_INVALID' });
    expect(mockedReplaceMediaAssetContent).not.toHaveBeenCalled();
  });

  it('passes the existing media id through and replaces content in place on success', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedReplaceMediaAssetContent.mockResolvedValueOnce({
      docId: 'media-shared',
      readiness: { overall: 'ready' },
    } as Awaited<ReturnType<typeof replaceMediaAssetContent>>);

    const file = makeImageFile('image-bytes');
    const res = await POST(makeRequest(file, true), { params: Promise.resolve({ id: 'media-shared' }) });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedReplaceMediaAssetContent).toHaveBeenCalledWith(
      'media-shared',
      expect.any(Buffer),
      'updated.webp'
    );
    expect(payload).toMatchObject({
      message: 'Media asset media-shared replaced successfully.',
      processingComplete: true,
    });
  });

  it('requires an explicit same-item confirmation before replacing', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);

    const file = makeImageFile('image-bytes');
    const res = await POST(makeRequest(file), { params: Promise.resolve({ id: 'media-shared' }) });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload).toMatchObject({ code: 'MEDIA_REPLACE_CONFIRMATION_REQUIRED' });
    expect(mockedReplaceMediaAssetContent).not.toHaveBeenCalled();
  });

  it('returns 404 when the target media row does not exist', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedReplaceMediaAssetContent.mockRejectedValueOnce(
      new Error('Media document with ID media-missing not found.')
    );

    const file = makeImageFile('image-bytes');
    const res = await POST(makeRequest(file, true), { params: Promise.resolve({ id: 'media-missing' }) });
    const payload = await res.json();

    expect(res.status).toBe(404);
    expect(payload).toMatchObject({
      code: 'MEDIA_NOT_FOUND',
      message: 'Media asset not found.',
      retryable: false,
    });
  });

  it('returns 409 when the target media row is missing storage metadata', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedReplaceMediaAssetContent.mockRejectedValueOnce(
      new Error('Media document with ID media-bad has no storagePath.')
    );

    const file = makeImageFile('image-bytes');
    const res = await POST(makeRequest(file, true), { params: Promise.resolve({ id: 'media-bad' }) });
    const payload = await res.json();

    expect(res.status).toBe(409);
    expect(payload).toMatchObject({
      code: 'MEDIA_REPLACE_INVALID_TARGET',
      message: 'Media asset is missing required storage metadata.',
      retryable: false,
    });
  });

  it('returns a specific conflict when the replacement belongs to another Media item', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedReplaceMediaAssetContent.mockRejectedValueOnce(
      new Error('This replacement exactly matches another media asset. Review the duplicate instead of replacing.')
    );

    const file = makeImageFile('duplicate-bytes');
    const res = await POST(makeRequest(file, true), { params: Promise.resolve({ id: 'media-bad' }) });
    const payload = await res.json();

    expect(res.status).toBe(409);
    expect(payload).toMatchObject({
      code: 'MEDIA_REPLACE_DUPLICATE',
      retryable: false,
    });
  });
});

describe('PUT /api/images/[id]/replace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a read-only embedded-metadata review without replacing content', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedReviewReplacementMetadata.mockResolvedValueOnce({
      evidence: {
        caption: 'Replacement caption',
        keywords: ['Charlie', 'Myrtle Beach'],
        capturedAt: { raw: '2024:06:12 14:30:00', year: 2024, month: 6, day: 12, hour: 14, minute: 30 },
      },
      matchedTags: [],
      unmatchedKeywords: ['Charlie', 'Myrtle Beach'],
      conflicts: [],
    });

    const file = makeImageFile('image-bytes');
    const res = await PUT(makeRequest(file), { params: Promise.resolve({ id: 'media-shared' }) });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedReviewReplacementMetadata).toHaveBeenCalledWith(
      'media-shared',
      expect.any(Buffer),
      'updated.webp'
    );
    expect(payload).toMatchObject({
      review: {
        evidence: { caption: 'Replacement caption' },
        conflicts: [],
      },
    });
    expect(mockedReplaceMediaAssetContent).not.toHaveBeenCalled();
  });

  it('requires administrator access for metadata review', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);
    const res = await PUT(makeRequest(makeImageFile('image-bytes')), {
      params: Promise.resolve({ id: 'media-shared' }),
    });

    expect(res.status).toBe(403);
    expect(mockedReviewReplacementMetadata).not.toHaveBeenCalled();
  });
});

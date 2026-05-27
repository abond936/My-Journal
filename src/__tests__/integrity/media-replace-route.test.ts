import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { replaceMediaAssetContent } from '@/lib/services/images/imageImportService';

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

import { POST } from '@/app/api/images/[id]/replace/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedReplaceMediaAssetContent =
  replaceMediaAssetContent as jest.MockedFunction<typeof replaceMediaAssetContent>;

const adminSession = { user: { role: 'admin' } } as Awaited<ReturnType<typeof getServerSession>>;

function makeRequest(file?: File): NextRequest {
  const formData = new FormData();
  if (file) formData.set('file', file);
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
    mockedReplaceMediaAssetContent.mockResolvedValueOnce();

    const file = makeImageFile('image-bytes');
    const res = await POST(makeRequest(file), { params: Promise.resolve({ id: 'media-shared' }) });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedReplaceMediaAssetContent).toHaveBeenCalledWith(
      'media-shared',
      expect.any(Buffer),
      'updated.webp'
    );
    expect(payload).toMatchObject({
      message: 'Media asset media-shared replaced successfully.',
    });
  });

  it('returns 404 when the target media row does not exist', async () => {
    mockedGetServerSession.mockResolvedValueOnce(adminSession);
    mockedReplaceMediaAssetContent.mockRejectedValueOnce(
      new Error('Media document with ID media-missing not found.')
    );

    const file = makeImageFile('image-bytes');
    const res = await POST(makeRequest(file), { params: Promise.resolve({ id: 'media-missing' }) });
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
    const res = await POST(makeRequest(file), { params: Promise.resolve({ id: 'media-bad' }) });
    const payload = await res.json();

    expect(res.status).toBe(409);
    expect(payload).toMatchObject({
      code: 'MEDIA_REPLACE_INVALID_TARGET',
      message: 'Media asset is missing required storage metadata.',
      retryable: false,
    });
  });
});

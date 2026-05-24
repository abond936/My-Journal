import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

jest.mock('next/server', () => {
  const NextResponse = function NextResponse(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    return {
      status: init?.status ?? 200,
      headers: {
        get: (key: string) => init?.headers?.[key],
      },
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    };
  } as unknown as {
    json: (data: unknown, init?: { status?: number }) => {
      status: number;
      json: () => Promise<unknown>;
      text: () => Promise<string>;
    };
  };
  NextResponse.json = (data: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
  return { NextResponse };
});

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('fs', () => ({
  readdirSync: jest.fn(),
}));

jest.mock('image-size', () => jest.fn(() => ({ width: 100, height: 50 })));

import { GET as getLocalFile } from '@/app/api/images/local/file/route';
import { POST as getFolderContents } from '@/app/api/images/local/folder-contents/route';
import { GET as getFolderTree } from '@/app/api/images/local/folder-tree/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('local image helper access boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ONEDRIVE_ROOT_FOLDER = 'C:\\OneDriveRoot';
  });

  it('rejects anonymous access to local file bytes', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null as never);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams('path=folder/photo.jpg'),
      },
    } as NextRequest;

    const res = await getLocalFile(req);

    expect(res.status).toBe(403);
    await expect(res.text()).resolves.toBe('Forbidden');
  });

  it('rejects viewer access to local folder contents', async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { role: 'viewer' } } as never);

    const req = {
      json: async () => ({ folderPath: 'folder' }),
    } as NextRequest;

    const res = await getFolderContents(req);
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload).toMatchObject({ message: 'Forbidden.' });
  });

  it('rejects viewer access to local folder tree', async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { role: 'viewer' } } as never);

    const res = await getFolderTree();
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload).toMatchObject({ message: 'Forbidden.' });
  });
});

import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import path from 'path';

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
  __esModule: true,
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('image-size', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 100, height: 50 })),
}));

const TEST_ONEDRIVE_ROOT = path.join(process.cwd(), '.tmp-local-images');

process.env.ONEDRIVE_ROOT_FOLDER = TEST_ONEDRIVE_ROOT;

function getMockedGetServerSession(): jest.Mock {
  return getServerSession as jest.Mock;
}

async function loadLocalFileRoute() {
  return (await import('@/app/api/images/local/file/route')) as {
    GET: (request: NextRequest) => Promise<{ status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
  };
}

async function loadFolderContentsRoute() {
  return (await import('@/app/api/images/local/folder-contents/route')) as {
    POST: (request: NextRequest) => Promise<{ status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
  };
}

async function loadFolderTreeRoute() {
  return (await import('@/app/api/images/local/folder-tree/route')) as {
    GET: () => Promise<{ status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
  };
}

describe('local image helper access boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ONEDRIVE_ROOT_FOLDER = TEST_ONEDRIVE_ROOT;
  });

  it('rejects anonymous access to local file bytes', async () => {
    getMockedGetServerSession().mockResolvedValueOnce(null as never);
    const { GET: getLocalFile } = await loadLocalFileRoute();

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
    getMockedGetServerSession().mockResolvedValueOnce({ user: { role: 'viewer' } } as never);
    const { POST: getFolderContents } = await loadFolderContentsRoute();

    const req = {
      json: async () => ({ folderPath: 'folder' }),
    } as NextRequest;

    const res = await getFolderContents(req);
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload).toMatchObject({ message: 'Forbidden.' });
  });

  it('rejects viewer access to local folder tree', async () => {
    getMockedGetServerSession().mockResolvedValueOnce({ user: { role: 'viewer' } } as never);
    const { GET: getFolderTree } = await loadFolderTreeRoute();

    const res = await getFolderTree();
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload).toMatchObject({ message: 'Forbidden.' });
  });

  it('returns all supported image files from the selected local folder for admins', async () => {
    const fs = jest.requireActual('fs/promises') as typeof import('fs/promises');
    const targetFolder = path.join(TEST_ONEDRIVE_ROOT, 'folder');

    getMockedGetServerSession().mockResolvedValueOnce({ user: { role: 'admin' } } as never);
    const { POST: getFolderContents } = await loadFolderContentsRoute();
    await fs.rm(TEST_ONEDRIVE_ROOT, { recursive: true, force: true });
    await fs.mkdir(targetFolder, { recursive: true });
    await fs.writeFile(path.join(targetFolder, 'cover__X.jpg'), 'jpg');
    await fs.writeFile(path.join(targetFolder, 'scan-01.tif'), 'tif');
    await fs.writeFile(path.join(targetFolder, 'retouched.bmp'), 'bmp');
    await fs.writeFile(path.join(targetFolder, 'notes.txt'), 'txt');
    await fs.mkdir(path.join(targetFolder, 'nested'), { recursive: true });

    const req = {
      json: async () => ({ folderPath: 'folder' }),
    } as NextRequest;

    const res = await getFolderContents(req);
    const payload = (await res.json()) as Array<{ filename: string; sourcePath: string }>;

    expect(res.status).toBe(200);
    expect(payload.map((item) => item.filename)).toEqual(['cover__X.jpg', 'retouched.bmp', 'scan-01.tif']);
    expect(payload.map((item) => item.sourcePath)).toEqual([
      'folder/cover__X.jpg',
      'folder/retouched.bmp',
      'folder/scan-01.tif',
    ]);
  });
});

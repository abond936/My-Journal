import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { importFromLocalDrive } from '@/lib/services/images/imageImportService';

jest.mock('next/server', () => {
  const NextResponse = {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
    }),
  };
  return { NextResponse };
});

jest.mock('next-auth/next', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('@/lib/services/images/imageImportService', () => ({
  importFromLocalDrive: jest.fn(),
}));

function getMockedGetServerSession(): jest.Mock {
  return getServerSession as jest.Mock;
}

function getMockedImportFromLocalDrive(): jest.Mock {
  return importFromLocalDrive as jest.Mock;
}

async function loadRoute() {
  return (await import('@/app/api/images/local/import/route')) as {
    POST: (request: NextRequest) => Promise<{ status: number; json: () => Promise<unknown> }>;
  };
}

describe('local import route duplicate policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockedGetServerSession().mockResolvedValue({ user: { role: 'admin' } } as never);
  });

  it('always enables sourcePath duplicate skipping for batch imports and returns skipped results', async () => {
    getMockedImportFromLocalDrive().mockResolvedValue({
      mediaId: 'media-existing-1',
      media: {
        docId: 'media-existing-1',
        filename: 'photo-1.jpg',
        sourcePath: 'folder/photo-1.jpg',
      },
      skipped: true,
    });

    const { POST } = await loadRoute();
    const req = {
      json: async () => ({
        sourcePaths: ['folder/photo-1.jpg'],
      }),
    } as NextRequest;

    const res = await POST(req);
    const payload = (await res.json()) as {
      results: Array<{ sourcePath: string; mediaId: string; skipped?: boolean }>;
    };

    expect(getMockedImportFromLocalDrive()).toHaveBeenCalledWith(
      'folder/photo-1.jpg',
      expect.objectContaining({
        skipIfExists: true,
        normalizeInMemory: true,
      })
    );
    expect(res.status).toBe(200);
    expect(payload.results).toEqual([
      expect.objectContaining({
        sourcePath: 'folder/photo-1.jpg',
        mediaId: 'media-existing-1',
        skipped: true,
      }),
    ]);
  });

  it('always enables sourcePath duplicate skipping for single-file imports and returns skipped=true', async () => {
    getMockedImportFromLocalDrive().mockResolvedValue({
      mediaId: 'media-existing-2',
      media: {
        docId: 'media-existing-2',
        filename: 'photo-2.jpg',
        sourcePath: 'folder/photo-2.jpg',
      },
      skipped: true,
    });

    const { POST } = await loadRoute();
    const req = {
      json: async () => ({
        sourcePath: 'folder/photo-2.jpg',
      }),
    } as NextRequest;

    const res = await POST(req);
    const payload = (await res.json()) as { mediaId: string; skipped?: boolean };

    expect(getMockedImportFromLocalDrive()).toHaveBeenCalledWith(
      'folder/photo-2.jpg',
      expect.objectContaining({
        skipIfExists: true,
        normalizeInMemory: true,
      })
    );
    expect(res.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        mediaId: 'media-existing-2',
        skipped: true,
      })
    );
  });
});

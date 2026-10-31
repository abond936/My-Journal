import { Readable } from 'node:stream';
import { getServerSession } from 'next-auth/next';
import { canReadMedia } from '@/lib/auth/readerMediaAccess';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { GET } from '@/app/api/reader/media/[id]/route';

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/readerMediaAccess', () => ({ canReadMedia: jest.fn() }));
jest.mock('@/lib/config/firebase/admin', () => ({ getAdminApp: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const session = getServerSession as jest.MockedFunction<typeof getServerSession>;
const authorize = canReadMedia as jest.MockedFunction<typeof canReadMedia>;
const admin = getAdminApp as jest.MockedFunction<typeof getAdminApp>;

function request(query = '') {
  return { url: `https://example.test/api/reader/media/media-1${query}` } as Request;
}

function context() {
  return { params: Promise.resolve({ id: 'media-1' }) };
}

function configureMedia() {
  const file = {
    exists: jest.fn().mockResolvedValue([true]),
    getMetadata: jest.fn().mockResolvedValue([{ contentType: 'image/jpeg' }]),
    createReadStream: jest.fn(() => Readable.from(Buffer.from('image-bytes'))),
  };
  const doc = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      id: 'media-1',
      data: () => ({
        storagePath: 'images/media-1.jpg',
        contentType: 'image/jpeg',
        referencedByCardIds: ['card-1'],
      }),
    }),
  };
  const firestore = { collection: jest.fn(() => ({ doc: jest.fn(() => doc) })) };
  const app = {
    firestore: jest.fn(() => firestore),
    storage: jest.fn(() => ({ bucket: jest.fn(() => ({ file: jest.fn(() => file) })) })),
  };
  admin.mockReturnValue(app as never);
  return { file };
}

describe('GET /api/reader/media/[id]', () => {
  beforeAll(() => {
    class TestResponse {
      status: number;
      headers: { get: (name: string) => string | null };
      private body: ReadableStream;

      constructor(body: ReadableStream, init?: { status?: number; headers?: Record<string, string> }) {
        this.body = body;
        this.status = init?.status ?? 200;
        const headers = new Map(
          Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
        );
        this.headers = { get: (name: string) => headers.get(name.toLowerCase()) ?? null };
      }

      async text() {
        const reader = this.body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        return Buffer.concat(chunks).toString('utf8');
      }
    }
    global.Response = TestResponse as never;
  });

  beforeEach(() => jest.clearAllMocks());

  it('requires authentication', async () => {
    session.mockResolvedValue(null);
    const response = await GET(request(), context());
    expect(response.status).toBe(401);
    expect(admin).not.toHaveBeenCalled();
  });

  it('returns not found when the viewer is not authorized', async () => {
    session.mockResolvedValue({ user: { id: 'viewer', role: 'viewer' } } as never);
    configureMedia();
    authorize.mockResolvedValue(false);
    const response = await GET(request(), context());
    expect(response.status).toBe(404);
  });

  it('streams authorized bytes without exposing a Storage URL', async () => {
    session.mockResolvedValue({ user: { id: 'viewer', role: 'viewer' } } as never);
    const { file } = configureMedia();
    authorize.mockResolvedValue(true);

    const response = await GET(request(), context());

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toBe('image-bytes');
    expect(file.createReadStream).toHaveBeenCalled();
  });
});

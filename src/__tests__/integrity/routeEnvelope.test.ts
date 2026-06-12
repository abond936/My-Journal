import { getServerSession } from 'next-auth/next';
import {
  apiRouteError,
  apiRouteInputCapError,
  requireApiSession,
} from '@/lib/api/routeEnvelope';

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

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('routeEnvelope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the standard ok:false error envelope', async () => {
    const response = apiRouteError({
      code: 'TEST_ERROR',
      message: 'Something failed.',
      status: 400,
      retryable: false,
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      ok: false,
      code: 'TEST_ERROR',
      message: 'Something failed.',
      severity: 'error',
      retryable: false,
    });
  });

  it('returns 401 for missing authenticated sessions', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null as never);

    const result = await requireApiSession('authenticated');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      const payload = await result.error.json();
      expect(result.error.status).toBe(401);
      expect(payload.code).toBe('AUTH_UNAUTHORIZED');
    }
  });

  it('returns 403 for non-admin sessions on admin routes', async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { role: 'viewer' } } as never);

    const result = await requireApiSession('admin');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
      const payload = await result.error.json();
      expect(payload.code).toBe('AUTH_FORBIDDEN');
    }
  });

  it('maps input-cap failures through route-specific codes', async () => {
    const response = apiRouteInputCapError(
      { code: 'INPUT_ARRAY_EXCEEDED', message: 'cardIds must contain at most 400 items.' },
      { code: 'CARD_BULK_TAGS_TOO_MANY' }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe('CARD_BULK_TAGS_TOO_MANY');
    expect(payload.ok).toBe(false);
  });
});

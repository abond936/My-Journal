import { getServerSession } from 'next-auth/next';
import { GET } from '@/app/api/cards/search/route';
import { getCards } from '@/lib/services/cards/cardListQueryService';
import { getCardsByIds } from '@/lib/services/cards/cardReadService';
import { isTypesenseConfigured } from '@/lib/config/typesense';
import { searchCardsFiltered } from '@/lib/services/typesenseService';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: {
        set: jest.fn(),
      },
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

jest.mock('@/lib/services/cards/cardListQueryService', () => ({
  getCards: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardReadService', () => ({
  getCardsByIds: jest.fn(),
}));

jest.mock('@/lib/config/typesense', () => ({
  isTypesenseConfigured: jest.fn(),
}));

jest.mock('@/lib/services/typesenseService', () => ({
  searchCardsFiltered: jest.fn(),
}));

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedGetCards = getCards as jest.MockedFunction<typeof getCards>;
const mockedGetCardsByIds = getCardsByIds as jest.MockedFunction<typeof getCardsByIds>;
const mockedIsTypesenseConfigured = isTypesenseConfigured as jest.MockedFunction<typeof isTypesenseConfigured>;
const mockedSearchCardsFiltered = searchCardsFiltered as jest.MockedFunction<typeof searchCardsFiltered>;

function makeRequest(url: string) {
  return { url } as Request;
}

describe('card search route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const res = await GET(makeRequest('https://example.test/api/cards/search?q=test'));
    const payload = await res.json();

    expect(res.status).toBe(401);
    expect(payload.code).toBe('AUTH_UNAUTHORIZED');
  });

  it('uses Typesense-backed search when configured', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'viewer' } } as never);
    mockedIsTypesenseConfigured.mockReturnValue(true);
    mockedSearchCardsFiltered.mockResolvedValue({
      docIds: ['card-1', 'card-2'],
      totalFound: 3,
    });
    mockedGetCardsByIds.mockResolvedValue([
      { docId: 'card-1', title: 'One' },
      { docId: 'card-2', title: 'Two' },
    ] as never);

    const res = await GET(makeRequest('https://example.test/api/cards/search?q=test&limit=2'));
    const payload = await res.json();

    expect(mockedSearchCardsFiltered).toHaveBeenCalledWith(
      expect.objectContaining({
        textQuery: 'test',
        status: 'published',
        perPage: 2,
        sortBy: 'title',
        sortDir: 'asc',
      })
    );
    expect(mockedGetCardsByIds).toHaveBeenCalledWith(['card-1', 'card-2']);
    expect(payload).toMatchObject({
      items: [{ docId: 'card-1' }, { docId: 'card-2' }],
      hasMore: true,
      lastDocId: 'card-2',
      searchMode: 'full-text',
      degraded: false,
    });
  });

  it('falls back to Firestore title search when Typesense is not configured', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    mockedIsTypesenseConfigured.mockReturnValue(false);
    mockedGetCards.mockResolvedValue({
      items: [{ docId: 'card-a', title: 'Alpha' }] as never,
      hasMore: false,
      lastDocId: 'card-a',
    });

    const res = await GET(makeRequest('https://example.test/api/cards/search?q=alpha&limit=5'));
    const payload = await res.json();

    expect(mockedSearchCardsFiltered).not.toHaveBeenCalled();
    expect(mockedGetCards).toHaveBeenCalledWith({
      q: 'alpha',
      status: 'all',
      limit: 5,
      lastDocId: undefined,
      sortBy: 'title',
      sortDir: 'asc',
    });
    expect(payload).toMatchObject({
      items: [{ docId: 'card-a' }],
      hasMore: false,
      lastDocId: 'card-a',
      searchMode: 'title-prefix',
      degraded: true,
    });
  });

  it('falls back truthfully when configured Typesense search is unavailable', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'viewer' } } as never);
    mockedIsTypesenseConfigured.mockReturnValue(true);
    mockedSearchCardsFiltered.mockRejectedValue(new Error('Typesense unavailable'));
    mockedGetCards.mockResolvedValue({
      items: [{ docId: 'card-fallback', title: 'Fallback' }] as never,
      hasMore: false,
      lastDocId: 'card-fallback',
    });

    const res = await GET(makeRequest('https://example.test/api/cards/search?q=fall&limit=5'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedGetCards).toHaveBeenCalledWith({
      q: 'fall',
      status: 'published',
      limit: 5,
      lastDocId: undefined,
      sortBy: 'title',
      sortDir: 'asc',
    });
    expect(payload).toMatchObject({
      items: [{ docId: 'card-fallback' }],
      searchMode: 'title-prefix',
      degraded: true,
    });
  });
});

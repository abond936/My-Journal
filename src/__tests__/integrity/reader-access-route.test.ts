import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { redirect } from 'next/navigation';
import { getCardById, getCards, getPaginatedCardsByIds } from '@/lib/services/cardService';
import { GET as listCards } from '@/app/api/cards/route';
import { GET as getCard } from '@/app/api/cards/[id]/route';
import { GET as searchCards } from '@/app/api/cards/search/route';
import { GET as randomCards } from '@/app/api/cards/random/route';
import { GET as viewMedia } from '@/app/api/view/media/route';
import ViewPage from '@/app/view/page';
import SearchPage from '@/app/search/page';
import { config, middleware } from '../../../middleware';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: {
        set: jest.fn(),
      },
      json: async () => data,
    }),
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn((url: URL) => ({ type: 'redirect', url: url.toString() })),
  },
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string | URL) => ({
    type: 'redirect',
    url: url.toString(),
  })),
  notFound: jest.fn(() => ({ type: 'notFound' })),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('@/lib/services/cardService', () => ({
  getCardById: jest.fn(),
  getCardsByIds: jest.fn(),
  getPaginatedCardsByIds: jest.fn(),
  updateCard: jest.fn(),
  updateCardCover: jest.fn(),
  updateCardGallery: jest.fn(),
  updateCardGalleryOrder: jest.fn(),
  updateCardChildren: jest.fn(),
  updateCardChildrenOrder: jest.fn(),
  updateCardCollectionRoot: jest.fn(),
  updateCardMetadata: jest.fn(),
  updateCardTags: jest.fn(),
  updateCardStatus: jest.fn(),
  deleteCard: jest.fn(),
  isGalleryOnlyPayload: jest.fn(),
  isGalleryReorderOnlyPayload: jest.fn(),
  isCardMetadataOnlyPayload: jest.fn(),
  isChildrenOnlyPayload: jest.fn(),
  isChildrenReorderOnlyPayload: jest.fn(),
  isCollectionRootOnlyPayload: jest.fn(),
  isTagsOnlyPayload: jest.fn(),
  isStatusOnlyPayload: jest.fn(),
  getCards: jest.fn(),
  getCardsByCollectionId: jest.fn(),
  getCollectionCards: jest.fn(),
  getParentCardsByChildId: jest.fn(),
  createCard: jest.fn(),
  searchCards: jest.fn(),
}));

jest.mock('@/lib/config/typesense', () => ({
  isTypesenseConfigured: jest.fn(() => false),
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({
    firestore: jest.fn(() => ({
      collection: jest.fn(),
    })),
  })),
}));

jest.mock('@/lib/services/typesenseMediaService', () => ({
  ensureMediaCollection: jest.fn(),
  searchMediaTypesense: jest.fn(),
}));

jest.mock('@/app/view/ViewRootClientPage', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/app/search/SearchRootClientPage', () => ({
  __esModule: true,
  default: () => null,
}));

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedGetCardById = getCardById as jest.MockedFunction<typeof getCardById>;
const mockedGetCards = getCards as jest.MockedFunction<typeof getCards>;
const mockedGetPaginatedCardsByIds = getPaginatedCardsByIds as jest.MockedFunction<typeof getPaginatedCardsByIds>;

function makeRequest(url: string) {
  const parsed = new URL(url);
  return {
    method: 'GET',
    url,
    nextUrl: {
      pathname: parsed.pathname,
      search: parsed.search,
      searchParams: parsed.searchParams,
      clone: () => new URL(url),
    },
    headers: {
      get: jest.fn(),
    },
    clone() {
      return this;
    },
    json: async () => ({}),
  } as never;
}

describe('reader access boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated reader routes to login with callbackUrl', async () => {
    mockedGetToken.mockResolvedValue(null);

    const res = await middleware(makeRequest('https://example.test/view/card-1?x=1'));

    expect(res).toMatchObject({
      type: 'redirect',
      url: 'https://example.test/login?callbackUrl=%2Fview%2Fcard-1%3Fx%3D1',
    });
  });

  it('registers explicit middleware matchers for root and nested reader routes', () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining(['/view', '/view/:path*', '/search', '/search/:path*'])
    );
  });

  it('returns 401 for anonymous reader APIs', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const [listRes, searchRes, randomRes, mediaRes] = await Promise.all([
      listCards(makeRequest('https://example.test/api/cards')),
      searchCards(makeRequest('https://example.test/api/cards/search?q=test')),
      randomCards(makeRequest('https://example.test/api/cards/random')),
      viewMedia(makeRequest('https://example.test/api/view/media')),
    ]);

    expect(listRes.status).toBe(401);
    expect(searchRes.status).toBe(401);
    expect(randomRes.status).toBe(401);
    expect(mediaRes.status).toBe(401);
  });

  it('scans additional ordered card batches before paginating subject-scoped results', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    mockedGetCards
      .mockResolvedValueOnce({
        items: [
          {
            docId: 'card-1',
            title: 'Non-subject match',
            status: 'draft',
            who: ['who-other'],
            subjectTagId: 'who-other',
            subjectFilterTags: { 'who-other': true },
          } as never,
        ],
        lastDocId: 'card-1',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [
          {
            docId: 'card-2',
            title: 'Subject match',
            status: 'draft',
            who: ['who-target'],
            subjectTagId: 'who-target',
            subjectFilterTags: { 'who-target': true },
          } as never,
        ],
        lastDocId: 'card-2',
        hasMore: false,
      });

    const res = await listCards(
      makeRequest('https://example.test/api/cards?status=all&who=who-target&tagScope=subject&limit=1')
    );
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedGetCards).toHaveBeenCalledTimes(2);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].docId).toBe('card-2');
    expect(payload.lastDocId).toBe('card-2');
    expect(payload.hasMore).toBe(false);
  });

  it('redirects anonymous root reader pages server-side with callbackUrl intact', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    await Promise.all([
      ViewPage({
        searchParams: Promise.resolve({ focusCardId: 'card-1' }),
      }),
      SearchPage({
        searchParams: Promise.resolve({ q: 'family story' }),
      }),
    ]);

    expect(mockedRedirect).toHaveBeenNthCalledWith(
      1,
      '/login?callbackUrl=%2Fview%3FfocusCardId%3Dcard-1'
    );
    expect(mockedRedirect).toHaveBeenNthCalledWith(
      2,
      '/login?callbackUrl=%2Fsearch%3Fq%3Dfamily%2Bstory'
    );
  });

  it('hides draft card detail from viewers', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'viewer' } } as never);
    mockedGetCardById.mockResolvedValue({
      docId: 'draft-card',
      title: 'Draft',
      status: 'draft',
      createdAt: 1,
      updatedAt: 1,
    } as never);

    const res = await getCard(makeRequest('https://example.test/api/cards/draft-card'), {
      params: Promise.resolve({ id: 'draft-card' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(404);
    expect(payload.code).toBe('NOT_FOUND');
  });

  it('filters draft children from viewer card detail', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'viewer' } } as never);
    mockedGetCardById.mockResolvedValue({
      docId: 'published-parent',
      title: 'Published',
      status: 'published',
      childrenIds: ['published-child', 'draft-child'],
      createdAt: 1,
      updatedAt: 1,
    } as never);
    mockedGetPaginatedCardsByIds.mockResolvedValue({
      items: [
        { docId: 'published-child', title: 'Visible', status: 'published' },
        { docId: 'draft-child', title: 'Hidden', status: 'draft' },
      ],
      hasMore: false,
      lastDocId: undefined,
    } as never);

    const res = await getCard(makeRequest('https://example.test/api/cards/published-parent'), {
      params: Promise.resolve({ id: 'published-parent' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.children).toHaveLength(1);
    expect(payload.children[0].docId).toBe('published-child');
  });
});

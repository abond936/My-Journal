import { getServerSession } from 'next-auth';
import {
  getCardById,
  updateCard,
  updateCardCover,
  updateCardGallery,
  updateCardGalleryOrder,
  isGalleryOnlyPayload,
  isGalleryReorderOnlyPayload,
  updateCardChildren,
  updateCardChildrenOrder,
  updateCardCollectionRoot,
  updateCardMetadata,
  updateCardTags,
  updateCardStatus,
  isCardMetadataOnlyPayload,
  isChildrenOnlyPayload,
  isChildrenReorderOnlyPayload,
  isCollectionRootOnlyPayload,
  isTagsOnlyPayload,
  isStatusOnlyPayload,
} from '@/lib/services/cardService';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
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

jest.mock('@/lib/services/cardService', () => ({
  getCardById: jest.fn(),
  updateCard: jest.fn(),
  updateCardCover: jest.fn(),
  updateCardGallery: jest.fn(),
  updateCardGalleryOrder: jest.fn(),
  isGalleryOnlyPayload: jest.fn(),
  isGalleryReorderOnlyPayload: jest.fn(),
  updateCardChildren: jest.fn(),
  updateCardChildrenOrder: jest.fn(),
  updateCardCollectionRoot: jest.fn(),
  updateCardMetadata: jest.fn(),
  updateCardTags: jest.fn(),
  updateCardStatus: jest.fn(),
  isCardMetadataOnlyPayload: jest.fn(),
  isChildrenOnlyPayload: jest.fn(),
  isChildrenReorderOnlyPayload: jest.fn(),
  isCollectionRootOnlyPayload: jest.fn(),
  isTagsOnlyPayload: jest.fn(),
  isStatusOnlyPayload: jest.fn(),
  deleteCard: jest.fn(),
  getPaginatedCardsByIds: jest.fn(),
}));

import { PATCH } from '@/app/api/cards/[id]/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedGetCardById = getCardById as jest.MockedFunction<typeof getCardById>;
const mockedUpdateCard = updateCard as jest.MockedFunction<typeof updateCard>;
const mockedUpdateCardCover = updateCardCover as jest.MockedFunction<typeof updateCardCover>;
const mockedUpdateCardGallery = updateCardGallery as jest.MockedFunction<typeof updateCardGallery>;
const mockedUpdateCardGalleryOrder = updateCardGalleryOrder as jest.MockedFunction<typeof updateCardGalleryOrder>;
const mockedIsGalleryOnlyPayload = isGalleryOnlyPayload as jest.MockedFunction<typeof isGalleryOnlyPayload>;
const mockedIsGalleryReorderOnlyPayload = isGalleryReorderOnlyPayload as jest.MockedFunction<typeof isGalleryReorderOnlyPayload>;
const mockedUpdateCardChildren = updateCardChildren as jest.MockedFunction<typeof updateCardChildren>;
const mockedUpdateCardChildrenOrder = updateCardChildrenOrder as jest.MockedFunction<typeof updateCardChildrenOrder>;
const mockedUpdateCardCollectionRoot = updateCardCollectionRoot as jest.MockedFunction<typeof updateCardCollectionRoot>;
const mockedUpdateCardMetadata = updateCardMetadata as jest.MockedFunction<typeof updateCardMetadata>;
const mockedUpdateCardTags = updateCardTags as jest.MockedFunction<typeof updateCardTags>;
const mockedUpdateCardStatus = updateCardStatus as jest.MockedFunction<typeof updateCardStatus>;
const mockedIsCardMetadataOnlyPayload = isCardMetadataOnlyPayload as jest.MockedFunction<typeof isCardMetadataOnlyPayload>;
const mockedIsChildrenOnlyPayload = isChildrenOnlyPayload as jest.MockedFunction<typeof isChildrenOnlyPayload>;
const mockedIsChildrenReorderOnlyPayload = isChildrenReorderOnlyPayload as jest.MockedFunction<typeof isChildrenReorderOnlyPayload>;
const mockedIsCollectionRootOnlyPayload = isCollectionRootOnlyPayload as jest.MockedFunction<typeof isCollectionRootOnlyPayload>;
const mockedIsTagsOnlyPayload = isTagsOnlyPayload as jest.MockedFunction<typeof isTagsOnlyPayload>;
const mockedIsStatusOnlyPayload = isStatusOnlyPayload as jest.MockedFunction<typeof isStatusOnlyPayload>;

function makeRequest(body: unknown) {
  return {
    method: 'PATCH',
    nextUrl: {
      pathname: '/api/cards/card-1',
      searchParams: new URLSearchParams(),
    },
    headers: {
      get: jest.fn(() => 'application/json'),
    },
    json: async () => body,
    clone() {
      return this;
    },
  } as unknown as Request;
}

describe('PATCH /api/cards/[id] cover fast path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    mockedGetCardById.mockResolvedValue({ docId: 'card-1', title: 'Test', createdAt: 1, updatedAt: 1, content: '' } as never);
    mockedIsGalleryOnlyPayload.mockReturnValue(false);
    mockedIsGalleryReorderOnlyPayload.mockReturnValue(false);
    mockedIsCardMetadataOnlyPayload.mockReturnValue(false);
    mockedIsChildrenOnlyPayload.mockReturnValue(false);
    mockedIsChildrenReorderOnlyPayload.mockReturnValue(false);
    mockedIsCollectionRootOnlyPayload.mockReturnValue(false);
    mockedIsTagsOnlyPayload.mockReturnValue(false);
    mockedIsStatusOnlyPayload.mockReturnValue(false);
  });

  it('uses narrow cover update path for cover-only payloads', async () => {
    mockedUpdateCardCover.mockResolvedValue({ docId: 'card-1', coverImageId: 'media-1' } as never);

    const res = await PATCH(makeRequest({ coverImageId: 'media-1' }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardCover).toHaveBeenCalledWith('card-1', {
      coverImageId: 'media-1',
      coverImageFocalPoint: undefined,
    });
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(payload.coverImageId).toBe('media-1');
  });

  it('falls back to broad update path when payload includes non-cover fields', async () => {
    mockedUpdateCard.mockResolvedValue({ docId: 'card-1', title: 'Renamed', coverImageId: 'media-1' } as never);

    const res = await PATCH(makeRequest({ coverImageId: 'media-1', title: 'Renamed' }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCard).toHaveBeenCalledWith('card-1', {
      coverImageId: 'media-1',
      title: 'Renamed',
    });
    expect(mockedUpdateCardCover).not.toHaveBeenCalled();
    expect(payload.title).toBe('Renamed');
  });

  it('uses narrow gallery reorder path for reorder-only gallery payloads', async () => {
    mockedIsGalleryReorderOnlyPayload.mockReturnValue(true);
    mockedUpdateCardGalleryOrder.mockResolvedValue({
      docId: 'card-1',
      galleryMedia: [
        { mediaId: 'media-2', order: 0 },
        { mediaId: 'media-1', order: 1 },
      ],
    } as never);

    const galleryMedia = [
      { mediaId: 'media-2', order: 0 },
      { mediaId: 'media-1', order: 1 },
    ];

    const res = await PATCH(makeRequest({ galleryMedia }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardGalleryOrder).toHaveBeenCalledWith('card-1', galleryMedia);
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(mockedUpdateCardCover).not.toHaveBeenCalled();
    expect(payload.galleryMedia).toEqual(galleryMedia);
  });

  it('uses narrow gallery-only path for gallery membership changes', async () => {
    mockedIsGalleryOnlyPayload.mockReturnValue(true);
    mockedUpdateCardGallery.mockResolvedValue({
      docId: 'card-1',
      galleryMedia: [
        { mediaId: 'media-1', order: 0 },
        { mediaId: 'media-3', order: 1 },
      ],
    } as never);

    const galleryMedia = [
      { mediaId: 'media-1', order: 0 },
      { mediaId: 'media-3', order: 1 },
    ];

    const res = await PATCH(makeRequest({ galleryMedia }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardGallery).toHaveBeenCalledWith('card-1', galleryMedia);
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(mockedUpdateCardCover).not.toHaveBeenCalled();
    expect(mockedUpdateCardGalleryOrder).not.toHaveBeenCalled();
    expect(payload.galleryMedia).toEqual(galleryMedia);
  });

  it('uses narrow children reorder path for reorder-only children payloads', async () => {
    mockedIsChildrenReorderOnlyPayload.mockReturnValue(true);
    mockedUpdateCardChildrenOrder.mockResolvedValue({
      docId: 'card-1',
      childrenIds: ['child-2', 'child-1'],
    } as never);

    const childrenIds = ['child-2', 'child-1'];

    const res = await PATCH(makeRequest({ childrenIds }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardChildrenOrder).toHaveBeenCalledWith('card-1', childrenIds);
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(mockedUpdateCardCover).not.toHaveBeenCalled();
    expect(mockedUpdateCardGalleryOrder).not.toHaveBeenCalled();
    expect(payload.childrenIds).toEqual(childrenIds);
  });

  it('uses narrow children-only path for child membership changes', async () => {
    mockedIsChildrenOnlyPayload.mockReturnValue(true);
    mockedUpdateCardChildren.mockResolvedValue({
      docId: 'card-1',
      childrenIds: ['child-1', 'child-3'],
    } as never);

    const childrenIds = ['child-1', 'child-3'];

    const res = await PATCH(makeRequest({ childrenIds }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardChildren).toHaveBeenCalledWith('card-1', childrenIds);
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(mockedUpdateCardCover).not.toHaveBeenCalled();
    expect(mockedUpdateCardGalleryOrder).not.toHaveBeenCalled();
    expect(mockedUpdateCardChildrenOrder).not.toHaveBeenCalled();
    expect(payload.childrenIds).toEqual(childrenIds);
  });

  it('uses narrow metadata-only path for lightweight card edits', async () => {
    mockedIsCardMetadataOnlyPayload.mockReturnValue(true);
    mockedUpdateCardMetadata.mockResolvedValue({
      docId: 'card-1',
      title: 'Renamed',
    } as never);

    const updates = { title: 'Renamed' };

    const res = await PATCH(makeRequest(updates), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardMetadata).toHaveBeenCalledWith('card-1', updates);
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(mockedUpdateCardCover).not.toHaveBeenCalled();
    expect(mockedUpdateCardGalleryOrder).not.toHaveBeenCalled();
    expect(mockedUpdateCardChildrenOrder).not.toHaveBeenCalled();
    expect(mockedUpdateCardCollectionRoot).not.toHaveBeenCalled();
    expect(mockedUpdateCardTags).not.toHaveBeenCalled();
    expect(mockedUpdateCardStatus).not.toHaveBeenCalled();
    expect(payload.title).toBe('Renamed');
  });
});

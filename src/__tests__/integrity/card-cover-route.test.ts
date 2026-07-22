import { getServerSession } from 'next-auth';
import { updateCard } from '@/lib/services/cards/cardBroadMutationService';
import { updateCardContent } from '@/lib/services/cards/cardContentMutationService';
import { updateCardCover } from '@/lib/services/cards/cardCoverMutationService';
import {
  updateCardGallery,
  updateCardGalleryOrder,
  updateCardGalleryInheritanceOverrides,
} from '@/lib/services/cards/cardGalleryMutationService';
import {
  updateCardChildren,
  updateCardChildrenOrder,
  updateCardCollectionRoot,
} from '@/lib/services/cards/cardHierarchyMutationService';
import { updateCardMetadata } from '@/lib/services/cards/cardMetadataMutationService';
import {
  isGalleryOnlyPayload,
  isGalleryReorderOnlyPayload,
  isCardMetadataOnlyPayload,
  isChildrenOnlyPayload,
  isChildrenReorderOnlyPayload,
  isCollectionRootOnlyPayload,
  isContentOnlyPayload,
  isTagsOnlyPayload,
  isGalleryInheritanceOverridesOnlyPayload,
  isStatusOnlyPayload,
} from '@/lib/services/cards/cardMutationClassifiers';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { updateCardStatus } from '@/lib/services/cards/cardStatusMutationService';
import { updateCardTags } from '@/lib/services/cards/cardTagMutationService';
import { getAdminApp } from '@/lib/config/firebase/admin';

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

jest.mock('@/lib/services/cards/cardReadService', () => ({ getCardById: jest.fn(), getPaginatedCardsByIds: jest.fn() }));
jest.mock('@/lib/services/cards/cardBroadMutationService', () => ({ updateCard: jest.fn() }));
jest.mock('@/lib/services/cards/cardCoverMutationService', () => ({ updateCardCover: jest.fn() }));
jest.mock('@/lib/services/cards/cardGalleryMutationService', () => ({
  updateCardGallery: jest.fn(),
  updateCardGalleryOrder: jest.fn(),
  updateCardGalleryInheritanceOverrides: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardHierarchyMutationService', () => ({
  updateCardChildren: jest.fn(), updateCardChildrenOrder: jest.fn(), updateCardCollectionRoot: jest.fn(),
}));
jest.mock('@/lib/services/cards/cardMetadataMutationService', () => ({ updateCardMetadata: jest.fn() }));
jest.mock('@/lib/services/cards/cardTagMutationService', () => ({ updateCardTags: jest.fn() }));
jest.mock('@/lib/services/cards/cardStatusMutationService', () => ({ updateCardStatus: jest.fn() }));
jest.mock('@/lib/services/cards/cardContentMutationService', () => ({ updateCardContent: jest.fn() }));
jest.mock('@/lib/services/cards/cardLifecycleService', () => ({ deleteCard: jest.fn() }));
jest.mock('@/lib/services/cards/cardMutationClassifiers', () => ({
  isGalleryOnlyPayload: jest.fn(),
  isGalleryReorderOnlyPayload: jest.fn(),
  isCardMetadataOnlyPayload: jest.fn(),
  isChildrenOnlyPayload: jest.fn(),
  isChildrenReorderOnlyPayload: jest.fn(),
  isCollectionRootOnlyPayload: jest.fn(),
  isContentOnlyPayload: jest.fn(),
  isTagsOnlyPayload: jest.fn(),
  isGalleryInheritanceOverridesOnlyPayload: jest.fn(),
  isStatusOnlyPayload: jest.fn(),
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(),
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
const mockedUpdateCardContent = updateCardContent as jest.MockedFunction<typeof updateCardContent>;
const mockedIsCardMetadataOnlyPayload = isCardMetadataOnlyPayload as jest.MockedFunction<typeof isCardMetadataOnlyPayload>;
const mockedIsChildrenOnlyPayload = isChildrenOnlyPayload as jest.MockedFunction<typeof isChildrenOnlyPayload>;
const mockedIsChildrenReorderOnlyPayload = isChildrenReorderOnlyPayload as jest.MockedFunction<typeof isChildrenReorderOnlyPayload>;
const mockedIsCollectionRootOnlyPayload = isCollectionRootOnlyPayload as jest.MockedFunction<typeof isCollectionRootOnlyPayload>;
const mockedIsContentOnlyPayload = isContentOnlyPayload as jest.MockedFunction<typeof isContentOnlyPayload>;
const mockedIsTagsOnlyPayload = isTagsOnlyPayload as jest.MockedFunction<typeof isTagsOnlyPayload>;
const mockedIsGalleryInheritanceOverridesOnlyPayload = isGalleryInheritanceOverridesOnlyPayload as jest.MockedFunction<typeof isGalleryInheritanceOverridesOnlyPayload>;
const mockedUpdateCardGalleryInheritanceOverrides = updateCardGalleryInheritanceOverrides as jest.MockedFunction<typeof updateCardGalleryInheritanceOverrides>;
const mockedIsStatusOnlyPayload = isStatusOnlyPayload as jest.MockedFunction<typeof isStatusOnlyPayload>;
const mockedGetAdminApp = getAdminApp as jest.MockedFunction<typeof getAdminApp>;
const cardDocGetMock = jest.fn();

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
    mockedIsGalleryInheritanceOverridesOnlyPayload.mockReturnValue(false);
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    mockedGetCardById.mockResolvedValue({ docId: 'card-1', title: 'Test', createdAt: 1, updatedAt: 1, content: '' } as never);
    cardDocGetMock.mockResolvedValue({
      exists: true,
      id: 'card-1',
      data: () => ({ title: 'Test', createdAt: 1, updatedAt: 1, content: '', galleryMedia: [], childrenIds: [] }),
    });
    mockedGetAdminApp.mockReturnValue({
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: cardDocGetMock,
          }),
        }),
      }),
    } as never);
    mockedIsGalleryOnlyPayload.mockReturnValue(false);
    mockedIsGalleryReorderOnlyPayload.mockReturnValue(false);
    mockedIsCardMetadataOnlyPayload.mockReturnValue(false);
    mockedIsChildrenOnlyPayload.mockReturnValue(false);
    mockedIsChildrenReorderOnlyPayload.mockReturnValue(false);
    mockedIsCollectionRootOnlyPayload.mockReturnValue(false);
    mockedIsContentOnlyPayload.mockReturnValue(false);
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
    expect(mockedGetCardById).not.toHaveBeenCalled();
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

  it('uses narrow content-only path for editor body updates', async () => {
    mockedIsContentOnlyPayload.mockReturnValue(true);
    mockedUpdateCardContent.mockResolvedValue({
      docId: 'card-1',
      content: '<p>Updated body</p>',
      contentMedia: ['media-1'],
    } as never);

    const res = await PATCH(makeRequest({ content: '<p>Updated body</p>' }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardContent).toHaveBeenCalledWith('card-1', '<p>Updated body</p>');
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(mockedUpdateCardMetadata).not.toHaveBeenCalled();
    expect(payload.content).toBe('<p>Updated body</p>');
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

  it('accepts collection-root payloads and routes them to the narrow root update path', async () => {
    mockedIsCollectionRootOnlyPayload.mockReturnValue(true);
    mockedUpdateCardCollectionRoot.mockResolvedValue({
      docId: 'card-1',
      isCollectionRoot: true,
      collectionRootOrder: 20,
    } as never);

    const res = await PATCH(makeRequest({ isCollectionRoot: true, collectionRootOrder: 20 }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardCollectionRoot).toHaveBeenCalledWith('card-1', {
      isCollectionRoot: true,
      collectionRootOrder: 20,
    });
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(payload.isCollectionRoot).toBe(true);
    expect(payload.collectionRootOrder).toBe(20);
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

  it('routes subject-only payloads through the narrow tag-assignment path', async () => {
    mockedIsTagsOnlyPayload.mockReturnValue(true);
    mockedUpdateCardTags.mockResolvedValue({
      docId: 'card-1',
      tags: ['siblings'],
      subjectTagId: 'siblings',
    } as never);

    const res = await PATCH(makeRequest({ subjectTagId: 'siblings' }), {
      params: Promise.resolve({ id: 'card-1' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedUpdateCardTags).toHaveBeenCalledWith('card-1', {
      tags: undefined,
      subjectTagId: 'siblings',
    });
    expect(mockedUpdateCard).not.toHaveBeenCalled();
    expect(payload.subjectTagId).toBe('siblings');
  });

  it('routes Gallery inheritance controls through the narrow override path', async () => {
    const overrides = { who: false, what: true, when: true, where: true };
    mockedIsGalleryInheritanceOverridesOnlyPayload.mockReturnValue(true);
    mockedUpdateCardGalleryInheritanceOverrides.mockResolvedValue({
      docId: 'card-1', title: 'Test', content: '', createdAt: 1, updatedAt: 2,
      galleryTagInheritanceOverrides: overrides,
    } as never);

    const res = await PATCH(makeRequest({ galleryTagInheritanceOverrides: overrides }) as never, {
      params: Promise.resolve({ id: 'card-1' }),
    });

    expect(res.status).toBe(200);
    expect(mockedUpdateCardGalleryInheritanceOverrides).toHaveBeenCalledWith('card-1', overrides);
    expect(mockedUpdateCard).not.toHaveBeenCalled();
  });
});

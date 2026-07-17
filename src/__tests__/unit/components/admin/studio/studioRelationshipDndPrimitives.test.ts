import {
  handleStudioRelationshipDragEnd,
  reorderChildrenIdsFromDragIds,
  reorderGalleryMediaFromDragIds,
} from '@/components/admin/studio/studioRelationshipDndPrimitives';
import type { Media } from '@/lib/types/photo';

const baseMedia = (overrides: Partial<Media> = {}): Media => ({
  docId: 'media-1',
  filename: 'image.jpg',
  width: 100,
  height: 100,
  size: 1024,
  contentType: 'image/jpeg',
  storageUrl: 'https://example.com/image.jpg',
  storagePath: 'images/image.jpg',
  source: 'paste',
  sourcePath: 'upload://image.jpg',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('reorderGalleryMediaFromDragIds', () => {
  const items = [
    { mediaId: 'media-1', order: 0 },
    { mediaId: 'media-2', order: 1 },
    { mediaId: 'media-3', order: 2 },
  ];

  it('reorders by mediaId across order-encoding drift', () => {
    expect(reorderGalleryMediaFromDragIds(items, 'gallery:media-3:99', 'gallery:media-1:0')).toEqual([
      { mediaId: 'media-3', order: 0 },
      { mediaId: 'media-1', order: 1 },
      { mediaId: 'media-2', order: 2 },
    ]);
  });

  it('moves to end for gallery:end', () => {
    expect(reorderGalleryMediaFromDragIds(items, 'gallery:media-1:0', 'gallery:end')).toEqual([
      { mediaId: 'media-2', order: 0 },
      { mediaId: 'media-3', order: 1 },
      { mediaId: 'media-1', order: 2 },
    ]);
  });

  it('returns null for non-gallery drags', () => {
    expect(reorderGalleryMediaFromDragIds(items, 'studioChild:a', 'studioChild:b')).toBeNull();
  });
});

describe('reorderChildrenIdsFromDragIds', () => {
  const childrenIds = ['child-1', 'child-2', 'child-3'];

  it('reorders when dropped onto another child row', () => {
    expect(
      reorderChildrenIdsFromDragIds(childrenIds, 'studioChild:child-3', 'studioChild:child-1', 'parent-1')
    ).toEqual(['child-3', 'child-1', 'child-2']);
  });

  it('moves to end for studioChildAfter parent zone', () => {
    expect(
      reorderChildrenIdsFromDragIds(
        childrenIds,
        'studioChild:child-1',
        'studioChildAfter:parent-1',
        'parent-1'
      )
    ).toEqual(['child-2', 'child-3', 'child-1']);
  });

  it('returns null for non-child drags', () => {
    expect(reorderChildrenIdsFromDragIds(childrenIds, 'gallery:media-1:0', 'gallery:media-2:1')).toBeNull();
  });
});

describe('handleStudioRelationshipDragEnd', () => {
  const buildCtx = (overrides: Record<string, unknown> = {}) => ({
    actionBusy: false,
    selectedCardDetail: {
      docId: 'card-1',
      title: 'Card',
      childrenIds: [],
      galleryMedia: [],
      contentMedia: [],
    } as never,
    selectedCardId: 'card-1',
    patchSelectedCard: jest.fn(),
    bridgeCollectionsCardToSelectedParent: jest.fn(),
    resolveBankMediaById: () => undefined,
    bodyMediaInsertRef: { current: jest.fn() },
    showToast: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    ...overrides,
  });

  it('inserts dropped body media through the registered editor adapter', async () => {
    const media = baseMedia();
    const insert = jest.fn();
    const showSuccess = jest.fn();
    const showError = jest.fn();
    const showToast = jest.fn();

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: { id: `source:${media.docId}` },
        over: { id: 'drop:body' },
      },
      null,
      buildCtx({
        patchSelectedCard: jest.fn(),
        resolveBankMediaById: () => media,
        bodyMediaInsertRef: { current: insert },
        showToast,
        showSuccess,
        showError,
      })
    );

    expect(handled).toBe(true);
    expect(insert).toHaveBeenCalledWith(media);
    expect(showSuccess).toHaveBeenCalledWith('Image inserted in the card body.');
    expect(showError).not.toHaveBeenCalled();
  });

  it('reports when body media cannot be resolved from the active bank set', async () => {
    const showSuccess = jest.fn();
    const showError = jest.fn();
    const showToast = jest.fn();

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: { id: 'source:missing-media' },
        over: { id: 'drop:body' },
      },
      null,
      buildCtx({
        patchSelectedCard: jest.fn(),
        resolveBankMediaById: () => undefined,
        bodyMediaInsertRef: { current: jest.fn() },
        showToast,
        showSuccess,
        showError,
      })
    );

    expect(handled).toBe(true);
    expect(showError).toHaveBeenCalledWith(
      'That media is not on the current bank page. Adjust filters or use Next/Previous, then try again.',
      'Could not insert image',
      false
    );
    expect(showSuccess).not.toHaveBeenCalled();
  });

  it('sets cover when bank media is dropped on the cover target', async () => {
    const patchSelectedCard = jest.fn().mockResolvedValue(undefined);

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: { id: 'source:media-cover' },
        over: { id: 'drop:cover' },
      },
      null,
      buildCtx({
        patchSelectedCard,
      })
    );

    expect(handled).toBe(true);
    expect(patchSelectedCard).toHaveBeenCalledWith({
      coverImageId: 'media-cover',
      galleryMedia: [{ mediaId: 'media-cover', order: 0 }],
    });
  });

  it('appends bank media to gallery when dropped on the gallery target', async () => {
    const patchSelectedCard = jest.fn().mockResolvedValue(undefined);
    const showSuccess = jest.fn();

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: { id: 'source:media-gallery' },
        over: { id: 'drop:gallery' },
      },
      null,
      buildCtx({
        patchSelectedCard,
        selectedCardDetail: {
          docId: 'card-1',
          title: 'Card',
          childrenIds: [],
          galleryMedia: [{ mediaId: 'existing', order: 0 }],
          contentMedia: [],
        } as never,
        showSuccess,
      })
    );

    expect(handled).toBe(true);
    expect(patchSelectedCard).toHaveBeenCalledWith({
      galleryMedia: [
        { mediaId: 'existing', order: 0 },
        { mediaId: 'media-gallery', order: 1 },
      ],
    });
    expect(showSuccess).toHaveBeenCalledWith('Media added to the Gallery.');
  });

  it('appends the full selected media set to gallery when dragging a selected bank item', async () => {
    const patchSelectedCard = jest.fn().mockResolvedValue(undefined);
    const showSuccess = jest.fn();

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: {
          id: 'source:media-2',
          data: {
            current: {
              mediaId: 'media-2',
              selectedMediaIds: ['media-2', 'media-3', 'existing'],
            },
          },
        },
        over: { id: 'drop:gallery' },
      },
      null,
      buildCtx({
        patchSelectedCard,
        selectedCardDetail: {
          docId: 'card-1',
          title: 'Card',
          childrenIds: [],
          galleryMedia: [{ mediaId: 'existing', order: 0 }],
          contentMedia: [],
        } as never,
        showSuccess,
      })
    );

    expect(handled).toBe(true);
    expect(patchSelectedCard).toHaveBeenCalledWith({
      galleryMedia: [
        { mediaId: 'existing', order: 0 },
        { mediaId: 'media-2', order: 1 },
        { mediaId: 'media-3', order: 2 },
      ],
    });
    expect(showSuccess).toHaveBeenCalledWith('2 media added to the Gallery.');
  });

  it('reorders child cards when dropped onto another child row', async () => {
    const patchSelectedCard = jest.fn().mockResolvedValue(undefined);

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: { id: 'studioChild:child-3' },
        over: { id: 'studioChild:child-1' },
      },
      null,
      buildCtx({
        patchSelectedCard,
        selectedCardDetail: {
          docId: 'card-1',
          title: 'Card',
          childrenIds: ['child-1', 'child-2', 'child-3'],
          galleryMedia: [],
          contentMedia: [],
        } as never,
      })
    );

    expect(handled).toBe(true);
    expect(patchSelectedCard).toHaveBeenCalledWith(
      { childrenIds: ['child-3', 'child-1', 'child-2'] },
      'Child order updated.'
    );
  });

  it('reorders gallery items when dropped onto another gallery row', async () => {
    const patchSelectedCard = jest.fn().mockResolvedValue(undefined);

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: { id: 'gallery:media-3:2' },
        over: { id: 'gallery:media-1:0' },
      },
      null,
      buildCtx({
        patchSelectedCard,
        selectedCardDetail: {
          docId: 'card-1',
          title: 'Card',
          childrenIds: [],
          galleryMedia: [
            { mediaId: 'media-1', order: 0 },
            { mediaId: 'media-2', order: 1 },
            { mediaId: 'media-3', order: 2 },
          ],
          contentMedia: [],
        } as never,
      })
    );

    expect(handled).toBe(true);
    expect(patchSelectedCard).toHaveBeenCalledWith(
      {
        galleryMedia: [
          { mediaId: 'media-3', order: 0 },
          { mediaId: 'media-1', order: 1 },
          { mediaId: 'media-2', order: 2 },
        ],
      },
      'Gallery order updated.'
    );
  });

  it('reorders gallery items by mediaId when sortable order encoding drifts from shell state', async () => {
    const patchSelectedCard = jest.fn().mockResolvedValue(undefined);

    const handled = await handleStudioRelationshipDragEnd(
      {
        // Form may encode order 0/1 while selectedDetail still has sparse historical orders.
        active: { id: 'gallery:media-3:1' },
        over: { id: 'gallery:media-1:0' },
      },
      null,
      buildCtx({
        patchSelectedCard,
        selectedCardDetail: {
          docId: 'card-1',
          title: 'Card',
          childrenIds: [],
          galleryMedia: [
            { mediaId: 'media-1', order: 10 },
            { mediaId: 'media-2', order: 20 },
            { mediaId: 'media-3', order: 30 },
          ],
          contentMedia: [],
        } as never,
      })
    );

    expect(handled).toBe(true);
    expect(patchSelectedCard).toHaveBeenCalledWith(
      {
        galleryMedia: [
          { mediaId: 'media-3', order: 0 },
          { mediaId: 'media-1', order: 1 },
          { mediaId: 'media-2', order: 2 },
        ],
      },
      'Gallery order updated.'
    );
  });

  it('moves a gallery item to the end when dropped on gallery:end', async () => {
    const patchSelectedCard = jest.fn().mockResolvedValue(undefined);

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: { id: 'gallery:media-1:0' },
        over: { id: 'gallery:end' },
      },
      null,
      buildCtx({
        patchSelectedCard,
        selectedCardDetail: {
          docId: 'card-1',
          title: 'Card',
          childrenIds: [],
          galleryMedia: [
            { mediaId: 'media-1', order: 0 },
            { mediaId: 'media-2', order: 1 },
            { mediaId: 'media-3', order: 2 },
          ],
          contentMedia: [],
        } as never,
      })
    );

    expect(handled).toBe(true);
    expect(patchSelectedCard).toHaveBeenCalledWith(
      {
        galleryMedia: [
          { mediaId: 'media-2', order: 0 },
          { mediaId: 'media-3', order: 1 },
          { mediaId: 'media-1', order: 2 },
        ],
      },
      'Gallery order updated.'
    );
  });

  it('sets cover from an existing gallery item when dropped onto the cover target', async () => {
    const patchSelectedCard = jest.fn().mockResolvedValue(undefined);

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: { id: 'gallery:media-2:1' },
        over: { id: 'drop:cover' },
      },
      null,
      buildCtx({
        patchSelectedCard,
        selectedCardDetail: {
          docId: 'card-1',
          title: 'Card',
          childrenIds: [],
          galleryMedia: [
            { mediaId: 'media-1', order: 0 },
            { mediaId: 'media-2', order: 1 },
          ],
          contentMedia: [],
        } as never,
      })
    );

    expect(handled).toBe(true);
    expect(patchSelectedCard).toHaveBeenCalledWith({
      coverImageId: 'media-2',
      galleryMedia: [
        { mediaId: 'media-2', order: 0 },
        { mediaId: 'media-1', order: 1 },
      ],
    });
  });

  it('routes card-bank drops on compose children through the collections bridge handler', async () => {
    const bridgeCollectionsCardToSelectedParent = jest.fn().mockResolvedValue(true);

    const handled = await handleStudioRelationshipDragEnd(
      {
        active: {
          id: 'card:child-2',
          data: {
            current: {
              domain: 'collections',
              kind: 'card',
              cardId: 'child-2',
              sourceParentId: 'old-parent',
            },
          },
        },
        over: { id: 'studio-parent:card-1' },
      },
      null,
      buildCtx({
        bridgeCollectionsCardToSelectedParent,
        selectedCardDetail: {
          docId: 'card-1',
          title: 'Card',
          childrenIds: ['child-1'],
          galleryMedia: [],
          contentMedia: [],
        } as never,
      })
    );

    expect(handled).toBe(true);
    expect(bridgeCollectionsCardToSelectedParent).toHaveBeenCalledWith({
      childId: 'child-2',
      parentId: 'card-1',
      dragData: {
        domain: 'collections',
        kind: 'card',
        cardId: 'child-2',
        sourceParentId: 'old-parent',
      },
    });
  });
});

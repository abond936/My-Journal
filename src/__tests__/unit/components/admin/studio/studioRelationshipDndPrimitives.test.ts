import { handleStudioRelationshipDragEnd } from '@/components/admin/studio/studioRelationshipDndPrimitives';
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

describe('handleStudioRelationshipDragEnd', () => {
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
      {
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
        resolveBankMediaById: () => media,
        bodyMediaInsertRef: { current: insert },
        showToast,
        showSuccess,
        showError,
      }
    );

    expect(handled).toBe(true);
    expect(insert).toHaveBeenCalledWith(media);
    expect(showSuccess).toHaveBeenCalledWith('Image inserted in body.', 'Inserted');
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
      {
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
        resolveBankMediaById: () => undefined,
        bodyMediaInsertRef: { current: jest.fn() },
        showToast,
        showSuccess,
        showError,
      }
    );

    expect(handled).toBe(true);
    expect(showError).toHaveBeenCalledWith(
      'That media is not on the current bank page. Adjust filters or use Next/Previous, then try again.',
      'Could not insert image',
      false
    );
    expect(showSuccess).not.toHaveBeenCalled();
  });
});

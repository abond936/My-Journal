import {
  buildGalleryCaptionPatch,
  buildReaderMetadataQuickEditPatch,
  buildReaderReturnAfterDelete,
  patchReaderQuickEdit,
} from '@/lib/utils/readerCardPatchReconcile';
import type { HydratedGalleryMediaItem } from '@/lib/types/card';

describe('buildReaderMetadataQuickEditPatch', () => {
  it('builds a metadata-only patch for changed title, subtitle, and excerpt', () => {
    const patch = buildReaderMetadataQuickEditPatch(
      { title: 'New title', subtitle: 'New subtitle', excerpt: 'New excerpt' },
      { title: 'Old title', subtitle: 'Old subtitle', excerpt: 'Old excerpt', excerptAuto: true }
    );

    expect(patch).toEqual({
      title: 'New title',
      subtitle: 'New subtitle',
      excerpt: 'New excerpt',
      excerptAuto: false,
    });
  });

  it('omits unchanged fields', () => {
    const patch = buildReaderMetadataQuickEditPatch(
      { title: 'Same', subtitle: 'Changed', excerpt: 'Same' },
      { title: 'Same', subtitle: 'Original', excerpt: 'Same' }
    );

    expect(patch).toEqual({ subtitle: 'Changed' });
  });

  it('clears subtitle with null when emptied', () => {
    const patch = buildReaderMetadataQuickEditPatch(
      { title: 'Same', subtitle: '', excerpt: 'Same' },
      { title: 'Same', subtitle: 'Was set', excerpt: 'Same' }
    );

    expect(patch).toEqual({ subtitle: null });
  });
});

describe('buildReaderReturnAfterDelete', () => {
  it('returns from a deleted detail route to the Reader feed while preserving mode', () => {
    expect(buildReaderReturnAfterDelete('/view/card-1?mode=guided', 'card-1')).toBe('/view?mode=guided');
  });

  it('removes focus for the deleted feed card and preserves other context', () => {
    expect(
      buildReaderReturnAfterDelete('/view?mode=freeform&focusCardId=card-1#stories', 'card-1')
    ).toBe('/view?mode=freeform#stories');
  });

  it('preserves an unrelated focus target', () => {
    expect(buildReaderReturnAfterDelete('/view?focusCardId=card-2', 'card-1')).toBe(
      '/view?focusCardId=card-2'
    );
  });
});

describe('buildGalleryCaptionPatch', () => {
  const gallery: HydratedGalleryMediaItem[] = [
    {
      mediaId: 'media-1',
      order: 0,
      media: { docId: 'media-1', caption: 'File caption', filename: 'a.jpg' },
    },
    {
      mediaId: 'media-2',
      order: 1,
      caption: 'Card override',
      media: { docId: 'media-2', caption: 'Other default', filename: 'b.jpg' },
    },
  ];

  it('returns null when caption is unchanged', () => {
    expect(buildGalleryCaptionPatch(gallery, 'media-1', 'File caption')).toBeNull();
  });

  it('stores a card-only override when caption differs from media default', () => {
    const patch = buildGalleryCaptionPatch(gallery, 'media-1', 'Card-specific caption');
    expect(patch).toEqual({
      galleryMedia: [
        { mediaId: 'media-1', order: 0, caption: 'Card-specific caption' },
        { mediaId: 'media-2', order: 1, caption: 'Card override' },
      ],
    });
  });

  it('clears a slot override when caption matches media default', () => {
    const patch = buildGalleryCaptionPatch(gallery, 'media-2', 'Other default');
    expect(patch).toEqual({
      galleryMedia: [
        { mediaId: 'media-1', order: 0 },
        { mediaId: 'media-2', order: 1 },
      ],
    });
  });
});

describe('patchReaderQuickEdit', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('sends sequential metadata and content patches', async () => {
    const savedCard = {
      docId: 'card-1',
      title: 'New title',
      content: '<p>Updated body</p>',
      status: 'published',
      type: 'story',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...savedCard, content: '<p>Original body</p>' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => savedCard,
      });

    const result = await patchReaderQuickEdit(
      'card-1',
      { title: 'New title', subtitle: '', excerpt: '', body: 'Updated body' },
      { title: 'Old title', subtitle: '', excerpt: '', content: '<p>Original body</p>' }
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/cards/card-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'New title' }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/cards/card-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ content: '<p>Updated body</p>' }),
      })
    );
    expect(result).toEqual(savedCard);
  });
});

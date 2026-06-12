import { buildReaderMetadataQuickEditPatch, buildGalleryCaptionPatch } from '@/lib/utils/readerCardPatchReconcile';
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

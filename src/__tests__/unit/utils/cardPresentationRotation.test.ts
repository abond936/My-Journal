import { dehydrateCardPatchPayload, dehydrateGalleryMediaForPatch } from '@/lib/utils/cardUtils';

describe('Card presentation rotation persistence', () => {
  it('retains cover and Gallery rotation while stripping hydrated Media', () => {
    expect(dehydrateCardPatchPayload({
      coverImageRotation: 90,
      galleryMedia: [{
        mediaId: 'media-1',
        order: 0,
        rotation: 270,
        media: { docId: 'media-1' } as never,
      }],
    })).toEqual({
      coverImageRotation: 90,
      galleryMedia: [{ mediaId: 'media-1', order: 0, rotation: 270 }],
    });
  });

  it('omits empty crop overrides without discarding an explicit orientation', () => {
    expect(dehydrateGalleryMediaForPatch([{
      mediaId: 'media-1',
      order: 0,
      objectPosition: ' ',
      rotation: 180,
    }])).toEqual([{ mediaId: 'media-1', order: 0, rotation: 180 }]);
  });
});

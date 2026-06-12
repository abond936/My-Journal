import {
  applyGallerySlotCaptionEdit,
  getEffectiveGalleryCaption,
  gallerySlotHasCaptionOverride,
} from '@/lib/utils/galleryObjectPosition';

describe('applyGallerySlotCaptionEdit', () => {
  const item = {
    mediaId: 'media-1',
    order: 0,
    media: { docId: 'media-1', caption: 'Default caption', filename: 'a.jpg' },
  };

  it('adds a slot override when text differs from media default', () => {
    const next = applyGallerySlotCaptionEdit(item, 'Card caption');
    expect(next.caption).toBe('Card caption');
    expect(gallerySlotHasCaptionOverride(next)).toBe(true);
  });

  it('removes slot override when text matches media default', () => {
    const withOverride = { ...item, caption: 'Card caption' };
    const next = applyGallerySlotCaptionEdit(withOverride, 'Default caption');
    expect(gallerySlotHasCaptionOverride(next)).toBe(false);
    expect(getEffectiveGalleryCaption(next, next.media)).toBe('Default caption');
  });
});

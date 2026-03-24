import type { Media } from '@/lib/types/photo';

/**
 * Gallery slot focal: use per-card override when set; otherwise the media document default.
 */
export function getEffectiveGalleryObjectPosition(
  galleryItem: { objectPosition?: string | null },
  media?: Pick<Media, 'objectPosition'> | null | undefined
): string {
  const override = galleryItem.objectPosition?.trim();
  if (override) return override;
  const fromMedia = media?.objectPosition?.trim();
  if (fromMedia) return fromMedia;
  return '50% 50%';
}

/** True when the card document stores an explicit caption on this slot (may be empty string). */
export function gallerySlotHasCaptionOverride(galleryItem: object): boolean {
  return Object.prototype.hasOwnProperty.call(galleryItem, 'caption');
}

/**
 * Gallery slot caption: per-card override when `caption` is present on the slot; otherwise `media.caption`.
 */
export function getEffectiveGalleryCaption(
  galleryItem: { caption?: string | null },
  media?: Pick<Media, 'caption'> | null | undefined
): string {
  if (gallerySlotHasCaptionOverride(galleryItem)) {
    return galleryItem.caption ?? '';
  }
  return media?.caption ?? '';
}

import type { GalleryMediaItem, HydratedGalleryMediaItem } from '@/lib/types/card';
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

/**
 * Apply a card-only gallery caption edit. Matching the media default clears the slot override.
 */
export function applyGallerySlotCaptionEdit<
  T extends { caption?: string | null; media?: Pick<Media, 'caption'> | null | undefined },
>(item: T, newText: string): T {
  const mediaDefault = item.media?.caption ?? '';
  if (newText === mediaDefault) {
    if (!gallerySlotHasCaptionOverride(item)) return item;
    const rest = { ...item };
    delete rest.caption;
    return rest;
  }
  return { ...item, caption: newText };
}

export function dehydrateGalleryMediaForPatch(
  gallery: HydratedGalleryMediaItem[]
): GalleryMediaItem[] {
  return gallery.map((item, index) => {
    const { media: _media, ...rest } = item;
    return { ...rest, order: index };
  });
}

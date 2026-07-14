import type { HydratedGalleryMediaItem } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';

export function appendGalleryMediaItems(
  current: HydratedGalleryMediaItem[],
  newMedia: Media[]
): HydratedGalleryMediaItem[] {
  const base = current.length;
  const appended = newMedia
    .filter((item) => Boolean(item.docId))
    .map((media, index) => ({
      mediaId: media.docId!,
      order: base + index,
      media,
    }));
  return [...current, ...appended];
}

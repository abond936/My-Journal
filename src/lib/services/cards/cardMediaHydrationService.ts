import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';
import { hydrateContentImageSrc } from '@/lib/utils/cardUtils';
import { applyPublicStorageUrlsToMedia } from '@/lib/utils/storageUrl';

const firestore = getAdminApp().firestore();
const MEDIA_COLLECTION = 'media';

export function deriveFocalPointFromObjectPosition(
  objectPosition: string,
  width: number,
  height: number
): { x: number; y: number } {
  const parts = objectPosition.trim().split(/\s+/);
  const x = Number.parseInt(parts[0] ?? '50', 10);
  const y = Number.parseInt(parts[1] ?? '50', 10);
  if (Number.isNaN(x) || Number.isNaN(y)) return { x: width / 2, y: height / 2 };
  if (objectPosition.includes('%') || (x <= 100 && y <= 100)) {
    return { x: (x / 100) * width, y: (y / 100) * height };
  }
  return {
    x: Math.max(0, Math.min(width, x)),
    y: Math.max(0, Math.min(height, y)),
  };
}

function applyPublicStorageUrls(mediaMap: Map<string, Media>): void {
  mediaMap.forEach((media, id) => {
    mediaMap.set(id, applyPublicStorageUrlsToMedia(media));
  });
}

export function getMediaIdsFromCard(card: {
  coverImageId?: string | null;
  galleryMedia?: { mediaId?: string }[];
  contentMedia?: string[];
}): Set<string> {
  const ids = new Set<string>();
  if (card.coverImageId) ids.add(card.coverImageId);
  card.galleryMedia?.forEach((item) => item.mediaId && ids.add(item.mediaId));
  (card.contentMedia ?? []).forEach((id) => id && ids.add(id));
  return ids;
}

export function stripHydratedGalleryItem<T extends { media?: unknown }>(
  item: T
): Omit<T, 'media'> {
  const clone = { ...item };
  delete clone.media;
  return clone;
}

function computeMediaSignalBuckets(
  mediaTagIds: string[],
  allTags: Tag[]
): Pick<Card, 'mediaWho' | 'mediaWhat' | 'mediaWhen' | 'mediaWhere'> {
  const byId = new Map(allTags.filter((tag) => tag.docId).map((tag) => [tag.docId!, tag]));
  const buckets: Record<'who' | 'what' | 'when' | 'where', Set<string>> = {
    who: new Set<string>(),
    what: new Set<string>(),
    when: new Set<string>(),
    where: new Set<string>(),
  };
  for (const tagId of mediaTagIds) {
    const tag = byId.get(tagId);
    if (!tag?.docId || !tag.dimension) continue;
    const dimension = String(tag.dimension) === 'reflection' ? 'what' : String(tag.dimension);
    if (dimension === 'who' || dimension === 'what' || dimension === 'when' || dimension === 'where') {
      buckets[dimension].add(tag.docId);
    }
  }
  return {
    mediaWho: Array.from(buckets.who),
    mediaWhat: Array.from(buckets.what),
    mediaWhen: Array.from(buckets.when),
    mediaWhere: Array.from(buckets.where),
  };
}

export async function computeCardMediaSignalsFromMediaIds(
  mediaIds: Set<string>,
  allTags: Tag[]
): Promise<Pick<Card, 'mediaWho' | 'mediaWhat' | 'mediaWhen' | 'mediaWhere'>> {
  if (mediaIds.size === 0) {
    return { mediaWho: [], mediaWhat: [], mediaWhen: [], mediaWhere: [] };
  }
  const docs = await Promise.all(
    Array.from(mediaIds).map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get())
  );
  const tagIds = new Set<string>();
  for (const doc of docs) {
    const media = doc.exists ? (doc.data() as Media) : undefined;
    for (const tagId of media?.tags ?? []) {
      if (typeof tagId === 'string' && tagId.trim()) tagIds.add(tagId);
    }
  }
  return computeMediaSignalBuckets(Array.from(tagIds), allTags);
}

export async function loadMediaMapByIds(mediaIds: Iterable<string>): Promise<Map<string, Media>> {
  const uniqueIds = Array.from(
    new Set(Array.from(mediaIds).filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );
  const mediaMap = new Map<string, Media>();
  if (uniqueIds.length === 0) return mediaMap;
  const docs = await Promise.all(
    uniqueIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get())
  );
  docs.forEach((doc) => {
    if (doc.exists) mediaMap.set(doc.id, doc.data() as Media);
  });
  applyPublicStorageUrls(mediaMap);
  return mediaMap;
}

export function computeCardMediaSignalsFromMediaMap(
  mediaMap: Map<string, Media>,
  allTags: Tag[]
): Pick<Card, 'mediaWho' | 'mediaWhat' | 'mediaWhen' | 'mediaWhere'> {
  const tagIds = new Set<string>();
  mediaMap.forEach((media) => {
    for (const tagId of media.tags ?? []) {
      if (typeof tagId === 'string' && tagId.trim()) tagIds.add(tagId);
    }
  });
  return computeMediaSignalBuckets(Array.from(tagIds), allTags);
}

export function hydrateCardFromMediaMap(card: Card, mediaMap: Map<string, Media>): Card {
  const hydratedCard = { ...card };
  if (hydratedCard.coverImageId) {
    hydratedCard.coverImage = mediaMap.get(hydratedCard.coverImageId) ?? null;
    if (hydratedCard.coverImage && !hydratedCard.coverImageFocalPoint) {
      hydratedCard.coverImageFocalPoint = deriveFocalPointFromObjectPosition(
        hydratedCard.coverImage.objectPosition || '50% 50%',
        hydratedCard.coverImage.width,
        hydratedCard.coverImage.height
      );
    }
  } else {
    hydratedCard.coverImage = null;
  }
  hydratedCard.galleryMedia = hydratedCard.galleryMedia?.map((item) => ({
    ...item,
    media: mediaMap.get(item.mediaId),
  }));
  hydratedCard.displayThumbnail =
    hydratedCard.coverImage ?? hydratedCard.galleryMedia?.[0]?.media ?? null;
  hydratedCard.displayThumbnailSource = hydratedCard.coverImage
    ? 'cover'
    : hydratedCard.galleryMedia?.[0]?.media
      ? 'gallery'
      : null;
  if (hydratedCard.content) {
    hydratedCard.content = hydrateContentImageSrc(hydratedCard.content, mediaMap);
  }
  return hydratedCard;
}

export async function hydrateCards(cards: Card[]): Promise<Card[]> {
  if (!cards?.length) return [];
  const mediaIds = new Set<string>();
  cards.forEach((card) => getMediaIdsFromCard(card).forEach((id) => mediaIds.add(id)));
  if (mediaIds.size === 0) return cards;
  const mediaMap = await loadMediaMapByIds(mediaIds);
  return cards.map((card) => hydrateCardFromMediaMap(card, mediaMap));
}

export async function hydrateCoverImagesOnly(cards: Card[]): Promise<Card[]> {
  if (!cards?.length) return [];
  const coverImageIds = cards
    .map((card) => card.coverImageId)
    .filter((id): id is string => Boolean(id));
  if (coverImageIds.length === 0) return cards;
  const mediaMap = await loadMediaMapByIds(coverImageIds);
  return cards.map((card) => {
    const hydratedCard = { ...card };
    hydratedCard.coverImage = card.coverImageId ? mediaMap.get(card.coverImageId) ?? null : null;
    hydratedCard.displayThumbnail = hydratedCard.coverImage;
    hydratedCard.displayThumbnailSource = hydratedCard.coverImage ? 'cover' : null;
    if (hydratedCard.coverImage && !hydratedCard.coverImageFocalPoint) {
      hydratedCard.coverImageFocalPoint = deriveFocalPointFromObjectPosition(
        hydratedCard.coverImage.objectPosition || '50% 50%',
        hydratedCard.coverImage.width,
        hydratedCard.coverImage.height
      );
    }
    return hydratedCard;
  });
}

export async function hydrateReaderFeedCards(cards: Card[]): Promise<Card[]> {
  if (!cards?.length) return [];
  const mediaIds = new Set<string>();
  for (const card of cards) {
    if (card.coverImageId) mediaIds.add(card.coverImageId);
    if (card.type === 'gallery') {
      card.galleryMedia?.forEach((item) => item.mediaId && mediaIds.add(item.mediaId));
    }
  }
  const mediaMap = await loadMediaMapByIds(mediaIds);
  return cards.map((card) => {
    const hydratedCard = { ...card };
    hydratedCard.coverImage = card.coverImageId ? mediaMap.get(card.coverImageId) ?? null : null;
    if (hydratedCard.coverImage && !hydratedCard.coverImageFocalPoint) {
      hydratedCard.coverImageFocalPoint = deriveFocalPointFromObjectPosition(
        hydratedCard.coverImage.objectPosition || '50% 50%',
        hydratedCard.coverImage.width,
        hydratedCard.coverImage.height
      );
    }
    if (card.type === 'gallery') {
      hydratedCard.galleryMedia = (card.galleryMedia ?? []).map((item) => ({
        ...item,
        media: mediaMap.get(item.mediaId),
      }));
    }
    const firstGalleryMedia =
      card.type === 'gallery'
        ? hydratedCard.galleryMedia?.find((item) => item.media)?.media ?? null
        : null;
    hydratedCard.displayThumbnail = hydratedCard.coverImage ?? firstGalleryMedia;
    hydratedCard.displayThumbnailSource = hydratedCard.coverImage
      ? 'cover'
      : firstGalleryMedia
        ? 'gallery'
        : null;
    return hydratedCard;
  });
}

export async function hydrateFirstGallerySlideWhereNoCover(cards: Card[]): Promise<Card[]> {
  if (!cards?.length) return cards;
  const ids = new Set<string>();
  for (const card of cards) {
    if (!card.coverImage && card.galleryMedia?.[0]?.mediaId) ids.add(card.galleryMedia[0].mediaId);
  }
  if (ids.size === 0) return cards;
  const mediaMap = await loadMediaMapByIds(ids);
  return cards.map((card) => {
    if (card.coverImage || !card.galleryMedia?.[0]?.mediaId) {
      return {
        ...card,
        displayThumbnail: card.coverImage ?? card.displayThumbnail ?? null,
        displayThumbnailSource: card.coverImage ? 'cover' : card.displayThumbnailSource ?? null,
      };
    }
    const media = mediaMap.get(card.galleryMedia[0].mediaId);
    if (!media) return { ...card, displayThumbnail: null, displayThumbnailSource: null };
    return {
      ...card,
      displayThumbnail: media,
      displayThumbnailSource: 'gallery',
      galleryMedia: [{ ...card.galleryMedia[0], media }, ...card.galleryMedia.slice(1)],
    };
  });
}

import type { Card } from '@/lib/types/card';
import type {
  StudioCatalogCard,
  StudioSelectedDetail,
  StudioSelectedPreview,
} from '@/components/admin/studio/studioCardTypes';

function firstGalleryMedia(card: Partial<Card>) {
  return Array.isArray(card.galleryMedia) ? card.galleryMedia[0]?.media ?? null : null;
}

function hasOwn<T extends object>(value: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function toStudioCatalogCard(card: Card | StudioSelectedPreview | StudioSelectedDetail): StudioCatalogCard {
  const directDisplayThumbnail = 'displayThumbnail' in card ? (card.displayThumbnail ?? null) : null;
  const coverImage = card.coverImage ?? null;
  const galleryMedia = firstGalleryMedia(card);
  return {
    ...card,
    displayThumbnail: coverImage ?? directDisplayThumbnail ?? galleryMedia,
    displayThumbnailSource:
      coverImage
        ? 'cover'
        : ('displayThumbnailSource' in card ? card.displayThumbnailSource : null) ?? (directDisplayThumbnail || galleryMedia ? 'gallery' : null),
  };
}

export function toStudioSelectedPreview(
  card: Card | StudioSelectedPreview | StudioSelectedDetail
): StudioSelectedPreview {
  return {
    ...toStudioCatalogCard(card),
    children: 'children' in card && Array.isArray(card.children) ? card.children : undefined,
  };
}

export function toStudioSelectedDetail(
  card: Card | StudioSelectedPreview | StudioSelectedDetail
): StudioSelectedDetail {
  return {
    ...card,
    children: 'children' in card && Array.isArray(card.children) ? card.children : undefined,
  };
}

export function mergeStudioCatalogCard(
  existing: StudioCatalogCard,
  incoming: Partial<Card> | StudioCatalogCard | StudioSelectedPreview | StudioSelectedDetail
): StudioCatalogCard {
  const hasIncomingCoverId = hasOwn(incoming, 'coverImageId');
  const hasIncomingCoverImage = hasOwn(incoming, 'coverImage');
  const hasIncomingCoverFocalPoint = hasOwn(incoming, 'coverImageFocalPoint');
  const hasIncomingGallery = hasOwn(incoming, 'galleryMedia');
  const hasIncomingDisplayThumbnail = hasOwn(incoming, 'displayThumbnail');
  const hasIncomingDisplayThumbnailSource = hasOwn(incoming, 'displayThumbnailSource');
  const next: StudioCatalogCard = {
    ...existing,
    ...incoming,
  };

  if (!hasOwn(incoming, 'childrenIds')) {
    next.childrenIds = existing.childrenIds;
  }
  if (!hasOwn(incoming, 'isCollectionRoot')) {
    next.isCollectionRoot = existing.isCollectionRoot;
  }
  if (!hasOwn(incoming, 'collectionRootOrder')) {
    next.collectionRootOrder = existing.collectionRootOrder;
  }
  if (!hasIncomingCoverId) {
    next.coverImageId = existing.coverImageId;
    next.coverImage = existing.coverImage ?? null;
    next.coverImageFocalPoint = existing.coverImageFocalPoint;
  } else if (hasIncomingCoverImage) {
    next.coverImage = incoming.coverImage ?? null;
  } else if (!incoming.coverImageId || existing.coverImageId !== incoming.coverImageId) {
    next.coverImage = null;
  }
  if (hasIncomingCoverId && !hasIncomingCoverFocalPoint && (!incoming.coverImageId || existing.coverImageId !== incoming.coverImageId)) {
    next.coverImageFocalPoint = undefined;
  }
  if (!hasIncomingGallery) {
    next.galleryMedia = existing.galleryMedia;
  }
  if (!hasOwn(incoming, 'contentMedia')) {
    next.contentMedia = existing.contentMedia;
  }

  const coverImage = next.coverImage ?? null;
  const galleryMedia = firstGalleryMedia(next);
  const previewDriversChanged = hasIncomingCoverId || hasIncomingCoverImage || hasIncomingGallery;
  const directDisplayThumbnail = coverImage
    ? null
    : hasIncomingDisplayThumbnail
      ? incoming.displayThumbnail ?? null
      : previewDriversChanged
        ? null
        : existing.displayThumbnail ?? null;
  const directDisplayThumbnailSource = coverImage
    ? null
    : hasIncomingDisplayThumbnailSource
      ? incoming.displayThumbnailSource ?? null
      : previewDriversChanged
        ? null
        : existing.displayThumbnailSource ?? null;
  next.displayThumbnail = coverImage ?? directDisplayThumbnail ?? galleryMedia;
  next.displayThumbnailSource =
    coverImage ? 'cover' : directDisplayThumbnailSource ?? (directDisplayThumbnail || galleryMedia ? 'gallery' : null);
  return next;
}

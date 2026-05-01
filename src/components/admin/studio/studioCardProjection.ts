import type { Card } from '@/lib/types/card';
import type {
  StudioCatalogCard,
  StudioSelectedDetail,
  StudioSelectedPreview,
} from '@/components/admin/studio/studioCardTypes';

function firstGalleryMedia(card: Partial<Card>) {
  return Array.isArray(card.galleryMedia) ? card.galleryMedia[0]?.media ?? null : null;
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
  const next: StudioCatalogCard = {
    ...existing,
    ...incoming,
  };

  if (!Object.prototype.hasOwnProperty.call(incoming, 'childrenIds')) {
    next.childrenIds = existing.childrenIds;
  }
  if (!Object.prototype.hasOwnProperty.call(incoming, 'isCollectionRoot')) {
    next.isCollectionRoot = existing.isCollectionRoot;
  }
  if (!Object.prototype.hasOwnProperty.call(incoming, 'collectionRootOrder')) {
    next.collectionRootOrder = existing.collectionRootOrder;
  }
  if (!Object.prototype.hasOwnProperty.call(incoming, 'coverImageId')) {
    next.coverImageId = existing.coverImageId;
    next.coverImage = existing.coverImage ?? null;
    next.coverImageFocalPoint = existing.coverImageFocalPoint;
  }
  if (!Object.prototype.hasOwnProperty.call(incoming, 'galleryMedia')) {
    next.galleryMedia = existing.galleryMedia;
  }
  if (!Object.prototype.hasOwnProperty.call(incoming, 'contentMedia')) {
    next.contentMedia = existing.contentMedia;
  }

  const coverImage = next.coverImage ?? null;
  const galleryMedia = firstGalleryMedia(next);
  const directDisplayThumbnail = next.displayThumbnail ?? null;
  next.displayThumbnail = coverImage ?? directDisplayThumbnail ?? galleryMedia;
  next.displayThumbnailSource =
    coverImage ? 'cover' : next.displayThumbnailSource ?? (directDisplayThumbnail || galleryMedia ? 'gallery' : null);
  return next;
}

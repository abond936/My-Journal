import type { Card } from '@/lib/types/card';
import type { StudioCatalogCard } from '@/components/admin/studio/studioCardTypes';
import {
  getObjectPositionForAspectRatio,
  getObjectPositionFromFocalPoint,
} from '@/lib/utils/objectPositionUtils';
import { SQUARE_FEED_TILE_COVER_BAND_ASPECT } from '@/lib/reader/readerFeedPresentation';
import type { MediaPresentationRotation } from '@/lib/types/mediaPresentation';

export function previewImage(card: Card): Card['coverImage'] {
  const studioCard = card as Card & Partial<StudioCatalogCard>;
  return card.coverImage ?? studioCard.displayThumbnail ?? null;
}

export function getPreviewObjectFit(card: Card, preview: Card['coverImage']): 'cover' | 'contain' {
  if (!preview) return 'cover';
  if (card.coverImage?.docId && preview.docId === card.coverImage.docId && card.coverImageMode === 'fit') {
    return 'contain';
  }
  return 'cover';
}

export function getPreviewObjectPosition(card: Card, preview: Card['coverImage']): string {
  if (!preview) return 'center';
  const isCoverPreview = Boolean(card.coverImage?.docId && preview.docId === card.coverImage?.docId);
  if (!isCoverPreview || !card.coverImageFocalPoint || !preview.width || !preview.height) {
    return preview.objectPosition || 'center';
  }
  if (getPreviewObjectFit(card, preview) === 'contain') {
    return getObjectPositionFromFocalPoint(
      { x: card.coverImageFocalPoint.x ?? 0, y: card.coverImageFocalPoint.y ?? 0 },
      { width: preview.width, height: preview.height }
    );
  }
  return getObjectPositionForAspectRatio(
    { x: card.coverImageFocalPoint.x ?? 0, y: card.coverImageFocalPoint.y ?? 0 },
    { width: preview.width, height: preview.height },
    SQUARE_FEED_TILE_COVER_BAND_ASPECT,
    400
  );
}

export function getPreviewRotation(card: Card, preview: Card['coverImage']): MediaPresentationRotation {
  if (!preview) return 0;
  if (card.coverImage?.docId && preview.docId === card.coverImage.docId) {
    return card.coverImageRotation ?? 0;
  }
  return card.galleryMedia?.find((item) => item.mediaId === preview.docId)?.rotation ?? 0;
}

export function shouldRenderUtilityPreviewInCover(card: Card, preview: Card['coverImage']): boolean {
  if (card.type === 'quote' || card.type === 'callout') return true;
  if (card.type === 'qa' && !preview) return true;
  return false;
}

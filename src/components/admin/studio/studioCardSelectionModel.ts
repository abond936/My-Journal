import type { Card } from '@/lib/types/card';
import type { StudioCardContext } from './studioCardTypes';

export function removeCardFromCardsCache<T>(cached: T, cardId: string): T {
  if (!cached || typeof cached !== 'object') return cached;

  if (Array.isArray(cached)) {
    return cached.map((entry) => removeCardFromCardsCache(entry, cardId)) as T;
  }

  const candidate = cached as { items?: Array<{ docId?: string }> };
  if (Array.isArray(candidate.items)) {
    return {
      ...(candidate as Record<string, unknown>),
      items: candidate.items.filter((item) => item?.docId !== cardId),
    } as T;
  }

  return cached;
}

export function applyOptimisticSelectedCardPatch(
  card: StudioCardContext,
  payload: Partial<Card>
): StudioCardContext {
  const next: StudioCardContext = { ...card, ...payload };

  if (Object.prototype.hasOwnProperty.call(payload, 'childrenIds')) {
    next.childrenIds = Array.isArray(payload.childrenIds) ? [...payload.childrenIds] : [];
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'galleryMedia')) {
    next.galleryMedia = Array.isArray(payload.galleryMedia)
      ? payload.galleryMedia.map((item) => ({ ...item }))
      : [];
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'contentMedia')) {
    next.contentMedia = Array.isArray(payload.contentMedia) ? [...payload.contentMedia] : [];
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'coverImageId')) {
    next.coverImageId = payload.coverImageId ?? null;
  }

  next.updatedAt = Date.now();
  return next;
}

export function collectAssignedMediaIds(
  card: Pick<Card, 'coverImageId' | 'galleryMedia' | 'contentMedia'> | null
): string[] {
  if (!card) return [];
  const ids = new Set<string>();
  if (card.coverImageId) ids.add(card.coverImageId);
  (card.galleryMedia ?? []).forEach((item) => {
    if (item.mediaId) ids.add(item.mediaId);
  });
  (card.contentMedia ?? []).forEach((mediaId) => {
    if (mediaId) ids.add(mediaId);
  });
  return Array.from(ids);
}

export function mediaRolesOnCard(
  card: Pick<Card, 'coverImageId' | 'galleryMedia' | 'contentMedia'> | null,
  mediaId: string
): string[] {
  if (!card || !mediaId) return [];
  const roles: string[] = [];
  if (card.coverImageId === mediaId) roles.push('Cover');
  if ((card.galleryMedia ?? []).some((item) => item.mediaId === mediaId)) roles.push('Gallery');
  if ((card.contentMedia ?? []).includes(mediaId)) roles.push('Content');
  return roles;
}

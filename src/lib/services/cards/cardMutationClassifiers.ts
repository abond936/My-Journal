import type { Card } from '@/lib/types/card';
import { normalizeChildrenIds } from './cardHierarchyRules';

function normalizeGalleryMembership(galleryMedia: Card['galleryMedia']) {
  return (galleryMedia ?? [])
    .filter((item): item is NonNullable<Card['galleryMedia']>[number] => Boolean(item?.mediaId))
    .map((item) => ({
      mediaId: item.mediaId,
      ...(item.caption !== undefined ? { caption: item.caption } : {}),
      ...(item.objectPosition !== undefined ? { objectPosition: item.objectPosition } : {}),
    }))
    .sort((a, b) =>
      a.mediaId.localeCompare(b.mediaId) ||
      (a.caption ?? '').localeCompare(b.caption ?? '') ||
      (a.objectPosition ?? '').localeCompare(b.objectPosition ?? '')
    );
}

export function isGalleryReorderOnlyPayload(existingCard: Pick<Card, 'galleryMedia'>, updates: Partial<Pick<Card, 'galleryMedia'>>): updates is Pick<Card, 'galleryMedia'> {
  const keys = Object.keys(updates);
  if (keys.length !== 1 || keys[0] !== 'galleryMedia' || !Array.isArray(updates.galleryMedia)) return false;
  if ((existingCard.galleryMedia ?? []).length !== updates.galleryMedia.length) return false;
  return JSON.stringify(normalizeGalleryMembership(existingCard.galleryMedia)) === JSON.stringify(normalizeGalleryMembership(updates.galleryMedia));
}

export function isGalleryOnlyPayload(updates: Partial<Pick<Card, 'galleryMedia'>>): updates is Pick<Card, 'galleryMedia'> {
  const keys = Object.keys(updates);
  return keys.length === 1 && keys[0] === 'galleryMedia' && Array.isArray(updates.galleryMedia);
}

export type CardTagAssignmentUpdates = Partial<Pick<Card, 'tags' | 'subjectTagId' | 'subjectTagIds'>>;
export function isTagsOnlyPayload(updates: CardTagAssignmentUpdates): updates is CardTagAssignmentUpdates {
  const keys = Object.keys(updates);
  if (!keys.length || !keys.every((key) => key === 'tags' || key === 'subjectTagId' || key === 'subjectTagIds')) return false;
  if ('tags' in updates && updates.tags !== undefined && !Array.isArray(updates.tags)) return false;
  if ('subjectTagId' in updates && updates.subjectTagId !== undefined && updates.subjectTagId !== null && typeof updates.subjectTagId !== 'string') return false;
  return !('subjectTagIds' in updates && updates.subjectTagIds !== undefined && !Array.isArray(updates.subjectTagIds));
}

export function isGalleryInheritanceOverridesOnlyPayload(updates: Partial<Pick<Card, 'galleryTagInheritanceOverrides'>>): boolean {
  const keys = Object.keys(updates);
  return keys.length === 1 && keys[0] === 'galleryTagInheritanceOverrides' && updates.galleryTagInheritanceOverrides !== undefined;
}

export function isStatusOnlyPayload(updates: Partial<Pick<Card, 'status'>>): updates is Pick<Card, 'status'> {
  const keys = Object.keys(updates);
  return keys.length === 1 && keys[0] === 'status' && (updates.status === 'draft' || updates.status === 'published');
}

export function isContentOnlyPayload(updates: Partial<Pick<Card, 'content'>>): updates is Pick<Card, 'content'> {
  const keys = Object.keys(updates);
  return keys.length === 1 && keys[0] === 'content' && typeof updates.content === 'string';
}

export function isChildrenReorderOnlyPayload(existingCard: Pick<Card, 'childrenIds'>, updates: Partial<Pick<Card, 'childrenIds'>>): updates is Pick<Card, 'childrenIds'> {
  const keys = Object.keys(updates);
  if (keys.length !== 1 || keys[0] !== 'childrenIds' || !Array.isArray(updates.childrenIds)) return false;
  const existing = normalizeChildrenIds(existingCard.childrenIds);
  const next = normalizeChildrenIds(updates.childrenIds);
  if (existing.length !== next.length || existing.length <= 1) return false;
  return [...existing].sort().every((id, index) => id === [...next].sort()[index]);
}

export function isChildrenOnlyPayload(updates: Partial<Pick<Card, 'childrenIds'>>): updates is Pick<Card, 'childrenIds'> {
  const keys = Object.keys(updates);
  return keys.length === 1 && keys[0] === 'childrenIds' && Array.isArray(updates.childrenIds);
}

export function isCollectionRootOnlyPayload(updates: Partial<Card>): updates is Partial<Pick<Card, 'isCollectionRoot' | 'collectionRootOrder'>> {
  const keys = Object.keys(updates);
  return keys.length > 0 && keys.every((key) => key === 'isCollectionRoot' || key === 'collectionRootOrder');
}

export type CardMetadataUpdates = Partial<Pick<Card, 'title' | 'subtitle' | 'excerpt' | 'excerptAuto' | 'type' | 'displayMode' | 'questionId'>>;
const CARD_METADATA_ONLY_KEYS = new Set<keyof CardMetadataUpdates>(['title','subtitle','excerpt','excerptAuto','type','displayMode','questionId']);
export function isCardMetadataOnlyPayload(updates: CardMetadataUpdates): boolean {
  const keys = Object.keys(updates) as Array<keyof CardMetadataUpdates>;
  return keys.length > 0 && keys.every((key) => CARD_METADATA_ONLY_KEYS.has(key));
}

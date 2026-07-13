import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import { getAuthorSettings } from '@/lib/services/authorSettingsService';
import { updateCardTags } from '@/lib/services/cardService';
import { getAllTags } from '@/lib/firebase/tagService';
import {
  cardTagsEqual,
  galleryInheritanceTogglesActive,
  mergeGalleryInheritedCardTags,
} from '@/lib/utils/galleryTagInheritance';

const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

function cardUsesMediaInGallery(card: Card, mediaId: string): boolean {
  return (card.galleryMedia ?? []).some((item) => item.mediaId === mediaId);
}

async function loadGalleryMediaForCard(card: Card): Promise<Media[]> {
  const galleryIds = (card.galleryMedia ?? [])
    .map((item) => item.mediaId)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  if (galleryIds.length === 0) {
    return [];
  }

  const firestore = getAdminApp().firestore();
  const docs = await Promise.all(
    galleryIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get())
  );

  const media: Media[] = [];
  for (const doc of docs) {
    if (doc.exists) {
      media.push(doc.data() as Media);
    }
  }
  return media;
}

/**
 * Apply gallery→card tag inheritance for one card when any inheritance toggle is on.
 * No-op when all toggles off or computed tags match current assignments.
 */
export async function syncGalleryTagInheritanceForCard(cardId: string): Promise<void> {
  const settings = await getAuthorSettings();
  if (!galleryInheritanceTogglesActive(settings.galleryTagInheritance)) {
    return;
  }

  const firestore = getAdminApp().firestore();
  const cardSnap = await firestore.collection(CARDS_COLLECTION).doc(cardId).get();
  if (!cardSnap.exists) {
    return;
  }

  const card = cardSnap.data() as Card;
  const currentTags = (card.tags ?? []).filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  const galleryMedia = await loadGalleryMediaForCard(card);
  const allTags = await getAllTags();
  const nextTags = mergeGalleryInheritedCardTags(
    currentTags,
    galleryMedia,
    settings.galleryTagInheritance,
    allTags
  );

  if (cardTagsEqual(currentTags, nextTags)) {
    return;
  }

  await updateCardTags(cardId, { tags: nextTags });
}

/**
 * After gallery-media tag changes, sync inheritance on cards that reference the media in gallery only.
 */
export async function syncGalleryTagInheritanceForMediaId(mediaId: string): Promise<void> {
  const settings = await getAuthorSettings();
  if (!galleryInheritanceTogglesActive(settings.galleryTagInheritance)) {
    return;
  }

  const firestore = getAdminApp().firestore();
  const mediaSnap = await firestore.collection(MEDIA_COLLECTION).doc(mediaId).get();
  if (!mediaSnap.exists) {
    return;
  }

  const media = mediaSnap.data() as Media;
  const candidateCardIds = media.referencedByCardIds ?? [];
  if (candidateCardIds.length === 0) {
    return;
  }

  const cardSnaps = await Promise.all(
    candidateCardIds.map((id) => firestore.collection(CARDS_COLLECTION).doc(id).get())
  );

  for (const snap of cardSnaps) {
    if (!snap.exists) continue;
    const card = snap.data() as Card;
    if (!cardUsesMediaInGallery(card, mediaId)) continue;
    await syncGalleryTagInheritanceForCard(snap.id);
  }
}

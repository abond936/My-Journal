import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { computeCardMediaSignalsFromMediaIds, computeCardMediaSignalsFromMediaMap, getMediaIdsFromCard } from '@/lib/services/cards/cardMediaHydrationService';
import { syncCardProjection as syncCardToTypesense, withCardMutationRetry as withRetry } from '@/lib/services/cards/cardMutationSupport';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { deleteMediaAsset } from '@/lib/services/images/mediaStorage';
import { syncMediaToTypesenseById } from '@/lib/services/typesenseMediaService';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import { extractMediaFromContent, removeMediaFromContent } from '@/lib/utils/cardUtils';
import { FieldValue } from 'firebase-admin/firestore';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

/** Finds card IDs that reference the given mediaId by authoritative surface scan (cover, gallery, content ids, inline content media ids). */
export async function getCardsReferencingMedia(mediaId: string): Promise<string[]> {
  const mediaDoc = await firestore.collection(MEDIA_COLLECTION).doc(mediaId).get();
  if (!mediaDoc.exists) return [];
  const cardIds = new Set<string>();
  const [coverSnap, contentSnap] = await Promise.all([
    firestore.collection(CARDS_COLLECTION).where('coverImageId', '==', mediaId).get(),
    firestore.collection(CARDS_COLLECTION).where('contentMedia', 'array-contains', mediaId).get(),
  ]);
  coverSnap.docs.forEach(d => cardIds.add(d.id));
  contentSnap.docs.forEach(d => cardIds.add(d.id));

  const allCardsSnap = await firestore.collection(CARDS_COLLECTION).get();
  allCardsSnap.docs.forEach(doc => {
    const card = doc.data() as Card;
    if (
      card.galleryMedia?.some((g) => g.mediaId === mediaId) ||
      extractMediaFromContent(card.content ?? '').includes(mediaId)
    ) {
      cardIds.add(doc.id);
    }
  });

  const ids = Array.from(cardIds);
  await firestore.collection(MEDIA_COLLECTION).doc(mediaId).update({
    referencedByCardIds: ids,
    updatedAt: Date.now(),
  });
  return ids;
}

export async function recomputeCardMediaSignals(cardId: string): Promise<void> {
  const doc = await firestore.collection(CARDS_COLLECTION).doc(cardId).get();
  if (!doc.exists) return;
  const card = { docId: doc.id, ...(doc.data() as Card) };
  const mediaIds = getMediaIdsFromCard(card);
  const allTags = await getAllTags();
  const mediaSignals = await computeCardMediaSignalsFromMediaIds(mediaIds, allTags);
  await doc.ref.update({
    mediaWho: mediaSignals.mediaWho,
    mediaWhat: mediaSignals.mediaWhat,
    mediaWhen: mediaSignals.mediaWhen,
    mediaWhere: mediaSignals.mediaWhere,
    updatedAt: Date.now(),
  });
}

export async function recomputeCardsMediaSignalsForMedia(mediaId: string): Promise<void> {
  const cardIds = await getCardsReferencingMedia(mediaId);
  if (!cardIds.length) return;
  await Promise.all(cardIds.map((id) => recomputeCardMediaSignals(id)));
}

export async function recomputeCardsMediaSignalsForMediaIds(mediaIds: string[]): Promise<void> {
  if (!mediaIds.length) return;
  const allCardIds = new Set<string>();
  const uniqueMediaIds = Array.from(
    new Set(mediaIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );
  const cardIdLists = await Promise.all(uniqueMediaIds.map((mediaId) => getCardsReferencingMedia(mediaId)));
  for (const ids of cardIdLists) {
    ids.forEach((id) => allCardIds.add(id));
  }
  if (!allCardIds.size) return;
  await Promise.all(Array.from(allCardIds).map((id) => recomputeCardMediaSignals(id)));
}

function cardReferencesMediaId(card: Card, mediaId: string): boolean {
  return (
    getMediaIdsFromCard(card).has(mediaId) ||
    extractMediaFromContent(card.content ?? '').includes(mediaId)
  );
}

/**
 * Builds card-field updates for detaching one media id from every card surface.
 * Returns null when the card does not reference the media id.
 */
export function buildMediaReferenceRemovalUpdate(
  card: Card,
  mediaId: string
): { cardUpdate: Record<string, unknown>; remainingMediaIds: Set<string> } | null {
  if (!cardReferencesMediaId(card, mediaId)) {
    return null;
  }

  const cardUpdate: Record<string, unknown> = {};
  const inBodyHtml = extractMediaFromContent(card.content ?? '').includes(mediaId);

  let nextCoverId = card.coverImageId ?? null;
  if (card.coverImageId === mediaId) {
    cardUpdate.coverImageId = FieldValue.delete();
    cardUpdate.coverImageFocalPoint = FieldValue.delete();
    cardUpdate.coverImage = FieldValue.delete();
    nextCoverId = null;
  }

  let nextGalleryMedia = card.galleryMedia;
  if (card.galleryMedia?.some((g) => g.mediaId === mediaId)) {
    nextGalleryMedia = card.galleryMedia.filter((g) => g.mediaId !== mediaId);
    cardUpdate.galleryMedia = nextGalleryMedia;
  }

  let nextContent = card.content;
  let nextContentMedia = card.contentMedia ?? [];
  if ((card.contentMedia ?? []).includes(mediaId) || inBodyHtml) {
    nextContent = removeMediaFromContent(card.content, mediaId);
    nextContentMedia = (card.contentMedia ?? []).filter((id) => id !== mediaId);
    cardUpdate.content = nextContent;
    cardUpdate.contentMedia = nextContentMedia;
  }

  const remainingMediaIds = new Set<string>();
  if (nextCoverId) remainingMediaIds.add(nextCoverId);
  nextGalleryMedia?.forEach((item) => {
    if (item.mediaId) remainingMediaIds.add(item.mediaId);
  });
  nextContentMedia.forEach((id) => {
    if (id) remainingMediaIds.add(id);
  });
  extractMediaFromContent(nextContent ?? '').forEach((id) => {
    if (id) remainingMediaIds.add(id);
  });

  return { cardUpdate, remainingMediaIds };
}

/** Removes all occurrences of a media reference from a card (cover, gallery, and content/inline). */
export async function removeMediaReferenceFromCard(cardId: string, mediaId: string): Promise<void> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
  const allTags = await getAllTags();

  await withRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const cardSnap = await transaction.get(docRef);
      if (!cardSnap.exists) return;

      const removal = buildMediaReferenceRemovalUpdate(cardSnap.data() as Card, mediaId);
      if (!removal) return;

      const { cardUpdate, remainingMediaIds } = removal;
      const mediaIdsToRead = new Set(remainingMediaIds);
      mediaIdsToRead.add(mediaId);

      const mediaMap = new Map<string, Media>();
      let mediaDocExists = false;
      if (mediaIdsToRead.size > 0) {
        const refs = [...mediaIdsToRead].map((id) => firestore.collection(MEDIA_COLLECTION).doc(id));
        const docs = await transaction.getAll(...refs);
        for (const doc of docs) {
          if (!doc.exists) continue;
          if (doc.id === mediaId) {
            mediaDocExists = true;
          }
          if (remainingMediaIds.has(doc.id)) {
            mediaMap.set(doc.id, doc.data() as Media);
          }
        }
      }

      const mediaSignals = computeCardMediaSignalsFromMediaMap(mediaMap, allTags);

      transaction.update(docRef, {
        ...cardUpdate,
        mediaWho: mediaSignals.mediaWho,
        mediaWhat: mediaSignals.mediaWhat,
        mediaWhen: mediaSignals.mediaWhen,
        mediaWhere: mediaSignals.mediaWhere,
        updatedAt: Date.now(),
      });

      if (mediaDocExists) {
        transaction.update(mediaRef, {
          referencedByCardIds: FieldValue.arrayRemove(cardId),
          updatedAt: Date.now(),
        });
      }
    });
  });

  void syncMediaToTypesenseById(mediaId);
  const updatedCard = await getCardById(cardId);
  if (updatedCard) {
    void syncCardToTypesense(updatedCard);
  }
}

/** Deletes media and removes its references from all cards (Option B). */
export async function deleteMediaWithCardCleanup(mediaId: string): Promise<void> {
  const firstPassCardIds = await getCardsReferencingMedia(mediaId);
  const cardIds = Array.from(new Set(firstPassCardIds));
  for (const cardId of cardIds) {
    await removeMediaReferenceFromCard(cardId, mediaId);
  }
  const remaining = await getCardsReferencingMedia(mediaId);
  if (remaining.length > 0) {
    throw new Error(
      `Cannot delete media ${mediaId}; unresolved card references remain: ${remaining.join(', ')}`
    );
  }
  await deleteMediaAsset(mediaId);
}

/**
 * Creates a new card in Firestore.
 * @param cardData The data for the new card, excluding 'id'.
 * @returns The newly created card with its ID.
 */


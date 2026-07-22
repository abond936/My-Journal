import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { isGalleryReorderOnlyPayload } from '@/lib/services/cards/cardMutationClassifiers';
import {
  computeCardMediaSignalsFromMediaIds,
  getMediaIdsFromCard,
  stripHydratedGalleryItem,
} from '@/lib/services/cards/cardMediaHydrationService';
import { getExistingMediaDocIdsInTransaction } from '@/lib/services/cards/cardMediaMutationIntegrity';
import { syncCardProjection } from '@/lib/services/cards/cardMutationSupport';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { syncMediaToTypesenseById } from '@/lib/services/typesenseMediaService';
import { Card, cardSchema } from '@/lib/types/card';
import { protectExistingCardInheritance } from '@/lib/utils/galleryTagInheritance';
import { FieldValue } from 'firebase-admin/firestore';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

export async function updateCardGalleryInheritanceOverrides(
  cardId: string,
  overrides: NonNullable<Card['galleryTagInheritanceOverrides']>
): Promise<Card> {
  const parsed = cardSchema.shape.galleryTagInheritanceOverrides.unwrap().parse(overrides);
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const beforeSnap = await docRef.get();
  if (!beforeSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  const previous = (beforeSnap.data() as Card).galleryTagInheritanceOverrides
    ?? protectExistingCardInheritance();
  await docRef.update({ galleryTagInheritanceOverrides: parsed, updatedAt: Date.now() });
  if ((['who', 'what', 'when', 'where'] as const).some(
    (dimension) => previous[dimension] && !parsed[dimension]
  )) {
    const { syncGalleryTagInheritanceForCard } = await import('@/lib/services/galleryTagInheritanceService');
    await syncGalleryTagInheritanceForCard(cardId);
  }
  const updated = await getCardById(cardId);
  if (!updated) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  void syncCardProjection(updated);
  return updated;
}

export async function updateCardGalleryOrder(
  cardId: string,
  galleryMedia: NonNullable<Card['galleryMedia']>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  if (!isGalleryReorderOnlyPayload(preSnap.data() as Card, { galleryMedia })) {
    throw new Error('Gallery reorder fast path requires unchanged gallery membership.');
  }
  await docRef.update({
    galleryMedia: galleryMedia.map((item, order) => ({ ...stripHydratedGalleryItem(item), order })),
    updatedAt: Date.now(),
  });
  const updated = await getCardById(cardId);
  if (!updated) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  void syncCardProjection(updated);
  return updated;
}

export async function updateCardGallery(
  cardId: string,
  galleryMedia: NonNullable<Card['galleryMedia']>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  const existingData = preSnap.data() as Card;
  const dehydrated = galleryMedia.map((item, order) => ({ ...stripHydratedGalleryItem(item), order }));
  const oldGalleryIds = new Set((existingData.galleryMedia ?? []).map((item) => item.mediaId).filter(Boolean));
  const newGalleryIds = new Set(dehydrated.map((item) => item.mediaId).filter(Boolean));
  const removed = [...oldGalleryIds].filter((id) => !newGalleryIds.has(id));
  const added = [...newGalleryIds].filter((id) => !oldGalleryIds.has(id));
  const oldAll = getMediaIdsFromCard(existingData);
  const newAll = getMediaIdsFromCard({ ...existingData, galleryMedia: dehydrated });
  const mediaSetChanged = oldAll.size !== newAll.size || [...oldAll].some((id) => !newAll.has(id));
  const signals = mediaSetChanged
    ? await computeCardMediaSignalsFromMediaIds(newAll, await getAllTags())
    : {
        mediaWho: existingData.mediaWho ?? [], mediaWhat: existingData.mediaWhat ?? [],
        mediaWhen: existingData.mediaWhen ?? [], mediaWhere: existingData.mediaWhere ?? [],
      };
  await firestore.runTransaction(async (transaction) => {
    const existingIds = await getExistingMediaDocIdsInTransaction(firestore, transaction, [...removed, ...added]);
    for (const mediaId of added) {
      if (!existingIds.has(mediaId)) throw new Error(`Gallery media with ID ${mediaId} not found.`);
    }
    transaction.update(docRef, { galleryMedia: dehydrated, ...signals, updatedAt: Date.now() });
    for (const mediaId of removed) {
      if (existingIds.has(mediaId)) transaction.update(firestore.collection(MEDIA_COLLECTION).doc(mediaId), {
        referencedByCardIds: FieldValue.arrayRemove(cardId), updatedAt: Date.now(),
      });
    }
    for (const mediaId of added) transaction.update(firestore.collection(MEDIA_COLLECTION).doc(mediaId), {
      referencedByCardIds: FieldValue.arrayUnion(cardId), updatedAt: Date.now(),
    });
  });
  const updated = await getCardById(cardId);
  if (!updated) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  void syncCardProjection(updated);
  new Set([...removed, ...added]).forEach((id) => void syncMediaToTypesenseById(id));
  if (mediaSetChanged) {
    const { syncGalleryTagInheritanceForCard } = await import('@/lib/services/galleryTagInheritanceService');
    await syncGalleryTagInheritanceForCard(cardId);
    return (await getCardById(cardId)) ?? updated;
  }
  return updated;
}

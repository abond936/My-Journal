import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import {
  computeCardMediaSignalsFromMediaMap,
  getMediaIdsFromCard,
  hydrateCardFromMediaMap,
  loadMediaMapByIds,
} from '@/lib/services/cards/cardMediaHydrationService';
import { getExistingMediaDocIdsInTransaction } from '@/lib/services/cards/cardMediaMutationIntegrity';
import { syncCardProjection, withCardMutationRetry } from '@/lib/services/cards/cardMutationSupport';
import { syncMediaToTypesenseById } from '@/lib/services/typesenseMediaService';
import type { Card } from '@/lib/types/card';
import { FieldValue } from 'firebase-admin/firestore';
import { extractMediaFromContent, generateExcerpt, stripContentImageSrc } from '@/lib/utils/cardUtils';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

export async function updateCardContent(cardId: string, content: string): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  const preCard = preSnap.data() as Card;
  const preMediaIds = getMediaIdsFromCard(preCard);
  const sanitizedContent = stripContentImageSrc(content);
  const contentMediaIds = sanitizedContent ? extractMediaFromContent(sanitizedContent) : [];
  const nextMediaIds = new Set<string>();
  if (preCard.coverImageId) nextMediaIds.add(preCard.coverImageId);
  preCard.galleryMedia?.forEach((item) => item.mediaId && nextMediaIds.add(item.mediaId));
  contentMediaIds.forEach((mediaId) => mediaId && nextMediaIds.add(mediaId));
  const responseMediaMap = await loadMediaMapByIds(nextMediaIds);
  const mediaSignals = computeCardMediaSignalsFromMediaMap(responseMediaMap, await getAllTags());

  return withCardMutationRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
      const existingData = docSnap.data() as Card;
      const transactionMediaIds = new Set<string>();
      if (existingData.coverImageId) transactionMediaIds.add(existingData.coverImageId);
      existingData.galleryMedia?.forEach((item) => item.mediaId && transactionMediaIds.add(item.mediaId));
      contentMediaIds.forEach((mediaId) => mediaId && transactionMediaIds.add(mediaId));
      const oldMediaIds = getMediaIdsFromCard(existingData);
      const mediaRemoved = [...oldMediaIds].filter((id) => !transactionMediaIds.has(id));
      const mediaAdded = [...transactionMediaIds].filter((id) => !oldMediaIds.has(id));
      const existingMediaIds = await getExistingMediaDocIdsInTransaction(
        firestore,
        transaction,
        [...mediaRemoved, ...mediaAdded]
      );
      for (const mediaId of mediaRemoved) {
        if (!existingMediaIds.has(mediaId)) continue;
        transaction.update(firestore.collection(MEDIA_COLLECTION).doc(mediaId), {
          referencedByCardIds: FieldValue.arrayRemove(cardId),
          updatedAt: Date.now(),
        });
      }
      for (const mediaId of mediaAdded) {
        if (!existingMediaIds.has(mediaId)) throw new Error(`Referenced media with ID ${mediaId} not found.`);
        transaction.update(firestore.collection(MEDIA_COLLECTION).doc(mediaId), {
          referencedByCardIds: FieldValue.arrayUnion(cardId),
          updatedAt: Date.now(),
        });
      }
      transaction.update(docRef, {
        content: sanitizedContent,
        contentMedia: contentMediaIds,
        ...mediaSignals,
        ...(existingData.excerptAuto === true
          ? { excerpt: generateExcerpt(sanitizedContent) || null }
          : {}),
        updatedAt: Date.now(),
      });
    });

    const postSnap = await docRef.get();
    if (!postSnap.exists) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
    const updatedCard = hydrateCardFromMediaMap(
      { ...(postSnap.data() as Card), docId: postSnap.id },
      responseMediaMap
    );
    void syncCardProjection(updatedCard);
    new Set([...preMediaIds, ...getMediaIdsFromCard(updatedCard)])
      .forEach((mediaId) => void syncMediaToTypesenseById(mediaId));
    return updatedCard;
  });
}

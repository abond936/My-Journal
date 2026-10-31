import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags, updateTagCountsForCard } from '@/lib/firebase/tagService';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { getMediaIdsFromCard } from '@/lib/services/cards/cardMediaHydrationService';
import { getMediaMapInTransaction } from '@/lib/services/cards/cardMediaMutationIntegrity';
import { assertCardPublicationIntegrity } from '@/lib/services/cards/cardPublicationIntegrityService';
import { syncCardProjection, withCardMutationRetry } from '@/lib/services/cards/cardMutationSupport';
import type { Card } from '@/lib/types/card';
import { buildTagMap } from '@/lib/utils/journalWhenSort';
import { getAuthorSettings } from '@/lib/services/authorSettingsService';
import { hasActiveCollectionPlacement } from '@/lib/services/collections/collectionCardReferenceService';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

export async function updateCardStatus(cardId: string, status: 'draft' | 'published'): Promise<Card> {
  if (status !== 'draft' && status !== 'published') {
    throw new Error(`Invalid status '${status}'; expected 'draft' or 'published'.`);
  }
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const [allTags, authorSettings] = await Promise.all([getAllTags(), getAuthorSettings()]);
  const tagPathLookup = buildTagMap(allTags);
  return withCardMutationRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
      const existingData = docSnap.data() as Card;
      if (status === 'published' && existingData.status !== 'published') {
        const hasCollectionDestination = await hasActiveCollectionPlacement({
          transaction,
          firestore,
          cardId,
        });
        const mediaById = await getMediaMapInTransaction(
          firestore,
          transaction,
          getMediaIdsFromCard(existingData)
        );
        assertCardPublicationIntegrity(
          { ...existingData, docId: docSnap.id },
          mediaById,
          authorSettings.classificationRequirements,
          { hasActiveCollectionPlacement: hasCollectionDestination }
        );
      }
      await updateTagCountsForCard(existingData, { ...existingData, status }, transaction, tagPathLookup);
      transaction.update(docRef, { status, updatedAt: Date.now() });
    });
    const updatedCard = await getCardById(cardId);
    if (!updatedCard) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
    void syncCardProjection(updatedCard);
    return updatedCard;
  });
}

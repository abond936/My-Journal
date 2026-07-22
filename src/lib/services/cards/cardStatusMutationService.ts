import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags, updateTagCountsForCard } from '@/lib/firebase/tagService';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { syncCardProjection, withCardMutationRetry } from '@/lib/services/cards/cardMutationSupport';
import type { Card } from '@/lib/types/card';
import { buildTagMap } from '@/lib/utils/journalWhenSort';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

export async function updateCardStatus(cardId: string, status: 'draft' | 'published'): Promise<Card> {
  if (status !== 'draft' && status !== 'published') {
    throw new Error(`Invalid status '${status}'; expected 'draft' or 'published'.`);
  }
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const tagPathLookup = buildTagMap(await getAllTags());
  return withCardMutationRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
      const existingData = docSnap.data() as Card;
      await updateTagCountsForCard(existingData, { ...existingData, status }, transaction, tagPathLookup);
      transaction.update(docRef, { status, updatedAt: Date.now() });
    });
    const updatedCard = await getCardById(cardId);
    if (!updatedCard) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
    void syncCardProjection(updatedCard);
    return updatedCard;
  });
}

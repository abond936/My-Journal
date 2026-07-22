import { getAdminApp } from '@/lib/config/firebase/admin';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { assertValidQuestionBackedQa } from '@/lib/services/cards/cardMutationIntegrity';
import { syncCardProjection } from '@/lib/services/cards/cardMutationSupport';
import type { CardMetadataUpdates } from '@/lib/services/cards/cardMutationClassifiers';
import type { Card } from '@/lib/types/card';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

export async function updateCardMetadata(
  cardId: string,
  updates: CardMetadataUpdates
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);

  const existingData = preSnap.data() as Card;
  await assertValidQuestionBackedQa(firestore, updates, existingData);
  const cleanedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  ) as CardMetadataUpdates;
  if (Object.keys(cleanedUpdates).length === 0) return existingData;

  const mergedType = (cleanedUpdates.type ?? existingData.type) as Card['type'];
  const rawDisplay = cleanedUpdates.displayMode !== undefined
    ? cleanedUpdates.displayMode
    : existingData.displayMode;
  const normalizedDisplay = normalizeDisplayModeForType(mergedType, rawDisplay);
  const updatePayload: Partial<Card> = {
    ...cleanedUpdates,
    ...(Object.prototype.hasOwnProperty.call(cleanedUpdates, 'title')
      ? { title_lowercase: (cleanedUpdates.title ?? '').toLowerCase() }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(cleanedUpdates, 'type') ||
    Object.prototype.hasOwnProperty.call(cleanedUpdates, 'displayMode')
      ? { displayMode: normalizedDisplay }
      : {}),
    updatedAt: Date.now(),
  };

  await docRef.update(updatePayload);
  const updatedCard = await getCardById(cardId);
  if (!updatedCard) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  void syncCardProjection(updatedCard);
  return updatedCard;
}

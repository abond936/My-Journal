import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { computeCardMediaSignalsFromMediaIds, getMediaIdsFromCard } from '@/lib/services/cards/cardMediaHydrationService';
import { getExistingMediaDocIdsInTransaction } from '@/lib/services/cards/cardMediaMutationIntegrity';
import { syncCardProjection, withCardMutationRetry } from '@/lib/services/cards/cardMutationSupport';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { syncMediaToTypesenseById } from '@/lib/services/typesenseMediaService';
import type { Card } from '@/lib/types/card';
import { FieldValue } from 'firebase-admin/firestore';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

export async function updateCardCover(
  cardId: string,
  updates: Partial<Pick<Card, 'coverImageId' | 'coverImageFocalPoint' | 'coverImageMode'>>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  const existing = preSnap.data() as Card;
  const previousId = existing.coverImageId ?? null;
  const previousMode = existing.coverImageMode ?? 'fill';
  const idProvided = Object.prototype.hasOwnProperty.call(updates, 'coverImageId');
  const nextId = idProvided
    ? typeof updates.coverImageId === 'string' && updates.coverImageId.trim() ? updates.coverImageId : null
    : previousId;
  const modeProvided = Object.prototype.hasOwnProperty.call(updates, 'coverImageMode');
  const nextMode = modeProvided ? updates.coverImageMode ?? 'fill' : previousMode;
  const focalProvided = Object.prototype.hasOwnProperty.call(updates, 'coverImageFocalPoint');
  const focalPoint = updates.coverImageFocalPoint;
  if ((!idProvided || previousId === nextId) && (!modeProvided || previousMode === nextMode) &&
      (!focalProvided || (existing.coverImageFocalPoint?.x === focalPoint?.x && existing.coverImageFocalPoint?.y === focalPoint?.y))) {
    const unchanged = await getCardById(cardId);
    if (!unchanged) throw new Error(`Failed to fetch card with ID ${cardId}`);
    return unchanged;
  }
  const nextMediaIds = getMediaIdsFromCard(existing);
  if (previousId) nextMediaIds.delete(previousId);
  if (nextId) nextMediaIds.add(nextId);
  const signals = await computeCardMediaSignalsFromMediaIds(nextMediaIds, await getAllTags());
  const changed = idProvided && previousId !== nextId;
  const clearing = idProvided && nextId === null;
  return withCardMutationRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) throw new Error(`Card with ID ${cardId} not found.`);
      const checked = [previousId, nextId].filter((id): id is string => Boolean(id?.trim()));
      const existingIds = await getExistingMediaDocIdsInTransaction(firestore, transaction, checked);
      if (nextId && !existingIds.has(nextId)) throw new Error(`Cover media with ID ${nextId} not found.`);
      const payload: Record<string, unknown> = {
        ...signals, coverImage: FieldValue.delete(), updatedAt: Date.now(),
      };
      if (idProvided) payload.coverImageId = clearing ? FieldValue.delete() : nextId;
      if (modeProvided) payload.coverImageMode = nextMode;
      if (focalProvided && focalPoint && nextId) payload.coverImageFocalPoint = focalPoint;
      else if (clearing || (changed && !focalProvided)) payload.coverImageFocalPoint = FieldValue.delete();
      transaction.update(docRef, payload);
      if (changed && previousId && existingIds.has(previousId)) {
        transaction.update(firestore.collection(MEDIA_COLLECTION).doc(previousId), {
          referencedByCardIds: FieldValue.arrayRemove(cardId), updatedAt: Date.now(),
        });
      }
      if (changed && nextId) transaction.update(firestore.collection(MEDIA_COLLECTION).doc(nextId), {
        referencedByCardIds: FieldValue.arrayUnion(cardId), updatedAt: Date.now(),
      });
      if (focalProvided && focalPoint && nextId && existingIds.has(nextId)) {
        transaction.update(firestore.collection(MEDIA_COLLECTION).doc(nextId), {
          objectPosition: `${focalPoint.x} ${focalPoint.y}`, updatedAt: Date.now(),
        });
      }
    });
    const updated = await getCardById(cardId);
    if (!updated) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
    void syncCardProjection(updated);
    new Set([previousId, nextId].filter((id): id is string => Boolean(id)))
      .forEach((id) => void syncMediaToTypesenseById(id));
    return updated;
  });
}

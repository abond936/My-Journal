import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { CardTagAssignmentUpdates } from '@/lib/services/cards/cardMutationClassifiers';
import { updateCardTagAssignmentWithInheritance } from '@/lib/services/galleryTagInheritanceService';
import type { GalleryTagInheritanceToggles } from '@/lib/types/authorSettings';
import type { Card } from '@/lib/types/card';

const OPERATIONS_COLLECTION = 'card_bulk_tag_operations';
const ITEMS_COLLECTION = 'items';
const WRITE_BATCH_SIZE = 300;

export type CardBulkTagAssignmentItem = {
  cardId: string;
  updates: CardTagAssignmentUpdates;
  overrides: GalleryTagInheritanceToggles;
};

export type CardBulkTagAssignmentResult = {
  operationId: string;
  cards: Card[];
  failed: Array<{ cardId: string; error: string }>;
  complete: boolean;
};

export async function createCardBulkTagAssignmentOperation(
  items: CardBulkTagAssignmentItem[]
): Promise<string> {
  const firestore = getAdminApp().firestore();
  const operationRef = firestore.collection(OPERATIONS_COLLECTION).doc();
  await operationRef.set({
    status: 'pending',
    total: items.length,
    completedCount: 0,
    failedCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  for (let start = 0; start < items.length; start += WRITE_BATCH_SIZE) {
    const batch = firestore.batch();
    for (const item of items.slice(start, start + WRITE_BATCH_SIZE)) {
      batch.set(operationRef.collection(ITEMS_COLLECTION).doc(item.cardId), {
        ...item,
        status: 'pending',
        attempts: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return operationRef.id;
}

export async function processCardBulkTagAssignmentOperation(
  operationId: string
): Promise<CardBulkTagAssignmentResult> {
  const firestore = getAdminApp().firestore();
  const operationRef = firestore.collection(OPERATIONS_COLLECTION).doc(operationId);
  const operationSnap = await operationRef.get();
  if (!operationSnap.exists) {
    throw new Error(`Card bulk tag operation ${operationId} was not found.`);
  }

  await operationRef.update({
    status: 'running',
    lastStartedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const itemSnapshot = await operationRef.collection(ITEMS_COLLECTION).get();
  const cards: Card[] = [];
  const failed: Array<{ cardId: string; error: string }> = [];

  for (const itemDoc of itemSnapshot.docs) {
    const item = itemDoc.data() as CardBulkTagAssignmentItem & {
      status?: 'pending' | 'running' | 'complete' | 'failed';
    };
    if (item.status === 'complete') continue;
    await itemDoc.ref.update({
      status: 'running',
      attempts: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      error: FieldValue.delete(),
    });
    try {
      const card = await updateCardTagAssignmentWithInheritance(
        item.cardId,
        item.updates,
        item.overrides
      );
      cards.push(card);
      await itemDoc.ref.update({
        status: 'complete',
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Card update failure';
      failed.push({ cardId: item.cardId, error: message });
      await itemDoc.ref.update({
        status: 'failed',
        error: message,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  const finalItems = await operationRef.collection(ITEMS_COLLECTION).get();
  const completedCount = finalItems.docs.filter((doc) => doc.data().status === 'complete').length;
  const failedCount = finalItems.docs.filter((doc) => doc.data().status === 'failed').length;
  const complete = completedCount === finalItems.size;
  await operationRef.update({
    status: complete ? 'complete' : 'failed',
    completedCount,
    failedCount,
    ...(complete ? { completedAt: FieldValue.serverTimestamp() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { operationId, cards, failed, complete };
}

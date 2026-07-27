import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { recomputeCardsMediaSignalsForMediaIds } from '@/lib/services/cards/cardMediaLifecycleService';
import { syncGalleryTagInheritanceForMediaIds } from '@/lib/services/galleryTagInheritanceService';
import { syncMediaToTypesenseById } from '@/lib/services/typesenseMediaService';

const COLLECTION = 'media_tag_reconciliation_operations';

type MediaTagReconciliationOperation = {
  mediaIds?: string[];
  status?: 'pending' | 'running' | 'complete' | 'failed';
  lastStartedAt?: { toMillis?: () => number };
};

export async function createMediaTagReconciliationOperation(mediaIds: string[]): Promise<string> {
  const ids = Array.from(new Set(mediaIds.filter((id) => typeof id === 'string' && id.trim())));
  const ref = getAdminApp().firestore().collection(COLLECTION).doc();
  await ref.set({
    mediaIds: ids,
    status: 'pending',
    stage: 'pending',
    attempts: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function reconcileMediaTagDependents(
  mediaIds: string[]
): Promise<{ affectedCardIds: string[] }> {
  const inheritedCardIds = await syncGalleryTagInheritanceForMediaIds(mediaIds);
  const signalCardIds = await recomputeCardsMediaSignalsForMediaIds(mediaIds);
  await Promise.all(mediaIds.map((mediaId) => syncMediaToTypesenseById(mediaId)));
  return { affectedCardIds: Array.from(new Set([...inheritedCardIds, ...signalCardIds])) };
}

export async function processMediaTagReconciliationOperation(
  operationId: string
): Promise<{ operationId: string; affectedCardIds: string[]; skipped?: boolean }> {
  const firestore = getAdminApp().firestore();
  const ref = firestore.collection(COLLECTION).doc(operationId);
  const claimed = await firestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error(`Media tag reconciliation ${operationId} was not found.`);
    const operation = snap.data() as MediaTagReconciliationOperation;
    if (operation.status === 'complete') return null;
    if (
      operation.status === 'running' &&
      typeof operation.lastStartedAt?.toMillis === 'function' &&
      Date.now() - operation.lastStartedAt.toMillis() < 5 * 60 * 1000
    ) {
      return null;
    }
    transaction.update(ref, {
      status: 'running',
      stage: 'gallery-inheritance',
      attempts: FieldValue.increment(1),
      lastStartedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      error: FieldValue.delete(),
    });
    return Array.from(new Set(operation.mediaIds ?? []));
  });

  if (!claimed) {
    const current = await ref.get();
    const affectedCardIds = current.exists
      ? Array.from(new Set((current.data()?.affectedCardIds as string[] | undefined) ?? []))
      : [];
    return { operationId, affectedCardIds, skipped: true };
  }

  try {
    const inheritedCardIds = await syncGalleryTagInheritanceForMediaIds(claimed);
    await ref.update({
      stage: 'card-media-signals',
      updatedAt: FieldValue.serverTimestamp(),
    });
    const signalCardIds = await recomputeCardsMediaSignalsForMediaIds(claimed);
    const affectedCardIds = Array.from(new Set([...inheritedCardIds, ...signalCardIds]));
    await ref.update({
      stage: 'media-search-index',
      updatedAt: FieldValue.serverTimestamp(),
    });
    await Promise.all(claimed.map((mediaId) => syncMediaToTypesenseById(mediaId)));
    await ref.update({
      status: 'complete',
      stage: 'complete',
      affectedCardIds,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { operationId, affectedCardIds };
  } catch (error) {
    await ref.update({
      status: 'failed',
      stage: 'failed',
      error: error instanceof Error ? error.message : 'Unknown reconciliation failure',
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw error;
  }
}

export async function processPendingMediaTagReconciliations(
  limit = 5
): Promise<Array<{ operationId: string; affectedCardIds: string[]; skipped?: boolean }>> {
  const firestore = getAdminApp().firestore();
  const snapshot = await firestore
    .collection(COLLECTION)
    .where('status', 'in', ['pending', 'failed', 'running'])
    .limit(limit)
    .get();
  const results = [];
  for (const doc of snapshot.docs) {
    results.push(await processMediaTagReconciliationOperation(doc.id));
  }
  return results;
}

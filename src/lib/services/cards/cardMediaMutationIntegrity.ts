import type { Firestore, Transaction } from 'firebase-admin/firestore';
import type { Media } from '@/lib/types/photo';

const MEDIA_COLLECTION = 'media';

export async function getExistingMediaDocIdsInTransaction(
  firestore: Firestore,
  transaction: Transaction,
  mediaIds: Iterable<string>
): Promise<Set<string>> {
  const uniqueIds = Array.from(new Set(Array.from(mediaIds).filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0
  )));
  if (uniqueIds.length === 0) return new Set<string>();
  const docs = await transaction.getAll(
    ...uniqueIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id))
  );
  return new Set(docs.filter((doc) => doc.exists).map((doc) => doc.id));
}

export async function getMediaMapInTransaction(
  firestore: Firestore,
  transaction: Transaction,
  mediaIds: Iterable<string>
): Promise<Map<string, Media>> {
  const uniqueIds = Array.from(new Set(Array.from(mediaIds).filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0
  )));
  if (uniqueIds.length === 0) return new Map<string, Media>();
  const docs = await transaction.getAll(
    ...uniqueIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id))
  );
  return new Map(
    docs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, { docId: doc.id, ...doc.data() } as Media])
  );
}

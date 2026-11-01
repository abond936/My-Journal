import { getAdminApp } from '@/lib/config/firebase/admin';
import { collectionSchema, type Collection } from '@/lib/types/collection';

const COLLECTIONS = 'collections';

export class CollectionTitleConflictError extends Error {
  constructor() {
    super('An active Collection already uses that title.');
    this.name = 'CollectionTitleConflictError';
  }
}

export async function createActiveCollection(args: {
  title: string;
  description?: string | null;
  now?: number;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<Collection> {
  const {
    title,
    description,
    now = Date.now(),
    firestore = getAdminApp().firestore(),
  } = args;
  const normalizedTitle = title.trim();
  const normalizedDescription = description?.trim() || null;
  const collectionRef = firestore.collection(COLLECTIONS).doc();
  const collectionsQuery = firestore.collection(COLLECTIONS);

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(collectionsQuery);
    const activeCollections = snapshot.docs
      .map((doc) => collectionSchema.parse({ docId: doc.id, ...doc.data() }))
      .filter((collection) => collection.recordState === 'active');
    if (activeCollections.some((collection) => collection.title.trim().toLowerCase() === normalizedTitle.toLowerCase())) {
      throw new CollectionTitleConflictError();
    }
    const order = activeCollections.length
      ? Math.max(...activeCollections.map((collection) => collection.order)) + 10
      : 10;
    const collection = collectionSchema.parse({
      docId: collectionRef.id,
      title: normalizedTitle,
      description: normalizedDescription,
      lifecycle: 'draft',
      recordState: 'active',
      structureRevision: 0,
      authorityRevision: 1,
      authorityEstablishedAt: now,
      order,
      createdAt: now,
      updatedAt: now,
    });
    transaction.create(collectionRef, collection);
    return collection;
  });
}

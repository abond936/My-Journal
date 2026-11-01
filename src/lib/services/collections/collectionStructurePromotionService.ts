import { getAdminApp } from '@/lib/config/firebase/admin';
import { collectionPlacementSchema, collectionSchema } from '@/lib/types/collection';
import { CollectionTitleConflictError } from '@/lib/services/collections/collectionCreationService';
import {
  buildCollectionStructurePromotionPlan,
  type CollectionStructurePromotionPlan,
} from '@/lib/utils/collectionStructurePromotion';

const COLLECTIONS = 'collections';
const PLACEMENTS = 'collection_placements';
const CARDS = 'cards';
const OPERATIONS = 'collection_structure_operations';

export async function promoteCollectionStructure(args: {
  sourceCollectionId: string;
  sourcePlacementId: string;
  expectedStructureRevision: number;
  title: string;
  now?: number;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<CollectionStructurePromotionPlan> {
  const {
    sourceCollectionId,
    sourcePlacementId,
    expectedStructureRevision,
    title,
    now = Date.now(),
    firestore = getAdminApp().firestore(),
  } = args;
  const normalizedTitle = title.trim();
  const targetCollectionRef = firestore.collection(COLLECTIONS).doc();
  const sourceCollectionRef = firestore.collection(COLLECTIONS).doc(sourceCollectionId);
  const collectionsQuery = firestore.collection(COLLECTIONS);
  const sourcePlacementsQuery = firestore.collection(PLACEMENTS).where('collectionId', '==', sourceCollectionId);

  return firestore.runTransaction(async (transaction) => {
    const [sourceCollectionSnap, collectionsSnap, sourcePlacementsSnap] = await Promise.all([
      transaction.get(sourceCollectionRef),
      transaction.get(collectionsQuery),
      transaction.get(sourcePlacementsQuery),
    ]);
    if (!sourceCollectionSnap.exists) throw new Error(`Collection ${sourceCollectionId} was not found.`);
    const sourceCollection = collectionSchema.parse({
      docId: sourceCollectionSnap.id,
      ...sourceCollectionSnap.data(),
    });
    const activeCollections = collectionsSnap.docs
      .map((doc) => collectionSchema.parse({ docId: doc.id, ...doc.data() }))
      .filter((collection) => collection.recordState === 'active');
    if (activeCollections.some((collection) => collection.title.trim().toLowerCase() === normalizedTitle.toLowerCase())) {
      throw new CollectionTitleConflictError();
    }
    const sourcePlacements = sourcePlacementsSnap.docs.map((doc) =>
      collectionPlacementSchema.parse({ docId: doc.id, ...doc.data() })
    );
    const cardIds = Array.from(new Set(sourcePlacements.map((placement) => placement.cardId)));
    const cardSnapshots = cardIds.length
      ? await transaction.getAll(...cardIds.map((cardId) => firestore.collection(CARDS).doc(cardId)))
      : [];
    const existingCardIds = new Set(
      cardSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id)
    );
    const plan = buildCollectionStructurePromotionPlan({
      sourceCollection,
      sourcePlacements,
      sourcePlacementId,
      expectedStructureRevision,
      targetCollectionId: targetCollectionRef.id,
      targetTitle: normalizedTitle,
      targetOrder: activeCollections.length
        ? Math.max(...activeCollections.map((collection) => collection.order)) + 10
        : 10,
      targetPlacementId: () => {
        const ref = firestore.collection(PLACEMENTS).doc();
        return ref.id;
      },
      existingCardIds,
      now,
    });
    transaction.create(targetCollectionRef, plan.collection);
    plan.placements.forEach((placement) => {
      transaction.create(firestore.collection(PLACEMENTS).doc(placement.docId), placement);
    });
    transaction.create(firestore.collection(OPERATIONS).doc(plan.operation.docId), plan.operation);
    return plan;
  });
}

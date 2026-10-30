import { getAdminApp } from '@/lib/config/firebase/admin';
import type { CollectionPlacementStructureInput } from '@/lib/types/collection';
import { collectionPlacementSchema, collectionSchema } from '@/lib/types/collection';
import {
  buildCollectionPlacementMutationPlan,
  type CollectionPlacementMutationPlan,
} from '@/lib/utils/collectionPlacementMutation';

const COLLECTIONS = 'collections';
const PLACEMENTS = 'collection_placements';
const OPERATIONS = 'collection_structure_operations';
const CARDS = 'cards';

export async function replaceCollectionPlacementStructure(args: {
  collectionId: string;
  expectedStructureRevision: number;
  placements: CollectionPlacementStructureInput[];
  now?: number;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<CollectionPlacementMutationPlan> {
  const {
    collectionId,
    expectedStructureRevision,
    placements,
    now = Date.now(),
    firestore = getAdminApp().firestore(),
  } = args;
  const collectionRef = firestore.collection(COLLECTIONS).doc(collectionId);
  const placementsQuery = firestore.collection(PLACEMENTS).where('collectionId', '==', collectionId);

  return firestore.runTransaction(async (transaction) => {
    const collectionSnap = await transaction.get(collectionRef);
    if (!collectionSnap.exists) throw new Error(`Collection ${collectionId} was not found.`);
    const currentCollection = collectionSchema.parse({ docId: collectionSnap.id, ...collectionSnap.data() });
    const placementsSnap = await transaction.get(placementsQuery);
    const currentPlacements = placementsSnap.docs.map((doc) =>
      collectionPlacementSchema.parse({ docId: doc.id, ...doc.data() })
    );
    const cardIds = Array.from(new Set(placements.map((placement) => placement.cardId)));
    const cardSnapshots = cardIds.length
      ? await transaction.getAll(...cardIds.map((cardId) => firestore.collection(CARDS).doc(cardId)))
      : [];
    const existingCardIds = new Set(
      cardSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id)
    );
    const plan = buildCollectionPlacementMutationPlan({
      collection: currentCollection,
      currentPlacements,
      proposedPlacements: placements,
      existingCardIds,
      expectedStructureRevision,
      now,
    });
    if (!plan.changed || !plan.operation) return plan;

    plan.upserts.forEach((placement) => {
      transaction.set(firestore.collection(PLACEMENTS).doc(placement.docId), placement);
    });
    plan.deletePlacementIds.forEach((placementId) => {
      transaction.delete(firestore.collection(PLACEMENTS).doc(placementId));
    });
    transaction.update(collectionRef, {
      structureRevision: plan.nextRevision,
      updatedAt: now,
    });
    transaction.create(firestore.collection(OPERATIONS).doc(plan.operation.docId), plan.operation);
    return plan;
  });
}

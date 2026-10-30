import { getAdminApp } from '@/lib/config/firebase/admin';
import type { CollectionShadowWritePlan } from '@/lib/utils/collectionShadowPlan';

const COLLECTIONS = 'collections';
const PLACEMENTS = 'collection_placements';
const OPERATIONS = 'collection_migration_operations';

export async function createCollectionShadow(plan: CollectionShadowWritePlan): Promise<void> {
  const firestore = getAdminApp().firestore();
  const collectionRef = firestore.collection(COLLECTIONS).doc(plan.collection.docId);
  const operationRef = firestore.collection(OPERATIONS).doc(plan.operation.docId);
  const placementRefs = plan.placements.map((placement) => ({
    ref: firestore.collection(PLACEMENTS).doc(placement.docId),
    placement,
  }));

  await firestore.runTransaction(async (transaction) => {
    transaction.create(collectionRef, plan.collection);
    placementRefs.forEach(({ ref, placement }) => transaction.create(ref, placement));
    transaction.create(operationRef, plan.operation);
  });
}

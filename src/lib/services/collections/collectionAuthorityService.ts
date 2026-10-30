import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import type { CollectionRecordState } from '@/lib/types/collection';
import { collectionPlacementSchema, collectionSchema } from '@/lib/types/collection';
import {
  buildCollectionAuthorityTransitionPlan,
  type CollectionAuthorityTransitionPlan,
} from '@/lib/utils/collectionAuthorityTransition';

const COLLECTIONS = 'collections';
const PLACEMENTS = 'collection_placements';
const CARDS = 'cards';
const OPERATIONS = 'collection_authority_operations';

export async function transitionCollectionAuthority(args: {
  collectionId: string;
  desiredState: CollectionRecordState;
  expectedStructureRevision: number;
  expectedAuthorityRevision: number;
  now?: number;
  firestore?: FirebaseFirestore.Firestore;
}): Promise<CollectionAuthorityTransitionPlan> {
  const {
    collectionId,
    desiredState,
    expectedStructureRevision,
    expectedAuthorityRevision,
    now = Date.now(),
    firestore = getAdminApp().firestore(),
  } = args;
  const collectionRef = firestore.collection(COLLECTIONS).doc(collectionId);

  return firestore.runTransaction(async (transaction) => {
    const collectionSnap = await transaction.get(collectionRef);
    if (!collectionSnap.exists) throw new Error(`Collection ${collectionId} was not found.`);
    const collection = collectionSchema.parse({ docId: collectionSnap.id, ...collectionSnap.data() });

    let placements: ReturnType<typeof collectionPlacementSchema.parse>[] = [];
    let sourceCards: Card[] = [];
    if (desiredState === 'active') {
      const placementsQuery = firestore.collection(PLACEMENTS).where('collectionId', '==', collectionId);
      const sourceCardsQuery = firestore.collection(CARDS).select(
        'title', 'status', 'isCollectionRoot', 'childrenIds'
      );
      const [placementsSnap, sourceCardsSnap] = await Promise.all([
        transaction.get(placementsQuery),
        transaction.get(sourceCardsQuery),
      ]);
      placements = placementsSnap.docs.map((doc) =>
        collectionPlacementSchema.parse({ docId: doc.id, ...doc.data() })
      );
      sourceCards = sourceCardsSnap.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
    }

    const plan = buildCollectionAuthorityTransitionPlan({
      collection,
      placements,
      sourceCards,
      desiredState,
      expectedStructureRevision,
      expectedAuthorityRevision,
      now,
    });
    if (!plan.changed || !plan.patch || !plan.operation) return plan;
    transaction.update(collectionRef, plan.patch);
    transaction.create(firestore.collection(OPERATIONS).doc(plan.operation.docId), plan.operation);
    return plan;
  });
}

import { AppError, ErrorCode } from '@/lib/types/error';
import type { Transaction } from 'firebase-admin/firestore';

const PLACEMENTS = 'collection_placements';

export async function assertCardHasNoCollectionPlacements(args: {
  transaction: Transaction;
  firestore: FirebaseFirestore.Firestore;
  cardId: string;
}): Promise<void> {
  const { transaction, firestore, cardId } = args;
  const placementSnapshot = await transaction.get(
    firestore.collection(PLACEMENTS).where('cardId', '==', cardId)
  );
  if (placementSnapshot.empty) return;
  const placementIds = placementSnapshot.docs.map((doc) => doc.id).sort();
  const collectionIds = Array.from(new Set(
    placementSnapshot.docs
      .map((doc) => doc.data().collectionId)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  )).sort();
  throw new AppError(
    ErrorCode.COLLECTION_PLACEMENT_REFERENCE,
    'Cannot delete a Card while a durable Collection placement references it.',
    {
      cardId,
      placementCount: placementIds.length,
      placementIds,
      collectionIds,
    }
  );
}

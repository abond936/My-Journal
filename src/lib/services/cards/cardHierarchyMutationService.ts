import { getAdminApp } from '@/lib/config/firebase/admin';
import { isChildrenReorderOnlyPayload } from '@/lib/services/cards/cardMutationClassifiers';
import { computeCuratedNavEligible, normalizeChildrenIds } from '@/lib/services/cards/cardHierarchyRules';
import { syncCardProjection } from '@/lib/services/cards/cardMutationSupport';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { AppError, ErrorCode } from '@/lib/types/error';
import type { Card } from '@/lib/types/card';
import { nextCollectionRootOrderForAppend } from '@/lib/utils/curatedCollectionTree';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

export async function getExistingCollectionRoots(): Promise<Card[]> {
  const snap = await firestore.collection(CARDS_COLLECTION).where('isCollectionRoot', '==', true).get();
  return snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
}

export async function wouldCreateCycle(transaction: Transaction, parentId: string, childId: string) {
  if (parentId === childId) return true;
  const queue = [childId];
  const visited = new Set<string>();
  while (queue.length) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const snap = await transaction.get(firestore.collection(CARDS_COLLECTION).doc(currentId));
    if (!snap.exists) continue;
    const children = normalizeChildrenIds((snap.data() as Card).childrenIds);
    if (children.includes(parentId)) return true;
    children.forEach((id) => !visited.has(id) && queue.push(id));
  }
  return false;
}

type ChildPlacementUpdate = {
  ref: FirebaseFirestore.DocumentReference;
  payload: Record<string, unknown>;
};

export async function readChildPlacementReconciliation(
  transaction: Transaction,
  parentId: string,
  nextChildrenIds: string[],
  previousChildrenIds: string[]
): Promise<ChildPlacementUpdate[]> {
  const previous = new Set(previousChildrenIds);
  const updates: ChildPlacementUpdate[] = [];
  for (const childId of nextChildrenIds) {
    if (previous.has(childId)) continue;
    const childRef = firestore.collection(CARDS_COLLECTION).doc(childId);
    const childSnap = await transaction.get(childRef);
    if (!childSnap.exists) {
      throw new AppError(
        ErrorCode.CURATED_COLLECTION_CHILD_NOT_FOUND,
        `Cannot add child ${childId}: card not found.`,
        { childId, parentCardId: parentId }
      );
    }
    const child = childSnap.data() as Card;
    updates.push({
      ref: childRef,
      payload: {
        curatedRoot: FieldValue.delete(),
        curatedRootOrder: FieldValue.delete(),
        curatedNavEligible: computeCuratedNavEligible({
          childrenIds: child.childrenIds,
          isCollectionRoot: child.isCollectionRoot,
        }),
        updatedAt: Date.now(),
      },
    });

    const parentSnap = await transaction.get(
      firestore.collection(CARDS_COLLECTION).where('childrenIds', 'array-contains', childId)
    );
    for (const formerParentDoc of parentSnap.docs) {
      if (formerParentDoc.id === parentId) continue;
      const formerParent = formerParentDoc.data() as Card;
      const childrenIds = normalizeChildrenIds(formerParent.childrenIds)
        .filter((id) => id !== childId);
      updates.push({
        ref: formerParentDoc.ref,
        payload: {
          childrenIds,
          curatedRoot: FieldValue.delete(),
          curatedRootOrder: FieldValue.delete(),
          curatedNavEligible: computeCuratedNavEligible({
            childrenIds,
            isCollectionRoot: formerParent.isCollectionRoot,
          }),
          updatedAt: Date.now(),
        },
      });
    }
  }
  return updates;
}

export function applyChildPlacementReconciliation(
  transaction: Transaction,
  updates: ChildPlacementUpdate[]
): void {
  updates.forEach(({ ref, payload }) => transaction.update(ref, payload));
}

async function returnUpdatedCard(cardId: string): Promise<Card> {
  const updated = await getCardById(cardId);
  if (!updated) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  void syncCardProjection(updated);
  return updated;
}

export async function updateCardChildrenOrder(cardId: string, childrenIds: string[]): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  if (!isChildrenReorderOnlyPayload(preSnap.data() as Card, { childrenIds })) {
    throw new Error('Children reorder fast path requires unchanged child membership.');
  }
  await docRef.update({ childrenIds: normalizeChildrenIds(childrenIds, cardId), updatedAt: Date.now() });
  return returnUpdatedCard(cardId);
}

export async function updateCardCollectionRoot(
  cardId: string,
  updates: Partial<Pick<Card, 'isCollectionRoot' | 'collectionRootOrder'>>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  const existing = preSnap.data() as Card;
  const nextIsRoot = Object.prototype.hasOwnProperty.call(updates, 'isCollectionRoot')
    ? updates.isCollectionRoot === true
    : existing.isCollectionRoot === true;
  let order = typeof updates.collectionRootOrder === 'number'
    ? updates.collectionRootOrder
    : existing.collectionRootOrder;
  if (nextIsRoot && typeof order !== 'number') {
    order = nextCollectionRootOrderForAppend(await getExistingCollectionRoots(), cardId);
  }
  await docRef.update({
    isCollectionRoot: nextIsRoot,
    curatedNavEligible: computeCuratedNavEligible({ childrenIds: existing.childrenIds, isCollectionRoot: nextIsRoot }),
    curatedRoot: FieldValue.delete(),
    curatedRootOrder: FieldValue.delete(),
    collectionRootOrder: nextIsRoot && typeof order === 'number' ? order : FieldValue.delete(),
    updatedAt: Date.now(),
  });
  return returnUpdatedCard(cardId);
}

export async function updateCardChildren(cardId: string, childrenIds: string[]): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  const existing = preSnap.data() as Card;
  const normalized = normalizeChildrenIds(childrenIds, cardId);
  const previous = new Set(normalizeChildrenIds(existing.childrenIds, cardId));
  await firestore.runTransaction(async (transaction) => {
    const placementUpdates = await readChildPlacementReconciliation(
      transaction,
      cardId,
      normalized,
      [...previous]
    );
    for (const childId of normalized) {
      if (await wouldCreateCycle(transaction, cardId, childId)) {
        throw new AppError(ErrorCode.CURATED_COLLECTION_CYCLE,
          `Cannot set child ${childId}; this would create a cycle.`, { childId, parentCardId: cardId });
      }
    }
    applyChildPlacementReconciliation(transaction, placementUpdates);
    transaction.update(docRef, {
      childrenIds: normalized,
      curatedNavEligible: computeCuratedNavEligible({ childrenIds: normalized, isCollectionRoot: existing.isCollectionRoot }),
      curatedRoot: FieldValue.delete(),
      curatedRootOrder: FieldValue.delete(),
      updatedAt: Date.now(),
    });
  });
  return returnUpdatedCard(cardId);
}

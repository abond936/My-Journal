import { firestore } from '../firebase';
import { Card } from '../models/card';

const CARDS_COLLECTION = 'cards';

if (querySnapshot.size === 500) {
  await deleteAllCards();
}

/**
 * Retrieves a paginated and filtered list of cards from Firestore.
 * This is a server-side function.
 * @param options - Options for filtering and pagination.
 * @returns A paginated result of cards.
 */
export async function getCards(options: {
  q?: string;
  status?: Card['status'] | 'all';
  type?: Card['type'] | 'all';
  limit?: number;
  lastDocId?: string;
} = {}): Promise<{ items: Card[]; lastDocId?: string }> {
  const { q, status = 'all', type = 'all', limit = 10, lastDocId } = options;
  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);

  // Apply filters
  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (type && type !== 'all') {
    query = query.where('type', '==', type);
  }

  // Note: Firestore does not support full-text search natively.
  // A simple "startsWith" search on the title is implemented here.
  // For more complex search, a dedicated search service like Algolia is needed.
  if (q) {
    query = query.where('title', '>=', q).where('title', '<=', q + '\uf8ff');
  }

  query = query.orderBy('createdAt', 'desc').limit(limit);

  if (lastDocId) {
    const lastDoc = await firestore.collection(CARDS_COLLECTION).doc(lastDocId).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(doc => doc.data() as Card);
  const newLastDocId = snapshot.docs[snapshot.docs.length - 1]?.id;

  return { items, lastDocId: newLastDocId };
} 
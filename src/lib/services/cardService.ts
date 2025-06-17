import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card } from '@/lib/types/card';
import { getTagAncestors, getTagPaths } from '@/lib/firebase/tagDataAccess';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';

/**
 * Adds a new card to the Firestore 'cards' collection.
 *
 * @param cardData - The data for the card to be created.
 *   The 'id' can be omitted, and Firestore will generate one.
 * @returns The full Card object, including the generated ID.
 */
export async function addCard(cardData: Omit<Card, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Card> {
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  const docRef = cardData.id ? collectionRef.doc(cardData.id) : collectionRef.doc();
  
  const newCard: Card = {
    ...cardData,
    id: docRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await docRef.set(newCard);
  return newCard;
}

/**
 * Creates a new card in Firestore.
 * @param cardData The data for the new card, excluding 'id'.
 * @returns The newly created card with its ID.
 */
export async function createCard(cardData: Partial<Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'inheritedTags' | 'tagPaths'>>): Promise<Card> {
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  const docRef = collectionRef.doc();

  // Ensure required arrays are present
  const dataWithDefaults = {
    ...cardData,
    tags: cardData.tags || [],
    contentMedia: cardData.contentMedia || [],
    galleryMedia: cardData.galleryMedia || [],
  };

  // Calculate inherited tags and paths
  const selectedTags = dataWithDefaults.tags;
  const ancestorTags = await getTagAncestors(selectedTags);
  const inheritedTags = [...new Set([...selectedTags, ...ancestorTags])];
  const tagPaths = await getTagPaths(selectedTags);

  const newCard: Card = {
    contentMedia: [],
    galleryMedia: [],
    ...dataWithDefaults,
    id: docRef.id,
    inheritedTags,
    tagPaths,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await docRef.set(newCard);
  return newCard;
}

/**
 * Updates an existing card in Firestore.
 * @param cardId The ID of the card to update.
 * @param cardData The partial data to update the card with.
 * @returns The updated card.
 */
export async function updateCard(cardId: string, cardData: Partial<Omit<Card, 'id'>>): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  
  const updateData: Partial<Card> = {
    ...cardData,
    updatedAt: Date.now(),
  };

  // If tags are being updated, recalculate inheritedTags and tagPaths
  if (cardData.tags) {
    const selectedTags = cardData.tags;
    const ancestorTags = await getTagAncestors(selectedTags);
    updateData.inheritedTags = [...new Set([...selectedTags, ...ancestorTags])];
    updateData.tagPaths = await getTagPaths(selectedTags);
  }

  await docRef.update(updateData);
  const updatedDoc = await docRef.get();
  return updatedDoc.data() as Card;
}

/**
 * Retrieves a card by its ID from Firestore.
 * @param id - The ID of the card to retrieve.
 * @returns The card data, or null if not found.
 */
export async function getCardById(id: string): Promise<Card | null> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return null;
  }

  return docSnap.data() as Card;
}

/**
 * Retrieves multiple cards by their IDs from Firestore.
 * @param ids - An array of card IDs to retrieve.
 * @returns An array of found cards.
 */
export async function getCardsByIds(ids: string[]): Promise<Card[]> {
  if (!ids || ids.length === 0) {
    return [];
  }
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  // Firestore 'in' queries are limited to 30 items.
  const chunks = [];
  for (let i = 0; i < ids.length; i += 30) {
    chunks.push(ids.slice(i, i + 30));
  }

  const promises = chunks.map(chunk =>
    collectionRef.where('id', 'in', chunk).get()
  );

  const snapshotResults = await Promise.all(promises);
  const cards = snapshotResults.flatMap(snapshot =>
    snapshot.docs.map(doc => doc.data() as Card)
  );
  
  // Preserve the original order of IDs
  const cardMap = new Map(cards.map(c => [c.id, c]));
  return ids.map(id => cardMap.get(id)).filter((c): c is Card => !!c);
}

/**
 * Deletes all documents from the 'cards' collection.
 * This is a utility function for seeding and should be used with caution.
 */
export async function deleteAllCards(): Promise<void> {
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  const querySnapshot = await collectionRef.limit(500).get();

  if (querySnapshot.empty) {
    console.log('No documents to delete.');
    return;
  }

  const batch = firestore.batch();
  querySnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  // If there might be more documents, recursively delete them.
  if (querySnapshot.size === 500) {
    await deleteAllCards();
  }
}

/**
 * Deletes a card from the Firestore 'cards' collection.
 * @param cardId The ID of the card to delete.
 */
export async function deleteCard(cardId: string): Promise<void> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  await docRef.delete();
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
  childrenIds_contains?: string;
  limit?: number;
  lastDocId?: string;
} = {}): Promise<{ items: Card[]; lastDocId?: string }> {
  const { q, status = 'all', type = 'all', childrenIds_contains, limit = 10, lastDocId } = options;
  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);

  // Apply filters
  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (type && type !== 'all') {
    query = query.where('type', '==', type);
  }
  if (childrenIds_contains) {
    query = query.where('childrenIds', 'array-contains', childrenIds_contains);
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
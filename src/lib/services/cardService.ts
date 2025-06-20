import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema } from '@/lib/types/card';
import { getTagAncestors, getTagPathsMap } from '@/lib/firebase/tagDataAccess';
import { getFirestore, writeBatch } from 'firebase-admin/firestore';
import { doc } from 'firebase-admin/firestore';

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
export async function createCard(cardData: Partial<Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'inheritedTags' | 'tagPathsMap'>>): Promise<Card> {
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
  const tagPathsMap = await getTagPathsMap(selectedTags);

  const newCard: Card = {
    contentMedia: [],
    galleryMedia: [],
    ...dataWithDefaults,
    id: docRef.id,
    inheritedTags,
    tagPathsMap,
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
    updateData.tagPathsMap = await getTagPathsMap(selectedTags);
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
 * Retrieves a paginated subset of cards from a given list of IDs.
 * @param ids - The full list of card IDs to paginate through.
 * @param options - Options for pagination (limit, lastDocId).
 * @returns A paginated result of cards from the specified list.
 */
export async function getPaginatedCardsByIds(
  ids: string[],
  options: {
    limit?: number;
    lastDocId?: string;
  } = {}
): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const { limit = 10, lastDocId } = options;

  if (!ids || ids.length === 0) {
    return { items: [], hasMore: false };
  }

  const startIndex = lastDocId ? ids.indexOf(lastDocId) + 1 : 0;
  if (startIndex < 0 || startIndex >= ids.length) {
    return { items: [], hasMore: false };
  }

  const endIndex = startIndex + limit;
  const pageIds = ids.slice(startIndex, endIndex);

  if (pageIds.length === 0) {
    return { items: [], hasMore: false };
  }

  const items = await getCardsByIds(pageIds);
  const newLastDocId = items.length > 0 ? items[items.length - 1].id : undefined;
  const hasMore = endIndex < ids.length;

  return { items, lastDocId: newLastDocId, hasMore };
}

/**
 * Updates the tags for a list of cards in a batch operation.
 * @param cardIds - The IDs of the cards to update.
 * @param tags - The new array of tag IDs to set for all cards.
 * @returns A promise that resolves when the batch update is complete.
 */
export async function bulkUpdateTags(cardIds: string[], tags: string[]): Promise<void> {
  const db = getFirestore();
  const batch = writeBatch(db);

  const newInheritedTags = await getInheritedTags(tags);

  cardIds.forEach(id => {
    const cardRef = doc(db, 'cards', id);
    batch.update(cardRef, { 
      tags,
      inheritedTags: newInheritedTags,
    });
  });

  await batch.commit();
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
 * Searches for cards based on a query string across multiple fields.
 * This is a server-side function.
 * @param options - Options for filtering and pagination.
 * @returns A paginated result of cards.
 */
export async function searchCards(options: {
  q: string;
  status?: Card['status'] | 'all';
  limit?: number;
  lastDocId?: string;
} = { q: '' }): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const { q, status = 'published', limit = 10, lastDocId } = options;
  const db = getFirestore();
  let query: FirebaseFirestore.Query = db.collection(CARDS_COLLECTION);

  // New tag-based search logic
  const tags = q.split(' ').filter(tag => tag.trim() !== '');

  if (tags.length > 0) {
    // Firestore allows up to 10 `array-contains` clauses for 'AND' operations.
    // We will use `inheritedTags` which should contain the tag itself and its ancestors.
    tags.forEach(tag => {
      query = query.where('inheritedTags', 'array-contains', tag.trim());
    });
  } else {
    // If no tags are provided, return no results.
    return { items: [], hasMore: false };
  }

  if (status !== 'all') {
    query = query.where('status', '==', status);
  }

  query = query.orderBy('createdAt', 'desc');

  if (lastDocId) {
    const lastDocSnap = await db.collection(CARDS_COLLECTION).doc(lastDocId).get();
    if (lastDocSnap.exists) {
      query = query.startAfter(lastDocSnap);
    }
  }

  const snapshot = await query.limit(limit).get();
  
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Card));
  
  const hasMore = items.length === limit;
  const newLastDocId = items.length > 0 ? items[items.length - 1].id : undefined;

  return { items, lastDocId: newLastDocId, hasMore };
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
  tags?: string[];
  dimensionalTags?: string[];
  childrenIds_contains?: string;
  limit?: number;
  lastDocId?: string;
} = {}): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const { q, status, type, tags, dimensionalTags, childrenIds_contains, limit = 10, lastDocId } = options;
  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);

  // Apply filters
  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (type && type !== 'all') {
    query = query.where('type', '==', type);
  }
  if (tags && tags.length > 0) {
    query = query.where('inheritedTags', 'array-contains-any', tags);
  }
  if (dimensionalTags && dimensionalTags.length > 0) {
    dimensionalTags.forEach(tag => {
      query = query.where(`tagPathsMap.${tag}`, '!=', null);
    });
  }
  if (childrenIds_contains) {
    query = query.where('childrenIds', 'array-contains', childrenIds_contains);
  }
  if (q) {
    const searchTerm = q.trim();
    if (searchTerm) {
        query = query.where('title', '>=', searchTerm)
                     .where('title', '<=', searchTerm + '\uf8ff')
                     .orderBy('title');
    }
  }

  // Apply sorting
  if (!q) {
    query = query.orderBy('createdAt', 'desc');
  }

  // Apply pagination
  if (lastDocId) {
    const lastDocSnap = await firestore.collection(CARDS_COLLECTION).doc(lastDocId).get();
    if (lastDocSnap.exists) {
      query = query.startAfter(lastDocSnap);
    }
  }

  const querySnapshot = await query.limit(limit).get();
  
  const items = querySnapshot.docs
    .map(doc => {
      const data = doc.data();
      // Add the document ID to the data object
      data.id = doc.id;
      const validation = cardSchema.safeParse(data);
      if (validation.success) {
        return validation.data as Card;
      } else {
        console.warn(`[Data Integrity] Invalid card data found for doc id: ${doc.id}. Issues:`, validation.error.issues);
        return null;
      }
    })
    .filter((item): item is Card => item !== null);

  const hasMore = querySnapshot.docs.length === limit;
  const newLastDocId = items.length > 0 ? items[items.length - 1].id : undefined;

  return { items, lastDocId: newLastDocId, hasMore };
} 
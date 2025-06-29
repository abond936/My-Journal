import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema, GalleryMediaItem } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { getTagAncestors, getTagPathsMap } from '@/lib/firebase/tagDataAccess';
import { getFirestore, writeBatch } from 'firebase-admin/firestore';
import { doc } from 'firebase-admin/firestore';
import { deleteMediaAsset } from './images/imageImportService';
import { extractMediaFromContent } from '@/lib/utils/cardUtils';
import { Media } from '@/lib/types/photo';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

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
export async function createCard(cardData: Partial<Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'inheritedTags' | 'tagPathsMap' | 'filterTags'>>): Promise<Card> {
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  const docRef = collectionRef.doc();

  // Validate and apply defaults using Zod
  const validatedData = cardSchema.partial().parse(cardData);

  // Calculate inherited tags and paths
  const selectedTags = validatedData.tags || [];
  const ancestorTags = await getTagAncestors(selectedTags);
  const inheritedTags = [...new Set([...selectedTags, ...ancestorTags])];
  const tagPathsMap = await getTagPathsMap(selectedTags);
  const filterTags = inheritedTags.reduce((acc, tagId) => {
    acc[tagId] = true;
    return acc;
  }, {} as Record<string, boolean>);

  const newCard: Card = {
    ...validatedData,
    id: docRef.id,
    tags: selectedTags, // ensure tags is not undefined
    contentMedia: validatedData.contentMedia || [], // ensure arrays are not undefined
    galleryMedia: validatedData.galleryMedia || [], // ensure arrays are not undefined
    inheritedTags,
    tagPathsMap,
    filterTags,
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
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }
  const existingData = docSnap.data() as Card;

  // --- Start Firestore Batch Write ---
  const batch = firestore.batch();

  // Dehydrate gallery media for saving, and update captions on root media objects.
  const dehydratedGalleryMedia = cardData.galleryMedia?.map(item => {
    if (item.media && item.caption !== item.media.caption) {
      const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(item.mediaId);
      batch.update(mediaRef, { caption: item.caption });
    }
    const { media, ...rest } = item;
    return rest;
  }) || [];
  
  // The 'content' field from the client is the source of truth for content media.
  const contentMediaIds = cardData.content ? extractMediaFromContent(cardData.content) : [];
  
  const updatePayload: Partial<Card> = {
    ...cardData,
    coverImageId: cardData.coverImageId || null,
    galleryMedia: dehydratedGalleryMedia,
    contentMedia: contentMediaIds,
    updatedAt: Date.now(),
  };

  // Remove transient fields that shouldn't be saved.
  delete updatePayload.coverImage;

  // The client now sends the complete, hydrated card object.
  // We just need to persist it and update media statuses.
  // Validate the incoming partial data against the card schema.
  const validatedUpdate = cardSchema.partial().parse(updatePayload);

  // Always recalculate tag hierarchy if tags have been modified.
  if (validatedUpdate.tags) {
    const finalTags = validatedUpdate.tags ?? existingData.tags;
    const ancestorTags = await getTagAncestors(finalTags);
    validatedUpdate.inheritedTags = [...new Set([...finalTags, ...ancestorTags])];
    validatedUpdate.tagPathsMap = await getTagPathsMap(finalTags);
    validatedUpdate.filterTags = validatedUpdate.inheritedTags.reduce((acc, tagId) => {
      acc[tagId] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }

  // 1. Update the card document with the new data.
  batch.update(docRef, validatedUpdate);

  // 2. Collect all media IDs that should be marked as 'active'.
  const mediaIdsToActivate = new Set<string>();
  if (validatedUpdate.coverImageId) {
    mediaIdsToActivate.add(validatedUpdate.coverImageId);
  }
  if (validatedUpdate.galleryMedia) {
    validatedUpdate.galleryMedia.forEach(item => item.mediaId && mediaIdsToActivate.add(item.mediaId));
  }
  if (validatedUpdate.contentMedia) {
    validatedUpdate.contentMedia.forEach(id => mediaIdsToActivate.add(id));
  }

  // 3. Update the status of all associated media to 'active'.
  for (const mediaId of Array.from(mediaIdsToActivate)) {
    const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
    batch.update(mediaRef, { status: 'active', updatedAt: Date.now() });
  }

  // Commit all database operations atomically.
  await batch.commit();

  // Return the full, hydrated card by calling the trusted getCardById function.
  const updatedCard = await getCardById(cardId);
  if (!updatedCard) {
    throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  }
  return updatedCard;
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

  const cardData = docSnap.data() as Card;

  // --- Start Hydration ---
  // Collect all unique media IDs from all fields.
  const mediaIds = new Set<string>();
  if (cardData.coverImageId) {
    mediaIds.add(cardData.coverImageId);
  }
  if (cardData.galleryMedia) {
    cardData.galleryMedia.forEach(item => item.mediaId && mediaIds.add(item.mediaId));
  }
  if (cardData.contentMedia) {
    cardData.contentMedia.forEach(id => mediaIds.add(id));
  }

  // Fetch all media objects in a single batch query.
  const mediaMap = new Map<string, Media>();
  if (mediaIds.size > 0) {
    const mediaDocs = await firestore.collection(MEDIA_COLLECTION).where('id', 'in', Array.from(mediaIds)).get();
    mediaDocs.forEach(doc => mediaMap.set(doc.id, doc.data() as Media));
  }

  // Inject the full media objects back into the card.
  if (cardData.coverImageId) {
    cardData.coverImage = mediaMap.get(cardData.coverImageId) || null;
  }

  if (cardData.galleryMedia) {
    cardData.galleryMedia = cardData.galleryMedia.map(item => ({
      ...item,
      media: mediaMap.get(item.mediaId),
    }));
  }

  if (cardData.contentMedia) {
    // The client doesn't need a hydrated contentMedia array, as the content
    // itself contains the necessary markup. We just ensure the array exists.
    cardData.contentMedia = cardData.contentMedia || [];
  }
  // --- End Hydration ---

  return cardData;
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
  const filterTags = newInheritedTags.reduce((acc, tagId) => {
    acc[tagId] = true;
    return acc;
  }, {} as Record<string, boolean>);

  cardIds.forEach(id => {
    const cardRef = doc(db, 'cards', id);
    batch.update(cardRef, { 
      tags,
      inheritedTags: newInheritedTags,
      filterTags,
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
 * Deletes a card and all its associated media assets (cover image, gallery images).
 * This function enforces the "no orphans" rule for media and updates parent cards.
 * @param cardId The ID of the card to delete.
 */
export async function deleteCard(cardId: string): Promise<void> {
  const card = await getCardById(cardId);
  if (!card) {
    console.warn(`[deleteCard] Card with ID ${cardId} not found. Skipping deletion.`);
    return;
  }

  const mediaIdsToDelete: string[] = [];

  // 1. Collect cover image ID
  if (card.coverImageId) {
    mediaIdsToDelete.push(card.coverImageId);
  }

  // 2. Collect gallery image IDs
  if (card.galleryMedia && card.galleryMedia.length > 0) {
    card.galleryMedia.forEach(item => {
      if (item.mediaId) {
        mediaIdsToDelete.push(item.mediaId);
      }
    });
  }

  // 3. Collect content media IDs
  if (card.contentMedia && card.contentMedia.length > 0) {
    card.contentMedia.forEach(item => {
      if (item.id) {
        mediaIdsToDelete.push(item.id);
      }
    });
  }

  // 4. Find all parent cards that have this card as a child
  const parentCardsQuery = await firestore.collection(CARDS_COLLECTION)
    .where('childrenIds', 'array-contains', cardId)
    .get();

  // 5. Start a batch write
  const batch = firestore.batch();

  // 6. Update all parent cards to remove this card from their childrenIds
  parentCardsQuery.docs.forEach(doc => {
    const parentCard = doc.data() as Card;
    const updatedChildrenIds = parentCard.childrenIds?.filter(id => id !== cardId) || [];
    batch.update(doc.ref, { childrenIds: updatedChildrenIds });
  });

  // 7. Delete the card document
  const cardRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  batch.delete(cardRef);

  // 8. Commit the batch (card deletion and parent updates)
  await batch.commit();

  // 9. Delete all associated media assets in parallel
  if (mediaIdsToDelete.length > 0) {
    console.log(`[deleteCard] Deleting ${mediaIdsToDelete.length} associated media assets for card ${cardId}...`);
    const deletionPromises = mediaIdsToDelete.map(mediaId => 
      deleteMediaAsset(mediaId).catch(err => {
        // Log error for a specific asset but don't let it stop the process
        console.error(`[deleteCard] Failed to delete media asset ${mediaId} for card ${cardId}:`, err);
      })
    );
    await Promise.all(deletionPromises);
    console.log(`[deleteCard] Finished deleting media assets for card ${cardId}.`);
  }

  console.log(`[deleteCard] Successfully deleted card document ${cardId} and updated all parent references.`);
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

  let query = firestore.collection(CARDS_COLLECTION) as FirebaseFirestore.Query<Card>;

  // Combined text search and tag filtering
  if (q) {
    const searchTerm = q.trim();
    if (searchTerm) {
      query = query.where('title', '>=', searchTerm)
                   .where('title', '<=', searchTerm + '\uf8ff')
                   .orderBy('title');
    }
  }

  // --- Filter by tags ---
  if (tags && tags.length > 0) {
    query = query.where('inheritedTags', 'array-contains-any', tags);
  }

  // Filter by status
  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }

  // Filter by type
  if (type && type !== 'all') {
    query = query.where('type', '==', type);
  }

  // Filter by dimensional tags
  if (dimensionalTags && dimensionalTags.length > 0) {
    query = query.where('tagPathsMap', '!=', null);
  }

  // Filter by childrenIds_contains
  if (childrenIds_contains) {
    query = query.where('childrenIds', 'array-contains', childrenIds_contains);
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

  // Fetch all media objects in parallel for better performance
  const mediaPromises = querySnapshot.docs.map(async doc => {
    const data = doc.data();
    data.id = doc.id;

    // If there's a coverImageId, fetch the media object
    if (data.coverImageId) {
      const mediaDoc = await firestore.collection('media').doc(data.coverImageId).get();
      if (mediaDoc.exists) {
        data.coverImage = mediaDoc.data();
      }
    }

    return data;
  });

  const cardsWithMedia = await Promise.all(mediaPromises);

  const items = cardsWithMedia
    .map(data => {
      const validation = cardSchema.safeParse(data);
      if (validation.success) {
        return validation.data as Card;
      } else {
        console.warn(`[Data Integrity] Invalid card data found for doc id: ${data.id}. Issues:`, validation.error.issues);
        return null;
      }
    })
    .filter((item): item is Card => item !== null);
  
  const hasMore = querySnapshot.docs.length === limit;
  const newLastDocId = items.length > 0 ? items[items.length - 1].id : undefined;

  return { items, lastDocId: newLastDocId, hasMore };
}

/**
 * Retrieves the full set of inherited tags for a given list of direct tags.
 * @param tags - The list of direct tags.
 * @returns The full set of inherited tags for the given list.
 */
export async function getInheritedTags(tags: string[]): Promise<string[]> {
  const ancestorTags = await getTagAncestors(tags);
  return [...new Set([...tags, ...ancestorTags])];
} 
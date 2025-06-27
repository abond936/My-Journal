import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { getTagAncestors, getTagPathsMap } from '@/lib/firebase/tagDataAccess';
import { getFirestore, writeBatch } from 'firebase-admin/firestore';
import { doc } from 'firebase-admin/firestore';
import { deleteMediaAsset } from './images/imageImportService';

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

  // Defensively sanitize incoming array fields to prevent accidental deletion in Firestore.
  // If a client sends 'tags: undefined', Firestore deletes the field. This ensures it becomes 'tags: []'.
  const sanitizedCardData = { ...cardData };
  const arrayFields: (keyof Card)[] = ['tags', 'galleryMedia', 'childrenIds', 'who', 'what', 'when', 'where', 'reflection'];
  arrayFields.forEach(field => {
    if (sanitizedCardData[field] === null || sanitizedCardData[field] === undefined) {
      delete sanitizedCardData[field]; // Remove explicit null/undefined to avoid conflicts
    }
  });

  // Validate the incoming partial data
  const validatedUpdate = cardSchema.partial().parse(sanitizedCardData);

  const updateData: Partial<Card> = {
    ...validatedUpdate,
    updatedAt: Date.now(),
  };

  // Determine the final set of tags for recalculation
  const finalTags = validatedUpdate.tags ?? existingData.tags;

  // Always recalculate hierarchy if tags exist
  if (finalTags) {
    const ancestorTags = await getTagAncestors(finalTags);
    updateData.inheritedTags = [...new Set([...finalTags, ...ancestorTags])];
    updateData.tagPathsMap = await getTagPathsMap(finalTags);
    updateData.filterTags = updateData.inheritedTags.reduce((acc, tagId) => {
      acc[tagId] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }

  // Update media status to active
  const batch = firestore.batch();
  batch.update(docRef, updateData);

  // Update cover image status if it exists
  if (validatedUpdate.coverImageId) {
    const mediaRef = firestore.collection('media').doc(validatedUpdate.coverImageId);
    const mediaUpdate: any = { 
      status: 'active',
      updatedAt: Date.now()
    };
    
    // If we have the full media object with objectPosition, update it
    if (validatedUpdate.coverImage?.objectPosition) {
      mediaUpdate.objectPosition = validatedUpdate.coverImage.objectPosition;
    }
    
    batch.update(mediaRef, mediaUpdate);
  }

  // Update gallery media status if it exists
  if (validatedUpdate.galleryMedia?.length) {
    const updatedGalleryMedia = [];
    for (const item of validatedUpdate.galleryMedia) {
      if (item.mediaId) {
        const mediaRef = firestore.collection('media').doc(item.mediaId);
        const mediaSnap = await mediaRef.get();
        const mediaData = mediaSnap.data();
        
        if (mediaData) {
          const mediaUpdate: any = { 
            status: 'active',
            updatedAt: Date.now(),
            objectPosition: item.objectPosition || mediaData.objectPosition || 'center'
          };
          
          batch.update(mediaRef, mediaUpdate);

          // Add the full media object to the gallery item
          updatedGalleryMedia.push({
            mediaId: item.mediaId,
            caption: item.caption || '',
            order: item.order,
            objectPosition: item.objectPosition || mediaData.objectPosition || 'center',
            media: {
              id: item.mediaId,
              filename: mediaData.filename || '',
              width: mediaData.width || 0,
              height: mediaData.height || 0,
              storageUrl: mediaData.storageUrl || '',
              storagePath: mediaData.storagePath || '',
              source: mediaData.source || 'upload',
              sourcePath: mediaData.sourcePath || '',
              caption: mediaData.caption || '',
              status: 'active',
              objectPosition: item.objectPosition || mediaData.objectPosition || 'center',
              createdAt: mediaData.createdAt || Date.now(),
              updatedAt: Date.now(),
              url: mediaData.storageUrl || mediaData.url || ''
            }
          });
        }
      }
    }
    // Update the gallery media with full media objects
    updateData.galleryMedia = updatedGalleryMedia;
  }

  // Update content media status if it exists
  if (validatedUpdate.contentMedia?.length) {
    const updatedContentMedia = [];
    for (const item of validatedUpdate.contentMedia) {
      if (item.id) {
        const mediaRef = firestore.collection('media').doc(item.id);
        const mediaSnap = await mediaRef.get();
        const mediaData = mediaSnap.data();
        
        if (mediaData) {
          const mediaUpdate: any = { 
            status: 'active',
            updatedAt: Date.now()
          };
          
          batch.update(mediaRef, mediaUpdate);

          // Add the full media object to the content media item
          updatedContentMedia.push({
            id: item.id,
            status: 'active',
            updatedAt: Date.now(),
            media: {
              id: item.id,
              filename: mediaData.filename || '',
              width: mediaData.width || 0,
              height: mediaData.height || 0,
              storageUrl: mediaData.storageUrl || '',
              storagePath: mediaData.storagePath || '',
              source: mediaData.source || 'upload',
              sourcePath: mediaData.sourcePath || '',
              caption: mediaData.caption || '',
              status: 'active',
              objectPosition: mediaData.objectPosition || 'center',
              createdAt: mediaData.createdAt || Date.now(),
              updatedAt: mediaData.updatedAt || Date.now(),
              url: mediaData.storageUrl || mediaData.url || ''
            }
          });
        }
      }
    }
    // Update the content media with full media objects
    updateData.contentMedia = updatedContentMedia;
  }

  await batch.commit();

  // Use getCardById to get the full card with media objects
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

  // Load cover image if it exists
  if (cardData.coverImageId) {
    const mediaRef = firestore.collection('media').doc(cardData.coverImageId);
    const mediaSnap = await mediaRef.get();
    const mediaData = mediaSnap.data();
    if (mediaData) {
      cardData.coverImage = {
        ...mediaData,
        url: mediaData.storageUrl || mediaData.url
      };
    }
  }

  // Load gallery media if it exists
  if (cardData.galleryMedia?.length) {
    const updatedGalleryMedia = [];
    for (const item of cardData.galleryMedia) {
      if (item.mediaId) {
        const mediaRef = firestore.collection('media').doc(item.mediaId);
        const mediaSnap = await mediaRef.get();
        const mediaData = mediaSnap.data();
        if (mediaData) {
          updatedGalleryMedia.push({
            ...item,
            media: {
              ...mediaData,
              url: mediaData.storageUrl || mediaData.url
            }
          });
        }
      }
    }
    cardData.galleryMedia = updatedGalleryMedia;
  }

  // Load content media if it exists
  if (cardData.contentMedia?.length) {
    const updatedContentMedia = [];
    for (const item of cardData.contentMedia) {
      if (item.id) {
        const mediaRef = firestore.collection('media').doc(item.id);
        const mediaSnap = await mediaRef.get();
        const mediaData = mediaSnap.data();
        if (mediaData) {
          updatedContentMedia.push({
            ...item,
            media: {
              ...mediaData,
              url: mediaData.storageUrl || mediaData.url
            }
          });
        }
      }
    }
    cardData.contentMedia = updatedContentMedia;
  }

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
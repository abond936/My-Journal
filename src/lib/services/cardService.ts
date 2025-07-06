import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema, GalleryMediaItem } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { updateTagCounts, calculateDerivedTagData } from '@/lib/firebase/tagService';
import { getFirestore, FieldPath, FieldValue } from 'firebase-admin/firestore';
import { deleteMediaAsset } from './images/imageImportService';
import { extractMediaFromContent, stripContentImageSrc, hydrateContentImageSrc } from '@/lib/utils/cardUtils';
import { Media } from '@/lib/types/photo';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

/**
 * Hydrates an array of cards with their full Media objects.
 * @param cards - An array of Card objects to hydrate.
 * @returns A promise that resolves to the array of hydrated cards.
 */
async function _hydrateCards(cards: Card[]): Promise<Card[]> {
  if (!cards || cards.length === 0) {
    return [];
  }

  // 1. Collect all unique media IDs from all cards.
  const mediaIds = new Set<string>();
  for (const card of cards) {
    if (card.coverImageId) mediaIds.add(card.coverImageId);
    if (card.galleryMedia) card.galleryMedia.forEach(item => item.mediaId && mediaIds.add(item.mediaId));
    if (card.contentMedia) card.contentMedia.forEach(id => mediaIds.add(id));
  }

  if (mediaIds.size === 0) {
    return cards; // No media to hydrate
  }

  // 2. Fetch all media objects in a single batch query.
  const mediaMap = new Map<string, Media>();
  // Firestore 'in' queries are limited to 30 items. We must batch the requests.
  const mediaIdChunks: string[][] = [];
  const allMediaIds = Array.from(mediaIds);
  for (let i = 0; i < allMediaIds.length; i += 30) {
    mediaIdChunks.push(allMediaIds.slice(i, i + 30));
  }

  for (const chunk of mediaIdChunks) {
    if (chunk.length > 0) {
      const mediaDocs = await firestore.collection(MEDIA_COLLECTION).where('id', 'in', chunk).get();
      mediaDocs.forEach(doc => mediaMap.set(doc.id, doc.data() as Media));
    }
  }
  
  // 3. Inject the full media objects back into each card.
  return cards.map(card => {
    const hydratedCard = { ...card };
    if (hydratedCard.coverImageId) {
      hydratedCard.coverImage = mediaMap.get(hydratedCard.coverImageId) || null;
    }
    if (hydratedCard.galleryMedia) {
      hydratedCard.galleryMedia = hydratedCard.galleryMedia.map(item => ({
        ...item,
        media: mediaMap.get(item.mediaId),
      }));
    }
    // Hydrate content for rendering (server-side only)
    if (hydratedCard.content) {
      hydratedCard.content = hydrateContentImageSrc(hydratedCard.content, mediaMap);
    }
    return hydratedCard;
  });
}

/**
 * Creates a new card in Firestore.
 * @param cardData The data for the new card, excluding 'id'.
 * @returns The newly created card with its ID.
 */
export async function createCard(cardData: Partial<Omit<Card, 'docId' | 'createdAt' | 'updatedAt' | 'filterTags'>>): Promise<Card> {
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  const docRef = collectionRef.doc();

  // Validate and apply defaults using Zod
  const validatedData = cardSchema.partial().parse(cardData);

  // Calculate all derived tag data using centralized function
  const selectedTags = validatedData.tags || [];
  const { filterTags, dimensionalTags } = await calculateDerivedTagData(selectedTags);

  // --- Content sanitation ---
  const rawContent = validatedData.content ?? '';
  const cleanedContent = stripContentImageSrc(rawContent);
  const contentMediaIds = extractMediaFromContent(cleanedContent);

  const newCard: Card = {
    ...validatedData,
    docId: docRef.id,
    title_lowercase: validatedData.title?.toLowerCase() || '',
    content: cleanedContent,
    tags: selectedTags, // ensure tags is not undefined
    contentMedia: contentMediaIds, // always an array even if empty
    galleryMedia: validatedData.galleryMedia || [], // ensure arrays are not undefined
    filterTags,
    // Populate dimensional arrays
    who: dimensionalTags.who || [],
    what: dimensionalTags.what || [],
    when: dimensionalTags.when || [],
    where: dimensionalTags.where || [],
    reflection: dimensionalTags.reflection || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  // Use a transaction to ensure atomicity
  await firestore.runTransaction(async (transaction) => {
      // 1. Create the new card document
      transaction.set(docRef, newCard);

      // 2. Increment counts for all associated tags if the card is published
      if (newCard.status === 'published' && newCard.tags && newCard.tags.length > 0) {
          await updateTagCounts(newCard.tags, 'increment', transaction);
      }
  });
  
  // The created card object needs to be constructed outside the transaction to be returned
  const finalCard = await getCardById(docRef.id);
  if (!finalCard) throw new Error("Failed to create or retrieve card.");

  return finalCard;
}

/**
 * Updates an existing card in Firestore.
 * @param cardId The ID of the card to update.
 * @param cardData The partial data to update the card with.
 * @returns The updated card.
 */
export async function updateCard(cardId: string, cardData: Partial<Omit<Card, 'docId'>>): Promise<Card> {
    
    const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
    
    return firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        throw new Error(`Card with ID ${cardId} not found.`);
      }
      const existingData = docSnap.data() as Card;
      

  
      // --- Start Firestore Batch Write ---
  
      // Capture gallery caption changes to update later (writes must come after all reads)
      const captionUpdates: { mediaId: string; caption: string }[] = [];
      const dehydratedGalleryMedia = cardData.galleryMedia?.map(item => {
        if (item.media && item.caption !== item.media.caption) {
          captionUpdates.push({ mediaId: item.mediaId, caption: item.caption });
        }
        const { media, ...rest } = item;
        return rest;
      }) || [];
      
      // Sanitize content HTML and derive content media IDs.
      const sanitizedContent = cardData.content ? stripContentImageSrc(cardData.content) : cardData.content;
      
      const contentMediaIds = sanitizedContent ? extractMediaFromContent(sanitizedContent) : [];
      
      const updatePayload: Partial<Card> = {
        ...cardData,
        content: sanitizedContent,
        coverImageId: cardData.coverImageId || null,
        galleryMedia: dehydratedGalleryMedia,
        contentMedia: contentMediaIds,
        updatedAt: Date.now(),
      };
  
      // Remove transient fields that shouldn't be saved.
      delete updatePayload.coverImage;
  
      // Validate the incoming partial data against the card schema.
      const validatedUpdate = cardSchema.partial().parse(updatePayload);
      

  
      // Helper to recursively strip undefined values (Firestore disallows them)
      const removeUndefinedDeep = (val: any): any => {
        if (Array.isArray(val)) {
          return val.map(removeUndefinedDeep);
        }
        if (val && typeof val === 'object') {
          return Object.fromEntries(
            Object.entries(val)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, removeUndefinedDeep(v)])
          );
        }
        return val;
      };
  
      const cleanedUpdate = removeUndefinedDeep(validatedUpdate);
      

  
      // If no fields remain after cleaning, nothing to update – return current data
      if (Object.keys(cleanedUpdate).length === 0) {
        return existingData;
      }
  
      // Determine tag changes and prepare derived tag data BEFORE any writes
      const oldTags = new Set(existingData.tags || []);
      const newTags = new Set(cardData.tags || []);
      const tagsAdded = [...newTags].filter(t => !oldTags.has(t));
      const tagsRemoved = [...oldTags].filter(t => !newTags.has(t));
      


      const wasPublished = existingData.status === 'published';
      const isPublished = cardData.status === 'published';

      // Prepare derived tag data (reads) BEFORE any writes to comply with Firestore transaction rules
      const finalTags = ('tags' in cleanedUpdate) ? (cleanedUpdate.tags ?? existingData.tags) : existingData.tags;
      
      const { filterTags, dimensionalTags } = await calculateDerivedTagData(finalTags || []);

      // --- Consolidated tag count adjustments (single read phase, then writes) ---
      const deltaMap: Record<string, number> = {};
      const applyDelta = (ids: string[], delta: number) => {
        ids.forEach(id => {
          deltaMap[id] = (deltaMap[id] || 0) + delta;
        });
      };

      if (wasPublished && isPublished) {
        applyDelta(tagsAdded, +1);
        applyDelta(tagsRemoved, -1);
      } else if (!wasPublished && isPublished) {
        applyDelta(Array.from(newTags), +1);
      } else if (wasPublished && !isPublished) {
        applyDelta(Array.from(oldTags), -1);
      }

      const candidateIds = Object.keys(deltaMap);
      if (candidateIds.length > 0) {
        // Read all affected tags once
        const tagRefs = candidateIds.map(id => firestore.collection('tags').doc(id));
        const tagDocs = await transaction.getAll(...tagRefs);

        // Include ancestors in deltaMap
        for (const docSnap of tagDocs) {
          if (!docSnap.exists) continue;
          const tagData = docSnap.data() as Tag;
          const tagId = docSnap.id;
          const delta = deltaMap[tagId] || 0;
          if (delta === 0) continue;

          if (Array.isArray(tagData.path)) {
            tagData.path.forEach(ancestorId => {
              deltaMap[ancestorId] = (deltaMap[ancestorId] || 0) + delta;
            });
          }
        }

        // Apply all increments/decrements after reads
        for (const [tid, delta] of Object.entries(deltaMap)) {
          if (delta !== 0) {
            const ref = firestore.collection('tags').doc(tid);
            transaction.update(ref, { cardCount: FieldValue.increment(delta) });
          }
        }
      }

      cleanedUpdate.filterTags = filterTags;
      cleanedUpdate.who = dimensionalTags.who || [];
      cleanedUpdate.what = dimensionalTags.what || [];
      cleanedUpdate.when = dimensionalTags.when || [];
      cleanedUpdate.where = dimensionalTags.where || [];
      cleanedUpdate.reflection = dimensionalTags.reflection || [];
  
      // 1. Update tag counts before any writes (requires reads first)
      //   (already executed above)

      // 2. Apply gallery caption updates captured earlier
      for (const { mediaId, caption } of captionUpdates) {
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, { caption });
      }

      // 3. Update the card document with the new data.
      transaction.update(docRef, cleanedUpdate);
  
      // 4. Tag counts were already adjusted earlier.

      // 5. Collect all media IDs that should be marked as 'active'.
      const mediaIdsToActivate = new Set<string>();
      if (cleanedUpdate.coverImageId) {
        mediaIdsToActivate.add(cleanedUpdate.coverImageId);
      }
      if (cleanedUpdate.galleryMedia) {
        cleanedUpdate.galleryMedia.forEach(item => item.mediaId && mediaIdsToActivate.add(item.mediaId));
      }
      if (cleanedUpdate.contentMedia) {
        cleanedUpdate.contentMedia.forEach(id => mediaIdsToActivate.add(id));
      }
  
      // 6. If a new coverImageObjectPosition was provided, update it on the media doc.
      const coverImagePosition = cleanedUpdate.coverImageObjectPosition;
      const coverImageId = cleanedUpdate.coverImageId ?? existingData.coverImageId;
      if (coverImageId && coverImagePosition) {
        const coverRef = firestore.collection(MEDIA_COLLECTION).doc(coverImageId);
        transaction.update(coverRef, { objectPosition: coverImagePosition, updatedAt: Date.now() });
      }
  
      // 7. Update the status of all associated media to 'active'.
      for (const mediaId of Array.from(mediaIdsToActivate)) {
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, { status: 'active', updatedAt: Date.now() });
      }
  
      // Return the full, hydrated card by calling the trusted getCardById function.
      // Note: getCardById is called outside the transaction to get the final hydrated state.
      const updatedCard = await getCardById(cardId);
      if (!updatedCard) {
        throw new Error(`Failed to fetch updated card with ID ${cardId}`);
      }
      return updatedCard;
    });
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

  const cardData = { ...docSnap.data(), docId: docSnap.id } as Card;
  // Refactor to use the helper function
  const hydratedCards = await _hydrateCards([cardData]);
  return hydratedCards[0] || null;
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

  // Firestore 'in' queries are limited to 30 items. We must batch the requests.
  const idChunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) {
    idChunks.push(ids.slice(i, i + 30));
  }

  const cards: Card[] = [];
  const collectionRef = firestore.collection(CARDS_COLLECTION);

  for (const chunk of idChunks) {
    if (chunk.length > 0) {
      const query = collectionRef.where(FieldPath.documentId(), 'in', chunk);
      const snapshot = await query.get();
      snapshot.forEach(doc => {
        const data = doc.data() as Card;
        cards.push({ ...data, docId: doc.id });
      });
    }
  }

  // Preserve the original order of IDs
  const cardMap = new Map(cards.map(c => [c.docId, c]));
  const orderedCards = ids.map(id => cardMap.get(id)).filter((c): c is Card => !!c);

  return await _hydrateCards(orderedCards);
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
  const newLastDocId = items.length > 0 ? items[items.length - 1].docId : undefined;
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
  if (!cardIds || cardIds.length === 0) {
    return;
  }

  // Calculate all derived tag data using centralized function
  const { filterTags, dimensionalTags } = await calculateDerivedTagData(tags);

  // Use a transaction to ensure atomicity of tag count updates and card updates
  await firestore.runTransaction(async (transaction) => {
    // 1. Read all affected cards to get their current tags
    const cardRefs = cardIds.map(id => firestore.collection(CARDS_COLLECTION).doc(id));
    const cardDocs = await transaction.getAll(...cardRefs);
    
    // 2. Calculate tag count deltas for all affected cards
    const deltaMap: Record<string, number> = {};
    
    for (const cardDoc of cardDocs) {
      if (!cardDoc.exists) continue;
      
      const cardData = cardDoc.data() as Card;
      const oldTags = new Set(cardData.tags || []);
      const newTags = new Set(tags);
      
      // Only process published cards for tag counting
      if (cardData.status === 'published') {
        // Calculate tags to remove
        const tagsRemoved = [...oldTags].filter(t => !newTags.has(t));
        // Calculate tags to add
        const tagsAdded = [...newTags].filter(t => !oldTags.has(t));
        
        // Apply deltas
        tagsRemoved.forEach(tagId => {
          deltaMap[tagId] = (deltaMap[tagId] || 0) - 1;
        });
        tagsAdded.forEach(tagId => {
          deltaMap[tagId] = (deltaMap[tagId] || 0) + 1;
        });
      }
    }
    
    // 3. Update tag counts for all affected tags and their ancestors
    const candidateIds = Object.keys(deltaMap);
    if (candidateIds.length > 0) {
      // Read all affected tags to get their paths
      const tagRefs = candidateIds.map(id => firestore.collection('tags').doc(id));
      const tagDocs = await transaction.getAll(...tagRefs);
      
      // Include ancestors in deltaMap
      for (const docSnap of tagDocs) {
        if (!docSnap.exists) continue;
        const tagData = docSnap.data() as Tag;
        const tagId = docSnap.id;
        const delta = deltaMap[tagId] || 0;
        if (delta === 0) continue;
        
        if (Array.isArray(tagData.path)) {
          tagData.path.forEach(ancestorId => {
            deltaMap[ancestorId] = (deltaMap[ancestorId] || 0) + delta;
          });
        }
      }
      
      // Apply all increments/decrements
      for (const [tagId, delta] of Object.entries(deltaMap)) {
        if (delta !== 0) {
          const ref = firestore.collection('tags').doc(tagId);
          transaction.update(ref, { cardCount: FieldValue.increment(delta) });
        }
      }
    }
    
    // 4. Update all cards with new tag data
    for (const cardId of cardIds) {
      const cardRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
      transaction.update(cardRef, { 
        tags,
        filterTags,
        // Populate dimensional arrays
        who: dimensionalTags.who || [],
        what: dimensionalTags.what || [],
        when: dimensionalTags.when || [],
        where: dimensionalTags.where || [],
        reflection: dimensionalTags.reflection || [],
        updatedAt: Date.now(),
      });
    }
  });
}

/**
 * Deletes all documents from the 'cards' collection.
 * This is a utility function for seeding and should be used with caution.
 */
export async function deleteAllCards(): Promise<void> {
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    return;
  }
  
  const batch = firestore.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}

/**
 * Deletes a card and all its associated media assets (cover image, gallery images).
 * This function enforces the "no orphans" rule for media and updates parent cards.
 * @param cardId The ID of the card to delete.
 */
export async function deleteCard(cardId: string): Promise<void> {
    const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);

    return firestore.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists) {
            console.warn(`Card with ID ${cardId} not found for deletion.`);
            return;
        }
        const cardToDelete = docSnap.data() as Card;

        // --- Delete Associated Media Assets ---
        const mediaToDelete = new Set<string>();
        if (cardToDelete.coverImageId) {
            mediaToDelete.add(cardToDelete.coverImageId);
        }
        if (cardToDelete.galleryMedia) {
            cardToDelete.galleryMedia.forEach(item => mediaToDelete.add(item.mediaId));
        }
        if (cardToDelete.contentMedia) {
            cardToDelete.contentMedia.forEach(id => mediaToDelete.add(id));
        }

        for (const mediaId of Array.from(mediaToDelete)) {
            await deleteMediaAsset(mediaId, transaction);
        }

        // Decrement counts for all associated tags if the card was published
        if (cardToDelete.status === 'published' && cardToDelete.tags && cardToDelete.tags.length > 0) {
            await updateTagCounts(cardToDelete.tags, 'decrement', transaction);
        }

        // --- Clean up parent-child relationships ---
        // Find all cards that have this card in their childrenIds and remove it
        const parentCardsQuery = firestore.collection(CARDS_COLLECTION)
            .where('childrenIds', 'array-contains', cardId);
        const parentCardsSnapshot = await transaction.get(parentCardsQuery);
        
        for (const parentDoc of parentCardsSnapshot.docs) {
            const parentData = parentDoc.data() as Card;
            const updatedChildrenIds = (parentData.childrenIds || []).filter(id => id !== cardId);
            transaction.update(parentDoc.ref, { 
                childrenIds: updatedChildrenIds,
                updatedAt: Date.now()
            });
        }

        // Delete the card document
        transaction.delete(docRef);
    });
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
    // Use filterTags for efficient tag-based queries
    // filterTags contains both direct tags and inherited tags
    tags.forEach(tag => {
      query = query.where(`filterTags.${tag.trim()}`, '==', true);
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
  
  const items = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() } as Card));
  
  const hasMore = items.length === limit;
  const newLastDocId = items.length > 0 ? items[items.length - 1].docId : undefined;

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
  dimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
    reflection?: string[];
  };
  childrenIds_contains?: string;
  limit?: number;
  lastDocId?: string;
} = {}): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const { 
    q,
    status = 'published',
    type = 'all',
    tags,
    dimensionalTags,
    childrenIds_contains,
    limit = 10,
    lastDocId,
  } = options;

  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);

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
    // Use filterTags for efficient tag-based queries
    // Note: Firestore doesn't support 'array-contains-any' on map fields
    // We'll use individual field queries for each tag
    tags.forEach(tag => {
      query = query.where(`filterTags.${tag}`, '==', true);
    });
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
  if (dimensionalTags) {
    const { who, what, when, where, reflection } = dimensionalTags;
    
    // Apply dimensional filtering with intra-dimension OR logic and inter-dimension AND logic
    if (who && who.length > 0) {
      query = query.where('who', 'array-contains-any', who);
    }
    if (what && what.length > 0) {
      query = query.where('what', 'array-contains-any', what);
    }
    if (when && when.length > 0) {
      query = query.where('when', 'array-contains-any', when);
    }
    if (where && where.length > 0) {
      query = query.where('where', 'array-contains-any', where);
    }
    if (reflection && reflection.length > 0) {
      query = query.where('reflection', 'array-contains-any', reflection);
    }
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

  let cards: Card[] = querySnapshot.docs.map(doc => ({
    docId: doc.id,
    ...doc.data(),
  } as Card));
  
  // --- ADD THE HYDRATION STEP HERE ---
  cards = await _hydrateCards(cards);

  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  const lastDocIdResult = lastVisible ? lastVisible.id : undefined;
  const hasMore = querySnapshot.size === limit;

  return { items: cards, lastDocId: lastDocIdResult, hasMore };
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
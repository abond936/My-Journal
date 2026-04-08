import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema, GalleryMediaItem } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import {
  updateTagCountsForCard,
  mergeDerivedTagsForCardRecord,
} from '@/lib/firebase/tagService';
import { getFirestore, FieldPath, FieldValue, Transaction } from 'firebase-admin/firestore';
import {
  deleteMediaAsset,
  deleteFromStorageWithRetry,
  markStorageForLaterDeletion,
} from './images/imageImportService';
import { extractMediaFromContent, stripContentImageSrc, hydrateContentImageSrc, removeMediaFromContent } from '@/lib/utils/cardUtils';
import { getPublicStorageUrl } from '@/lib/utils/storageUrl';
import { Media } from '@/lib/types/photo';
import { unlinkCardFromAllQuestions } from '@/lib/services/questionService';
import { syncCardToTypesense, removeCardFromTypesense } from '@/lib/services/typesenseService';

/**
 * Retry utility with exponential backoff for critical operations.
 * @param operation - The operation to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay in milliseconds (will be multiplied by 2^attempt)
 * @returns Promise that resolves with the operation result
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain error types
      if (error instanceof Error) {
        // Don't retry validation errors or permission errors
        if (error.message.includes('permission') || 
            error.message.includes('validation') ||
            error.message.includes('not found')) {
          throw error;
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(`Operation failed after ${maxRetries + 1} attempts:`, lastError);
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, lastError.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

const adminApp = getAdminApp();
const firestore = adminApp.firestore();
const bucket = adminApp.storage().bucket();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';


/**
 * Derives focal point (pixel coords) from media.objectPosition.
 * Handles "50% 50%" (percentage) and legacy "400 300" (pixel) formats.
 */
function deriveFocalPointFromObjectPosition(
  objectPosition: string,
  width: number,
  height: number
): { x: number; y: number } {
  const parts = objectPosition.trim().split(/\s+/);
  const a = parseInt(parts[0] ?? '50', 10);
  const b = parseInt(parts[1] ?? '50', 10);
  if (isNaN(a) || isNaN(b)) {
    return { x: width / 2, y: height / 2 };
  }
  // If string contains '%' or both values are 0-100, treat as percentage
  const isPercent = objectPosition.includes('%') || (a <= 100 && b <= 100);
  if (isPercent) {
    return {
      x: (a / 100) * width,
      y: (b / 100) * height,
    };
  }
  return {
    x: Math.max(0, Math.min(width, a)),
    y: Math.max(0, Math.min(height, b)),
  };
}

/**
 * Sets each media's storageUrl to the permanent public URL (derived from storagePath).
 * Requires Firebase Storage rules to allow public read for the images path.
 */
function _applyPublicStorageUrls(mediaMap: Map<string, Media>): void {
  mediaMap.forEach((media) => {
    if (media?.storagePath) {
      media.storageUrl = getPublicStorageUrl(media.storagePath);
    }
  });
}

/** Returns the set of media IDs referenced by a card (cover, gallery, content). */
function getMediaIdsFromCard(card: {
  coverImageId?: string | null;
  galleryMedia?: { mediaId?: string }[];
  contentMedia?: string[];
}): Set<string> {
  const ids = new Set<string>();
  if (card.coverImageId) ids.add(card.coverImageId);
  card.galleryMedia?.forEach(item => item.mediaId && ids.add(item.mediaId));
  (card.contentMedia ?? []).forEach(id => id && ids.add(id));
  return ids;
}

function normalizeChildrenIds(childrenIds: unknown, selfId?: string): string[] {
  if (!Array.isArray(childrenIds)) return [];
  const seen = new Set<string>();
  for (const raw of childrenIds) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id) continue;
    if (selfId && id === selfId) continue;
    seen.add(id);
  }
  return Array.from(seen);
}

async function wouldCreateCycle(
  transaction: FirebaseFirestore.Transaction,
  parentId: string,
  childId: string
): Promise<boolean> {
  if (parentId === childId) return true;

  const queue: string[] = [childId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentRef = firestore.collection(CARDS_COLLECTION).doc(currentId);
    const currentSnap = await transaction.get(currentRef);
    if (!currentSnap.exists) continue;
    const current = currentSnap.data() as Card;
    const children = normalizeChildrenIds(current.childrenIds);

    if (children.includes(parentId)) return true;
    for (const nextId of children) {
      if (!visited.has(nextId)) queue.push(nextId);
    }
  }

  return false;
}

/** Finds card IDs that reference the given mediaId. Uses referencedByCardIds if present, else scans (lazy backfill). */
export async function getCardsReferencingMedia(mediaId: string): Promise<string[]> {
  const mediaDoc = await firestore.collection(MEDIA_COLLECTION).doc(mediaId).get();
  if (!mediaDoc.exists) return [];
  const data = mediaDoc.data();
  const refs = data?.referencedByCardIds as string[] | undefined;
  if (Array.isArray(refs) && refs.length > 0) return [...refs];

  const cardIds = new Set<string>();
  const [coverSnap, contentSnap] = await Promise.all([
    firestore.collection(CARDS_COLLECTION).where('coverImageId', '==', mediaId).get(),
    firestore.collection(CARDS_COLLECTION).where('contentMedia', 'array-contains', mediaId).get(),
  ]);
  coverSnap.docs.forEach(d => cardIds.add(d.id));
  contentSnap.docs.forEach(d => cardIds.add(d.id));

  const allCardsSnap = await firestore.collection(CARDS_COLLECTION).get();
  allCardsSnap.docs.forEach(doc => {
    const card = doc.data() as Card;
    if (card.galleryMedia?.some(g => g.mediaId === mediaId)) cardIds.add(doc.id);
  });

  const ids = Array.from(cardIds);
  if (ids.length > 0) {
    await firestore.collection(MEDIA_COLLECTION).doc(mediaId).update({
      referencedByCardIds: ids,
      updatedAt: Date.now(),
    });
  }
  return ids;
}

/** Removes a media reference from a card (cover, gallery, or content). */
export async function removeMediaReferenceFromCard(cardId: string, mediaId: string): Promise<void> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const snap = await docRef.get();
  if (!snap.exists) return;
  const card = snap.data() as Card;

  if (card.coverImageId === mediaId) {
    await docRef.update({
      coverImageId: FieldValue.delete(),
      coverImageFocalPoint: FieldValue.delete(),
      coverImage: FieldValue.delete(),
      updatedAt: Date.now(),
    });
  } else if (card.galleryMedia?.some(g => g.mediaId === mediaId)) {
    const newGallery = card.galleryMedia.filter(g => g.mediaId !== mediaId);
    await docRef.update({
      galleryMedia: newGallery,
      updatedAt: Date.now(),
    });
  } else {
    const newContent = removeMediaFromContent(card.content, mediaId);
    const newContentMedia = (card.contentMedia ?? []).filter(id => id !== mediaId);
    await docRef.update({
      content: newContent,
      contentMedia: newContentMedia,
      updatedAt: Date.now(),
    });
  }
}

/** Deletes media and removes its references from all cards (Option B). */
export async function deleteMediaWithCardCleanup(mediaId: string): Promise<void> {
  const cardIds = await getCardsReferencingMedia(mediaId);
  for (const cardId of cardIds) {
    await removeMediaReferenceFromCard(cardId, mediaId);
  }
  await deleteMediaAsset(mediaId);
}

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
    if (card.coverImageId && typeof card.coverImageId === 'string') mediaIds.add(card.coverImageId);
    if (card.galleryMedia) card.galleryMedia.forEach(item => item.mediaId && typeof item.mediaId === 'string' && mediaIds.add(item.mediaId));
    if (card.contentMedia) card.contentMedia.forEach(id => id && typeof id === 'string' && mediaIds.add(id));
  }

  if (mediaIds.size === 0) {
    return cards; // No media to hydrate
  }

  // 2. Fetch all media objects using direct doc() lookups
  const mediaMap = new Map<string, Media>();
  const mediaIdArray = Array.from(mediaIds).filter(id => id && id.trim() !== '');
  
  if (mediaIdArray.length > 0) {
    // Use Promise.all for concurrent lookups
    const mediaDocs = await Promise.all(
      mediaIdArray.map(id => firestore.collection(MEDIA_COLLECTION).doc(id).get())
    );
    
    // Build the media map
    mediaDocs.forEach(doc => {
      if (doc.exists) {
        mediaMap.set(doc.id, doc.data() as Media);
      }
    });
  }

  // 2b. Set storageUrl to permanent public URL (derived from storagePath)
  _applyPublicStorageUrls(mediaMap);
  
  // 3. Inject the full media objects back into each card.
  return cards.map(card => {
    const hydratedCard = { ...card };
    if (hydratedCard.coverImageId) {
      hydratedCard.coverImage = mediaMap.get(hydratedCard.coverImageId) || null;
      // Derive coverImageFocalPoint from media when card lacks it (legacy cards or never-set)
      if (hydratedCard.coverImage && !hydratedCard.coverImageFocalPoint) {
        hydratedCard.coverImageFocalPoint = deriveFocalPointFromObjectPosition(
          hydratedCard.coverImage.objectPosition || '50% 50%',
          hydratedCard.coverImage.width,
          hydratedCard.coverImage.height
        );
      }
    } else {
      hydratedCard.coverImage = null;
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
 * Hydrates only cover images for cards (for admin list views)
 * This significantly reduces Firestore reads by not fetching gallery and content media
 */
async function _hydrateCoverImagesOnly(cards: Card[]): Promise<Card[]> {
  if (!cards || cards.length === 0) {
    return [];
  }

  // 1. Collect only cover image IDs
  const coverImageIds = cards
    .map(card => card.coverImageId)
    .filter(id => id) as string[];

  if (coverImageIds.length === 0) {
    return cards; // No cover images to hydrate
  }

  // 2. Fetch only cover images using direct doc() lookups
  const mediaMap = new Map<string, Media>();
  
  if (coverImageIds.length > 0) {
    // Use Promise.all for concurrent lookups
    const mediaDocs = await Promise.all(
      coverImageIds.map(id => firestore.collection(MEDIA_COLLECTION).doc(id).get())
    );
    
    // Build the media map
    mediaDocs.forEach(doc => {
      if (doc.exists) {
        mediaMap.set(doc.id, doc.data() as Media);
      }
    });
  }

  // 2b. Set storageUrl to permanent public URL (derived from storagePath)
  _applyPublicStorageUrls(mediaMap);
  
  // 3. Inject only cover images back into each card
  return cards.map(card => {
    const hydratedCard = { ...card };
    if (hydratedCard.coverImageId) {
      hydratedCard.coverImage = mediaMap.get(hydratedCard.coverImageId) || null;
      if (hydratedCard.coverImage && !hydratedCard.coverImageFocalPoint) {
        hydratedCard.coverImageFocalPoint = deriveFocalPointFromObjectPosition(
          hydratedCard.coverImage.objectPosition || '50% 50%',
          hydratedCard.coverImage.width,
          hydratedCard.coverImage.height
        );
      }
    } else {
      hydratedCard.coverImage = null;
    }
    // Leave galleryMedia and contentMedia as dehydrated (just IDs)
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

  const selectedTags = validatedData.tags || [];

  // --- Content sanitation ---
  const rawContent = validatedData.content ?? '';
  const cleanedContent = stripContentImageSrc(rawContent);
  const contentMediaIds = extractMediaFromContent(cleanedContent);

  // Use a transaction to ensure atomicity with retry logic
  await withRetry(async () => {
    return firestore.runTransaction(async (transaction) => {
      const normalizedChildren = normalizeChildrenIds(validatedData.childrenIds);
      const parentDetachUpdates = new Map<string, string[]>();

      for (const childId of normalizedChildren) {
        const parentQuery = firestore
          .collection(CARDS_COLLECTION)
          .where('childrenIds', 'array-contains', childId);
        const parentSnap = await transaction.get(parentQuery);
        for (const parentDoc of parentSnap.docs) {
          const parentData = parentDoc.data() as Card;
          const updatedChildren = normalizeChildrenIds(parentData.childrenIds).filter(id => id !== childId);
          parentDetachUpdates.set(parentDoc.id, updatedChildren);
        }
      }

      const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord({ tags: selectedTags });

      const newCard: Card = {
        ...validatedData,
        docId: docRef.id,
        status: validatedData.status ?? 'draft',
        title_lowercase: validatedData.title?.toLowerCase() || '',
        content: cleanedContent,
        tags: selectedTags,
        childrenIds: normalizedChildren,
        contentMedia: contentMediaIds,
        galleryMedia: validatedData.galleryMedia || [],
        filterTags,
        who: dimensionalTags.who || [],
        what: dimensionalTags.what || [],
        when: dimensionalTags.when || [],
        where: dimensionalTags.where || [],
        reflection: dimensionalTags.reflection || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 1. Create the new card document
      transaction.set(docRef, newCard);

      // 1b. Enforce single-parent across all existing parents of each child.
      for (const [parentId, updatedChildren] of parentDetachUpdates.entries()) {
        const parentRef = firestore.collection(CARDS_COLLECTION).doc(parentId);
        transaction.update(parentRef, { childrenIds: updatedChildren, updatedAt: Date.now() });
      }

      // 2. Update tag counts using centralized function
      await updateTagCountsForCard(null, newCard, transaction);

      // 3. Collect all media IDs that should be marked as 'active'.
      const mediaIdsToActivate = new Set<string>();
      if (newCard.coverImageId) {
        mediaIdsToActivate.add(newCard.coverImageId);
      }
      if (newCard.galleryMedia) {
        newCard.galleryMedia.forEach(item => item.mediaId && mediaIdsToActivate.add(item.mediaId));
      }
      if (newCard.contentMedia) {
        newCard.contentMedia.forEach(id => mediaIdsToActivate.add(id));
      }
  
      // 4. If a coverImageFocalPoint was provided, update it on the media doc.
      if (newCard.coverImageFocalPoint && newCard.coverImageId) {
        const coverRef = firestore.collection(MEDIA_COLLECTION).doc(newCard.coverImageId);
        transaction.update(coverRef, { 
          objectPosition: `${newCard.coverImageFocalPoint.x} ${newCard.coverImageFocalPoint.y}`, 
          updatedAt: Date.now() 
        });
      }
  
      // 5. Update the status of all associated media to 'active' and add this card to referencedByCardIds.
      for (const mediaId of Array.from(mediaIdsToActivate)) {
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, {
          status: 'active',
          updatedAt: Date.now(),
          referencedByCardIds: FieldValue.arrayUnion(docRef.id),
        });
      }
    });
  });
  
  // The created card object needs to be constructed outside the transaction to be returned
  const finalCard = await getCardById(docRef.id);
  if (!finalCard) throw new Error("Failed to create or retrieve card.");

  void syncCardToTypesense(finalCard);

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
    
    let isClearingCover = false;
    return withRetry(async () => {
      await firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        throw new Error(`Card with ID ${cardId} not found.`);
      }
      const existingData = docSnap.data() as Card;
      

  
      // --- Start Firestore Batch Write ---
  
      const dehydratedGalleryMedia =
        cardData.galleryMedia?.map(item => {
          const { media, ...rest } = item;
          return rest;
        }) || [];
      
      // Sanitize content HTML and derive content media IDs. Only when content is in payload.
      const sanitizedContent = cardData.content ? stripContentImageSrc(cardData.content) : cardData.content;
      const contentMediaIds = sanitizedContent ? extractMediaFromContent(sanitizedContent) : [];
      
      // Update contract: Fields present in payload overwrite stored values.
      // null = clear, omit = leave unchanged. Preserve contentMedia when content is omitted (e.g. bulk tag update).
      const updatePayload: Partial<Card> = {
        ...cardData,
        ...('content' in cardData ? { content: sanitizedContent, contentMedia: contentMediaIds } : {}),
        ...('coverImageId' in cardData ? { coverImageId: cardData.coverImageId ?? null } : {}),
        ...('galleryMedia' in cardData ? { galleryMedia: dehydratedGalleryMedia } : {}),
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
      

  
      // If no fields remain after cleaning, nothing to update â€“ return current data
      if (Object.keys(cleanedUpdate).length === 0) {
        return existingData;
      }

      const parentDetachUpdates = new Map<string, string[]>();
      if ('childrenIds' in cleanedUpdate) {
        const normalizedChildren = normalizeChildrenIds(cleanedUpdate.childrenIds, cardId);
        cleanedUpdate.childrenIds = normalizedChildren;

        for (const childId of normalizedChildren) {
          const hasCycle = await wouldCreateCycle(transaction, cardId, childId);
          if (hasCycle) {
            throw new Error(`Cannot set child ${childId}; this would create a cycle.`);
          }
        }

        for (const childId of normalizedChildren) {
          const parentQuery = firestore
            .collection(CARDS_COLLECTION)
            .where('childrenIds', 'array-contains', childId);
          const parentSnap = await transaction.get(parentQuery);
          for (const parentDoc of parentSnap.docs) {
            if (parentDoc.id === cardId) continue;
            const parentData = parentDoc.data() as Card;
            const updatedChildren = normalizeChildrenIds(parentData.childrenIds).filter(id => id !== childId);
            parentDetachUpdates.set(parentDoc.id, updatedChildren);
          }
        }
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

      const clearingCover = ('coverImageId' in cardData) && (cardData.coverImageId === null || cardData.coverImageId === undefined);
      const oldMediaIds = getMediaIdsFromCard(existingData);
      const newCover = clearingCover ? null : (('coverImageId' in cardData ? cardData.coverImageId : existingData.coverImageId) ?? null);
      const newGalleryMedia = cleanedUpdate.galleryMedia ?? existingData.galleryMedia;
      const newContentMedia = 'content' in cardData
        ? contentMediaIds
        : (existingData.contentMedia ?? extractMediaFromContent(existingData.content ?? ''));
      const newMediaIds = new Set<string>();
      if (newCover) newMediaIds.add(newCover);
      newGalleryMedia?.forEach(g => g.mediaId && newMediaIds.add(g.mediaId));
      newContentMedia.forEach(id => newMediaIds.add(id));

      const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord({ tags: finalTags || [] });

      // --- Update tag counts using centralized function ---
      await updateTagCountsForCard(existingData, { ...existingData, ...cleanedUpdate }, transaction);

      cleanedUpdate.filterTags = filterTags;
      cleanedUpdate.who = dimensionalTags.who || [];
      cleanedUpdate.what = dimensionalTags.what || [];
      cleanedUpdate.when = dimensionalTags.when || [];
      cleanedUpdate.where = dimensionalTags.where || [];
      cleanedUpdate.reflection = dimensionalTags.reflection || [];

      for (const [parentId, updatedChildren] of parentDetachUpdates.entries()) {
        const parentRef = firestore.collection(CARDS_COLLECTION).doc(parentId);
        transaction.update(parentRef, { childrenIds: updatedChildren, updatedAt: Date.now() });
      }

      // Maintain referencedByCardIds on media docs
      const mediaRemoved = [...oldMediaIds].filter(id => !newMediaIds.has(id));
      const mediaAdded = [...newMediaIds].filter(id => !oldMediaIds.has(id));
      for (const mediaId of mediaRemoved) {
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, {
          referencedByCardIds: FieldValue.arrayRemove(cardId),
          updatedAt: Date.now(),
        });
      }
      for (const mediaId of mediaAdded) {
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, {
          referencedByCardIds: FieldValue.arrayUnion(cardId),
          updatedAt: Date.now(),
        });
      }

      // 3. When cover is cleared, remove from main payload. Apply via direct update after transaction
      //    (transaction-based writes were not persisting; direct update works).
      isClearingCover = clearingCover;
      if (isClearingCover) {
        delete cleanedUpdate.coverImageId;
        delete cleanedUpdate.coverImageFocalPoint;
      }

      // 4. Update the card document with the new data.
      if (Object.keys(cleanedUpdate).length > 0) {
        transaction.update(docRef, cleanedUpdate);
      }
  
      // 5. Tag counts were already adjusted earlier.

      // 6. Collect all media IDs that should be marked as 'active'.
      const mediaIdsToActivate = new Set<string>();
      if (!isClearingCover && cleanedUpdate.coverImageId && typeof cleanedUpdate.coverImageId === 'string') {
        mediaIdsToActivate.add(cleanedUpdate.coverImageId);
      }
      if (cleanedUpdate.galleryMedia) {
        cleanedUpdate.galleryMedia.forEach(item => item.mediaId && mediaIdsToActivate.add(item.mediaId));
      }
      if (cleanedUpdate.contentMedia) {
        cleanedUpdate.contentMedia.forEach(id => mediaIdsToActivate.add(id));
      }
  
      // 7. If a new coverImageFocalPoint was provided (and we're not clearing cover), update the media doc.
      if (!isClearingCover) {
        const coverImageFocalPoint = cleanedUpdate.coverImageFocalPoint;
        const coverImageId = cleanedUpdate.coverImageId ?? existingData.coverImageId;
        if (coverImageId && typeof coverImageId === 'string' && coverImageFocalPoint && 'x' in coverImageFocalPoint && 'y' in coverImageFocalPoint) {
          const coverRef = firestore.collection(MEDIA_COLLECTION).doc(coverImageId);
          transaction.update(coverRef, { objectPosition: `${coverImageFocalPoint.x} ${coverImageFocalPoint.y}`, updatedAt: Date.now() });
        }
      }
  
      // 8. Update the status of all associated media to 'active'.
      for (const mediaId of Array.from(mediaIdsToActivate)) {
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, { status: 'active', updatedAt: Date.now() });
      }
  
      return null; // Signal completion; we fetch after transaction
    });

      // Cover clear: use FieldValue.delete() to remove fields and any legacy embedded coverImage.
      if (isClearingCover) {
        await docRef.update({
          coverImageId: FieldValue.delete(),
          coverImageFocalPoint: FieldValue.delete(),
          coverImage: FieldValue.delete(),
        });
      }

      const updatedCard = await getCardById(cardId);
      if (!updatedCard) {
        throw new Error(`Failed to fetch updated card with ID ${cardId}`);
      }

      void syncCardToTypesense(updatedCard);

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
 * Fetches a paginated list of a collection's child cards.
 * A collection is any card with childrenIds.
 */
export async function getCardsByCollectionId(
  collectionId: string,
  options: {
    limit?: number;
    lastDocId?: string;
    hydrationMode?: 'full' | 'cover-only';
  } = {}
): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const collectionCard = await getCardById(collectionId);
  if (!collectionCard || !collectionCard.childrenIds || collectionCard.childrenIds.length === 0) {
    return { items: [], hasMore: false };
  }

  const { limit = 10, lastDocId, hydrationMode = 'full' } = options;
  const result = await getPaginatedCardsByIds(collectionCard.childrenIds, { limit, lastDocId });

  if (hydrationMode === 'cover-only') {
    result.items = await _hydrateCoverImagesOnly(result.items);
  } else {
    result.items = await _hydrateCards(result.items);
  }

  return result;
}

/** Max cards to scan when listing collections (cards with children) */
const COLLECTIONS_LIST_LIMIT = 500;

/**
 * Fetches cards that are curated collections.
 * A card qualifies if it has children or is explicitly marked as a curated root.
 * Firestore cannot query "array length > 0", so we fetch and filter in memory.
 */
export async function getCollectionCards(
  status: Card['status'] | 'all' = 'published',
  options: { limit?: number; hydrationMode?: 'full' | 'cover-only' } = {}
): Promise<Card[]> {
  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);

  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  query = query.orderBy('createdAt', 'desc').limit(options.limit ?? COLLECTIONS_LIST_LIMIT);

  const snapshot = await query.get();
  const cards: Card[] = snapshot.docs
    .map(doc => ({ docId: doc.id, ...doc.data() } as Card))
    .filter(card => (card.childrenIds && card.childrenIds.length > 0) || card.curatedRoot === true);

  if (options.hydrationMode === 'cover-only') {
    return _hydrateCoverImagesOnly(cards);
  }
  return _hydrateCards(cards);
}

/** Firestore transaction getAll limit is 500. Use smaller chunks for tag count updates. */
const BULK_UPDATE_TAGS_CHUNK_SIZE = 400;

/**
 * Updates the tags for a list of cards in a batch operation.
 * Chunks into multiple transactions to stay under Firestore limits (500 docs per transaction).
 * @param cardIds - The IDs of the cards to update.
 * @param tags - The new array of tag IDs to set for all cards.
 * @returns A promise that resolves when the batch update is complete.
 */
export async function bulkUpdateTags(cardIds: string[], tags: string[]): Promise<void> {
  if (!cardIds || cardIds.length === 0) {
    return;
  }

  for (let i = 0; i < cardIds.length; i += BULK_UPDATE_TAGS_CHUNK_SIZE) {
    const chunk = cardIds.slice(i, i + BULK_UPDATE_TAGS_CHUNK_SIZE);

    await firestore.runTransaction(async (transaction) => {
      const cardRefs = chunk.map(id => firestore.collection(CARDS_COLLECTION).doc(id));
      const cardDocs = await transaction.getAll(...cardRefs);

      for (const cardDoc of cardDocs) {
        if (!cardDoc.exists) continue;

        const cardData = cardDoc.data() as Card;
        const newCardData = { ...cardData, tags };
        await updateTagCountsForCard(cardData, newCardData, transaction);
      }

      for (const cardDoc of cardDocs) {
        if (!cardDoc.exists) continue;
        const cardId = cardDoc.id;
        const cardData = cardDoc.data() as Card;
        const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord({ tags });

        const cardRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
        transaction.update(cardRef, {
          tags,
          filterTags,
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

    // First, get the card data to collect media IDs for post-transaction cleanup
    const cardSnap = await docRef.get();
    if (!cardSnap.exists) {
        console.warn(`Card with ID ${cardId} not found for deletion.`);
        return;
    }
    const cardToDelete = cardSnap.data() as Card;

    // Collect media IDs for post-transaction cleanup
    const mediaToDelete: string[] = [];
    if (cardToDelete.coverImageId) {
        mediaToDelete.push(cardToDelete.coverImageId);
    }
    if (cardToDelete.galleryMedia) {
        cardToDelete.galleryMedia.forEach(item => mediaToDelete.push(item.mediaId));
    }
    if (cardToDelete.contentMedia) {
        cardToDelete.contentMedia.forEach(id => mediaToDelete.push(id));
    }

    return withRetry(async () => {
      return firestore.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists) {
            console.warn(`Card with ID ${cardId} not found for deletion.`);
            return;
        }

        // Decrement counts for all associated tags if the card was published
        if (cardToDelete.status === 'published' && cardToDelete.tags && cardToDelete.tags.length > 0) {
            await updateTagCountsForCard(cardToDelete, { ...cardToDelete, tags: [] }, transaction);
        }

        // Clean up parent-child relationships
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

        // Delete media documents from Firestore (within transaction)
        for (const mediaId of mediaToDelete) {
            await deleteMediaAsset(mediaId, transaction);
        }

        // Delete the card document
        transaction.delete(docRef);
      });
    }).then(async () => {
        await unlinkCardFromAllQuestions(cardId);
        void removeCardFromTypesense(cardId);

        // Post-transaction: Try immediate storage cleanup for the deleted media
        // This is outside the transaction, so failures won't affect database integrity
        for (const mediaId of mediaToDelete) {
            try {
                const mediaDoc = await firestore.collection('media').doc(mediaId).get();
                if (mediaDoc.exists) {
                    const mediaData = mediaDoc.data() as Media;
                    
                    const success = await deleteFromStorageWithRetry(mediaData.storagePath);
                    if (!success) {
                        await markStorageForLaterDeletion(mediaData.storagePath);
                    }
                }
            } catch (error) {
                console.error(`Error processing storage for ${mediaId}:`, error);
            }
        }
    });
}

/**
 * Finds a card that was imported from the given folder path.
 * @param importedFromFolder - The folder path stored when the card was created
 * @returns The card if found, null otherwise
 */
export async function findCardByImportedFolder(
  importedFromFolder: string
): Promise<Card | null> {
  const snapshot = await firestore
    .collection(CARDS_COLLECTION)
    .where('importedFromFolder', '==', importedFromFolder)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data() as Card;
  return { ...data, docId: doc.id };
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
  hydrationMode?: 'full' | 'cover-only';
  /** When `q` is set, title prefix search uses `orderBy('title')` and this is ignored. */
  sort?: 'newest' | 'oldest';
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
    hydrationMode = 'full',
    sort = 'newest',
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

  // Apply sorting (title search uses range on title + orderBy title)
  if (!q) {
    const direction = sort === 'oldest' ? 'asc' : 'desc';
    query = query.orderBy('createdAt', direction);
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
  
  // --- HYDRATION STEP - Use selective hydration based on mode ---
  if (hydrationMode === 'cover-only') {
    cards = await _hydrateCoverImagesOnly(cards);
  } else {
    cards = await _hydrateCards(cards);
  }

  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  const lastDocIdResult = lastVisible ? lastVisible.id : undefined;
  const hasMore = querySnapshot.size === limit;

  return { items: cards, lastDocId: lastDocIdResult, hasMore };
}

 



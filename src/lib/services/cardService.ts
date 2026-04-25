import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import {
  updateTagCountsForCard,
  updateTagCountsForMedia,
  mergeDerivedTagsForCardRecord,
  getAllTags,
  getTagAncestors,
  organizeTagsByDimension,
} from '@/lib/firebase/tagService';
import { getFirestore, FieldPath, FieldValue } from 'firebase-admin/firestore';
import {
  deleteFromStorageWithRetry,
  deleteMediaAsset,
  markStorageForLaterDeletion,
} from './images/imageImportService';
import { extractMediaFromContent, stripContentImageSrc, hydrateContentImageSrc, removeMediaFromContent, generateExcerpt } from '@/lib/utils/cardUtils';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';
import { getPublicStorageUrl } from '@/lib/utils/storageUrl';
import { Media } from '@/lib/types/photo';
import { AppError, ErrorCode } from '@/lib/types/error';
import { unlinkCardFromAllQuestions } from '@/lib/services/questionService';
import { syncCardToTypesense, removeCardFromTypesense } from '@/lib/services/typesenseService';
import {
  removeMediaFromTypesense,
  syncMediaToTypesenseById,
} from '@/lib/services/typesenseMediaService';
import {
  compareCollectionRootCards,
  nextCollectionRootOrderForAppend,
} from '@/lib/utils/curatedCollectionTree';

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
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';
const QUESTIONS_COLLECTION = 'questions';

async function assertValidQuestionBackedQa(
  candidate: Partial<Card>,
  existing?: Partial<Card>
): Promise<void> {
  const finalType = candidate.type ?? existing?.type ?? 'story';
  if (finalType !== 'qa') return;

  const questionId = candidate.questionId ?? existing?.questionId;
  if (!questionId) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Q&A cards must be created from a question-bank prompt.'
    );
  }

  const questionSnap = await firestore.collection(QUESTIONS_COLLECTION).doc(questionId).get();
  if (!questionSnap.exists) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Q&A card questionId must reference an existing question.'
    );
  }
}

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

function stripHydratedGalleryItem<T extends { media?: unknown }>(item: T): Omit<T, 'media'> {
  const clone = { ...item };
  delete clone.media;
  return clone;
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

function adoptDeletedCardChildren(
  parentChildrenIds: unknown,
  deletedCardId: string,
  adoptedChildIds: string[]
): string[] {
  const parentChildren = normalizeChildrenIds(parentChildrenIds);
  if (adoptedChildIds.length === 0) {
    return parentChildren.filter((id) => id !== deletedCardId);
  }

  const next: string[] = [];
  const seen = new Set<string>();
  for (const childId of parentChildren) {
    if (childId === deletedCardId) {
      for (const adoptedChildId of adoptedChildIds) {
        if (!seen.has(adoptedChildId)) {
          next.push(adoptedChildId);
          seen.add(adoptedChildId);
        }
      }
      continue;
    }
    if (!seen.has(childId)) {
      next.push(childId);
      seen.add(childId);
    }
  }
  return next;
}

/**
 * True when this card should appear in curated collection lists (denormalized; server-maintained).
 * Denormalized collection-listing helper: a card is nav-eligible when it has children.
 */
export function computeCuratedNavEligible(card: Pick<Card, 'childrenIds' | 'isCollectionRoot'>): boolean {
  const children = normalizeChildrenIds(card.childrenIds);
  return children.length > 0 || card.isCollectionRoot === true;
}

async function getExistingCollectionRoots(): Promise<Card[]> {
  const snap = await firestore.collection(CARDS_COLLECTION).where('isCollectionRoot', '==', true).get();
  return snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
}

function computeDimensionSortKeys(
  directTagIds: string[] | undefined,
  allTags: Tag[]
): Pick<Card, 'whoSortKey' | 'whatSortKey' | 'whereSortKey'> {
  const byId = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
  const buckets: Record<'who' | 'what' | 'where', string[]> = {
    who: [],
    what: [],
    where: [],
  };

  for (const tagId of directTagIds || []) {
    const tag = byId.get(tagId);
    if (!tag?.name || !tag.dimension) continue;
    const dim = String(tag.dimension) === 'reflection' ? 'what' : String(tag.dimension);
    if (dim === 'who' || dim === 'what' || dim === 'where') {
      buckets[dim].push(tag.name.trim().toLowerCase());
    }
  }

  const pick = (values: string[]) => values.filter(Boolean).sort((a, b) => a.localeCompare(b))[0] || '\uffff';

  return {
    whoSortKey: pick(buckets.who),
    whatSortKey: pick(buckets.what),
    whereSortKey: pick(buckets.where),
  };
}

function computeMediaSignalBuckets(
  mediaTagIds: string[],
  allTags: Tag[]
): Pick<Card, 'mediaWho' | 'mediaWhat' | 'mediaWhen' | 'mediaWhere'> {
  const byId = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
  const buckets: Record<'who' | 'what' | 'when' | 'where', Set<string>> = {
    who: new Set<string>(),
    what: new Set<string>(),
    when: new Set<string>(),
    where: new Set<string>(),
  };

  for (const tagId of mediaTagIds) {
    const tag = byId.get(tagId);
    if (!tag?.docId || !tag.dimension) continue;
    const dim = String(tag.dimension) === 'reflection' ? 'what' : String(tag.dimension);
    if (dim === 'who' || dim === 'what' || dim === 'when' || dim === 'where') {
      buckets[dim].add(tag.docId);
    }
  }

  return {
    mediaWho: Array.from(buckets.who),
    mediaWhat: Array.from(buckets.what),
    mediaWhen: Array.from(buckets.when),
    mediaWhere: Array.from(buckets.where),
  };
}

async function computeCardMediaSignalsFromMediaIds(
  mediaIds: Set<string>,
  allTags: Tag[]
): Promise<Pick<Card, 'mediaWho' | 'mediaWhat' | 'mediaWhen' | 'mediaWhere'>> {
  if (mediaIds.size === 0) {
    return { mediaWho: [], mediaWhat: [], mediaWhen: [], mediaWhere: [] };
  }
  const docs = await Promise.all(
    Array.from(mediaIds).map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get())
  );
  const tagIds = new Set<string>();
  for (const doc of docs) {
    const media = doc.exists ? (doc.data() as Media) : undefined;
    for (const tagId of media?.tags || []) {
      if (typeof tagId === 'string' && tagId.trim()) tagIds.add(tagId);
    }
  }
  return computeMediaSignalBuckets(Array.from(tagIds), allTags);
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

/** Finds card IDs that reference the given mediaId by authoritative surface scan (cover, gallery, content ids, inline content media ids). */
export async function getCardsReferencingMedia(mediaId: string): Promise<string[]> {
  const mediaDoc = await firestore.collection(MEDIA_COLLECTION).doc(mediaId).get();
  if (!mediaDoc.exists) return [];
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
    if (
      card.galleryMedia?.some((g) => g.mediaId === mediaId) ||
      extractMediaFromContent(card.content ?? '').includes(mediaId)
    ) {
      cardIds.add(doc.id);
    }
  });

  const ids = Array.from(cardIds);
  await firestore.collection(MEDIA_COLLECTION).doc(mediaId).update({
    referencedByCardIds: ids,
    updatedAt: Date.now(),
  });
  return ids;
}

export async function recomputeCardMediaSignals(cardId: string): Promise<void> {
  const doc = await firestore.collection(CARDS_COLLECTION).doc(cardId).get();
  if (!doc.exists) return;
  const card = { docId: doc.id, ...(doc.data() as Card) };
  const mediaIds = getMediaIdsFromCard(card);
  const allTags = await getAllTags();
  const mediaSignals = await computeCardMediaSignalsFromMediaIds(mediaIds, allTags);
  await doc.ref.update({
    mediaWho: mediaSignals.mediaWho,
    mediaWhat: mediaSignals.mediaWhat,
    mediaWhen: mediaSignals.mediaWhen,
    mediaWhere: mediaSignals.mediaWhere,
    updatedAt: Date.now(),
  });
}

export async function recomputeCardsMediaSignalsForMedia(mediaId: string): Promise<void> {
  const cardIds = await getCardsReferencingMedia(mediaId);
  if (!cardIds.length) return;
  await Promise.all(cardIds.map((id) => recomputeCardMediaSignals(id)));
}

export async function recomputeCardsMediaSignalsForMediaIds(mediaIds: string[]): Promise<void> {
  if (!mediaIds.length) return;
  const allCardIds = new Set<string>();
  const uniqueMediaIds = Array.from(
    new Set(mediaIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );
  const cardIdLists = await Promise.all(uniqueMediaIds.map((mediaId) => getCardsReferencingMedia(mediaId)));
  for (const ids of cardIdLists) {
    ids.forEach((id) => allCardIds.add(id));
  }
  if (!allCardIds.size) return;
  await Promise.all(Array.from(allCardIds).map((id) => recomputeCardMediaSignals(id)));
}

/** Removes all occurrences of a media reference from a card (cover, gallery, and content/inline). */
export async function removeMediaReferenceFromCard(cardId: string, mediaId: string): Promise<void> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const snap = await docRef.get();
  if (!snap.exists) return;
  const card = snap.data() as Card;

  const structuredRefs = getMediaIdsFromCard(card).has(mediaId);
  const inBodyHtml = extractMediaFromContent(card.content ?? '').includes(mediaId);
  if (!structuredRefs && !inBodyHtml) {
    return;
  }

  const payload: Record<string, unknown> = { updatedAt: Date.now() };
  if (card.coverImageId === mediaId) {
    payload.coverImageId = FieldValue.delete();
    payload.coverImageFocalPoint = FieldValue.delete();
    payload.coverImage = FieldValue.delete();
  }
  if (card.galleryMedia?.some((g) => g.mediaId === mediaId)) {
    payload.galleryMedia = card.galleryMedia.filter((g) => g.mediaId !== mediaId);
  }
  if ((card.contentMedia ?? []).includes(mediaId) || inBodyHtml) {
    payload.content = removeMediaFromContent(card.content, mediaId);
    payload.contentMedia = (card.contentMedia ?? []).filter((id) => id !== mediaId);
  }
  await docRef.update(payload);

  const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
  const mediaSnap = await mediaRef.get();
  if (mediaSnap.exists) {
    await mediaRef.update({
      referencedByCardIds: FieldValue.arrayRemove(cardId),
      updatedAt: Date.now(),
    });
    void syncMediaToTypesenseById(mediaId);
  }

  await recomputeCardMediaSignals(cardId);

  const updatedCard = await getCardById(cardId);
  if (updatedCard) {
    void syncCardToTypesense(updatedCard);
  }
}

/** Deletes media and removes its references from all cards (Option B). */
export async function deleteMediaWithCardCleanup(mediaId: string): Promise<void> {
  const firstPassCardIds = await getCardsReferencingMedia(mediaId);
  const cardIds = Array.from(new Set(firstPassCardIds));
  for (const cardId of cardIds) {
    await removeMediaReferenceFromCard(cardId, mediaId);
  }
  const remaining = await getCardsReferencingMedia(mediaId);
  if (remaining.length > 0) {
    throw new Error(
      `Cannot delete media ${mediaId}; unresolved card references remain: ${remaining.join(', ')}`
    );
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
 * For gallery cards with no cover, hydrate only the first gallery slide so feed-style tiles can show a thumbnail.
 */
async function _hydrateFirstGallerySlideWhereNoCover(cards: Card[]): Promise<Card[]> {
  if (!cards?.length) {
    return cards;
  }

  const ids = new Set<string>();
  for (const card of cards) {
    if (!card.coverImage && card.galleryMedia?.[0]?.mediaId) {
      ids.add(card.galleryMedia[0].mediaId);
    }
  }

  if (ids.size === 0) {
    return cards;
  }

  const mediaMap = new Map<string, Media>();
  const mediaDocs = await Promise.all(
    Array.from(ids).map(id => firestore.collection(MEDIA_COLLECTION).doc(id).get())
  );
  mediaDocs.forEach(doc => {
    if (doc.exists) {
      mediaMap.set(doc.id, doc.data() as Media);
    }
  });
  _applyPublicStorageUrls(mediaMap);

  return cards.map(card => {
    if (card.coverImage || !card.galleryMedia?.[0]?.mediaId) {
      return card;
    }
    const media = mediaMap.get(card.galleryMedia[0].mediaId);
    if (!media) {
      return card;
    }
    return {
      ...card,
      galleryMedia: card.galleryMedia.map((item, i) =>
        i === 0 ? { ...item, media } : item
      ),
    };
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
  await assertValidQuestionBackedQa(validatedData);
  const requestedRoot = validatedData.isCollectionRoot === true;
  let resolvedRootOrder = validatedData.collectionRootOrder;
  if (requestedRoot && typeof resolvedRootOrder !== 'number') {
    const existingRoots = await getExistingCollectionRoots();
    resolvedRootOrder = nextCollectionRootOrderForAppend(existingRoots);
  }
  delete (validatedData as Partial<Card>).isCollectionRoot;
  delete (validatedData as Partial<Card>).collectionRootOrder;
  delete (validatedData as Partial<Card>).curatedRoot;
  delete (validatedData as Partial<Card>).curatedRootOrder;
  delete (validatedData as Partial<Card>).curatedNavEligible;

  const selectedTags = validatedData.tags || [];

  // --- Content sanitation ---
  const rawContent = validatedData.content ?? '';
  const cleanedContent = stripContentImageSrc(rawContent);
  const contentMediaIds = extractMediaFromContent(cleanedContent);

  // Use a transaction to ensure atomicity with retry logic
  await withRetry(async () => {
    return firestore.runTransaction(async (transaction) => {
      const normalizedChildren = normalizeChildrenIds(validatedData.childrenIds);

      const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord({ tags: selectedTags });
      const allTagsForJournal = await getAllTags();
      const journalWhenSort = computeJournalWhenSortKeys(
        dimensionalTags.when || [],
        buildTagMap(allTagsForJournal)
      );
      const dimensionSortKeys = computeDimensionSortKeys(selectedTags, allTagsForJournal);
      const mediaIdsForSignals = new Set<string>();
      if (validatedData.coverImageId) mediaIdsForSignals.add(validatedData.coverImageId);
      (validatedData.galleryMedia || []).forEach((item) => {
        if (item.mediaId) mediaIdsForSignals.add(item.mediaId);
      });
      contentMediaIds.forEach((id) => mediaIdsForSignals.add(id));
      const mediaSignals = await computeCardMediaSignalsFromMediaIds(mediaIdsForSignals, allTagsForJournal);

      const autoExcerpt = validatedData.excerptAuto ? generateExcerpt(cleanedContent) : undefined;

      const cardType = validatedData.type ?? 'story';
      const newCard: Card = {
        ...validatedData,
        docId: docRef.id,
        type: cardType,
        displayMode: normalizeDisplayModeForType(cardType, validatedData.displayMode),
        status: validatedData.status ?? 'draft',
        title_lowercase: validatedData.title?.toLowerCase() || '',
        content: cleanedContent,
        ...(validatedData.excerptAuto ? { excerpt: autoExcerpt || null } : {}),
        tags: selectedTags,
        childrenIds: normalizedChildren,
        ...(requestedRoot ? { isCollectionRoot: true, collectionRootOrder: resolvedRootOrder ?? 10 } : {}),
        contentMedia: contentMediaIds,
        galleryMedia: validatedData.galleryMedia || [],
        filterTags,
        who: dimensionalTags.who || [],
        what: dimensionalTags.what || [],
        when: dimensionalTags.when || [],
        where: dimensionalTags.where || [],
        mediaWho: mediaSignals.mediaWho,
        mediaWhat: mediaSignals.mediaWhat,
        mediaWhen: mediaSignals.mediaWhen,
        mediaWhere: mediaSignals.mediaWhere,
        whoSortKey: dimensionSortKeys.whoSortKey,
        whatSortKey: dimensionSortKeys.whatSortKey,
        whereSortKey: dimensionSortKeys.whereSortKey,
        journalWhenSortAsc: journalWhenSort.journalWhenSortAsc,
        journalWhenSortDesc: journalWhenSort.journalWhenSortDesc,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        curatedNavEligible: computeCuratedNavEligible({
          childrenIds: normalizedChildren,
          isCollectionRoot: requestedRoot,
        }),
      };

      // 1. Create the new card document
      transaction.set(docRef, newCard);

      // 2. Update tag counts using centralized function
      await updateTagCountsForCard(null, newCard, transaction);

      // 3. Collect all media IDs referenced by the new card (for referencedByCardIds).
      const mediaIdsReferenced = new Set<string>();
      if (newCard.coverImageId) {
        mediaIdsReferenced.add(newCard.coverImageId);
      }
      if (newCard.galleryMedia) {
        newCard.galleryMedia.forEach(item => item.mediaId && mediaIdsReferenced.add(item.mediaId));
      }
      if (newCard.contentMedia) {
        newCard.contentMedia.forEach(id => mediaIdsReferenced.add(id));
      }

      // 4. If a coverImageFocalPoint was provided, update it on the media doc.
      if (newCard.coverImageFocalPoint && newCard.coverImageId) {
        const coverRef = firestore.collection(MEDIA_COLLECTION).doc(newCard.coverImageId);
        transaction.update(coverRef, {
          objectPosition: `${newCard.coverImageFocalPoint.x} ${newCard.coverImageFocalPoint.y}`,
          updatedAt: Date.now(),
        });
      }

      // 5. Denormalize card reference onto each media doc.
      for (const mediaId of Array.from(mediaIdsReferenced)) {
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, {
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

  for (const mediaId of getMediaIdsFromCard(finalCard)) {
    void syncMediaToTypesenseById(mediaId);
  }

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

    const preSnap = await docRef.get();
    if (!preSnap.exists) {
      throw new Error(`Card with ID ${cardId} not found.`);
    }
    const preMediaIds = getMediaIdsFromCard({ ...preSnap.data(), docId: preSnap.id } as Card);
    
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
        cardData.galleryMedia?.map((item) => stripHydratedGalleryItem(item)) || [];
      
      // Sanitize content HTML and derive content media IDs. Only when content is in payload.
      const sanitizedContent = cardData.content ? stripContentImageSrc(cardData.content) : cardData.content;
      const contentMediaIds = sanitizedContent ? extractMediaFromContent(sanitizedContent) : [];
      
      // Auto-excerpt: recompute when excerptAuto is on and content changed
      const effectiveContent = sanitizedContent ?? existingData.content;
      const shouldAutoExcerpt = cardData.excerptAuto === true
        || (cardData.excerptAuto === undefined && existingData.excerptAuto === true);
      const autoExcerptFields = (shouldAutoExcerpt && 'content' in cardData)
        ? { excerpt: generateExcerpt(effectiveContent) || null }
        : {};

      // Update contract: Fields present in payload overwrite stored values.
      // null = clear, omit = leave unchanged. Preserve contentMedia when content is omitted (e.g. bulk tag update).
      const updatePayload: Partial<Card> = {
        ...cardData,
        ...('content' in cardData ? { content: sanitizedContent, contentMedia: contentMediaIds } : {}),
        ...('coverImageId' in cardData ? { coverImageId: cardData.coverImageId ?? null } : {}),
        ...('galleryMedia' in cardData ? { galleryMedia: dehydratedGalleryMedia } : {}),
        ...autoExcerptFields,
        updatedAt: Date.now(),
      };

      // Remove transient fields that shouldn't be saved.
      delete updatePayload.coverImage;
      delete updatePayload.isCollectionRoot;
      delete updatePayload.collectionRootOrder;
      delete updatePayload.curatedRoot;
      delete updatePayload.curatedRootOrder;
      delete updatePayload.curatedNavEligible;
  
      // Validate the incoming partial data against the card schema.
      const validatedUpdate = cardSchema.partial().parse(updatePayload);
      

  
      // Helper to recursively strip undefined values (Firestore disallows them)
      const removeUndefinedDeep = (val: unknown): unknown => {
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
  
      const cleanedUpdate = removeUndefinedDeep(validatedUpdate) as Partial<Card>;

      const mergedType = (cleanedUpdate.type ?? existingData.type) as Card['type'];
      const rawDisplay =
        cleanedUpdate.displayMode !== undefined ? cleanedUpdate.displayMode : existingData.displayMode;
      const coercedDisplay = normalizeDisplayModeForType(mergedType, rawDisplay);
      if (coercedDisplay !== rawDisplay) {
        cleanedUpdate.displayMode = coercedDisplay;
      }

      // If no fields remain after cleaning, nothing to update â€“ return current data
      if (mergedType === 'qa') {
        const questionId = (cleanedUpdate.questionId ?? existingData.questionId) as string | undefined;
        if (!questionId) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'Q&A cards must be created from a question-bank prompt.'
          );
        }
        const questionSnap = await transaction.get(firestore.collection(QUESTIONS_COLLECTION).doc(questionId));
        if (!questionSnap.exists) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'Q&A card questionId must reference an existing question.'
          );
        }
      }

      if (Object.keys(cleanedUpdate).length === 0) {
        return existingData;
      }

      if ('childrenIds' in cleanedUpdate) {
        const normalizedChildren = normalizeChildrenIds(cleanedUpdate.childrenIds, cardId);
        cleanedUpdate.childrenIds = normalizedChildren;

        const prevChildren = normalizeChildrenIds(existingData.childrenIds, cardId);
        const prevChildSet = new Set(prevChildren);
        for (const childId of normalizedChildren) {
          if (prevChildSet.has(childId)) continue;
          const childRef = firestore.collection(CARDS_COLLECTION).doc(childId);
          const childSnap = await transaction.get(childRef);
          if (!childSnap.exists) {
            throw new AppError(
              ErrorCode.CURATED_COLLECTION_CHILD_NOT_FOUND,
              `Cannot add child ${childId}: card not found.`,
              { childId, parentCardId: cardId }
            );
          }
        }

        for (const childId of normalizedChildren) {
          const hasCycle = await wouldCreateCycle(transaction, cardId, childId);
          if (hasCycle) {
            throw new AppError(
              ErrorCode.CURATED_COLLECTION_CYCLE,
              `Cannot set child ${childId}; this would create a cycle.`,
              { childId, parentCardId: cardId }
            );
          }
        }
      }
  
      // Determine tag changes and prepare derived tag data BEFORE any writes
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

      const allTagsForJournal = await getAllTags();
      const journalWhenSort = computeJournalWhenSortKeys(
        cleanedUpdate.when || [],
        buildTagMap(allTagsForJournal)
      );
      const dimensionSortKeys = computeDimensionSortKeys(finalTags || [], allTagsForJournal);
      const mediaSignals = await computeCardMediaSignalsFromMediaIds(newMediaIds, allTagsForJournal);
      cleanedUpdate.journalWhenSortAsc = journalWhenSort.journalWhenSortAsc;
      cleanedUpdate.journalWhenSortDesc = journalWhenSort.journalWhenSortDesc;
      cleanedUpdate.whoSortKey = dimensionSortKeys.whoSortKey;
      cleanedUpdate.whatSortKey = dimensionSortKeys.whatSortKey;
      cleanedUpdate.whereSortKey = dimensionSortKeys.whereSortKey;
      cleanedUpdate.mediaWho = mediaSignals.mediaWho;
      cleanedUpdate.mediaWhat = mediaSignals.mediaWhat;
      cleanedUpdate.mediaWhen = mediaSignals.mediaWhen;
      cleanedUpdate.mediaWhere = mediaSignals.mediaWhere;

      const finalChildrenForNav = 'childrenIds' in cleanedUpdate
        ? cleanedUpdate.childrenIds!
        : normalizeChildrenIds(existingData.childrenIds, cardId);
      cleanedUpdate.curatedNavEligible = computeCuratedNavEligible({
        childrenIds: finalChildrenForNav,
        isCollectionRoot: existingData.isCollectionRoot,
      });

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
        transaction.update(
          docRef,
          'childrenIds' in cleanedUpdate
            ? {
                ...cleanedUpdate,
                curatedRoot: FieldValue.delete(),
                curatedRootOrder: FieldValue.delete(),
              }
            : cleanedUpdate
        );
      }
  
      // 5. Tag counts were already adjusted earlier.

      // 6. If a new coverImageFocalPoint was provided (and we're not clearing cover), update the media doc.
      if (!isClearingCover) {
        const coverImageFocalPoint = cleanedUpdate.coverImageFocalPoint;
        const coverImageId = cleanedUpdate.coverImageId ?? existingData.coverImageId;
        if (coverImageId && typeof coverImageId === 'string' && coverImageFocalPoint && 'x' in coverImageFocalPoint && 'y' in coverImageFocalPoint) {
          const coverRef = firestore.collection(MEDIA_COLLECTION).doc(coverImageId);
          transaction.update(coverRef, { objectPosition: `${coverImageFocalPoint.x} ${coverImageFocalPoint.y}`, updatedAt: Date.now() });
        }
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

      const postMediaIds = getMediaIdsFromCard(updatedCard);
      const syncMediaIds = new Set([...preMediaIds, ...postMediaIds]);
      for (const mediaId of syncMediaIds) {
        void syncMediaToTypesenseById(mediaId);
      }

      return updatedCard;
  });
}

/**
 * Narrow cover-only mutation path.
 * Preserves card↔media backrefs, cover-derived media signals, and search sync
 * without paying the cost of the broad `updateCard()` pipeline.
 */
export async function updateCardCover(
  cardId: string,
  updates: Partial<Pick<Card, 'coverImageId' | 'coverImageFocalPoint'>>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const existingData = preSnap.data() as Card;
  const existingCoverId = existingData.coverImageId ?? null;
  const hasCoverIdUpdate = Object.prototype.hasOwnProperty.call(updates, 'coverImageId');
  const nextCoverIdRaw = updates.coverImageId;
  const nextCoverId = hasCoverIdUpdate
    ? typeof nextCoverIdRaw === 'string' && nextCoverIdRaw.trim().length > 0
      ? nextCoverIdRaw
      : null
    : existingCoverId;
  const focalProvided = Object.prototype.hasOwnProperty.call(updates, 'coverImageFocalPoint');
  const focalPoint = updates.coverImageFocalPoint;

  const isCoverUnchanged = !hasCoverIdUpdate || existingCoverId === nextCoverId;
  const isFocalUnchanged =
    !focalProvided ||
    (existingData.coverImageFocalPoint?.x === focalPoint?.x &&
      existingData.coverImageFocalPoint?.y === focalPoint?.y);
  if (isCoverUnchanged && isFocalUnchanged) {
    const card = await getCardById(cardId);
    if (!card) {
      throw new Error(`Failed to fetch card with ID ${cardId}`);
    }
    return card;
  }

  const oldMediaIds = getMediaIdsFromCard(existingData);
  const newMediaIds = new Set(oldMediaIds);
  if (existingCoverId) newMediaIds.delete(existingCoverId);
  if (nextCoverId) newMediaIds.add(nextCoverId);

  const allTags = await getAllTags();
  const mediaSignals = await computeCardMediaSignalsFromMediaIds(newMediaIds, allTags);
  const clearingCover = hasCoverIdUpdate && nextCoverId === null;
  const coverChanged = hasCoverIdUpdate && existingCoverId !== nextCoverId;
  const shouldClearCardFocalPoint = clearingCover || (coverChanged && !focalProvided);

  return withRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) {
        throw new Error(`Card with ID ${cardId} not found.`);
      }

      if (nextCoverId && nextCoverId !== existingCoverId) {
        const nextCoverRef = firestore.collection(MEDIA_COLLECTION).doc(nextCoverId);
        const nextCoverSnap = await transaction.get(nextCoverRef);
        if (!nextCoverSnap.exists) {
          throw new Error(`Cover media with ID ${nextCoverId} not found.`);
        }
      }

      const cardUpdate: Record<string, unknown> = {
        updatedAt: Date.now(),
        mediaWho: mediaSignals.mediaWho,
        mediaWhat: mediaSignals.mediaWhat,
        mediaWhen: mediaSignals.mediaWhen,
        mediaWhere: mediaSignals.mediaWhere,
        coverImage: FieldValue.delete(),
      };

      if (hasCoverIdUpdate) {
        if (clearingCover) {
          cardUpdate.coverImageId = FieldValue.delete();
        } else {
          cardUpdate.coverImageId = nextCoverId;
        }
      }

      if (focalProvided && focalPoint && nextCoverId) {
        cardUpdate.coverImageFocalPoint = focalPoint;
      } else if (shouldClearCardFocalPoint) {
        cardUpdate.coverImageFocalPoint = FieldValue.delete();
      }

      transaction.update(docRef, cardUpdate);

      if (coverChanged && existingCoverId && existingCoverId !== nextCoverId) {
        const oldCoverRef = firestore.collection(MEDIA_COLLECTION).doc(existingCoverId);
        transaction.update(oldCoverRef, {
          referencedByCardIds: FieldValue.arrayRemove(cardId),
          updatedAt: Date.now(),
        });
      }

      if (coverChanged && nextCoverId && nextCoverId !== existingCoverId) {
        const nextCoverRef = firestore.collection(MEDIA_COLLECTION).doc(nextCoverId);
        transaction.update(nextCoverRef, {
          referencedByCardIds: FieldValue.arrayUnion(cardId),
          updatedAt: Date.now(),
        });
      }

      if (focalProvided && focalPoint && nextCoverId) {
        const coverRef = firestore.collection(MEDIA_COLLECTION).doc(nextCoverId);
        transaction.update(coverRef, {
          objectPosition: `${focalPoint.x} ${focalPoint.y}`,
          updatedAt: Date.now(),
        });
      }
    });

    const updatedCard = await getCardById(cardId);
    if (!updatedCard) {
      throw new Error(`Failed to fetch updated card with ID ${cardId}`);
    }

    void syncCardToTypesense(updatedCard);
    const syncMediaIds = new Set<string>();
    if (existingCoverId) syncMediaIds.add(existingCoverId);
    if (nextCoverId) syncMediaIds.add(nextCoverId);
    syncMediaIds.forEach((mediaId) => void syncMediaToTypesenseById(mediaId));

    return updatedCard;
  });
}

function normalizeGalleryMembership(
  galleryMedia: Card['galleryMedia']
): Array<{ mediaId: string; caption?: string; objectPosition?: string }> {
  return (galleryMedia || [])
    .filter((item): item is NonNullable<Card['galleryMedia']>[number] => Boolean(item?.mediaId))
    .map((item) => ({
      mediaId: item.mediaId,
      ...(item.caption !== undefined ? { caption: item.caption } : {}),
      ...(item.objectPosition !== undefined ? { objectPosition: item.objectPosition } : {}),
    }))
    .sort((a, b) => {
      const mediaCmp = a.mediaId.localeCompare(b.mediaId);
      if (mediaCmp !== 0) return mediaCmp;
      const captionCmp = (a.caption ?? '').localeCompare(b.caption ?? '');
      if (captionCmp !== 0) return captionCmp;
      return (a.objectPosition ?? '').localeCompare(b.objectPosition ?? '');
    });
}

export function isGalleryReorderOnlyPayload(
  existingCard: Pick<Card, 'galleryMedia'>,
  updates: Partial<Pick<Card, 'galleryMedia'>>
): boolean {
  const keys = Object.keys(updates as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== 'galleryMedia') return false;
  if (!Array.isArray(updates.galleryMedia)) return false;

  const existing = existingCard.galleryMedia || [];
  const next = updates.galleryMedia || [];
  if (existing.length !== next.length) return false;

  const existingMembership = JSON.stringify(normalizeGalleryMembership(existing));
  const nextMembership = JSON.stringify(normalizeGalleryMembership(next));
  return existingMembership === nextMembership;
}

export function isGalleryOnlyPayload(
  updates: Partial<Pick<Card, 'galleryMedia'>>
): boolean {
  const keys = Object.keys(updates as Record<string, unknown>);
  return keys.length === 1 && keys[0] === 'galleryMedia' && Array.isArray(updates.galleryMedia);
}

export function isChildrenReorderOnlyPayload(
  existingCard: Pick<Card, 'childrenIds'>,
  updates: Partial<Pick<Card, 'childrenIds'>>
): boolean {
  const keys = Object.keys(updates as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== 'childrenIds') return false;
  if (!Array.isArray(updates.childrenIds)) return false;

  const existing = normalizeChildrenIds(existingCard.childrenIds);
  const next = normalizeChildrenIds(updates.childrenIds);
  if (existing.length !== next.length) return false;
  if (existing.length <= 1) return false;

  const existingSorted = [...existing].sort((a, b) => a.localeCompare(b));
  const nextSorted = [...next].sort((a, b) => a.localeCompare(b));
  return existingSorted.every((id, index) => id === nextSorted[index]);
}

export function isChildrenOnlyPayload(
  updates: Partial<Pick<Card, 'childrenIds'>>
): boolean {
  const keys = Object.keys(updates as Record<string, unknown>);
  return keys.length === 1 && keys[0] === 'childrenIds' && Array.isArray(updates.childrenIds);
}

export function isCollectionRootOnlyPayload(
  updates: Partial<Pick<Card, 'isCollectionRoot' | 'collectionRootOrder'>>
): boolean {
  const keys = Object.keys(updates as Record<string, unknown>);
  return (
    keys.length > 0 &&
    keys.every((key) => key === 'isCollectionRoot' || key === 'collectionRootOrder')
  );
}

type CardMetadataUpdates = Partial<
  Pick<Card, 'title' | 'subtitle' | 'excerpt' | 'excerptAuto' | 'type' | 'displayMode' | 'questionId'>
>;

const CARD_METADATA_ONLY_KEYS = new Set<keyof CardMetadataUpdates>([
  'title',
  'subtitle',
  'excerpt',
  'excerptAuto',
  'type',
  'displayMode',
  'questionId',
]);

export function isCardMetadataOnlyPayload(
  updates: CardMetadataUpdates
): boolean {
  const keys = Object.keys(updates as Record<string, unknown>) as Array<keyof CardMetadataUpdates>;
  return keys.length > 0 && keys.every((key) => CARD_METADATA_ONLY_KEYS.has(key));
}

/**
 * Narrow gallery reorder path.
 * Membership must remain unchanged; only the list order is updated.
 */
export async function updateCardGalleryOrder(
  cardId: string,
  galleryMedia: NonNullable<Card['galleryMedia']>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const existingData = preSnap.data() as Card;
  if (!isGalleryReorderOnlyPayload(existingData, { galleryMedia })) {
    throw new Error('Gallery reorder fast path requires unchanged gallery membership.');
  }

  const reordered = galleryMedia.map((item, index) => {
    const rest = stripHydratedGalleryItem(item);
    return {
      ...rest,
      order: index,
    };
  });

  await docRef.update({
    galleryMedia: reordered,
    updatedAt: Date.now(),
  });

  const updatedCard = await getCardById(cardId);
  if (!updatedCard) {
    throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  }

  void syncCardToTypesense(updatedCard);
  return updatedCard;
}

/**
 * Narrow gallery-only mutation path.
 * Handles reorder, add/remove membership, and slot metadata updates without
 * paying the cost of the broad `updateCard()` pipeline.
 */
export async function updateCardGallery(
  cardId: string,
  galleryMedia: NonNullable<Card['galleryMedia']>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const existingData = preSnap.data() as Card;
  const dehydratedGalleryMedia = galleryMedia.map((item, index) => {
    const rest = stripHydratedGalleryItem(item);
    return {
      ...rest,
      order: index,
    };
  });

  const oldGalleryIds = new Set(
    (existingData.galleryMedia || [])
      .map((item) => item.mediaId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  );
  const newGalleryIds = new Set(
    dehydratedGalleryMedia
      .map((item) => item.mediaId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  );
  const mediaRemoved = [...oldGalleryIds].filter((id) => !newGalleryIds.has(id));
  const mediaAdded = [...newGalleryIds].filter((id) => !oldGalleryIds.has(id));

  const oldAllMediaIds = getMediaIdsFromCard(existingData);
  const newAllMediaIds = getMediaIdsFromCard({
    ...existingData,
    galleryMedia: dehydratedGalleryMedia,
  });
  const mediaSetChanged =
    oldAllMediaIds.size !== newAllMediaIds.size ||
    [...oldAllMediaIds].some((id) => !newAllMediaIds.has(id));

  const allTags = mediaSetChanged ? await getAllTags() : null;
  const mediaSignals = mediaSetChanged
    ? await computeCardMediaSignalsFromMediaIds(newAllMediaIds, allTags || [])
    : {
        mediaWho: existingData.mediaWho ?? [],
        mediaWhat: existingData.mediaWhat ?? [],
        mediaWhen: existingData.mediaWhen ?? [],
        mediaWhere: existingData.mediaWhere ?? [],
      };

  await firestore.runTransaction(async (transaction) => {
    if (mediaAdded.length > 0) {
      const addedRefs = mediaAdded.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id));
      const addedDocs = await transaction.getAll(...addedRefs);
      for (const mediaDoc of addedDocs) {
        if (!mediaDoc.exists) {
          throw new Error(`Gallery media with ID ${mediaDoc.id} not found.`);
        }
      }
    }

    transaction.update(docRef, {
      galleryMedia: dehydratedGalleryMedia,
      mediaWho: mediaSignals.mediaWho,
      mediaWhat: mediaSignals.mediaWhat,
      mediaWhen: mediaSignals.mediaWhen,
      mediaWhere: mediaSignals.mediaWhere,
      updatedAt: Date.now(),
    });

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
  });

  const updatedCard = await getCardById(cardId);
  if (!updatedCard) {
    throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  }

  void syncCardToTypesense(updatedCard);
  const syncMediaIds = new Set<string>([...mediaRemoved, ...mediaAdded]);
  syncMediaIds.forEach((mediaId) => void syncMediaToTypesenseById(mediaId));
  return updatedCard;
}

/**
 * Narrow children reorder path.
 * Membership must remain unchanged; only the sequence is updated.
 */
export async function updateCardChildrenOrder(
  cardId: string,
  childrenIds: string[]
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const existingData = preSnap.data() as Card;
  if (!isChildrenReorderOnlyPayload(existingData, { childrenIds })) {
    throw new Error('Children reorder fast path requires unchanged child membership.');
  }

  const normalizedChildren = normalizeChildrenIds(childrenIds, cardId);
  await docRef.update({
    childrenIds: normalizedChildren,
    updatedAt: Date.now(),
  });

  const updatedCard = await getCardById(cardId);
  if (!updatedCard) {
    throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  }

  void syncCardToTypesense(updatedCard);
  return updatedCard;
}

/**
 * Narrow collection-root mutation path.
 * Handles explicit top-level root placement and ordering without broad card recomputation.
 */
export async function updateCardCollectionRoot(
  cardId: string,
  updates: Partial<Pick<Card, 'isCollectionRoot' | 'collectionRootOrder'>>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const existingData = preSnap.data() as Card;
  const hasRootFlag = Object.prototype.hasOwnProperty.call(updates, 'isCollectionRoot');
  const nextIsRoot = hasRootFlag ? updates.isCollectionRoot === true : existingData.isCollectionRoot === true;
  let nextRootOrder =
    typeof updates.collectionRootOrder === 'number'
      ? updates.collectionRootOrder
      : existingData.collectionRootOrder;

  if (nextIsRoot && typeof nextRootOrder !== 'number') {
    const existingRoots = await getExistingCollectionRoots();
    nextRootOrder = nextCollectionRootOrderForAppend(existingRoots, cardId);
  }

  const payload: Record<string, unknown> = {
    isCollectionRoot: nextIsRoot,
    curatedNavEligible: computeCuratedNavEligible({
      childrenIds: existingData.childrenIds,
      isCollectionRoot: nextIsRoot,
    }),
    curatedRoot: FieldValue.delete(),
    curatedRootOrder: FieldValue.delete(),
    updatedAt: Date.now(),
  };

  if (nextIsRoot && typeof nextRootOrder === 'number') {
    payload.collectionRootOrder = nextRootOrder;
  } else {
    payload.collectionRootOrder = FieldValue.delete();
  }

  await docRef.update(payload);

  const updatedCard = await getCardById(cardId);
  if (!updatedCard) {
    throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  }

  void syncCardToTypesense(updatedCard);
  return updatedCard;
}

/**
 * Narrow children-only mutation path.
 * Handles attach/detach/reorder while preserving curated-tree integrity
 * without paying the cost of the broad `updateCard()` pipeline.
 */
export async function updateCardChildren(
  cardId: string,
  childrenIds: string[]
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const existingData = preSnap.data() as Card;
  const normalizedChildren = normalizeChildrenIds(childrenIds, cardId);
  const prevChildren = normalizeChildrenIds(existingData.childrenIds, cardId);
  const prevChildSet = new Set(prevChildren);

  await firestore.runTransaction(async (transaction) => {
    for (const childId of normalizedChildren) {
      if (prevChildSet.has(childId)) continue;
      const childRef = firestore.collection(CARDS_COLLECTION).doc(childId);
      const childSnap = await transaction.get(childRef);
      if (!childSnap.exists) {
        throw new AppError(
          ErrorCode.CURATED_COLLECTION_CHILD_NOT_FOUND,
          `Cannot add child ${childId}: card not found.`,
          { childId, parentCardId: cardId }
        );
      }
    }

    for (const childId of normalizedChildren) {
      const hasCycle = await wouldCreateCycle(transaction, cardId, childId);
      if (hasCycle) {
        throw new AppError(
          ErrorCode.CURATED_COLLECTION_CYCLE,
          `Cannot set child ${childId}; this would create a cycle.`,
          { childId, parentCardId: cardId }
        );
      }
    }

    transaction.update(docRef, {
      childrenIds: normalizedChildren,
      curatedNavEligible: computeCuratedNavEligible({
        childrenIds: normalizedChildren,
        isCollectionRoot: existingData.isCollectionRoot,
      }),
      curatedRoot: FieldValue.delete(),
      curatedRootOrder: FieldValue.delete(),
      updatedAt: Date.now(),
    });
  });

  const updatedCard = await getCardById(cardId);
  if (!updatedCard) {
    throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  }

  void syncCardToTypesense(updatedCard);
  return updatedCard;
}

/**
 * Narrow metadata-only mutation path.
 * Handles lightweight card edits that don't affect tags, media, status, or structure.
 */
export async function updateCardMetadata(
  cardId: string,
  updates: CardMetadataUpdates
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const existingData = preSnap.data() as Card;
  await assertValidQuestionBackedQa(updates, existingData);
  const cleanedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  ) as CardMetadataUpdates;

  if (Object.keys(cleanedUpdates).length === 0) {
    return existingData;
  }

  const mergedType = (cleanedUpdates.type ?? existingData.type) as Card['type'];
  const rawDisplay =
    cleanedUpdates.displayMode !== undefined ? cleanedUpdates.displayMode : existingData.displayMode;
  const normalizedDisplay = normalizeDisplayModeForType(mergedType, rawDisplay);

  const updatePayload: Partial<Card> = {
    ...cleanedUpdates,
    ...(Object.prototype.hasOwnProperty.call(cleanedUpdates, 'title')
      ? { title_lowercase: (cleanedUpdates.title ?? '').toLowerCase() }
      : {}),
    ...(
      Object.prototype.hasOwnProperty.call(cleanedUpdates, 'type') ||
      Object.prototype.hasOwnProperty.call(cleanedUpdates, 'displayMode')
        ? { displayMode: normalizedDisplay }
        : {}
    ),
    updatedAt: Date.now(),
  };

  await docRef.update(updatePayload);

  const updatedCard = await getCardById(cardId);
  if (!updatedCard) {
    throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  }

  void syncCardToTypesense(updatedCard);
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
export type GetCardsByIdsOptions = {
  /** `cover-only`: fewer Firestore reads; enough for discovery thumbnails. Default `full`. */
  hydrationMode?: 'full' | 'cover-only';
};

export async function getCardsByIds(
  ids: string[],
  options?: GetCardsByIdsOptions
): Promise<Card[]> {
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

  const mode = options?.hydrationMode ?? 'full';
  if (mode === 'cover-only') {
    const withCovers = await _hydrateCoverImagesOnly(orderedCards);
    return _hydrateFirstGallerySlideWhereNoCover(withCovers);
  }

  return await _hydrateCards(orderedCards);
}

/**
 * After a feed page resolves to matching parent cards, append each parent's direct
 * `childrenIds` (in list order) for the same hydration. Intended only when the feed query
 * already uses tag/dimension-style filters (the API gates `includeChildren` accordingly)—not
 * for search-only or type-only lists. Dedupes by docId; children must match `status` when it
 * is not `all` (e.g. published-only feeds skip draft children).
 */
export async function expandFeedItemsWithChildren(
  items: Card[],
  options: { status: Card['status'] | 'all'; hydrationMode: 'full' | 'cover-only' }
): Promise<Card[]> {
  if (!items.length) return items;
  const { status, hydrationMode } = options;

  const childMatchesStatus = (child: Card): boolean => {
    if (status === 'all') return true;
    return child.status === status;
  };

  const seen = new Set<string>();
  for (const c of items) {
    if (c.docId) seen.add(c.docId);
  }

  const idsToFetch = new Set<string>();
  for (const card of items) {
    for (const id of card.childrenIds || []) {
      if (id && !seen.has(id)) idsToFetch.add(id);
    }
  }
  if (idsToFetch.size === 0) return items;

  const fetched = await getCardsByIds([...idsToFetch], { hydrationMode });
  const byId = new Map(fetched.map((c) => [c.docId!, c]));

  const out: Card[] = [];
  for (const card of items) {
    out.push(card);
    for (const cid of card.childrenIds || []) {
      if (!cid || seen.has(cid)) continue;
      const ch = byId.get(cid);
      if (!ch?.docId) continue;
      if (!childMatchesStatus(ch)) continue;
      seen.add(cid);
      out.push(ch);
    }
  }
  return out;
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
 * Uses denormalized `curatedNavEligible` (maintained in create/update/delete) so we query by flag
 * instead of scanning recent cards. Requires composite indexes and a one-time backfill for legacy docs.
 */
export async function getCollectionCards(
  status: Card['status'] | 'all' = 'published',
  options: { limit?: number; hydrationMode?: 'full' | 'cover-only' } = {}
): Promise<Card[]> {
  let query: FirebaseFirestore.Query = firestore
    .collection(CARDS_COLLECTION)
    .where('isCollectionRoot', '==', true);

  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  query = query.limit(options.limit ?? COLLECTIONS_LIST_LIMIT);

  const snapshot = await query.get();
  const cards = snapshot.docs
    .map(doc => ({ docId: doc.id, ...doc.data() } as Card))
    .sort(compareCollectionRootCards);

  if (options.hydrationMode === 'cover-only') {
    return _hydrateCoverImagesOnly(cards);
  }
  return _hydrateCards(cards);
}

/** Firestore transaction getAll limit is 500. Use smaller chunks for tag count updates. */
const BULK_UPDATE_TAGS_CHUNK_SIZE = 400;

type BulkTagDerived = {
  filterTags: Record<string, boolean>;
  who: string[];
  what: string[];
  when: string[];
  where: string[];
  whoSortKey: string;
  whatSortKey: string;
  whereSortKey: string;
  journalWhenSortAsc: number;
  journalWhenSortDesc: number;
};

async function deriveBulkTagFieldsForTags(
  directTags: string[],
  allTags: Tag[]
): Promise<BulkTagDerived> {
  const cleanedTags = Array.from(
    new Set(directTags.filter((tagId): tagId is string => typeof tagId === 'string' && tagId.trim().length > 0))
  );
  const tagMap = buildTagMap(allTags);
  const dimensionSortKeys = computeDimensionSortKeys(cleanedTags, allTags);

  if (cleanedTags.length === 0) {
    const journalWhenSort = computeJournalWhenSortKeys([], tagMap);
    return {
      filterTags: {},
      who: [],
      what: [],
      when: [],
      where: [],
      whoSortKey: dimensionSortKeys.whoSortKey,
      whatSortKey: dimensionSortKeys.whatSortKey,
      whereSortKey: dimensionSortKeys.whereSortKey,
      journalWhenSortAsc: journalWhenSort.journalWhenSortAsc,
      journalWhenSortDesc: journalWhenSort.journalWhenSortDesc,
    };
  }

  const ancestorTags = await getTagAncestors(cleanedTags, allTags);
  const inheritedTags = Array.from(new Set([...cleanedTags, ...ancestorTags]));
  const dimensionalTags = await organizeTagsByDimension(inheritedTags, allTags);
  const journalWhenSort = computeJournalWhenSortKeys(dimensionalTags.when || [], tagMap);
  const filterTags = inheritedTags.reduce((acc, tagId) => {
    acc[tagId] = true;
    return acc;
  }, {} as Record<string, boolean>);

  return {
    filterTags,
    who: dimensionalTags.who || [],
    what: dimensionalTags.what || [],
    when: dimensionalTags.when || [],
    where: dimensionalTags.where || [],
    whoSortKey: dimensionSortKeys.whoSortKey,
    whatSortKey: dimensionSortKeys.whatSortKey,
    whereSortKey: dimensionSortKeys.whereSortKey,
    journalWhenSortAsc: journalWhenSort.journalWhenSortAsc,
    journalWhenSortDesc: journalWhenSort.journalWhenSortDesc,
  };
}

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

  const allTags = await getAllTags();
  const tagLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
  const derived = await deriveBulkTagFieldsForTags(tags, allTags);

  for (let i = 0; i < cardIds.length; i += BULK_UPDATE_TAGS_CHUNK_SIZE) {
    const chunk = cardIds.slice(i, i + BULK_UPDATE_TAGS_CHUNK_SIZE);

    await firestore.runTransaction(async (transaction) => {
      const cardRefs = chunk.map(id => firestore.collection(CARDS_COLLECTION).doc(id));
      const cardDocs = await transaction.getAll(...cardRefs);

      for (const cardDoc of cardDocs) {
        if (!cardDoc.exists) continue;

        const cardData = cardDoc.data() as Card;
        const newCardData = { ...cardData, tags };
        await updateTagCountsForCard(cardData, newCardData, transaction, tagLookup);
      }

      for (const cardDoc of cardDocs) {
        if (!cardDoc.exists) continue;
        const cardId = cardDoc.id;

        const cardRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
        transaction.update(cardRef, {
          tags,
          filterTags: derived.filterTags,
          who: derived.who,
          what: derived.what,
          when: derived.when,
          where: derived.where,
          whoSortKey: derived.whoSortKey,
          whatSortKey: derived.whatSortKey,
          whereSortKey: derived.whereSortKey,
          journalWhenSortAsc: derived.journalWhenSortAsc,
          journalWhenSortDesc: derived.journalWhenSortDesc,
          updatedAt: Date.now(),
        });
      }
    });
  }
}

export async function bulkApplyTagDelta(
  cardIds: string[],
  addTagIds: string[],
  removeTagIds: string[]
): Promise<void> {
  if (!cardIds || cardIds.length === 0) {
    return;
  }

  const addSet = new Set(
    (addTagIds || []).filter((tagId): tagId is string => typeof tagId === 'string' && tagId.trim().length > 0)
  );
  const removeSet = new Set(
    (removeTagIds || []).filter((tagId): tagId is string => typeof tagId === 'string' && tagId.trim().length > 0)
  );

  if (addSet.size === 0 && removeSet.size === 0) {
    return;
  }

  const allTags = await getAllTags();
  const tagLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
  const derivedCache = new Map<string, BulkTagDerived>();

  for (let i = 0; i < cardIds.length; i += BULK_UPDATE_TAGS_CHUNK_SIZE) {
    const chunk = cardIds.slice(i, i + BULK_UPDATE_TAGS_CHUNK_SIZE);

    await firestore.runTransaction(async (transaction) => {
      const cardRefs = chunk.map((id) => firestore.collection(CARDS_COLLECTION).doc(id));
      const cardDocs = await transaction.getAll(...cardRefs);

      for (const cardDoc of cardDocs) {
        if (!cardDoc.exists) continue;

        const cardData = cardDoc.data() as Card;
        const currentTags = cardData.tags || [];
        const nextTagSet = new Set(currentTags);
        addSet.forEach((tagId) => nextTagSet.add(tagId));
        removeSet.forEach((tagId) => nextTagSet.delete(tagId));
        const nextTags = Array.from(nextTagSet);

        const unchanged =
          nextTags.length === currentTags.length &&
          nextTags.every((tagId) => currentTags.includes(tagId));
        if (unchanged) continue;

        const cacheKey = [...nextTags].sort((a, b) => a.localeCompare(b)).join('\u001f');
        let derived = derivedCache.get(cacheKey);
        if (!derived) {
          derived = await deriveBulkTagFieldsForTags(nextTags, allTags);
          derivedCache.set(cacheKey, derived);
        }

        await updateTagCountsForCard(
          cardData,
          { ...cardData, tags: nextTags },
          transaction,
          tagLookup
        );

        transaction.update(cardDoc.ref, {
          tags: nextTags,
          filterTags: derived.filterTags,
          who: derived.who,
          what: derived.what,
          when: derived.when,
          where: derived.where,
          whoSortKey: derived.whoSortKey,
          whatSortKey: derived.whatSortKey,
          whereSortKey: derived.whereSortKey,
          journalWhenSortAsc: derived.journalWhenSortAsc,
          journalWhenSortDesc: derived.journalWhenSortDesc,
          updatedAt: Date.now(),
        });
      }
    });
  }
}

/**
 * Creates a duplicate of an existing card as a draft.
 * Copies content, tags, media references, and gallery but not children.
 * The new card goes through full createCard() to get proper tag counts, Typesense sync, etc.
 */
export async function duplicateCard(sourceCardId: string): Promise<Card> {
  const source = await getCardById(sourceCardId);
  if (!source) {
    throw new Error(`Card with ID ${sourceCardId} not found.`);
  }

  const newCardData: Partial<Omit<Card, 'docId' | 'createdAt' | 'updatedAt' | 'filterTags'>> = {
    title: `Copy of ${source.title}`,
    subtitle: source.subtitle,
    excerpt: source.excerpt,
    content: source.content,
    type: source.type,
    status: 'draft',
    displayMode: source.displayMode,
    coverImageId: source.coverImageId,
    coverImageFocalPoint: source.coverImageFocalPoint,
    galleryMedia: source.galleryMedia?.map((item) => stripHydratedGalleryItem(item)) ?? [],
    contentMedia: source.contentMedia,
    tags: source.tags ?? [],
  };

  return createCard(newCardData);
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
    const directChildIds = normalizeChildrenIds(cardToDelete.childrenIds, cardId);

    if (cardToDelete.isCollectionRoot === true && directChildIds.length > 0) {
      throw new AppError(
        ErrorCode.CONFLICT,
        'Cannot delete a root card that still has children.',
        { cardId, childCount: directChildIds.length }
      );
    }

    // Collect media IDs for transaction cleanup work
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

    // Preload tag tree once so transaction-side tag count updates remain write-only.
    const allTags = await getAllTags();
    const tagPathLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
    const storagePathsToDelete = new Set<string>();

    return withRetry(async () => {
      return firestore.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists) {
            console.warn(`Card with ID ${cardId} not found for deletion.`);
            return;
        }
        const currentCard = docSnap.data() as Card;

        // Read phase (must complete before writes in Firestore transactions)
        const parentCardsQuery = firestore.collection(CARDS_COLLECTION)
            .where('childrenIds', 'array-contains', cardId);
        const parentCardsSnapshot = await transaction.get(parentCardsQuery);
        const mediaRefs = Array.from(new Set(mediaToDelete)).map((mediaId) =>
          firestore.collection(MEDIA_COLLECTION).doc(mediaId)
        );
        const mediaSnapshots = mediaRefs.length > 0 ? await transaction.getAll(...mediaRefs) : [];

        // Write phase
        // Decrement counts for all associated tags if the card was published.
        if (currentCard.status === 'published' && currentCard.tags && currentCard.tags.length > 0) {
            await updateTagCountsForCard(
              currentCard,
              { ...currentCard, tags: [] },
              transaction,
              tagPathLookup
            );
        }

        for (const parentDoc of parentCardsSnapshot.docs) {
          const parentData = parentDoc.data() as Card;
          const updatedChildrenIds = adoptDeletedCardChildren(parentData.childrenIds, cardId, directChildIds);
          transaction.update(parentDoc.ref, {
            childrenIds: updatedChildrenIds,
            curatedNavEligible: computeCuratedNavEligible({
              childrenIds: updatedChildrenIds,
              isCollectionRoot: parentData.isCollectionRoot,
            }),
            curatedRoot: FieldValue.delete(),
            curatedRootOrder: FieldValue.delete(),
            updatedAt: Date.now(),
          });
        }

        // Remove media docs + decrement media tag counts using pre-read snapshots.
        for (const mediaSnap of mediaSnapshots) {
          if (!mediaSnap.exists) continue;
          const mediaData = mediaSnap.data() as Media;
          if (mediaData.storagePath) storagePathsToDelete.add(mediaData.storagePath);
          await updateTagCountsForMedia(mediaData.tags || [], [], transaction, tagPathLookup);
          transaction.delete(mediaSnap.ref);
        }

        // Delete the card document
        transaction.delete(docRef);
      });
    }).then(async () => {
        await unlinkCardFromAllQuestions(cardId);
        void removeCardFromTypesense(cardId);
        for (const mediaId of mediaToDelete) {
          void removeMediaFromTypesense(mediaId);
        }

        // Post-transaction: Try immediate storage cleanup for deleted media files.
        // This runs outside Firestore transaction boundaries to keep DB integrity decoupled from storage availability.
        for (const storagePath of storagePathsToDelete) {
          try {
            const success = await deleteFromStorageWithRetry(storagePath);
            if (!success) {
              await markStorageForLaterDeletion(storagePath);
            }
          } catch (error) {
            console.error(`Error processing storage cleanup for ${storagePath}:`, error);
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
  /** When 2+ values, Firestore `in` filter (OR). Omit when using single `type`. */
  types?: Card['type'][];
  tags?: string[];
  dimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  };
  /** When true for a dimension, keep only cards with no card-level tags in that dimension (empty or absent array). Applied in-memory with query oversampling. */
  dimensionMissing?: {
    who?: boolean;
    what?: boolean;
    when?: boolean;
    where?: boolean;
  };
  childrenIds_contains?: string;
  limit?: number;
  lastDocId?: string;
  hydrationMode?: 'full' | 'cover-only';
  /** When `q` is set, title prefix search uses `orderBy('title_lowercase')` and this is ignored. */
  sortBy?: 'when' | 'created' | 'title' | 'who' | 'what' | 'where';
  sortDir?: 'asc' | 'desc';
} = {}): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const { 
    q,
    status = 'published',
    type = 'all',
    types: typesIn,
    tags,
    dimensionalTags,
    dimensionMissing,
    childrenIds_contains,
    limit = 10,
    lastDocId,
    hydrationMode = 'full',
    sortBy = 'when',
    sortDir = 'desc',
  } = options;

  const multiTypes =
    typesIn && typesIn.length > 1 ? [...new Set(typesIn)].slice(0, 10) : undefined;
  const singleTypeFilter =
    multiTypes !== undefined
      ? undefined
      : typesIn && typesIn.length === 1
        ? typesIn[0]
        : type && type !== 'all'
          ? type
          : undefined;

  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);
  const trimmedQuery = q?.trim() ?? '';
  const hasSearch = trimmedQuery.length > 0;
  const hasDimensionMissingFilters = Boolean(
    dimensionMissing &&
      (dimensionMissing.who ||
        dimensionMissing.what ||
        dimensionMissing.when ||
        dimensionMissing.where)
  );
  const needsPostFilterOversample = hasDimensionMissingFilters;

  // Combined text search and tag filtering
  if (hasSearch) {
    const lower = trimmedQuery.toLowerCase();
    query = query
      .where('title_lowercase', '>=', lower)
      .where('title_lowercase', '<=', lower + '\uf8ff')
      .orderBy('title_lowercase')
      .orderBy(FieldPath.documentId(), 'asc');
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

  // Filter by type (single == or multi in)
  if (multiTypes && multiTypes.length > 1) {
    query = query.where('type', 'in', multiTypes);
  } else if (singleTypeFilter) {
    query = query.where('type', '==', singleTypeFilter);
  }

  // Filter by dimensional tags
  if (dimensionalTags) {
    const { who, what, when, where } = dimensionalTags;
    
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
  }

  // Filter by childrenIds_contains
  if (childrenIds_contains) {
    query = query.where('childrenIds', 'array-contains', childrenIds_contains);
  }

  // Apply sorting (title search uses range on title + orderBy title_lowercase).
  // `when` uses denormalized journal keys where undated items sort last.
  if (!hasSearch) {
    if (sortBy === 'created') {
      query =
        sortDir === 'asc'
          ? query.orderBy('createdAt', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : query.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    } else if (sortBy === 'title') {
      query =
        sortDir === 'asc'
          ? query.orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : query.orderBy('title_lowercase', 'desc').orderBy(FieldPath.documentId(), 'desc');
    } else if (sortBy === 'who' || sortBy === 'what' || sortBy === 'where') {
      const key = sortBy === 'who' ? 'whoSortKey' : sortBy === 'what' ? 'whatSortKey' : 'whereSortKey';
      query =
        sortDir === 'asc'
          ? query.orderBy(key, 'asc').orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : query.orderBy(key, 'desc').orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc');
    } else {
      query =
        sortDir === 'asc'
          ? query.orderBy('journalWhenSortAsc', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : query.orderBy('journalWhenSortDesc', 'desc').orderBy(FieldPath.documentId(), 'desc');
    }
  }

  // Apply pagination
  if (lastDocId) {
    const lastDocSnap = await firestore.collection(CARDS_COLLECTION).doc(lastDocId).get();
    if (lastDocSnap.exists) {
      query = query.startAfter(lastDocSnap);
    }
  }

  const querySnapshot = await query.limit(
    needsPostFilterOversample ? Math.max(limit * 5, 100) : limit
  ).get();

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

  const cardDimEmpty = (arr: string[] | undefined) => !arr || arr.length === 0;

  if (hasDimensionMissingFilters && dimensionMissing) {
    cards = cards.filter((card) => {
      if (dimensionMissing.who && !cardDimEmpty(card.who)) return false;
      if (dimensionMissing.what && !cardDimEmpty(card.what)) return false;
      if (dimensionMissing.when && !cardDimEmpty(card.when)) return false;
      if (dimensionMissing.where && !cardDimEmpty(card.where)) return false;
      return true;
    });
  }
  if (cards.length > limit) {
    cards = cards.slice(0, limit);
  }

  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  let lastDocIdResult = lastVisible ? lastVisible.id : undefined;
  let hasMore = needsPostFilterOversample
    ? querySnapshot.size >= Math.max(limit * 5, 100)
    : querySnapshot.size === limit;

  // Temporary safety net: if title_lowercase is missing on legacy docs, strict prefix search can miss obvious results.
  // Fall back to a bounded scan and in-memory title match so admin search remains usable until backfill runs.
  if (hasSearch && cards.length === 0) {
    let fallbackQuery: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);
    if (status && status !== 'all') fallbackQuery = fallbackQuery.where('status', '==', status);
    if (multiTypes && multiTypes.length > 1) {
      fallbackQuery = fallbackQuery.where('type', 'in', multiTypes);
    } else if (singleTypeFilter) {
      fallbackQuery = fallbackQuery.where('type', '==', singleTypeFilter);
    }
    if (tags && tags.length > 0) {
      tags.forEach((tag) => {
        fallbackQuery = fallbackQuery.where(`filterTags.${tag}`, '==', true);
      });
    }
    if (dimensionalTags) {
      const { who, what, when, where } = dimensionalTags;
      if (who && who.length > 0) fallbackQuery = fallbackQuery.where('who', 'array-contains-any', who);
      if (what && what.length > 0) fallbackQuery = fallbackQuery.where('what', 'array-contains-any', what);
      if (when && when.length > 0) fallbackQuery = fallbackQuery.where('when', 'array-contains-any', when);
      if (where && where.length > 0) fallbackQuery = fallbackQuery.where('where', 'array-contains-any', where);
    }
    if (childrenIds_contains) {
      fallbackQuery = fallbackQuery.where('childrenIds', 'array-contains', childrenIds_contains);
    }

    if (sortBy === 'created') {
      fallbackQuery =
        sortDir === 'asc'
          ? fallbackQuery.orderBy('createdAt', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : fallbackQuery.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    } else if (sortBy === 'title') {
      fallbackQuery =
        sortDir === 'asc'
          ? fallbackQuery.orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : fallbackQuery.orderBy('title_lowercase', 'desc').orderBy(FieldPath.documentId(), 'desc');
    } else if (sortBy === 'who' || sortBy === 'what' || sortBy === 'where') {
      const key = sortBy === 'who' ? 'whoSortKey' : sortBy === 'what' ? 'whatSortKey' : 'whereSortKey';
      fallbackQuery =
        sortDir === 'asc'
          ? fallbackQuery.orderBy(key, 'asc').orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : fallbackQuery.orderBy(key, 'desc').orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc');
    } else {
      fallbackQuery =
        sortDir === 'asc'
          ? fallbackQuery.orderBy('journalWhenSortAsc', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : fallbackQuery.orderBy('journalWhenSortDesc', 'desc').orderBy(FieldPath.documentId(), 'desc');
    }

    const fallbackSnap = await fallbackQuery.limit(200).get();
    const lower = trimmedQuery.toLowerCase();
    let fallbackItems = fallbackSnap.docs
      .map((doc) => ({ docId: doc.id, ...(doc.data() as Card) } as Card))
      .filter((c) => (c.title || '').toLowerCase().includes(lower))
      .slice(0, 200);
    if (hasDimensionMissingFilters && dimensionMissing) {
      fallbackItems = fallbackItems.filter((card) => {
        if (dimensionMissing.who && !cardDimEmpty(card.who)) return false;
        if (dimensionMissing.what && !cardDimEmpty(card.what)) return false;
        if (dimensionMissing.when && !cardDimEmpty(card.when)) return false;
        if (dimensionMissing.where && !cardDimEmpty(card.where)) return false;
        return true;
      });
    }
    fallbackItems = fallbackItems.slice(0, limit);

    if (fallbackItems.length > 0) {
      cards = hydrationMode === 'cover-only'
        ? await _hydrateCoverImagesOnly(fallbackItems)
        : await _hydrateCards(fallbackItems);
      lastDocIdResult = cards[cards.length - 1]?.docId;
      hasMore = false;
    }
  }

  return { items: cards, lastDocId: lastDocIdResult, hasMore };
}

/**
 * Lightweight parent lookup for delete-safety checks.
 * Uses a narrow query shape to avoid index coupling with generic feed/list sorting.
 */
export async function getParentCardsByChildId(
  childId: string,
  options: {
    status?: Card['status'] | 'all';
    limit?: number;
    hydrationMode?: 'full' | 'cover-only';
  } = {}
): Promise<Card[]> {
  const { status = 'all', limit = 200, hydrationMode = 'cover-only' } = options;
  let query: FirebaseFirestore.Query = firestore
    .collection(CARDS_COLLECTION)
    .where('childrenIds', 'array-contains', childId);

  if (status !== 'all') {
    query = query.where('status', '==', status);
  }

  const snap = await query.limit(limit).get();
  let cards = snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Card));
  cards = hydrationMode === 'cover-only' ? await _hydrateCoverImagesOnly(cards) : await _hydrateCards(cards);
  return cards;
}

 

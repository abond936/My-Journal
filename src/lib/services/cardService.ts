import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, cardSchema } from '@/lib/types/card';
import type { Question } from '@/lib/types/question';
import { Tag } from '@/lib/types/tag';
import {
  updateTagCountsForCard,
  mergeDerivedTagsForCardRecord,
  getAllTags,
  getTagAncestors,
  organizeTagsByDimension,
} from '@/lib/firebase/tagService';
import { getFirestore, FieldPath, FieldValue } from 'firebase-admin/firestore';
import { deleteMediaAsset } from './images/mediaStorage';
import { extractMediaFromContent, stripContentImageSrc, hydrateContentImageSrc, removeMediaFromContent, generateExcerpt } from '@/lib/utils/cardUtils';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';
import { applyPublicStorageUrlsToMedia } from '@/lib/utils/storageUrl';
import { Media } from '@/lib/types/photo';
import { AppError, ErrorCode } from '@/lib/types/error';
import {
  QuestionAnswerConflictError,
  unlinkCardFromAllQuestions,
} from '@/lib/services/questionService';
import { syncCardToTypesense, removeCardFromTypesense } from '@/lib/services/typesenseService';
import { syncMediaToTypesenseById } from '@/lib/services/typesenseMediaService';
import {
  compareCollectionRootCards,
  nextCollectionRootOrderForAppend,
} from '@/lib/utils/curatedCollectionTree';
import { orderIdsBySeed } from '@/lib/utils/seededRandomOrder';
import { buildSubjectFilterTags, resolveSubjectTagState } from '@/lib/utils/subjectTag';
import { getAuthorSettings } from '@/lib/services/authorSettingsService';
import { protectExistingCardInheritance, resolveNewCardInheritanceOverrides } from '@/lib/utils/galleryTagInheritance';

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
            error.message.includes('not found') ||
            error instanceof QuestionAnswerConflictError) {
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

function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedDeep(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, removeUndefinedDeep(nested)])
    ) as T;
  }
  return value;
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
  mediaMap.forEach((media, id) => {
    mediaMap.set(id, applyPublicStorageUrlsToMedia(media));
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

export function computeDimensionSortKeys(
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

async function loadMediaMapByIds(mediaIds: Iterable<string>): Promise<Map<string, Media>> {
  const uniqueIds = Array.from(
    new Set(
      Array.from(mediaIds).filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      )
    )
  );

  const mediaMap = new Map<string, Media>();
  if (uniqueIds.length === 0) {
    return mediaMap;
  }

  const docs = await Promise.all(
    uniqueIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get())
  );

  docs.forEach((doc) => {
    if (doc.exists) {
      mediaMap.set(doc.id, doc.data() as Media);
    }
  });

  _applyPublicStorageUrls(mediaMap);
  return mediaMap;
}

function computeCardMediaSignalsFromMediaMap(
  mediaMap: Map<string, Media>,
  allTags: Tag[]
): Pick<Card, 'mediaWho' | 'mediaWhat' | 'mediaWhen' | 'mediaWhere'> {
  const tagIds = new Set<string>();
  mediaMap.forEach((media) => {
    for (const tagId of media.tags || []) {
      if (typeof tagId === 'string' && tagId.trim()) {
        tagIds.add(tagId);
      }
    }
  });
  return computeMediaSignalBuckets(Array.from(tagIds), allTags);
}

function hydrateCardFromMediaMap(card: Card, mediaMap: Map<string, Media>): Card {
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
  if (hydratedCard.galleryMedia) {
    hydratedCard.galleryMedia = hydratedCard.galleryMedia.map((item) => ({
      ...item,
      media: mediaMap.get(item.mediaId),
    }));
  }
  hydratedCard.displayThumbnail =
    hydratedCard.coverImage ?? hydratedCard.galleryMedia?.[0]?.media ?? null;
  hydratedCard.displayThumbnailSource = hydratedCard.coverImage
    ? 'cover'
    : hydratedCard.galleryMedia?.[0]?.media
      ? 'gallery'
      : null;
  if (hydratedCard.content) {
    hydratedCard.content = hydrateContentImageSrc(hydratedCard.content, mediaMap);
  }
  return hydratedCard;
}

async function getExistingMediaDocIdsInTransaction(
  transaction: FirebaseFirestore.Transaction,
  mediaIds: Iterable<string>
): Promise<Set<string>> {
  const uniqueIds = Array.from(
    new Set(
      Array.from(mediaIds).filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      )
    )
  );

  if (uniqueIds.length === 0) {
    return new Set<string>();
  }

  const refs = uniqueIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id));
  const docs = await transaction.getAll(...refs);
  const existingIds = new Set<string>();
  for (const doc of docs) {
    if (doc.exists) {
      existingIds.add(doc.id);
    }
  }
  return existingIds;
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

function cardReferencesMediaId(card: Card, mediaId: string): boolean {
  return (
    getMediaIdsFromCard(card).has(mediaId) ||
    extractMediaFromContent(card.content ?? '').includes(mediaId)
  );
}

/**
 * Builds card-field updates for detaching one media id from every card surface.
 * Returns null when the card does not reference the media id.
 */
export function buildMediaReferenceRemovalUpdate(
  card: Card,
  mediaId: string
): { cardUpdate: Record<string, unknown>; remainingMediaIds: Set<string> } | null {
  if (!cardReferencesMediaId(card, mediaId)) {
    return null;
  }

  const cardUpdate: Record<string, unknown> = {};
  const inBodyHtml = extractMediaFromContent(card.content ?? '').includes(mediaId);

  let nextCoverId = card.coverImageId ?? null;
  if (card.coverImageId === mediaId) {
    cardUpdate.coverImageId = FieldValue.delete();
    cardUpdate.coverImageFocalPoint = FieldValue.delete();
    cardUpdate.coverImage = FieldValue.delete();
    nextCoverId = null;
  }

  let nextGalleryMedia = card.galleryMedia;
  if (card.galleryMedia?.some((g) => g.mediaId === mediaId)) {
    nextGalleryMedia = card.galleryMedia.filter((g) => g.mediaId !== mediaId);
    cardUpdate.galleryMedia = nextGalleryMedia;
  }

  let nextContent = card.content;
  let nextContentMedia = card.contentMedia ?? [];
  if ((card.contentMedia ?? []).includes(mediaId) || inBodyHtml) {
    nextContent = removeMediaFromContent(card.content, mediaId);
    nextContentMedia = (card.contentMedia ?? []).filter((id) => id !== mediaId);
    cardUpdate.content = nextContent;
    cardUpdate.contentMedia = nextContentMedia;
  }

  const remainingMediaIds = new Set<string>();
  if (nextCoverId) remainingMediaIds.add(nextCoverId);
  nextGalleryMedia?.forEach((item) => {
    if (item.mediaId) remainingMediaIds.add(item.mediaId);
  });
  nextContentMedia.forEach((id) => {
    if (id) remainingMediaIds.add(id);
  });
  extractMediaFromContent(nextContent ?? '').forEach((id) => {
    if (id) remainingMediaIds.add(id);
  });

  return { cardUpdate, remainingMediaIds };
}

/** Removes all occurrences of a media reference from a card (cover, gallery, and content/inline). */
export async function removeMediaReferenceFromCard(cardId: string, mediaId: string): Promise<void> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
  const allTags = await getAllTags();

  await withRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const cardSnap = await transaction.get(docRef);
      if (!cardSnap.exists) return;

      const removal = buildMediaReferenceRemovalUpdate(cardSnap.data() as Card, mediaId);
      if (!removal) return;

      const { cardUpdate, remainingMediaIds } = removal;
      const mediaIdsToRead = new Set(remainingMediaIds);
      mediaIdsToRead.add(mediaId);

      const mediaMap = new Map<string, Media>();
      let mediaDocExists = false;
      if (mediaIdsToRead.size > 0) {
        const refs = [...mediaIdsToRead].map((id) => firestore.collection(MEDIA_COLLECTION).doc(id));
        const docs = await transaction.getAll(...refs);
        for (const doc of docs) {
          if (!doc.exists) continue;
          if (doc.id === mediaId) {
            mediaDocExists = true;
          }
          if (remainingMediaIds.has(doc.id)) {
            mediaMap.set(doc.id, doc.data() as Media);
          }
        }
      }

      const mediaSignals = computeCardMediaSignalsFromMediaMap(mediaMap, allTags);

      transaction.update(docRef, {
        ...cardUpdate,
        mediaWho: mediaSignals.mediaWho,
        mediaWhat: mediaSignals.mediaWhat,
        mediaWhen: mediaSignals.mediaWhen,
        mediaWhere: mediaSignals.mediaWhere,
        updatedAt: Date.now(),
      });

      if (mediaDocExists) {
        transaction.update(mediaRef, {
          referencedByCardIds: FieldValue.arrayRemove(cardId),
          updatedAt: Date.now(),
        });
      }
    });
  });

  void syncMediaToTypesenseById(mediaId);
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

  const mediaMap = await loadMediaMapByIds(mediaIds);
  return cards.map((card) => hydrateCardFromMediaMap(card, mediaMap));
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
      hydratedCard.displayThumbnail = hydratedCard.coverImage;
      hydratedCard.displayThumbnailSource = hydratedCard.coverImage ? 'cover' : null;
      if (hydratedCard.coverImage && !hydratedCard.coverImageFocalPoint) {
        hydratedCard.coverImageFocalPoint = deriveFocalPointFromObjectPosition(
          hydratedCard.coverImage.objectPosition || '50% 50%',
          hydratedCard.coverImage.width,
          hydratedCard.coverImage.height
        );
      }
    } else {
      hydratedCard.coverImage = null;
      hydratedCard.displayThumbnail = null;
      hydratedCard.displayThumbnailSource = null;
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
      return {
        ...card,
        displayThumbnail: card.coverImage ?? card.displayThumbnail ?? null,
        displayThumbnailSource: card.coverImage ? 'cover' : card.displayThumbnailSource ?? null,
      };
    }
    const media = mediaMap.get(card.galleryMedia[0].mediaId);
    if (!media) {
      return {
        ...card,
        displayThumbnail: null,
        displayThumbnailSource: null,
      };
    }
    const hydratedFirstSlide = { ...card.galleryMedia[0], media };
    return {
      ...card,
      displayThumbnail: media,
      displayThumbnailSource: 'gallery',
      galleryMedia: [hydratedFirstSlide, ...card.galleryMedia.slice(1)],
    };
  });
}

/**
 * Creates a new card in Firestore.
 * @param cardData The data for the new card, excluding 'id'.
 * @returns The newly created card with its ID.
 */
export async function createCard(
  cardData: Partial<Omit<Card, 'docId' | 'createdAt' | 'updatedAt' | 'filterTags' | 'subjectFilterTags'>>
): Promise<Card> {
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

  // Pre-read tag catalog + derived fields outside the transaction (docs/01 → Catalog reads).
  const normalizedChildren = normalizeChildrenIds(validatedData.childrenIds);
  const allTagsForJournal = await getAllTags();
  const tagPathLookup = buildTagMap(allTagsForJournal);
  const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord(
    { tags: selectedTags },
    undefined,
    allTagsForJournal
  );
  const subjectState = await resolveSubjectTagState({
    assignedTagIds: selectedTags,
    existingSubjectTagId: null,
    existingSubjectTagIds: [],
    requestedSubjectTagId: validatedData.subjectTagId,
    requestedSubjectTagIds: validatedData.subjectTagIds,
    subjectTagIdProvided: Object.prototype.hasOwnProperty.call(validatedData, 'subjectTagId'),
    subjectTagIdsProvided: Object.prototype.hasOwnProperty.call(validatedData, 'subjectTagIds'),
    allTags: allTagsForJournal,
  });
  const journalWhenSort = computeJournalWhenSortKeys(
    dimensionalTags.when || [],
    tagPathLookup
  );
  const dimensionSortKeys = computeDimensionSortKeys(selectedTags, allTagsForJournal);
  const mediaIdsForSignals = new Set<string>();
  if (validatedData.coverImageId) mediaIdsForSignals.add(validatedData.coverImageId);
  (validatedData.galleryMedia || []).forEach((item) => {
    if (item.mediaId) mediaIdsForSignals.add(item.mediaId);
  });
  contentMediaIds.forEach((id) => mediaIdsForSignals.add(id));
  const mediaSignals = await computeCardMediaSignalsFromMediaIds(mediaIdsForSignals, allTagsForJournal);
  const inheritanceOverrides = resolveNewCardInheritanceOverrides(
    await getAuthorSettings(),
    validatedData.galleryTagInheritanceOverrides
  );

  const autoExcerpt = validatedData.excerptAuto ? generateExcerpt(cleanedContent) : undefined;

  const cardType = validatedData.type ?? 'story';
  const newCard = removeUndefinedDeep<Card>({
    ...validatedData,
    docId: docRef.id,
    type: cardType,
    displayMode: normalizeDisplayModeForType(cardType, validatedData.displayMode),
    status: validatedData.status ?? 'draft',
    title_lowercase: validatedData.title?.toLowerCase() || '',
    content: cleanedContent,
    ...(validatedData.excerptAuto ? { excerpt: autoExcerpt || null } : {}),
    tags: selectedTags,
    galleryTagInheritanceOverrides: inheritanceOverrides,
    ...(subjectState.subjectTagId
      ? {
          subjectTagId: subjectState.subjectTagId,
          subjectTagIds: subjectState.subjectTagIds,
          subjectFilterTags: subjectState.subjectFilterTags,
        }
      : {}),
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
  });

  // Use a transaction to ensure atomicity with retry logic
  await withRetry(async () => {
    return firestore.runTransaction(async (transaction) => {
      // 1. Update tag counts before transaction writes begin.
      await updateTagCountsForCard(null, newCard, transaction, tagPathLookup);

      // 2. Create the new card document
      transaction.set(docRef, newCard);

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

export async function createQuestionCardFromQuestion(
  question: Question
): Promise<{ card: Card; question: Question; created: boolean }> {
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  const docRef = collectionRef.doc();
  const now = Date.now();
  const selectedTags = question.tagIds || [];
  const normalizedChildren: string[] = [];

  const allTagsForJournal = await getAllTags();
  const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord(
    { tags: selectedTags },
    undefined,
    allTagsForJournal
  );
  const journalWhenSort = computeJournalWhenSortKeys(
    dimensionalTags.when || [],
    buildTagMap(allTagsForJournal)
  );
  const dimensionSortKeys = computeDimensionSortKeys(selectedTags, allTagsForJournal);
  const inheritanceOverrides = resolveNewCardInheritanceOverrides(await getAuthorSettings());
  const subjectState = await resolveSubjectTagState({
    assignedTagIds: selectedTags,
    existingSubjectTagId: question.subjectTagId,
    existingSubjectTagIds: question.subjectTagIds,
    subjectTagIdProvided: false,
    allTags: allTagsForJournal,
  });

  const newCard: Card = {
    docId: docRef.id,
    type: 'qa',
    questionId: question.docId,
    title: question.prompt,
    title_lowercase: question.prompt.toLowerCase(),
    content: '',
    status: 'draft',
    displayMode: 'navigate',
    tags: selectedTags,
    galleryTagInheritanceOverrides: inheritanceOverrides,
    subjectTagId: subjectState.subjectTagId,
    subjectTagIds: subjectState.subjectTagIds,
    subjectFilterTags: subjectState.subjectFilterTags,
    childrenIds: normalizedChildren,
    contentMedia: [],
    galleryMedia: [],
    filterTags,
    who: dimensionalTags.who || [],
    what: dimensionalTags.what || [],
    when: dimensionalTags.when || [],
    where: dimensionalTags.where || [],
    mediaWho: [],
    mediaWhat: [],
    mediaWhen: [],
    mediaWhere: [],
    whoSortKey: dimensionSortKeys.whoSortKey,
    whatSortKey: dimensionSortKeys.whatSortKey,
    whereSortKey: dimensionSortKeys.whereSortKey,
    journalWhenSortAsc: journalWhenSort.journalWhenSortAsc,
    journalWhenSortDesc: journalWhenSort.journalWhenSortDesc,
    curatedNavEligible: computeCuratedNavEligible({
      childrenIds: normalizedChildren,
      isCollectionRoot: false,
    }),
    createdAt: now,
    updatedAt: now,
  };

  const questionRef = firestore.collection(QUESTIONS_COLLECTION).doc(question.docId);
  const transactionResult = await withRetry(async () => {
    return firestore.runTransaction(async (transaction) => {
      const questionSnap = await transaction.get(questionRef);
      if (!questionSnap.exists) {
        throw new Error('Question not found');
      }

      const questionData = questionSnap.data() ?? {};
      const usedByCardIds = Array.isArray(questionData.usedByCardIds)
        ? questionData.usedByCardIds.filter((id): id is string => typeof id === 'string')
        : [];
      if (usedByCardIds.length > 1) {
        throw new QuestionAnswerConflictError(
          'This question has conflicting answer-card links and requires review'
        );
      }
      if (usedByCardIds.length === 1) {
        const existingCardSnap = await transaction.get(
          firestore.collection(CARDS_COLLECTION).doc(usedByCardIds[0])
        );
        if (!existingCardSnap.exists) {
          throw new QuestionAnswerConflictError(
            'This question points to a missing answer card and requires review'
          );
        }
        const existingCard = cardSchema.safeParse({
          docId: existingCardSnap.id,
          ...existingCardSnap.data(),
        });
        if (
          !existingCard.success ||
          existingCard.data.type !== 'qa' ||
          existingCard.data.questionId !== question.docId
        ) {
          throw new QuestionAnswerConflictError(
            'This question has an inconsistent answer-card link and requires review'
          );
        }
        return { card: existingCard.data, created: false };
      }

      await updateTagCountsForCard(null, newCard, transaction, buildTagMap(allTagsForJournal));
      transaction.set(docRef, newCard);
      transaction.update(questionRef, {
        usedByCardIds: [docRef.id],
        usageCount: 1,
        updatedAt: now,
      });
      return { card: newCard, created: true };
    });
  });

  if (transactionResult.created) {
    void syncCardToTypesense(transactionResult.card);
  }

  return {
    card: transactionResult.card,
    created: transactionResult.created,
    question: {
      ...question,
      usedByCardIds: [transactionResult.card.docId],
      usageCount: 1,
      updatedAt: now,
    },
  };
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

    // Pre-read tag catalog once outside the transaction; derived-field helpers are
    // pure on this snapshot (docs/01 → Catalog reads).
    const allTagsForJournal = await getAllTags();
    const tagPathLookup = buildTagMap(allTagsForJournal);

    const preExisting = preSnap.data() as Card;
    const preSanitizedContent = cardData.content ? stripContentImageSrc(cardData.content) : cardData.content;
    const preContentMediaIds = preSanitizedContent ? extractMediaFromContent(preSanitizedContent) : [];
    const preClearingCover =
      'coverImageId' in cardData &&
      (cardData.coverImageId === null || cardData.coverImageId === undefined);
    const preNewCover = preClearingCover
      ? null
      : (('coverImageId' in cardData ? cardData.coverImageId : preExisting.coverImageId) ?? null);
    const preNewGalleryMedia =
      cardData.galleryMedia?.map((item) => stripHydratedGalleryItem(item)) ?? preExisting.galleryMedia;
    const preNewContentMedia =
      'content' in cardData
        ? preContentMediaIds
        : preExisting.contentMedia ?? extractMediaFromContent(preExisting.content ?? '');
    const preNewMediaIds = new Set<string>();
    if (preNewCover) preNewMediaIds.add(preNewCover);
    preNewGalleryMedia?.forEach((g) => g.mediaId && preNewMediaIds.add(g.mediaId));
    preNewContentMedia.forEach((id) => preNewMediaIds.add(id));
    
    let isClearingCover = false;
    const responseMediaMap = await loadMediaMapByIds(preNewMediaIds);
    const precomputedMediaSignals = computeCardMediaSignalsFromMediaMap(
      responseMediaMap,
      allTagsForJournal
    );
    let responseCoverImageId: string | null = null;
    let responseCoverImageFocalPoint: { x: number; y: number } | undefined;
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

      const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord(
        { tags: finalTags || [] },
        undefined,
        allTagsForJournal
      );
      const subjectState = await resolveSubjectTagState({
        assignedTagIds: finalTags || [],
        existingSubjectTagId: existingData.subjectTagId,
        existingSubjectTagIds: existingData.subjectTagIds,
        requestedSubjectTagId: cleanedUpdate.subjectTagId,
        requestedSubjectTagIds: cleanedUpdate.subjectTagIds,
        subjectTagIdProvided: Object.prototype.hasOwnProperty.call(cleanedUpdate, 'subjectTagId'),
        subjectTagIdsProvided: Object.prototype.hasOwnProperty.call(cleanedUpdate, 'subjectTagIds'),
        allTags: allTagsForJournal,
      });

      cleanedUpdate.filterTags = filterTags;
      cleanedUpdate.subjectTagId = subjectState.subjectTagId;
      cleanedUpdate.subjectTagIds = subjectState.subjectTagIds;
      const retainedImplicitSubjectTagIds = (existingData.galleryImplicitSubjectTagIds ?? [])
        .filter((tagId) => (finalTags ?? []).includes(tagId));
      cleanedUpdate.subjectFilterTags = retainedImplicitSubjectTagIds.length > 0
        ? await buildSubjectFilterTags(
            [...subjectState.subjectTagIds, ...retainedImplicitSubjectTagIds],
            allTagsForJournal
          )
        : subjectState.subjectFilterTags;
      cleanedUpdate.who = dimensionalTags.who || [];
      cleanedUpdate.what = dimensionalTags.what || [];
      cleanedUpdate.when = dimensionalTags.when || [];
      cleanedUpdate.where = dimensionalTags.where || [];

      const journalWhenSort = computeJournalWhenSortKeys(
        cleanedUpdate.when || [],
        tagPathLookup
      );
      const dimensionSortKeys = computeDimensionSortKeys(finalTags || [], allTagsForJournal);
      const mediaSignals = precomputedMediaSignals;
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

      // Finish all transaction reads before any writes begin.
      const mediaRemoved = [...oldMediaIds].filter(id => !newMediaIds.has(id));
      const mediaAdded = [...newMediaIds].filter(id => !oldMediaIds.has(id));
      const coverImageFocalPoint = cleanedUpdate.coverImageFocalPoint;
      const coverImageId = cleanedUpdate.coverImageId ?? existingData.coverImageId;
      const checkedMediaIds = [
        ...mediaRemoved,
        ...mediaAdded,
        ...(
          !clearingCover &&
          coverImageId &&
          typeof coverImageId === 'string' &&
          coverImageFocalPoint &&
          'x' in coverImageFocalPoint &&
          'y' in coverImageFocalPoint
            ? [coverImageId]
            : []
        ),
      ];
      const existingReferencedMediaIds = await getExistingMediaDocIdsInTransaction(
        transaction,
        checkedMediaIds
      );

      // --- Update tag counts using centralized function ---
      await updateTagCountsForCard(
        existingData,
        { ...existingData, ...cleanedUpdate },
        transaction,
        tagPathLookup
      );

      // Maintain referencedByCardIds on media docs
      for (const mediaId of mediaRemoved) {
        if (!existingReferencedMediaIds.has(mediaId)) continue;
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, {
          referencedByCardIds: FieldValue.arrayRemove(cardId),
          updatedAt: Date.now(),
        });
      }
      for (const mediaId of mediaAdded) {
        if (!existingReferencedMediaIds.has(mediaId)) {
          throw new Error(`Referenced media with ID ${mediaId} not found.`);
        }
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
        if (coverImageId && typeof coverImageId === 'string' && coverImageFocalPoint && 'x' in coverImageFocalPoint && 'y' in coverImageFocalPoint) {
          if (existingReferencedMediaIds.has(coverImageId)) {
            responseCoverImageId = coverImageId;
            responseCoverImageFocalPoint = {
              x: coverImageFocalPoint.x,
              y: coverImageFocalPoint.y,
            };
            const coverRef = firestore.collection(MEDIA_COLLECTION).doc(coverImageId);
            transaction.update(coverRef, {
              objectPosition: `${coverImageFocalPoint.x} ${coverImageFocalPoint.y}`,
              updatedAt: Date.now(),
            });
          }
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

      if (responseCoverImageId && responseCoverImageFocalPoint && responseMediaMap.has(responseCoverImageId)) {
        const cover = responseMediaMap.get(responseCoverImageId)!;
        responseMediaMap.set(responseCoverImageId, {
          ...cover,
          objectPosition: `${responseCoverImageFocalPoint.x} ${responseCoverImageFocalPoint.y}`,
        });
      }

      const postSnap = await docRef.get();
      if (!postSnap.exists) {
        throw new Error(`Failed to fetch updated card with ID ${cardId}`);
      }

      // A broad form save can contain the tag snapshot that existed before the
      // author released a Gallery-inheritance override. Reconcile after that
      // write so the stale form payload cannot restore protected-era tags.
      // The service is a no-op when inheritance is disabled or fully protected.
      const { syncGalleryTagInheritanceForCard } = await import(
        '@/lib/services/galleryTagInheritanceService'
      );
      await syncGalleryTagInheritanceForCard(cardId);

      const reconciledSnap = await docRef.get();
      if (!reconciledSnap.exists) {
        throw new Error(`Failed to fetch reconciled card with ID ${cardId}`);
      }
      const updatedCard = hydrateCardFromMediaMap(
        { ...(reconciledSnap.data() as Card), docId: reconciledSnap.id },
        responseMediaMap
      );

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
  updates: Partial<Pick<Card, 'coverImageId' | 'coverImageFocalPoint' | 'coverImageMode'>>
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const existingData = preSnap.data() as Card;
  const existingCoverId = existingData.coverImageId ?? null;
  const existingCoverMode = existingData.coverImageMode ?? 'fill';
  const hasCoverIdUpdate = Object.prototype.hasOwnProperty.call(updates, 'coverImageId');
  const nextCoverIdRaw = updates.coverImageId;
  const nextCoverId = hasCoverIdUpdate
    ? typeof nextCoverIdRaw === 'string' && nextCoverIdRaw.trim().length > 0
      ? nextCoverIdRaw
      : null
    : existingCoverId;
  const hasCoverModeUpdate = Object.prototype.hasOwnProperty.call(updates, 'coverImageMode');
  const nextCoverMode = hasCoverModeUpdate ? updates.coverImageMode ?? 'fill' : existingCoverMode;
  const focalProvided = Object.prototype.hasOwnProperty.call(updates, 'coverImageFocalPoint');
  const focalPoint = updates.coverImageFocalPoint;
  
  const isCoverUnchanged = !hasCoverIdUpdate || existingCoverId === nextCoverId;
  const isCoverModeUnchanged = !hasCoverModeUpdate || existingCoverMode === nextCoverMode;
  const isFocalUnchanged =
    !focalProvided ||
      (existingData.coverImageFocalPoint?.x === focalPoint?.x &&
        existingData.coverImageFocalPoint?.y === focalPoint?.y);
  if (isCoverUnchanged && isCoverModeUnchanged && isFocalUnchanged) {
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

      const checkedMediaIds = [
        existingCoverId,
        nextCoverId,
      ].filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      const existingMediaIds = await getExistingMediaDocIdsInTransaction(transaction, checkedMediaIds);

      if (nextCoverId && !existingMediaIds.has(nextCoverId)) {
        throw new Error(`Cover media with ID ${nextCoverId} not found.`);
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

        if (hasCoverModeUpdate) {
          cardUpdate.coverImageMode = nextCoverMode;
        }

      if (focalProvided && focalPoint && nextCoverId) {
        cardUpdate.coverImageFocalPoint = focalPoint;
      } else if (shouldClearCardFocalPoint) {
        cardUpdate.coverImageFocalPoint = FieldValue.delete();
      }

      transaction.update(docRef, cardUpdate);

      if (coverChanged && existingCoverId && existingCoverId !== nextCoverId) {
        if (existingMediaIds.has(existingCoverId)) {
          const oldCoverRef = firestore.collection(MEDIA_COLLECTION).doc(existingCoverId);
          transaction.update(oldCoverRef, {
            referencedByCardIds: FieldValue.arrayRemove(cardId),
            updatedAt: Date.now(),
          });
        }
      }

      if (coverChanged && nextCoverId && nextCoverId !== existingCoverId) {
        const nextCoverRef = firestore.collection(MEDIA_COLLECTION).doc(nextCoverId);
        transaction.update(nextCoverRef, {
          referencedByCardIds: FieldValue.arrayUnion(cardId),
          updatedAt: Date.now(),
        });
      }

      if (focalProvided && focalPoint && nextCoverId) {
        if (existingMediaIds.has(nextCoverId)) {
          const coverRef = firestore.collection(MEDIA_COLLECTION).doc(nextCoverId);
          transaction.update(coverRef, {
            objectPosition: `${focalPoint.x} ${focalPoint.y}`,
            updatedAt: Date.now(),
          });
        }
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
): updates is Pick<Card, 'galleryMedia'> {
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
): updates is Pick<Card, 'galleryMedia'> {
  const keys = Object.keys(updates as Record<string, unknown>);
  return keys.length === 1 && keys[0] === 'galleryMedia' && Array.isArray(updates.galleryMedia);
}

type CardTagAssignmentUpdates = Partial<Pick<Card, 'tags' | 'subjectTagId' | 'subjectTagIds'>>;

export function isTagsOnlyPayload(
  updates: CardTagAssignmentUpdates
): updates is CardTagAssignmentUpdates {
  const keys = Object.keys(updates as Record<string, unknown>);
  if (keys.length === 0) return false;
  if (!keys.every((key) => key === 'tags' || key === 'subjectTagId' || key === 'subjectTagIds')) return false;
  if ('tags' in updates && updates.tags !== undefined && !Array.isArray(updates.tags)) return false;
  if (
    'subjectTagId' in updates &&
    updates.subjectTagId !== undefined &&
    updates.subjectTagId !== null &&
    typeof updates.subjectTagId !== 'string'
  ) {
    return false;
  }
  if ('subjectTagIds' in updates && updates.subjectTagIds !== undefined && !Array.isArray(updates.subjectTagIds)) {
    return false;
  }
  return true;
}

export function isGalleryInheritanceOverridesOnlyPayload(
  updates: Partial<Pick<Card, 'galleryTagInheritanceOverrides'>>
): boolean {
  const keys = Object.keys(updates as Record<string, unknown>);
  return keys.length === 1 && keys[0] === 'galleryTagInheritanceOverrides'
    && updates.galleryTagInheritanceOverrides !== undefined;
}

export async function updateCardGalleryInheritanceOverrides(
  cardId: string,
  overrides: NonNullable<Card['galleryTagInheritanceOverrides']>
): Promise<Card> {
  const parsed = cardSchema.shape.galleryTagInheritanceOverrides.unwrap().parse(overrides);
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const beforeSnap = await docRef.get();
  if (!beforeSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
  const before = beforeSnap.data() as Card;
  const previous = before.galleryTagInheritanceOverrides ?? protectExistingCardInheritance();

  await docRef.update({ galleryTagInheritanceOverrides: parsed, updatedAt: Date.now() });

  const releasedProtection = (['who', 'what', 'when', 'where'] as const).some(
    (dimension) => previous[dimension] && !parsed[dimension]
  );
  if (releasedProtection) {
    const { syncGalleryTagInheritanceForCard } = await import(
      '@/lib/services/galleryTagInheritanceService'
    );
    await syncGalleryTagInheritanceForCard(cardId);
  }

  const updated = await getCardById(cardId);
  if (!updated) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
  void syncCardToTypesense(updated);
  return updated;
}

export function isStatusOnlyPayload(
  updates: Partial<Pick<Card, 'status'>>
): updates is Pick<Card, 'status'> {
  const keys = Object.keys(updates as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== 'status') return false;
  return updates.status === 'draft' || updates.status === 'published';
}

type CardContentUpdates = Partial<Pick<Card, 'content'>>;

export function isContentOnlyPayload(
  updates: CardContentUpdates
): updates is Pick<Card, 'content'> {
  const keys = Object.keys(updates as Record<string, unknown>);
  return keys.length === 1 && keys[0] === 'content' && typeof updates.content === 'string';
}

export function isChildrenReorderOnlyPayload(
  existingCard: Pick<Card, 'childrenIds'>,
  updates: Partial<Pick<Card, 'childrenIds'>>
): updates is Pick<Card, 'childrenIds'> {
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
): updates is Pick<Card, 'childrenIds'> {
  const keys = Object.keys(updates as Record<string, unknown>);
  return keys.length === 1 && keys[0] === 'childrenIds' && Array.isArray(updates.childrenIds);
}

export function isCollectionRootOnlyPayload(
  updates: Partial<Card>
): updates is Partial<Pick<Card, 'isCollectionRoot' | 'collectionRootOrder'>> {
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
    const existingMediaIds = await getExistingMediaDocIdsInTransaction(transaction, [
      ...mediaRemoved,
      ...mediaAdded,
    ]);
    for (const mediaId of mediaAdded) {
      if (!existingMediaIds.has(mediaId)) {
        throw new Error(`Gallery media with ID ${mediaId} not found.`);
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
      if (!existingMediaIds.has(mediaId)) continue;
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

  if (mediaSetChanged) {
    const { syncGalleryTagInheritanceForCard } = await import(
      '@/lib/services/galleryTagInheritanceService'
    );
    await syncGalleryTagInheritanceForCard(cardId);
    const afterInherit = await getCardById(cardId);
    if (afterInherit) {
      return afterInherit;
    }
  }

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
 * Narrow content-only mutation path.
 * Handles body HTML updates, embedded-media membership, card media signals,
 * referencedByCardIds maintenance, and auto-excerpt refresh without paying
 * the cost of the broad `updateCard()` pipeline.
 */
export async function updateCardContent(
  cardId: string,
  content: string
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const preSnap = await docRef.get();
  if (!preSnap.exists) {
    throw new Error(`Card with ID ${cardId} not found.`);
  }

  const preCard = preSnap.data() as Card;
  const preMediaIds = getMediaIdsFromCard(preCard);
  const sanitizedContent = stripContentImageSrc(content);
  const contentMediaIds = sanitizedContent ? extractMediaFromContent(sanitizedContent) : [];
  const allTags = await getAllTags();

  const nextMediaIds = new Set<string>();
  if (preCard.coverImageId) {
    nextMediaIds.add(preCard.coverImageId);
  }
  preCard.galleryMedia?.forEach((item) => {
    if (item.mediaId) nextMediaIds.add(item.mediaId);
  });
  contentMediaIds.forEach((mediaId) => {
    if (mediaId) nextMediaIds.add(mediaId);
  });
  const responseMediaMap = await loadMediaMapByIds(nextMediaIds);
  const mediaSignals = computeCardMediaSignalsFromMediaMap(responseMediaMap, allTags);

  return withRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        throw new Error(`Card with ID ${cardId} not found.`);
      }
      const existingData = docSnap.data() as Card;

      const nextMediaIds = new Set<string>();
      if (existingData.coverImageId) {
        nextMediaIds.add(existingData.coverImageId);
      }
      existingData.galleryMedia?.forEach((item) => {
        if (item.mediaId) nextMediaIds.add(item.mediaId);
      });
      contentMediaIds.forEach((mediaId) => {
        if (mediaId) nextMediaIds.add(mediaId);
      });

      const oldMediaIds = getMediaIdsFromCard(existingData);
      const mediaRemoved = [...oldMediaIds].filter((id) => !nextMediaIds.has(id));
      const mediaAdded = [...nextMediaIds].filter((id) => !oldMediaIds.has(id));
      const existingReferencedMediaIds = await getExistingMediaDocIdsInTransaction(
        transaction,
        [...mediaRemoved, ...mediaAdded]
      );

      for (const mediaId of mediaRemoved) {
        if (!existingReferencedMediaIds.has(mediaId)) continue;
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, {
          referencedByCardIds: FieldValue.arrayRemove(cardId),
          updatedAt: Date.now(),
        });
      }

      for (const mediaId of mediaAdded) {
        if (!existingReferencedMediaIds.has(mediaId)) {
          throw new Error(`Referenced media with ID ${mediaId} not found.`);
        }
        const mediaRef = firestore.collection(MEDIA_COLLECTION).doc(mediaId);
        transaction.update(mediaRef, {
          referencedByCardIds: FieldValue.arrayUnion(cardId),
          updatedAt: Date.now(),
        });
      }

      transaction.update(docRef, {
        content: sanitizedContent,
        contentMedia: contentMediaIds,
        mediaWho: mediaSignals.mediaWho,
        mediaWhat: mediaSignals.mediaWhat,
        mediaWhen: mediaSignals.mediaWhen,
        mediaWhere: mediaSignals.mediaWhere,
        ...(existingData.excerptAuto === true
          ? { excerpt: generateExcerpt(sanitizedContent) || null }
          : {}),
        updatedAt: Date.now(),
      });
    });

    const postSnap = await docRef.get();
    if (!postSnap.exists) {
      throw new Error(`Failed to fetch updated card with ID ${cardId}`);
    }
    const updatedCard = hydrateCardFromMediaMap(
      { ...(postSnap.data() as Card), docId: postSnap.id },
      responseMediaMap
    );

    void syncCardToTypesense(updatedCard);
    const postMediaIds = getMediaIdsFromCard(updatedCard);
    const syncMediaIds = new Set([...preMediaIds, ...postMediaIds]);
    syncMediaIds.forEach((mediaId) => void syncMediaToTypesenseById(mediaId));
    return updatedCard;
  });
}

/**
 * Narrow tag-assignment mutation path.
 *
 * Preserves all product invariants (`docs/01-Vision-Architecture.md` →
 * Backend Principles **Denormalized counts**, **Mutation scope**):
 * - Tag `cardCount` accuracy via `updateTagCountsForCard` (same helper the
 *   wide path calls).
 * - Card derived tag fields via `mergeDerivedTagsForCardRecord`:
 *   `filterTags`, `who`, `what`, `when`, `where`.
 * - Sort keys: `journalWhenSortAsc/Desc`, `whoSortKey`, `whatSortKey`,
 *   `whereSortKey`.
 * - Typesense card projection: `syncCardToTypesense` post-tx.
 *
 * Skips work that is provably unaffected by a card-tag change:
 * - Media id diff / `referencedByCardIds` (no media-membership change).
 * - `mediaWho/What/When/Where` (these aggregate tags on referenced **media
 *   docs**; a card-tag edit doesn't change those).
 * - `syncMediaToTypesenseById` for referenced media (those media docs are
 *   unchanged).
 * - Cover focal-point updates, content sanitization, child-cycle / Q&A
 *   validation, `curatedNavEligible`.
 */
export async function updateCardTags(
  cardId: string,
  updates: CardTagAssignmentUpdates,
  internal?: {
    galleryTagRollupStatuses?: Card['galleryTagRollupStatuses'];
    implicitSubjectTagIds?: string[];
  }
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);

  // Pre-read the tag catalog once outside the transaction; helpers below are
  // pure on this snapshot and do not need to be inside the tx (transaction
  // reads are reserved for the parent card + tag-count updates).
  const allTagsForJournal = await getAllTags();
  const tagPathLookup = buildTagMap(allTagsForJournal);

  return withRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        throw new Error(`Card with ID ${cardId} not found.`);
      }
      const existingData = docSnap.data() as Card;
      const cleanedTags = (updates.tags ?? existingData.tags ?? []).filter(
        (t): t is string => typeof t === 'string' && t.length > 0
      );
      const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord(
        { tags: cleanedTags },
        undefined,
        allTagsForJournal
      );
      const subjectState = await resolveSubjectTagState({
        assignedTagIds: cleanedTags,
        existingSubjectTagId: existingData.subjectTagId,
        existingSubjectTagIds: existingData.subjectTagIds,
        requestedSubjectTagId: updates.subjectTagId,
        requestedSubjectTagIds: updates.subjectTagIds,
        subjectTagIdProvided: Object.prototype.hasOwnProperty.call(updates, 'subjectTagId'),
        subjectTagIdsProvided: Object.prototype.hasOwnProperty.call(updates, 'subjectTagIds'),
        allTags: allTagsForJournal,
      });
      const journalWhenSort = computeJournalWhenSortKeys(
        dimensionalTags.when || [],
        tagPathLookup
      );
      const dimensionSortKeys = computeDimensionSortKeys(cleanedTags, allTagsForJournal);
      const implicitSubjectTagIds = (
        internal?.implicitSubjectTagIds ?? existingData.galleryImplicitSubjectTagIds
      )?.filter((tagId) => cleanedTags.includes(tagId));
      const effectiveSubjectFilterTags = implicitSubjectTagIds
        ? await buildSubjectFilterTags(
            [...subjectState.subjectTagIds, ...implicitSubjectTagIds],
            allTagsForJournal
          )
        : subjectState.subjectFilterTags;

      const updatePayload: Partial<Card> = {
        tags: cleanedTags,
        filterTags,
        subjectTagId: subjectState.subjectTagId,
        subjectTagIds: subjectState.subjectTagIds,
        subjectFilterTags: effectiveSubjectFilterTags,
        who: dimensionalTags.who || [],
        what: dimensionalTags.what || [],
        when: dimensionalTags.when || [],
        where: dimensionalTags.where || [],
        journalWhenSortAsc: journalWhenSort.journalWhenSortAsc,
        journalWhenSortDesc: journalWhenSort.journalWhenSortDesc,
        whoSortKey: dimensionSortKeys.whoSortKey,
        whatSortKey: dimensionSortKeys.whatSortKey,
        whereSortKey: dimensionSortKeys.whereSortKey,
        ...(internal?.galleryTagRollupStatuses
          ? { galleryTagRollupStatuses: internal.galleryTagRollupStatuses }
          : {}),
        ...(internal?.implicitSubjectTagIds
          ? { galleryImplicitSubjectTagIds: internal.implicitSubjectTagIds }
          : {}),
        updatedAt: Date.now(),
      };

      // Tag-count maintenance MUST happen in the same transaction as the
      // card write. Same helper signature the wide path uses; status is
      // unchanged by a tag-only edit, so the helper sees `wasPublished ===
      // isPublished` and only counts the tag delta.
      await updateTagCountsForCard(
        existingData,
        { ...existingData, ...updatePayload },
        transaction,
        tagPathLookup
      );

      transaction.update(docRef, updatePayload);
    });

    const updatedCard = await getCardById(cardId);
    if (!updatedCard) {
      throw new Error(`Failed to fetch updated card with ID ${cardId}`);
    }
    void syncCardToTypesense(updatedCard);
    return updatedCard;
  });
}

/**
 * Narrow status-only mutation path (draft ↔ published toggle).
 *
 * Status changes affect tag `cardCount` (only published cards count toward
 * the count); `updateTagCountsForCard` handles all four transitions
 * (was/is published) so the same helper used by the wide path keeps counts
 * accurate. Status does not change derived tag fields (filterTags,
 * who/what/when/where, sort keys), media, or content — those calls are
 * skipped relative to the wide path.
 *
 * Preserves: tag cardCount accuracy, Typesense card projection sync.
 */
export async function updateCardStatus(
  cardId: string,
  status: 'draft' | 'published'
): Promise<Card> {
  if (status !== 'draft' && status !== 'published') {
    throw new Error(`Invalid status '${status}'; expected 'draft' or 'published'.`);
  }

  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);

  // Pre-read the tag catalog once outside the transaction; tag-count helper
  // accepts the precomputed lookup so the transaction body stays read-light.
  const allTagsForJournal = await getAllTags();
  const tagPathLookup = buildTagMap(allTagsForJournal);

  return withRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        throw new Error(`Card with ID ${cardId} not found.`);
      }
      const existingData = docSnap.data() as Card;

      // Same helper the wide path uses; correctly handles all 4 transitions
      // (draft↔published × was/is). Tag set is unchanged so the helper sees
      // an empty tag-delta but still applies the published/draft transition.
      await updateTagCountsForCard(
        existingData,
        { ...existingData, status },
        transaction,
        tagPathLookup
      );

      transaction.update(docRef, { status, updatedAt: Date.now() });
    });

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
    status?: Card['status'] | 'all';
    hydrationMode?: 'full' | 'cover-only';
  } = {}
): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const collectionCard = await getCardById(collectionId);
  if (!collectionCard) {
    return { items: [], hasMore: false };
  }

  const { limit = 10, lastDocId, status = 'published', hydrationMode = 'full' } = options;
  const childIds = normalizeChildrenIds(collectionCard.childrenIds, collectionId);
  if (childIds.length === 0) {
    return { items: [], hasMore: false };
  }

  const allChildren = await getCardsByIds(childIds, { hydrationMode });
  const visibleChildren =
    status === 'all' ? allChildren : allChildren.filter((card) => card.status === status);

  const startIndex = lastDocId ? visibleChildren.findIndex((card) => card.docId === lastDocId) + 1 : 0;
  if (startIndex < 0 || startIndex >= visibleChildren.length) {
    return { items: [], hasMore: false };
  }

  const items = visibleChildren.slice(startIndex, startIndex + limit);
  const newLastDocId = items.length > 0 ? items[items.length - 1].docId : undefined;
  const hasMore = startIndex + limit < visibleChildren.length;

  return {
    items,
    lastDocId: newLastDocId,
    hasMore,
  };
}

type RandomFeedProjection = Pick<
  Card,
  'docId' | 'status' | 'type' | 'filterTags' | 'who' | 'what' | 'when' | 'where' | 'tags'
>;

function matchesAny(candidate: string[] | undefined, required: string[] | undefined): boolean {
  if (!required || required.length === 0) return true;
  if (!candidate || candidate.length === 0) return false;
  const set = new Set(candidate);
  return required.some((id) => set.has(id));
}

function matchesDirectTags(candidate: string[] | undefined, required: string[] | undefined): boolean {
  return matchesAny(candidate, required);
}

function cardDimEmpty(arr: string[] | undefined): boolean {
  return !arr || arr.length === 0;
}

/**
 * Archive-wide seeded random feed.
 *
 * This intentionally ranks the full filtered ID universe before hydration, so
 * Random is not biased toward the first deterministic Firestore page.
 */
export async function getSeededRandomCards(options: {
  seed: string;
  status?: Card['status'] | 'all';
  type?: Card['type'] | 'all';
  types?: Card['type'][];
  tags?: string[];
  dimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  };
  exactDimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  };
  dimensionMissing?: {
    who?: boolean;
    what?: boolean;
    when?: boolean;
    where?: boolean;
  };
  limit?: number;
  lastDocId?: string;
  hydrationMode?: 'full' | 'cover-only';
}): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const {
    seed,
    status = 'published',
    type = 'all',
    types,
    tags,
    dimensionalTags,
    exactDimensionalTags,
    dimensionMissing,
    limit = 10,
    lastDocId,
    hydrationMode = 'full',
  } = options;

  const multiTypes = types && types.length > 1 ? [...new Set(types)].slice(0, 10) : undefined;
  const singleType =
    multiTypes !== undefined
      ? undefined
      : types && types.length === 1
        ? types[0]
        : type && type !== 'all'
          ? type
          : undefined;

  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);
  if (status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (multiTypes && multiTypes.length > 1) {
    query = query.where('type', 'in', multiTypes);
  } else if (singleType) {
    query = query.where('type', '==', singleType);
  }

  const snapshot = await query
    .select('status', 'type', 'filterTags', 'who', 'what', 'when', 'where', 'tags')
    .get();

  const filteredIds = snapshot.docs
    .map((doc) => ({ docId: doc.id, ...(doc.data() as Partial<Card>) } as RandomFeedProjection))
    .filter((card) => {
      if (tags && tags.length > 0) {
        const filterTags = card.filterTags || {};
        for (const tag of tags) {
          if (tag && !filterTags[tag]) return false;
        }
      }
      if (dimensionalTags?.who && !matchesAny(card.who, dimensionalTags.who)) return false;
      if (dimensionalTags?.what && !matchesAny(card.what, dimensionalTags.what)) return false;
      if (dimensionalTags?.when && !matchesAny(card.when, dimensionalTags.when)) return false;
      if (dimensionalTags?.where && !matchesAny(card.where, dimensionalTags.where)) return false;
      if (exactDimensionalTags?.who && !matchesDirectTags(card.tags, exactDimensionalTags.who)) return false;
      if (exactDimensionalTags?.what && !matchesDirectTags(card.tags, exactDimensionalTags.what)) return false;
      if (exactDimensionalTags?.when && !matchesDirectTags(card.tags, exactDimensionalTags.when)) return false;
      if (exactDimensionalTags?.where && !matchesDirectTags(card.tags, exactDimensionalTags.where)) return false;
      if (dimensionMissing?.who && !cardDimEmpty(card.who)) return false;
      if (dimensionMissing?.what && !cardDimEmpty(card.what)) return false;
      if (dimensionMissing?.when && !cardDimEmpty(card.when)) return false;
      if (dimensionMissing?.where && !cardDimEmpty(card.where)) return false;
      return true;
    })
    .map((card) => card.docId)
    .filter((id): id is string => Boolean(id));

  const orderedIds = orderIdsBySeed(filteredIds, seed);
  const startIndex = lastDocId ? orderedIds.indexOf(lastDocId) + 1 : 0;
  if (startIndex < 0 || startIndex >= orderedIds.length) {
    return { items: [], hasMore: false };
  }

  const pageIds = orderedIds.slice(startIndex, startIndex + limit);
  const items = await getCardsByIds(pageIds, { hydrationMode });
  return {
    items,
    lastDocId: pageIds.length > 0 ? pageIds[pageIds.length - 1] : undefined,
    hasMore: startIndex + limit < orderedIds.length,
  };
}

/** Max cards to scan when listing collections (cards with children) */
/**
 * Fetches cards that are curated collections.
 * Uses denormalized `curatedNavEligible` (maintained in create/update/delete) so we query by flag
 * instead of scanning recent cards. Requires composite indexes and a one-time backfill for legacy docs.
 */
export async function getCollectionCards(
  status: Card['status'] | 'all' = 'published',
  options: {
    limit?: number;
    hydrationMode?: 'full' | 'cover-only';
    includeDescendants?: boolean;
  } = {}
): Promise<Card[]> {
  const fetchCardsByIdsRaw = async (ids: string[]): Promise<Card[]> => {
    if (!ids.length) return [];

    const idChunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) {
      idChunks.push(ids.slice(i, i + 30));
    }

    const cards: Card[] = [];
    const collectionRef = firestore.collection(CARDS_COLLECTION);
    for (const chunk of idChunks) {
      if (!chunk.length) continue;
      const query = collectionRef.where(FieldPath.documentId(), 'in', chunk);
      const snapshot = await query.get();
      snapshot.forEach((doc) => {
        cards.push({ ...(doc.data() as Card), docId: doc.id });
      });
    }
    return cards;
  };

  let query: FirebaseFirestore.Query = firestore
    .collection(CARDS_COLLECTION)
    .where('isCollectionRoot', '==', true);

  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (typeof options.limit === 'number') {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  const rootCards = snapshot.docs
    .map(doc => ({ docId: doc.id, ...doc.data() } as Card))
    .sort(compareCollectionRootCards);

  let cards = rootCards;

  if (options.includeDescendants) {
    const cardsById = new Map(rootCards.filter((card) => card.docId).map((card) => [card.docId!, card]));
    const pendingIds: string[] = [];
    const queuedIds = new Set(cardsById.keys());

    for (const root of rootCards) {
      for (const childId of normalizeChildrenIds(root.childrenIds)) {
        if (!queuedIds.has(childId)) {
          queuedIds.add(childId);
          pendingIds.push(childId);
        }
      }
    }

    while (pendingIds.length > 0) {
      const batchIds = pendingIds.splice(0, 120);
      const fetchedCards = await fetchCardsByIdsRaw(batchIds);
      for (const card of fetchedCards) {
        if (!card.docId) continue;
        if (status !== 'all' && card.status !== status) continue;
        if (!cardsById.has(card.docId)) {
          cardsById.set(card.docId, card);
        }
        for (const childId of normalizeChildrenIds(card.childrenIds)) {
          if (!queuedIds.has(childId)) {
            queuedIds.add(childId);
            pendingIds.push(childId);
          }
        }
      }
    }

    cards = Array.from(cardsById.values());
  }

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
export async function bulkUpdateTags(cardIds: string[], tags: string[]): Promise<Card[]> {
  if (!cardIds || cardIds.length === 0) {
    return [];
  }

  const allTags = await getAllTags();
  const tagLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
  const derived = await deriveBulkTagFieldsForTags(tags, allTags);
  const updatedCards: Card[] = [];

  for (let i = 0; i < cardIds.length; i += BULK_UPDATE_TAGS_CHUNK_SIZE) {
    const chunk = cardIds.slice(i, i + BULK_UPDATE_TAGS_CHUNK_SIZE);
    // Built inside the transaction (reset on retry); Typesense sync happens after commit.
    const pendingSyncs: Card[] = [];

    await firestore.runTransaction(async (transaction) => {
      pendingSyncs.length = 0;
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
        const subjectState = await resolveSubjectTagState({
          assignedTagIds: tags,
          existingSubjectTagId: (cardDoc.data() as Card).subjectTagId,
          existingSubjectTagIds: (cardDoc.data() as Card).subjectTagIds,
          requestedSubjectTagId: undefined,
          subjectTagIdProvided: false,
          allTags,
        });
        const updatePayload = {
          tags,
          filterTags: derived.filterTags,
          subjectTagId: subjectState.subjectTagId,
          subjectTagIds: subjectState.subjectTagIds,
          subjectFilterTags: subjectState.subjectFilterTags,
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
        };
        transaction.update(cardRef, updatePayload);
        pendingSyncs.push({
          ...(cardDoc.data() as Card),
          ...updatePayload,
          docId: cardId,
        } as Card);
      }
    });

    // Indexed fields (tags, derived dimensional arrays, sort keys) changed; fire
    // post-commit Typesense sync per card. Fire-and-forget — same pattern as
    // single-card paths. See docs/01-Vision-Architecture.md → Backend Principles
    // **Mutation scope** (sync indexed-field changes).
    await Promise.all(pendingSyncs.map((updatedCard) => syncCardToTypesense(updatedCard)));
    updatedCards.push(...pendingSyncs);
  }
  return updatedCards;
}

export async function bulkApplyTagDelta(
  cardIds: string[],
  addTagIds: string[],
  removeTagIds: string[]
): Promise<Card[]> {
  if (!cardIds || cardIds.length === 0) {
    return [];
  }

  const addSet = new Set(
    (addTagIds || []).filter((tagId): tagId is string => typeof tagId === 'string' && tagId.trim().length > 0)
  );
  const removeSet = new Set(
    (removeTagIds || []).filter((tagId): tagId is string => typeof tagId === 'string' && tagId.trim().length > 0)
  );

  if (addSet.size === 0 && removeSet.size === 0) {
    return [];
  }

  const allTags = await getAllTags();
  const tagLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));
  const derivedCache = new Map<string, BulkTagDerived>();
  const updatedCards: Card[] = [];

  for (let i = 0; i < cardIds.length; i += BULK_UPDATE_TAGS_CHUNK_SIZE) {
    const chunk = cardIds.slice(i, i + BULK_UPDATE_TAGS_CHUNK_SIZE);
    // Only cards whose tag set actually changed get pushed; reset on retry.
    const pendingSyncs: Card[] = [];

    await firestore.runTransaction(async (transaction) => {
      pendingSyncs.length = 0;
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
        const subjectState = await resolveSubjectTagState({
          assignedTagIds: nextTags,
          existingSubjectTagId: cardData.subjectTagId,
          existingSubjectTagIds: cardData.subjectTagIds,
          requestedSubjectTagId: undefined,
          subjectTagIdProvided: false,
          allTags,
        });

        await updateTagCountsForCard(
          cardData,
          { ...cardData, tags: nextTags },
          transaction,
          tagLookup
        );

        const updatePayload = {
          tags: nextTags,
          filterTags: derived.filterTags,
          subjectTagId: subjectState.subjectTagId,
          subjectTagIds: subjectState.subjectTagIds,
          subjectFilterTags: subjectState.subjectFilterTags,
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
        };
        transaction.update(cardDoc.ref, updatePayload);
        pendingSyncs.push({
          ...cardData,
          ...updatePayload,
          docId: cardDoc.id,
        } as Card);
      }
    });

    await Promise.all(pendingSyncs.map((updatedCard) => syncCardToTypesense(updatedCard)));
    updatedCards.push(...pendingSyncs);
  }
  return updatedCards;
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

  const newCardData: Partial<
    Omit<Card, 'docId' | 'createdAt' | 'updatedAt' | 'filterTags' | 'subjectFilterTags'>
  > = {
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
    ...(source.subjectTagId ? { subjectTagId: source.subjectTagId } : {}),
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
 * Deletes a card while preserving media library assets and updating parent cards.
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

    const mediaToDetach = Array.from(
      new Set([
        ...getMediaIdsFromCard(cardToDelete),
        ...extractMediaFromContent(cardToDelete.content ?? ''),
      ])
    );

    // Preload tag tree once so transaction-side tag count updates remain write-only.
    const allTags = await getAllTags();
    const tagPathLookup = new Map(allTags.filter((t) => t.docId).map((t) => [t.docId!, t]));

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
        const mediaRefs = mediaToDetach.map((mediaId) =>
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

        // Preserve media library assets while removing this card from their back-reference lists.
        for (const mediaSnap of mediaSnapshots) {
          if (!mediaSnap.exists) continue;
          transaction.update(mediaSnap.ref, {
            referencedByCardIds: FieldValue.arrayRemove(cardId),
            updatedAt: Date.now(),
          });
        }

        // Delete the card document
        transaction.delete(docRef);
      });
    }).then(async () => {
        await unlinkCardFromAllQuestions(cardId);
        void removeCardFromTypesense(cardId);
        for (const mediaId of mediaToDetach) {
          void syncMediaToTypesenseById(mediaId);
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
  displayMode?: Card['displayMode'] | 'all';
  /** When 2+ values, Firestore `in` filter (OR). Omit when using single `type`. */
  types?: Card['type'][];
  tags?: string[];
  dimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  };
  /** Exact direct-tag dimensional matching (selected tags only, no descendants). */
  exactDimensionalTags?: {
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
    displayMode = 'all',
    types: typesIn,
    tags,
    dimensionalTags,
    exactDimensionalTags,
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
  const hasExactDimensionalFilters = Boolean(
    exactDimensionalTags &&
      (exactDimensionalTags.who ||
        exactDimensionalTags.what ||
        exactDimensionalTags.when ||
        exactDimensionalTags.where)
  );
  const needsPostFilterOversample = hasDimensionMissingFilters || hasExactDimensionalFilters;

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

  if (displayMode && displayMode !== 'all') {
    query = query.where('displayMode', '==', displayMode);
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

  if (exactDimensionalTags) {
    const directExactTagUnion = [
      ...(exactDimensionalTags.who ?? []),
      ...(exactDimensionalTags.what ?? []),
      ...(exactDimensionalTags.when ?? []),
      ...(exactDimensionalTags.where ?? []),
    ];
    const directExactTags = [...new Set(directExactTagUnion)].slice(0, 30);
    if (directExactTags.length > 0) {
      query = query.where('tags', 'array-contains-any', directExactTags);
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

  const oversampleLimit = hasExactDimensionalFilters
    ? Math.max(limit * 10, 200)
    : hasDimensionMissingFilters
      ? Math.max(limit * 5, 100)
      : limit;

  const querySnapshot = await query.limit(oversampleLimit).get();

  let cards: Card[] = querySnapshot.docs.map(doc => ({
    docId: doc.id,
    ...doc.data(),
  } as Card));
  
  const cardDimEmpty = (arr: string[] | undefined) => !arr || arr.length === 0;
  const cardDirectMatchesAny = (card: Card, required: string[] | undefined) => {
    if (!required || required.length === 0) return true;
    const directTags = Array.isArray(card.tags) ? new Set(card.tags) : null;
    if (!directTags || directTags.size === 0) return false;
    return required.some((tagId) => directTags.has(tagId));
  };

  if (hasExactDimensionalFilters && exactDimensionalTags) {
    cards = cards.filter((card) => {
      if (!cardDirectMatchesAny(card, exactDimensionalTags.who)) return false;
      if (!cardDirectMatchesAny(card, exactDimensionalTags.what)) return false;
      if (!cardDirectMatchesAny(card, exactDimensionalTags.when)) return false;
      if (!cardDirectMatchesAny(card, exactDimensionalTags.where)) return false;
      return true;
    });
  }

  if (hasDimensionMissingFilters && dimensionMissing) {
    cards = cards.filter((card) => {
      if (dimensionMissing.who && !cardDimEmpty(card.who)) return false;
      if (dimensionMissing.what && !cardDimEmpty(card.what)) return false;
      if (dimensionMissing.when && !cardDimEmpty(card.when)) return false;
      if (dimensionMissing.where && !cardDimEmpty(card.where)) return false;
      return true;
    });
  }

  // --- HYDRATION STEP - Use selective hydration based on mode ---
  if (hydrationMode === 'cover-only') {
    cards = await _hydrateCoverImagesOnly(cards);
  } else {
    cards = await _hydrateCards(cards);
  }

  if (cards.length > limit) {
    cards = cards.slice(0, limit);
  }

  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  let lastDocIdResult = lastVisible ? lastVisible.id : undefined;
  let hasMore = needsPostFilterOversample
    ? querySnapshot.size >= oversampleLimit
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
    if (exactDimensionalTags) {
      const directExactTagUnion = [
        ...(exactDimensionalTags.who ?? []),
        ...(exactDimensionalTags.what ?? []),
        ...(exactDimensionalTags.when ?? []),
        ...(exactDimensionalTags.where ?? []),
      ];
      const directExactTags = [...new Set(directExactTagUnion)].slice(0, 30);
      if (directExactTags.length > 0) {
        fallbackQuery = fallbackQuery.where('tags', 'array-contains-any', directExactTags);
      }
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
    if (hasExactDimensionalFilters && exactDimensionalTags) {
      fallbackItems = fallbackItems.filter((card) => {
        if (!cardDirectMatchesAny(card, exactDimensionalTags.who)) return false;
        if (!cardDirectMatchesAny(card, exactDimensionalTags.what)) return false;
        if (!cardDirectMatchesAny(card, exactDimensionalTags.when)) return false;
        if (!cardDirectMatchesAny(card, exactDimensionalTags.where)) return false;
        return true;
      });
    }
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

 

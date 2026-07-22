import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags, mergeDerivedTagsForCardRecord, updateTagCountsForCard } from '@/lib/firebase/tagService';
import { computeCuratedNavEligible, normalizeChildrenIds } from '@/lib/services/cards/cardHierarchyRules';
import {
  applyChildPlacementReconciliation,
  readChildPlacementReconciliation,
  wouldCreateCycle,
} from '@/lib/services/cards/cardHierarchyMutationService';
import { getExistingMediaDocIdsInTransaction } from '@/lib/services/cards/cardMediaMutationIntegrity';
import { syncCardProjection as syncCardToTypesense, withCardMutationRetry as withRetry } from '@/lib/services/cards/cardMutationSupport';
import { computeDimensionSortKeys } from '@/lib/services/cards/cardTagRules';
import {
  computeCardMediaSignalsFromMediaMap, getMediaIdsFromCard, hydrateCardFromMediaMap,
  loadMediaMapByIds, stripHydratedGalleryItem,
} from '@/lib/services/cards/cardMediaHydrationService';
import { syncMediaToTypesenseById } from '@/lib/services/typesenseMediaService';
import { Card, cardSchema } from '@/lib/types/card';
import { AppError, ErrorCode } from '@/lib/types/error';
import { extractMediaFromContent, generateExcerpt, stripContentImageSrc } from '@/lib/utils/cardUtils';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';
import { buildSubjectFilterTags, resolveSubjectTagState } from '@/lib/utils/subjectTag';
import { FieldValue } from 'firebase-admin/firestore';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';
const QUESTIONS_COLLECTION = 'questions';

function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => removeUndefinedDeep(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined).map(([key, nested]) => [key, removeUndefinedDeep(nested)])) as T;
  }
  return value;
}

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
      let childPlacementUpdates: Awaited<ReturnType<typeof readChildPlacementReconciliation>> = [];
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
        childPlacementUpdates = await readChildPlacementReconciliation(
          transaction,
          cardId,
          normalizedChildren,
          prevChildren
        );

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
        firestore,
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

      applyChildPlacementReconciliation(transaction, childPlacementUpdates);

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
/**
 * Narrow gallery reorder path.
 * Membership must remain unchanged; only the list order is updated.
 */
/**
 * Narrow gallery-only mutation path.
 * Handles reorder, add/remove membership, and slot metadata updates without
 * paying the cost of the broad `updateCard()` pipeline.
 */
/**
 * Narrow children reorder path.
 * Membership must remain unchanged; only the sequence is updated.
 */
/**
 * Narrow collection-root mutation path.
 * Handles explicit top-level root placement and ordering without broad card recomputation.
 */
/**
 * Narrow children-only mutation path.
 * Handles attach/detach/reorder while preserving curated-tree integrity
 * without paying the cost of the broad `updateCard()` pipeline.
 */
/**
 * Narrow content-only mutation path.
 * Handles body HTML updates, embedded-media membership, card media signals,
 * referencedByCardIds maintenance, and auto-excerpt refresh without paying
 * the cost of the broad `updateCard()` pipeline.
 */
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
/**
 * Deletes all documents from the 'cards' collection.
 * This is a utility function for seeding and should be used with caution.
 */
/**
 * Deletes a card while preserving media library assets and updating parent cards.
 * @param cardId The ID of the card to delete.
 */

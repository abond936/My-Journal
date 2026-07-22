import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags, mergeDerivedTagsForCardRecord, updateTagCountsForCard } from '@/lib/firebase/tagService';
import { computeCuratedNavEligible, normalizeChildrenIds } from '@/lib/services/cards/cardHierarchyRules';
import { getExistingCollectionRoots } from '@/lib/services/cards/cardHierarchyMutationService';
import { assertValidQuestionBackedQa } from '@/lib/services/cards/cardMutationIntegrity';
import { syncCardProjection as syncCardToTypesense, removeCardProjection as removeCardFromTypesense, withCardMutationRetry as withRetry } from '@/lib/services/cards/cardMutationSupport';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { computeDimensionSortKeys } from '@/lib/services/cards/cardTagRules';
import { getAuthorSettings } from '@/lib/services/authorSettingsService';
import { QuestionAnswerConflictError, unlinkCardFromAllQuestions } from '@/lib/services/questionService';
import { syncMediaToTypesenseById } from '@/lib/services/typesenseMediaService';
import { Card, cardSchema } from '@/lib/types/card';
import type { Question } from '@/lib/types/question';
import { AppError, ErrorCode } from '@/lib/types/error';
import { extractMediaFromContent, generateExcerpt, stripContentImageSrc } from '@/lib/utils/cardUtils';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import { nextCollectionRootOrderForAppend } from '@/lib/utils/curatedCollectionTree';
import { resolveNewCardInheritanceOverrides } from '@/lib/utils/galleryTagInheritance';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';
import { resolveSubjectTagState } from '@/lib/utils/subjectTag';
import { getMediaIdsFromCard, computeCardMediaSignalsFromMediaIds, stripHydratedGalleryItem } from '@/lib/services/cards/cardMediaHydrationService';
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
function adoptDeletedCardChildren(parentChildrenIds: unknown, deletedCardId: string, adoptedChildIds: string[]): string[] {
  const parentChildren = normalizeChildrenIds(parentChildrenIds);
  if (!adoptedChildIds.length) return parentChildren.filter((id) => id !== deletedCardId);
  const next: string[] = [], seen = new Set<string>();
  for (const childId of parentChildren) {
    if (childId === deletedCardId) for (const adoptedId of adoptedChildIds) { if (!seen.has(adoptedId)) { next.push(adoptedId); seen.add(adoptedId); } }
    else if (!seen.has(childId)) { next.push(childId); seen.add(childId); }
  }
  return next;
}

export async function createCard(
  cardData: Partial<Omit<Card, 'docId' | 'createdAt' | 'updatedAt' | 'filterTags' | 'subjectFilterTags'>>
): Promise<Card> {
  const collectionRef = firestore.collection(CARDS_COLLECTION);
  const docRef = collectionRef.doc();

  // Validate and apply defaults using Zod
  const validatedData = cardSchema.partial().parse(cardData);
  await assertValidQuestionBackedQa(firestore, validatedData);
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
 * Retrieves a paginated and filtered list of cards from Firestore.
 * This is a server-side function.
 * @param options - Options for filtering and pagination.
 * @returns A paginated result of cards.
 */

 


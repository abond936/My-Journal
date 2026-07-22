import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags, getTagAncestors, organizeTagsByDimension, updateTagCountsForCard } from '@/lib/firebase/tagService';
import { syncCardProjections } from '@/lib/services/cards/cardMutationSupport';
import { computeDimensionSortKeys } from '@/lib/services/cards/cardTagRules';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';
import { resolveSubjectTagState } from '@/lib/utils/subjectTag';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

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
    // post-commit Typesense sync per card. Fire-and-forget â€” same pattern as
    // single-card paths. See docs/01-Vision-Architecture.md â†’ Backend Principles
    // **Mutation scope** (sync indexed-field changes).
    await syncCardProjections(pendingSyncs);
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

    await syncCardProjections(pendingSyncs);
    updatedCards.push(...pendingSyncs);
  }
  return updatedCards;
}

/**
 * Creates a duplicate of an existing card as a draft.
 * Copies content, tags, media references, and gallery but not children.
 * The new card goes through full createCard() to get proper tag counts, Typesense sync, etc.
 */


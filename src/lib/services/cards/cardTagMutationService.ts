import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags, mergeDerivedTagsForCardRecord, updateTagCountsForCard } from '@/lib/firebase/tagService';
import type { CardTagAssignmentUpdates } from '@/lib/services/cards/cardMutationClassifiers';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { syncCardProjection, withCardMutationRetry } from '@/lib/services/cards/cardMutationSupport';
import { computeDimensionSortKeys } from '@/lib/services/cards/cardTagRules';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import {
  buildSubjectFilterTags,
  filterSubjectTagIdsForTemporal,
  resolveSubjectTagState,
} from '@/lib/utils/subjectTag';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';
import { reconcileDimensionReviewMap } from '@/lib/utils/dimensionReview';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

export async function updateCardTags(
  cardId: string,
  updates: CardTagAssignmentUpdates,
  internal?: {
    galleryTagRollupStatuses?: Card['galleryTagRollupStatuses'];
    galleryTemporalRollupStatus?: Card['galleryTemporalRollupStatus'];
    dimensionReview?: Card['dimensionReview'];
    temporal?: Card['temporal'];
    temporalProvided?: boolean;
    implicitSubjectTagIds?: string[];
    allTags?: Tag[];
    galleryTagInheritanceOverrides?: Card['galleryTagInheritanceOverrides'];
  }
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const allTags = internal?.allTags ?? await getAllTags();
  const tagPathLookup = buildTagMap(allTags);

  return withCardMutationRetry(async () => {
    await firestore.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);
      const existingData = docSnap.data() as Card;
      const cleanedTags = (updates.tags ?? existingData.tags ?? []).filter(
        (tag): tag is string => typeof tag === 'string' && tag.length > 0
      );
      const { filterTags, dimensionalTags } = await mergeDerivedTagsForCardRecord(
        { tags: cleanedTags },
        undefined,
        allTags
      );
      const temporalProvided =
        Object.prototype.hasOwnProperty.call(updates, 'temporal') ||
        internal?.temporalProvided === true;
      const effectiveTemporal = Object.prototype.hasOwnProperty.call(updates, 'temporal')
        ? updates.temporal ?? null
        : internal?.temporalProvided
          ? internal.temporal ?? null
          : existingData.temporal ?? null;
      const subjectState = await resolveSubjectTagState({
        assignedTagIds: cleanedTags,
        existingSubjectTagId: existingData.subjectTagId,
        existingSubjectTagIds: existingData.subjectTagIds,
        requestedSubjectTagId: updates.subjectTagId,
        requestedSubjectTagIds: updates.subjectTagIds,
        subjectTagIdProvided: Object.prototype.hasOwnProperty.call(updates, 'subjectTagId'),
        subjectTagIdsProvided: Object.prototype.hasOwnProperty.call(updates, 'subjectTagIds'),
        temporal: effectiveTemporal,
        allTags,
      });
      const dimensionReviewProvided = Object.prototype.hasOwnProperty.call(
        updates,
        'dimensionReview'
      );
      const effectiveDimensionReview = dimensionReviewProvided
        ? updates.dimensionReview
        : internal?.dimensionReview ?? existingData.dimensionReview;
      const reconciledDimensionReview = reconcileDimensionReviewMap({
        dimensionReview: effectiveDimensionReview,
        assignedTagIds: cleanedTags,
        temporal: effectiveTemporal,
        allTags,
      });
      const dimensionReviewMustReconcile =
        dimensionReviewProvided ||
        Boolean(internal?.dimensionReview) ||
        temporalProvided ||
        Object.prototype.hasOwnProperty.call(updates, 'tags');
      const journalWhenSort = computeJournalWhenSortKeys(
        dimensionalTags.when || [],
        tagPathLookup,
        effectiveTemporal
      );
      const dimensionSortKeys = computeDimensionSortKeys(cleanedTags, allTags);
      const implicitSubjectTagIds = filterSubjectTagIdsForTemporal((
        internal?.implicitSubjectTagIds ?? existingData.galleryImplicitSubjectTagIds
      )?.filter((tagId) => cleanedTags.includes(tagId)) ?? [], effectiveTemporal, allTags);
      const subjectFilterTags = implicitSubjectTagIds.length > 0
        ? await buildSubjectFilterTags(
            [...subjectState.subjectTagIds, ...implicitSubjectTagIds],
            allTags
          )
        : subjectState.subjectFilterTags;
      const updatePayload: Partial<Card> = {
        tags: cleanedTags,
        filterTags,
        subjectTagId: subjectState.subjectTagId,
        subjectTagIds: subjectState.subjectTagIds,
        subjectFilterTags,
        who: dimensionalTags.who || [],
        what: dimensionalTags.what || [],
        when: dimensionalTags.when || [],
        where: dimensionalTags.where || [],
        journalWhenSortAsc: journalWhenSort.journalWhenSortAsc,
        journalWhenSortDesc: journalWhenSort.journalWhenSortDesc,
        ...dimensionSortKeys,
        ...(internal?.galleryTagRollupStatuses
          ? { galleryTagRollupStatuses: internal.galleryTagRollupStatuses }
          : {}),
        ...(internal?.galleryTemporalRollupStatus
          ? { galleryTemporalRollupStatus: internal.galleryTemporalRollupStatus }
          : {}),
        ...(dimensionReviewMustReconcile
          ? { dimensionReview: reconciledDimensionReview }
          : {}),
        ...(temporalProvided ? { temporal: effectiveTemporal } : {}),
        ...(internal?.implicitSubjectTagIds
          ? { galleryImplicitSubjectTagIds: implicitSubjectTagIds }
          : {}),
        ...(internal?.galleryTagInheritanceOverrides
          ? { galleryTagInheritanceOverrides: internal.galleryTagInheritanceOverrides }
          : {}),
        updatedAt: Date.now(),
      };
      await updateTagCountsForCard(
        existingData,
        { ...existingData, ...updatePayload },
        transaction,
        tagPathLookup
      );
      transaction.update(docRef, updatePayload);
    });

    const updatedCard = await getCardById(cardId);
    if (!updatedCard) throw new Error(`Failed to fetch updated card with ID ${cardId}`);
    await syncCardProjection(updatedCard);
    return updatedCard;
  });
}

import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags, mergeDerivedTagsForCardRecord, updateTagCountsForCard } from '@/lib/firebase/tagService';
import type { CardTagAssignmentUpdates } from '@/lib/services/cards/cardMutationClassifiers';
import { getCardById } from '@/lib/services/cards/cardReadService';
import { syncCardProjection, withCardMutationRetry } from '@/lib/services/cards/cardMutationSupport';
import { computeDimensionSortKeys } from '@/lib/services/cards/cardTagRules';
import type { Card } from '@/lib/types/card';
import { buildSubjectFilterTags, resolveSubjectTagState } from '@/lib/utils/subjectTag';
import { buildTagMap, computeJournalWhenSortKeys } from '@/lib/utils/journalWhenSort';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

export async function updateCardTags(
  cardId: string,
  updates: CardTagAssignmentUpdates,
  internal?: {
    galleryTagRollupStatuses?: Card['galleryTagRollupStatuses'];
    implicitSubjectTagIds?: string[];
  }
): Promise<Card> {
  const docRef = firestore.collection(CARDS_COLLECTION).doc(cardId);
  const allTags = await getAllTags();
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
      const subjectState = await resolveSubjectTagState({
        assignedTagIds: cleanedTags,
        existingSubjectTagId: existingData.subjectTagId,
        existingSubjectTagIds: existingData.subjectTagIds,
        requestedSubjectTagId: updates.subjectTagId,
        requestedSubjectTagIds: updates.subjectTagIds,
        subjectTagIdProvided: Object.prototype.hasOwnProperty.call(updates, 'subjectTagId'),
        subjectTagIdsProvided: Object.prototype.hasOwnProperty.call(updates, 'subjectTagIds'),
        allTags,
      });
      const journalWhenSort = computeJournalWhenSortKeys(dimensionalTags.when || [], tagPathLookup);
      const dimensionSortKeys = computeDimensionSortKeys(cleanedTags, allTags);
      const implicitSubjectTagIds = (
        internal?.implicitSubjectTagIds ?? existingData.galleryImplicitSubjectTagIds
      )?.filter((tagId) => cleanedTags.includes(tagId));
      const subjectFilterTags = implicitSubjectTagIds
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
        ...(internal?.implicitSubjectTagIds
          ? { galleryImplicitSubjectTagIds: internal.implicitSubjectTagIds }
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
    void syncCardProjection(updatedCard);
    return updatedCard;
  });
}

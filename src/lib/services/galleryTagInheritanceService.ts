import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import { getAuthorSettings } from '@/lib/services/authorSettingsService';
import { updateCardTags } from '@/lib/services/cards/cardTagMutationService';
import { getAllTags } from '@/lib/firebase/tagService';
import {
  cardTagsEqual,
  computeGalleryInheritanceResult,
  effectiveGalleryInheritanceToggles,
  galleryInheritanceTogglesActive,
} from '@/lib/utils/galleryTagInheritance';
import {
  buildSubjectFilterTags,
  normalizeSubjectTagId,
  normalizeSubjectTagIds,
} from '@/lib/utils/subjectTag';
import type { CardTagAssignmentUpdates } from '@/lib/services/cards/cardMutationClassifiers';

const CARDS_COLLECTION = 'cards';
const MEDIA_COLLECTION = 'media';

async function loadGalleryMediaForCard(card: Card): Promise<Media[]> {
  const galleryIds = (card.galleryMedia ?? [])
    .map((item) => item.mediaId)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  if (galleryIds.length === 0) {
    return [];
  }

  const firestore = getAdminApp().firestore();
  const docs = await Promise.all(
    galleryIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get())
  );

  const media: Media[] = [];
  for (const doc of docs) {
    if (doc.exists) {
      media.push(doc.data() as Media);
    }
  }
  return media;
}

/**
 * Apply gallery→card tag inheritance for one card when any inheritance toggle is on.
 * No-op when all toggles off or computed tags match current assignments.
 */
export async function syncGalleryTagInheritanceForCard(cardId: string): Promise<void> {
  const settings = await getAuthorSettings();
  if (!galleryInheritanceTogglesActive(settings.galleryTagInheritance)) {
    return;
  }

  const firestore = getAdminApp().firestore();
  const cardSnap = await firestore.collection(CARDS_COLLECTION).doc(cardId).get();
  if (!cardSnap.exists) {
    return;
  }

  const card = cardSnap.data() as Card;
  const effectiveToggles = effectiveGalleryInheritanceToggles(
    settings.galleryTagInheritance,
    card.galleryTagInheritanceOverrides
  );
  if (!galleryInheritanceTogglesActive(effectiveToggles)) return;
  const currentTags = (card.tags ?? []).filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  const galleryMedia = await loadGalleryMediaForCard(card);
  const allTags = await getAllTags();
  const result = computeGalleryInheritanceResult(
    currentTags,
    galleryMedia,
    effectiveToggles,
    allTags,
    card.galleryTagRollupStatuses
  );

  const statusesEqual = JSON.stringify(card.galleryTagRollupStatuses ?? {}) === JSON.stringify(result.statuses);
  const implicitSubjectsEqual = cardTagsEqual(
    card.galleryImplicitSubjectTagIds ?? [],
    result.implicitSubjectTagIds
  );
  const explicitSubjectTagIds = normalizeSubjectTagIds(card.subjectTagIds);
  const legacySubjectTagId = normalizeSubjectTagId(card.subjectTagId);
  const effectiveSubjectTagIds = [
    ...(explicitSubjectTagIds.length > 0
      ? explicitSubjectTagIds
      : legacySubjectTagId ? [legacySubjectTagId] : []),
    ...result.implicitSubjectTagIds,
  ];
  const expectedSubjectFilterTags = await buildSubjectFilterTags(effectiveSubjectTagIds, allTags);
  const storedSubjectFilterTagIds = Object.entries(card.subjectFilterTags ?? {})
    .filter(([, enabled]) => enabled === true)
    .map(([tagId]) => tagId);
  const expectedSubjectFilterTagIds = Object.keys(expectedSubjectFilterTags);
  const subjectFiltersEqual = cardTagsEqual(storedSubjectFilterTagIds, expectedSubjectFilterTagIds);
  if (
    cardTagsEqual(currentTags, result.tags) &&
    statusesEqual &&
    implicitSubjectsEqual &&
    subjectFiltersEqual
  ) {
    return;
  }

  await updateCardTags(
    cardId,
    { tags: result.tags },
    {
      galleryTagRollupStatuses: result.statuses,
      implicitSubjectTagIds: result.implicitSubjectTagIds,
    }
  );
}

export async function updateCardTagAssignmentWithInheritance(
  cardId: string,
  updates: CardTagAssignmentUpdates,
  overrides: NonNullable<Card['galleryTagInheritanceOverrides']>
): Promise<Card> {
  const firestore = getAdminApp().firestore();
  const cardSnap = await firestore.collection(CARDS_COLLECTION).doc(cardId).get();
  if (!cardSnap.exists) throw new Error(`Card with ID ${cardId} not found.`);

  const card = cardSnap.data() as Card;
  const settings = await getAuthorSettings();
  const allTags = await getAllTags();
  const galleryMedia = await loadGalleryMediaForCard(card);
  const effectiveToggles = effectiveGalleryInheritanceToggles(
    settings.galleryTagInheritance,
    overrides
  );
  const result = computeGalleryInheritanceResult(
    updates.tags ?? card.tags ?? [],
    galleryMedia,
    effectiveToggles,
    allTags,
    card.galleryTagRollupStatuses
  );

  return updateCardTags(
    cardId,
    {
      ...updates,
      tags: result.tags,
    },
    {
      galleryTagRollupStatuses: result.statuses,
      implicitSubjectTagIds: result.implicitSubjectTagIds,
      galleryTagInheritanceOverrides: overrides,
      allTags,
    }
  );
}

/**
 * After gallery-media tag changes, sync inheritance on cards that reference the media in gallery only.
 */
export async function syncGalleryTagInheritanceForMediaId(mediaId: string): Promise<void> {
  await syncGalleryTagInheritanceForMediaIds([mediaId]);
}

export async function syncGalleryTagInheritanceForMediaIds(mediaIds: string[]): Promise<void> {
  const settings = await getAuthorSettings();
  if (!galleryInheritanceTogglesActive(settings.galleryTagInheritance)) {
    return;
  }

  const firestore = getAdminApp().firestore();
  const uniqueMediaIds = Array.from(new Set(mediaIds.filter(Boolean)));
  const changedMediaIdSet = new Set(uniqueMediaIds);
  const mediaSnaps = await Promise.all(
    uniqueMediaIds.map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get())
  );
  const candidateCardIds = new Set<string>();
  mediaSnaps.forEach((snap) => {
    if (!snap.exists) return;
    ((snap.data() as Media).referencedByCardIds ?? []).forEach((id) => candidateCardIds.add(id));
  });
  if (candidateCardIds.size === 0) return;

  const cardSnaps = await Promise.all(
    Array.from(candidateCardIds).map((id) => firestore.collection(CARDS_COLLECTION).doc(id).get())
  );
  const candidateCards = cardSnaps
    .filter((snap) => snap.exists)
    .map((snap) => ({ id: snap.id, card: snap.data() as Card }))
    .filter(({ card }) =>
      (card.galleryMedia ?? []).some((item) => changedMediaIdSet.has(item.mediaId))
    );
  const galleryMediaIds = new Set<string>();
  candidateCards.forEach(({ card }) =>
    (card.galleryMedia ?? []).forEach((item) => item.mediaId && galleryMediaIds.add(item.mediaId))
  );
  const [galleryMediaSnaps, allTags] = await Promise.all([
    Promise.all(
      Array.from(galleryMediaIds).map((id) => firestore.collection(MEDIA_COLLECTION).doc(id).get())
    ),
    getAllTags(),
  ]);
  const mediaById = new Map<string, Media>();
  galleryMediaSnaps.forEach((snap) => {
    if (snap.exists) mediaById.set(snap.id, snap.data() as Media);
  });

  for (const { id: cardId, card } of candidateCards) {
    const effectiveToggles = effectiveGalleryInheritanceToggles(
      settings.galleryTagInheritance,
      card.galleryTagInheritanceOverrides
    );
    if (!galleryInheritanceTogglesActive(effectiveToggles)) continue;
    const galleryMedia = (card.galleryMedia ?? [])
      .map((item) => mediaById.get(item.mediaId))
      .filter((item): item is Media => Boolean(item));
    const currentTags = (card.tags ?? []).filter(Boolean);
    const result = computeGalleryInheritanceResult(
      currentTags,
      galleryMedia,
      effectiveToggles,
      allTags,
      card.galleryTagRollupStatuses
    );
    const statusesEqual =
      JSON.stringify(card.galleryTagRollupStatuses ?? {}) === JSON.stringify(result.statuses);
    const implicitSubjectsEqual = cardTagsEqual(
      card.galleryImplicitSubjectTagIds ?? [],
      result.implicitSubjectTagIds
    );
    const explicitSubjectTagIds = normalizeSubjectTagIds(card.subjectTagIds);
    const legacySubjectTagId = normalizeSubjectTagId(card.subjectTagId);
    const effectiveSubjectTagIds = [
      ...(explicitSubjectTagIds.length > 0
        ? explicitSubjectTagIds
        : legacySubjectTagId ? [legacySubjectTagId] : []),
      ...result.implicitSubjectTagIds,
    ];
    const expectedSubjectFilterTags = await buildSubjectFilterTags(effectiveSubjectTagIds, allTags);
    const storedSubjectFilterTagIds = Object.entries(card.subjectFilterTags ?? {})
      .filter(([, enabled]) => enabled === true)
      .map(([tagId]) => tagId);
    if (
      cardTagsEqual(currentTags, result.tags) &&
      statusesEqual &&
      implicitSubjectsEqual &&
      cardTagsEqual(storedSubjectFilterTagIds, Object.keys(expectedSubjectFilterTags))
    ) {
      continue;
    }
    await updateCardTags(
      cardId,
      { tags: result.tags },
      {
        galleryTagRollupStatuses: result.statuses,
        implicitSubjectTagIds: result.implicitSubjectTagIds,
        allTags,
      }
    );
  }
}

export async function reconcileGalleryInheritanceForNewlyEnabledDimensions(
  previous: import('@/lib/types/authorSettings').GalleryTagInheritanceToggles,
  next: import('@/lib/types/authorSettings').GalleryTagInheritanceToggles
): Promise<{ candidateCount: number; reconciledCardCount: number; failedCardCount: number }> {
  const newlyEnabled = (['who', 'what', 'when', 'where'] as const).filter(
    (dimension) => !previous[dimension] && next[dimension]
  );
  if (newlyEnabled.length === 0) {
    return { candidateCount: 0, reconciledCardCount: 0, failedCardCount: 0 };
  }

  const firestore = getAdminApp().firestore();
  const cardIds = new Set<string>();
  const snapshots = await Promise.all(
    newlyEnabled.map((dimension) =>
      firestore
        .collection(CARDS_COLLECTION)
        .where(`galleryTagInheritanceOverrides.${dimension}`, '==', false)
        .get()
    )
  );
  snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => cardIds.add(doc.id)));

  let reconciledCardCount = 0;
  let failedCardCount = 0;
  for (const cardId of cardIds) {
    try {
      await syncGalleryTagInheritanceForCard(cardId);
      reconciledCardCount += 1;
    } catch (error) {
      failedCardCount += 1;
      console.error('[gallery inheritance reconciliation]', { cardId, error });
    }
  }
  return { candidateCount: cardIds.size, reconciledCardCount, failedCardCount };
}

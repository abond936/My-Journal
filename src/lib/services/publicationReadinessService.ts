import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  getActiveCollectionStructure,
  listActiveCollections,
  type CollectionStructureReadModel,
} from '@/lib/services/collections/collectionProjectionReadService';
import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import type { DimensionReviewEntry } from '@/lib/types/dimensionReview';
import type { Media } from '@/lib/types/photo';

const DIMENSIONS = ['who', 'what', 'when', 'where'] as const;

export type CollectionPublicationAttention = {
  collectionId: string;
  title: string;
  lifecycle: Collection['lifecycle'];
  requiredCards: number;
  missingRequiredCards: number;
  draftCards: number;
  cardsNeedingDimensionReview: number;
  cardsMissingMeaningfulWhat: number;
  referencedMedia: number;
  missingMedia: number;
  mediaNeedingDimensionReview: number;
  mediaReadiness: {
    ready: number;
    pending: number;
    failed: number;
    unassessed: number;
  };
  audienceSelectionAvailable: false;
};

function isDimensionComplete(entry: DimensionReviewEntry | undefined): boolean {
  return (
    entry?.reviewed === true ||
    entry?.resolution === 'unknown' ||
    entry?.resolution === 'not_applicable'
  );
}

function referencedMediaIds(cards: Card[]): string[] {
  const ids = new Set<string>();
  for (const card of cards) {
    if (card.coverImageId) ids.add(card.coverImageId);
    card.galleryMedia?.forEach((item) => item.mediaId && ids.add(item.mediaId));
    card.contentMedia?.forEach((mediaId) => mediaId && ids.add(mediaId));
  }
  return [...ids];
}

export function evaluateCollectionPublicationAttention(args: {
  structure: CollectionStructureReadModel;
  media: Media[];
}): CollectionPublicationAttention {
  const { collection, placements, cards } = args.structure;
  const cardsById = new Map(cards.flatMap((card) => card.docId ? [[card.docId, card]] : []));
  const requiredCardIds = new Set([
    ...(collection.introductionCardId ? [collection.introductionCardId] : []),
    ...placements.map((placement) => placement.cardId),
  ]);
  const requiredCards = [...requiredCardIds]
    .map((cardId) => cardsById.get(cardId))
    .filter((card): card is Card => Boolean(card));
  const mediaIds = referencedMediaIds(requiredCards);
  const mediaById = new Map(args.media.flatMap((item) => item.docId ? [[item.docId, item]] : []));
  const referencedMedia = mediaIds
    .map((mediaId) => mediaById.get(mediaId))
    .filter((item): item is Media => Boolean(item));

  return {
    collectionId: collection.docId,
    title: collection.title,
    lifecycle: collection.lifecycle,
    requiredCards: requiredCardIds.size,
    missingRequiredCards: requiredCardIds.size - requiredCards.length,
    draftCards: requiredCards.filter((card) => card.status !== 'published').length,
    cardsNeedingDimensionReview: requiredCards.filter((card) =>
      DIMENSIONS.some((dimension) => !isDimensionComplete(card.dimensionReview?.[dimension]))
    ).length,
    cardsMissingMeaningfulWhat: requiredCards.filter((card) =>
      !isDimensionComplete(card.dimensionReview?.what) || (card.what?.length ?? 0) === 0
    ).length,
    referencedMedia: mediaIds.length,
    missingMedia: mediaIds.length - referencedMedia.length,
    mediaNeedingDimensionReview: referencedMedia.filter((item) =>
      DIMENSIONS.some((dimension) => !isDimensionComplete(item.dimensionReview?.[dimension]))
    ).length,
    mediaReadiness: {
      ready: referencedMedia.filter((item) => item.readiness?.overall === 'ready').length,
      pending: referencedMedia.filter((item) => item.readiness?.overall === 'pending').length,
      failed: referencedMedia.filter((item) => item.readiness?.overall === 'failed').length,
      unassessed: referencedMedia.filter((item) => !item.readiness).length,
    },
    audienceSelectionAvailable: false,
  };
}

async function loadMedia(
  mediaIds: string[],
  firestore: Firestore
): Promise<Media[]> {
  const media: Media[] = [];
  for (let index = 0; index < mediaIds.length; index += 30) {
    const chunk = mediaIds.slice(index, index + 30);
    const snapshot = await firestore
      .collection('media')
      .where(FieldPath.documentId(), 'in', chunk)
      .get();
    snapshot.forEach((doc) => media.push({ docId: doc.id, ...doc.data() } as Media));
  }
  return media;
}

export async function getCollectionPublicationAttention(
  collectionId: string,
  firestore: Firestore = getAdminApp().firestore()
): Promise<CollectionPublicationAttention | null> {
  const structure = await getActiveCollectionStructure(collectionId, firestore);
  if (!structure) return null;
  const media = await loadMedia(referencedMediaIds(structure.cards), firestore);
  return evaluateCollectionPublicationAttention({ structure, media });
}

export async function listActiveCollectionPublicationAttention(
  firestore: Firestore = getAdminApp().firestore()
): Promise<CollectionPublicationAttention[]> {
  const collections = await listActiveCollections(firestore);
  const attention = await Promise.all(
    collections.map((collection) => getCollectionPublicationAttention(collection.docId, firestore))
  );
  return attention.filter((item): item is CollectionPublicationAttention => Boolean(item));
}

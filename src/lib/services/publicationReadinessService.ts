import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  getActiveCollectionStructure,
  listActiveCollections,
  type CollectionStructureReadModel,
} from '@/lib/services/collections/collectionProjectionReadService';
import type { Card } from '@/lib/types/card';
import type { Collection } from '@/lib/types/collection';
import type { Media } from '@/lib/types/photo';
import { isDimensionReviewComplete } from '@/lib/services/cards/cardPublicationIntegrityService';
import { getAuthorSettings } from '@/lib/services/authorSettingsService';
import type { ClassificationRequirements } from '@/lib/types/authorSettings';

const DIMENSIONS = ['who', 'what', 'when', 'where'] as const;
export type AttentionDimension = (typeof DIMENSIONS)[number];

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
  audienceSelectionState: 'legacy_all_enabled' | 'all_enabled' | 'selected' | 'none';
};

export type CollectionPublicationAttentionDetails = {
  summary: CollectionPublicationAttention;
  missingRequiredCardIds: string[];
  draftCards: AttentionCardItem[];
  cardsNeedingDimensionReview: AttentionCardItem[];
  cardsMissingMeaningfulWhat: AttentionCardItem[];
  missingMedia: AttentionMissingMediaItem[];
  mediaNeedingDimensionReview: AttentionMediaItem[];
  mediaReadinessAttention: AttentionMediaItem[];
};

export type AttentionCardItem = {
  cardId: string;
  title: string;
  incompleteDimensions: AttentionDimension[];
};

export type AttentionCardReference = {
  cardId: string;
  title: string;
};

export type AttentionMissingMediaItem = {
  mediaId: string;
  referencedByCards: AttentionCardReference[];
};

export type AttentionMediaItem = AttentionMissingMediaItem & {
  label: string;
  incompleteDimensions: AttentionDimension[];
  readiness: 'pending' | 'failed' | 'unassessed';
};

function audienceSelectionState(
  collection: Collection
): CollectionPublicationAttention['audienceSelectionState'] {
  if (!collection.audience) return 'legacy_all_enabled';
  if (collection.audience.allContacts) return 'all_enabled';
  if (collection.audience.groupIds.length || collection.audience.contactIds.length) return 'selected';
  return 'none';
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

function cardTitle(card: Card): string {
  return card.title?.trim() || card.subtitle?.trim() || 'Untitled Card';
}

function incompleteDimensions(item: Pick<Card | Media, 'dimensionReview'>): AttentionDimension[] {
  return DIMENSIONS.filter(
    (dimension) => !isDimensionReviewComplete(item.dimensionReview?.[dimension])
  );
}

function referencesByMedia(cards: Card[]): Map<string, AttentionCardReference[]> {
  const references = new Map<string, AttentionCardReference[]>();
  for (const card of cards) {
    if (!card.docId) continue;
    const cardReference = { cardId: card.docId, title: cardTitle(card) };
    const ids = new Set<string>();
    if (card.coverImageId) ids.add(card.coverImageId);
    card.galleryMedia?.forEach((item) => item.mediaId && ids.add(item.mediaId));
    card.contentMedia?.forEach((mediaId) => mediaId && ids.add(mediaId));
    ids.forEach((mediaId) => {
      const current = references.get(mediaId) ?? [];
      current.push(cardReference);
      references.set(mediaId, current);
    });
  }
  return references;
}

export function evaluateCollectionPublicationAttention(args: {
  structure: CollectionStructureReadModel;
  media: Media[];
  classificationRequirements?: ClassificationRequirements;
}): CollectionPublicationAttention {
  const { collection, placements, cards } = args.structure;
  const classificationRequirements = args.classificationRequirements ?? {
    media: true,
    cards: true,
  };
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
    cardsNeedingDimensionReview: classificationRequirements.cards
      ? requiredCards.filter((card) =>
          DIMENSIONS.some((dimension) => !isDimensionReviewComplete(card.dimensionReview?.[dimension]))
        ).length
      : 0,
    cardsMissingMeaningfulWhat: classificationRequirements.cards
      ? requiredCards.filter((card) =>
          !isDimensionReviewComplete(card.dimensionReview?.what) || (card.what?.length ?? 0) === 0
        ).length
      : 0,
    referencedMedia: mediaIds.length,
    missingMedia: mediaIds.length - referencedMedia.length,
    mediaNeedingDimensionReview: classificationRequirements.media
      ? referencedMedia.filter((item) =>
          DIMENSIONS.some((dimension) => !isDimensionReviewComplete(item.dimensionReview?.[dimension]))
        ).length
      : 0,
    mediaReadiness: {
      ready: referencedMedia.filter((item) => item.readiness?.overall === 'ready').length,
      pending: referencedMedia.filter((item) => item.readiness?.overall === 'pending').length,
      failed: referencedMedia.filter((item) => item.readiness?.overall === 'failed').length,
      unassessed: referencedMedia.filter((item) => !item.readiness).length,
    },
    audienceSelectionState: audienceSelectionState(collection),
  };
}

export function evaluateCollectionPublicationAttentionDetails(args: {
  structure: CollectionStructureReadModel;
  media: Media[];
  classificationRequirements?: ClassificationRequirements;
}): CollectionPublicationAttentionDetails {
  const classificationRequirements = args.classificationRequirements ?? {
    media: true,
    cards: true,
  };
  const { collection, placements, cards } = args.structure;
  const cardsById = new Map(cards.flatMap((card) => card.docId ? [[card.docId, card]] : []));
  const requiredCardIds = [...new Set([
    ...(collection.introductionCardId ? [collection.introductionCardId] : []),
    ...placements.map((placement) => placement.cardId),
  ])];
  const requiredCards = requiredCardIds
    .map((cardId) => cardsById.get(cardId))
    .filter((card): card is Card => Boolean(card));
  const mediaById = new Map(args.media.flatMap((item) => item.docId ? [[item.docId, item]] : []));
  const mediaReferences = referencesByMedia(requiredCards);
  const mediaIds = [...mediaReferences.keys()];
  const toCardItem = (card: Card): AttentionCardItem => ({
    cardId: card.docId!,
    title: cardTitle(card),
    incompleteDimensions: incompleteDimensions(card),
  });
  const toMediaItem = (media: Media): AttentionMediaItem => ({
    mediaId: media.docId!,
    label: media.caption?.trim() || media.filename?.trim() || media.docId!,
    incompleteDimensions: incompleteDimensions(media),
    readiness:
      media.readiness?.overall === 'pending' || media.readiness?.overall === 'failed'
        ? media.readiness.overall
        : 'unassessed',
    referencedByCards: mediaReferences.get(media.docId!) ?? [],
  });

  return {
    summary: evaluateCollectionPublicationAttention(args),
    missingRequiredCardIds: requiredCardIds.filter((cardId) => !cardsById.has(cardId)),
    draftCards: requiredCards.filter((card) => card.status !== 'published').map(toCardItem),
    cardsNeedingDimensionReview: classificationRequirements.cards
      ? requiredCards.filter((card) => incompleteDimensions(card).length > 0).map(toCardItem)
      : [],
    cardsMissingMeaningfulWhat: classificationRequirements.cards
      ? requiredCards
          .filter((card) =>
            !isDimensionReviewComplete(card.dimensionReview?.what) || (card.what?.length ?? 0) === 0
          )
          .map(toCardItem)
      : [],
    missingMedia: mediaIds
      .filter((mediaId) => !mediaById.has(mediaId))
      .map((mediaId) => ({ mediaId, referencedByCards: mediaReferences.get(mediaId) ?? [] })),
    mediaNeedingDimensionReview: classificationRequirements.media
      ? mediaIds
          .map((mediaId) => mediaById.get(mediaId))
          .filter((media): media is Media => Boolean(media?.docId))
          .filter((media) => incompleteDimensions(media).length > 0)
          .map(toMediaItem)
      : [],
    mediaReadinessAttention: mediaIds
      .map((mediaId) => mediaById.get(mediaId))
      .filter((media): media is Media => Boolean(media?.docId))
      .filter((media) => media.readiness?.overall !== 'ready')
      .map(toMediaItem),
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
  firestore: Firestore = getAdminApp().firestore(),
  classificationRequirements: ClassificationRequirements = { media: true, cards: true }
): Promise<CollectionPublicationAttention | null> {
  const structure = await getActiveCollectionStructure(collectionId, firestore);
  if (!structure) return null;
  const media = await loadMedia(referencedMediaIds(structure.cards), firestore);
  return evaluateCollectionPublicationAttention({ structure, media, classificationRequirements });
}

export async function getCollectionPublicationAttentionDetails(
  collectionId: string,
  firestore: Firestore = getAdminApp().firestore(),
  classificationRequirements?: ClassificationRequirements
): Promise<CollectionPublicationAttentionDetails | null> {
  const structure = await getActiveCollectionStructure(collectionId, firestore);
  if (!structure) return null;
  const media = await loadMedia(referencedMediaIds(structure.cards), firestore);
  const requirements = classificationRequirements ?? (await getAuthorSettings(firestore)).classificationRequirements;
  return evaluateCollectionPublicationAttentionDetails({
    structure,
    media,
    classificationRequirements: requirements,
  });
}

export async function listActiveCollectionPublicationAttention(
  firestore: Firestore = getAdminApp().firestore()
): Promise<CollectionPublicationAttention[]> {
  const collections = await listActiveCollections(firestore);
  if (collections.length === 0) return [];
  const settings = await getAuthorSettings(firestore);
  const attention = await Promise.all(
    collections.map((collection) =>
      getCollectionPublicationAttention(
        collection.docId,
        firestore,
        settings.classificationRequirements
      )
    )
  );
  return attention.filter((item): item is CollectionPublicationAttention => Boolean(item));
}

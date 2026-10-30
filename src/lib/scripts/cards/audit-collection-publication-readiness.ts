/**
 * Read-only Collection publication-readiness inventory.
 *
 * This reports stored evidence and currently enforced gates. It never changes
 * Collection, Card, Media, audience, publication, or sharing state.
 */
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getActiveCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import { evaluateCollectionPublicationAttention } from '@/lib/services/publicationReadinessService';
import type { Card } from '@/lib/types/card';
import type { DimensionReviewMap } from '@/lib/types/dimensionReview';
import type { Media } from '@/lib/types/photo';

const DIMENSIONS = ['who', 'what', 'when', 'where'] as const;
type Dimension = (typeof DIMENSIONS)[number];

function readArg(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return exact?.slice(name.length + 1).trim() || undefined;
}

function isReviewComplete(review: DimensionReviewMap, dimension: Dimension): boolean {
  const entry = review?.[dimension];
  return (
    entry?.reviewed === true ||
    entry?.resolution === 'unknown' ||
    entry?.resolution === 'not_applicable'
  );
}

function referencedMedia(card: Card) {
  const rows: Array<{ mediaId: string; role: 'cover' | 'gallery' | 'body' }> = [];
  if (card.coverImageId) rows.push({ mediaId: card.coverImageId, role: 'cover' });
  (card.galleryMedia ?? []).forEach((item) => rows.push({ mediaId: item.mediaId, role: 'gallery' }));
  (card.contentMedia ?? []).forEach((mediaId) => rows.push({ mediaId, role: 'body' }));
  return rows;
}

function sampleCards(cards: Card[], predicate: (card: Card) => boolean) {
  return cards
    .filter(predicate)
    .slice(0, 12)
    .map((card) => ({ docId: card.docId, title: card.title, status: card.status }));
}

async function main() {
  const collectionId = readArg('--collection-id');
  if (!collectionId) throw new Error('--collection-id is required.');

  const firestore = getAdminApp().firestore();
  const collectionSnap = await firestore.collection('collections').doc(collectionId).get();
  if (!collectionSnap.exists) throw new Error(`Collection ${collectionId} was not found.`);

  const structure = await getActiveCollectionStructure(collectionId, firestore);
  if (!structure) throw new Error(`Collection ${collectionId} is not active.`);

  const cards = structure.cards;
  const cardsById = new Map(cards.flatMap((card) => card.docId ? [[card.docId, card]] : []));
  const requiredCardIds = new Set([
    ...(structure.collection.introductionCardId ? [structure.collection.introductionCardId] : []),
    ...structure.placements.map((placement) => placement.cardId),
  ]);
  const missingRequiredCardIds = Array.from(requiredCardIds).filter((cardId) => !cardsById.has(cardId));

  const mediaReferences = cards.flatMap((card) =>
    referencedMedia(card).map((reference) => ({ ...reference, cardId: card.docId }))
  );
  const mediaIds = Array.from(new Set(mediaReferences.map((reference) => reference.mediaId)));
  const mediaSnapshots = mediaIds.length
    ? await firestore.getAll(...mediaIds.map((mediaId) => firestore.collection('media').doc(mediaId)))
    : [];
  const media = mediaSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({ docId: snapshot.id, ...snapshot.data() } as Media));
  const mediaById = new Map(media.map((item) => [item.docId, item]));
  const missingMediaIds = mediaIds.filter((mediaId) => !mediaById.has(mediaId));

  const cardReviewCounts = Object.fromEntries(DIMENSIONS.map((dimension) => [
    dimension,
    cards.filter((card) => isReviewComplete(card.dimensionReview, dimension)).length,
  ]));
  const mediaReviewCounts = Object.fromEntries(DIMENSIONS.map((dimension) => [
    dimension,
    media.filter((item) => isReviewComplete(item.dimensionReview, dimension)).length,
  ]));
  const rawCollection = collectionSnap.data() ?? {};
  const audienceFieldKeys = Object.keys(rawCollection).filter((key) =>
    /audience|visibility|access|recipient|share/i.test(key)
  );

  const draftCards = cards.filter((card) => card.status !== 'published');
  const publishedCards = cards.filter((card) => card.status === 'published');
  const cardsWithAllDimensionsReviewed = cards.filter((card) =>
    DIMENSIONS.every((dimension) => isReviewComplete(card.dimensionReview, dimension))
  );
  const cardsWithReviewedMeaningfulWhat = cards.filter((card) =>
    isReviewComplete(card.dimensionReview, 'what') && (card.what?.length ?? 0) > 0
  );
  const readyMedia = media.filter((item) => item.readiness?.overall === 'ready');
  const unassessedMedia = media.filter((item) => !item.readiness);
  const pendingMedia = media.filter((item) => item.readiness?.overall === 'pending');
  const failedMedia = media.filter((item) => item.readiness?.overall === 'failed');
  const mediaWithAllDimensionsReviewed = media.filter((item) =>
    DIMENSIONS.every((dimension) => isReviewComplete(item.dimensionReview, dimension))
  );
  const publicationAttention = evaluateCollectionPublicationAttention({ structure, media });

  const report = {
    ok: true,
    dryRun: true,
    collection: {
      docId: structure.collection.docId,
      title: structure.collection.title,
      recordState: structure.collection.recordState,
      lifecycle: structure.collection.lifecycle,
      structureRevision: structure.collection.structureRevision,
      authorityRevision: structure.collection.authorityRevision,
      introductionCardId: structure.collection.introductionCardId ?? null,
      audienceFieldKeys,
    },
    structure: {
      placements: structure.placements.length,
      uniqueRequiredCards: requiredCardIds.size,
      loadedCards: cards.length,
      missingRequiredCards: missingRequiredCardIds.length,
      missingRequiredCardIds,
      roles: structure.placements.reduce<Record<string, number>>((counts, placement) => {
        counts[placement.role] = (counts[placement.role] ?? 0) + 1;
        return counts;
      }, {}),
    },
    cards: {
      total: cards.length,
      published: publishedCards.length,
      draft: draftCards.length,
      reviewedByDimension: cardReviewCounts,
      allDimensionsReviewed: cardsWithAllDimensionsReviewed.length,
      reviewedMeaningfulWhat: cardsWithReviewedMeaningfulWhat.length,
      samples: {
        draft: sampleCards(cards, (card) => card.status !== 'published'),
        incompleteDimensionReview: sampleCards(cards, (card) =>
          !DIMENSIONS.every((dimension) => isReviewComplete(card.dimensionReview, dimension))
        ),
        missingReviewedMeaningfulWhat: sampleCards(cards, (card) =>
          !(isReviewComplete(card.dimensionReview, 'what') && (card.what?.length ?? 0) > 0)
        ),
      },
    },
    media: {
      referenceOccurrences: mediaReferences.length,
      referencesByRole: mediaReferences.reduce<Record<string, number>>((counts, reference) => {
        counts[reference.role] = (counts[reference.role] ?? 0) + 1;
        return counts;
      }, {}),
      uniqueReferenced: mediaIds.length,
      loaded: media.length,
      missing: missingMediaIds.length,
      missingMediaIds,
      readiness: {
        ready: readyMedia.length,
        pending: pendingMedia.length,
        failed: failedMedia.length,
        unassessed: unassessedMedia.length,
      },
      reviewedByDimension: mediaReviewCounts,
      allDimensionsReviewed: mediaWithAllDimensionsReviewed.length,
    },
    publicationAttention,
    currentImplementation: {
      ordinaryReaderRequiresPublishedCollection: true,
      ordinaryReaderRequiresEveryRequiredCardPublished: true,
      ordinaryReaderFailsClosedOnMissingRequiredCard: true,
      cardStatusMutationEnforcesCanonPublicationIntegrity: false,
      collectionPublicationMutationImplemented: false,
      audienceGroupsImplemented: false,
      guestRecipientsImplemented: false,
      distributionNotificationsImplemented: false,
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

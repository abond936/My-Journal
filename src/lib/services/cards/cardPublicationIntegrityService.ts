import type { Card } from '@/lib/types/card';
import type { DimensionReviewEntry } from '@/lib/types/dimensionReview';
import { AppError, ErrorCode } from '@/lib/types/error';
import type { Media } from '@/lib/types/photo';
import type { ClassificationRequirements } from '@/lib/types/authorSettings';
import { getMediaIdsFromCard } from '@/lib/services/cards/cardMediaHydrationService';
import { isCardIncludedInFeed } from '@/lib/utils/cardFeedInclusion';
import { countUnresolvedPromptBlocks } from '@/lib/utils/cardPromptBlocks';

const DIMENSIONS = ['who', 'what', 'when', 'where'] as const;
type Dimension = (typeof DIMENSIONS)[number];

export type CardPublicationIntegrityIssue =
  | { code: 'audience-unconfirmed' }
  | { code: 'destination-missing' }
  | { code: 'card-dimension-review'; dimensions: Dimension[] }
  | { code: 'card-meaningful-what' }
  | { code: 'prompt-blocks'; count: number }
  | { code: 'media-missing'; mediaIds: string[] }
  | {
      code: 'media-dimension-review';
      media: Array<{ mediaId: string; dimensions: Dimension[] }>;
    }
  | {
      code: 'media-readiness';
      media: Array<{ mediaId: string; status: 'pending' | 'failed' | 'unassessed' }>;
    };

export type CardPublicationIntegrityResult = {
  ready: boolean;
  issues: CardPublicationIntegrityIssue[];
};

export function isDimensionReviewComplete(entry: DimensionReviewEntry | undefined): boolean {
  return (
    entry?.reviewed === true ||
    entry?.resolution === 'unknown' ||
    entry?.resolution === 'not_applicable'
  );
}

export function evaluateCardPublicationIntegrity(
  card: Card,
  mediaById: ReadonlyMap<string, Media>,
  requirements: ClassificationRequirements = { media: true, cards: true },
  context: { hasActiveCollectionPlacement: boolean } = { hasActiveCollectionPlacement: false }
): CardPublicationIntegrityResult {
  const issues: CardPublicationIntegrityIssue[] = [];
  if (
    !card.audience ||
    (
      !card.audience.allContacts &&
      !(card.audience.groupIds?.length ?? 0) &&
      !(card.audience.contactIds?.length ?? 0)
    )
  ) {
    issues.push({ code: 'audience-unconfirmed' });
  }
  if (!isCardIncludedInFeed(card) && !context.hasActiveCollectionPlacement) {
    issues.push({ code: 'destination-missing' });
  }
  const promptBlockCount = countUnresolvedPromptBlocks(card.content);
  if (promptBlockCount > 0) {
    issues.push({ code: 'prompt-blocks', count: promptBlockCount });
  }
  if (requirements.cards) {
    const cardDimensions = DIMENSIONS.filter(
      (dimension) => !isDimensionReviewComplete(card.dimensionReview?.[dimension])
    );
    if (cardDimensions.length > 0) {
      issues.push({ code: 'card-dimension-review', dimensions: cardDimensions });
    }
    if (
      !isDimensionReviewComplete(card.dimensionReview?.what) ||
      (card.what?.length ?? 0) === 0
    ) {
      issues.push({ code: 'card-meaningful-what' });
    }
  }

  const mediaIds = [...getMediaIdsFromCard(card)];
  const missingMediaIds = mediaIds.filter((mediaId) => !mediaById.has(mediaId));
  if (missingMediaIds.length > 0) {
    issues.push({ code: 'media-missing', mediaIds: missingMediaIds });
  }

  const mediaDimensionReview: Extract<
    CardPublicationIntegrityIssue,
    { code: 'media-dimension-review' }
  >['media'] = [];
  const mediaReadiness: Extract<
    CardPublicationIntegrityIssue,
    { code: 'media-readiness' }
  >['media'] = [];
  for (const mediaId of mediaIds) {
    const media = mediaById.get(mediaId);
    if (!media) continue;
    if (requirements.media) {
      const dimensions = DIMENSIONS.filter(
        (dimension) => !isDimensionReviewComplete(media.dimensionReview?.[dimension])
      );
      if (dimensions.length > 0) mediaDimensionReview.push({ mediaId, dimensions });
    }
    if (media.readiness?.overall !== 'ready') {
      mediaReadiness.push({
        mediaId,
        status: media.readiness?.overall ?? 'unassessed',
      });
    }
  }
  if (mediaDimensionReview.length > 0) {
    issues.push({ code: 'media-dimension-review', media: mediaDimensionReview });
  }
  if (mediaReadiness.length > 0) {
    issues.push({ code: 'media-readiness', media: mediaReadiness });
  }

  return { ready: issues.length === 0, issues };
}

function publicationBlockMessage(issues: CardPublicationIntegrityIssue[]): string {
  const clauses: string[] = [];
  if (issues.some((issue) => issue.code === 'audience-unconfirmed')) {
    clauses.push('explicitly choose all enabled readers or at least one group or individual');
  }
  if (issues.some((issue) => issue.code === 'destination-missing')) {
    clauses.push('include it in the Reader Feed or place it in an active Collection');
  }
  const cardReview = issues.find(
    (issue): issue is Extract<CardPublicationIntegrityIssue, { code: 'card-dimension-review' }> =>
      issue.code === 'card-dimension-review'
  );
  if (cardReview) clauses.push(`review Card ${cardReview.dimensions.join(', ')}`);
  if (issues.some((issue) => issue.code === 'card-meaningful-what')) {
    clauses.push('confirm at least one meaningful What');
  }
  const promptBlocks = issues.find(
    (issue): issue is Extract<CardPublicationIntegrityIssue, { code: 'prompt-blocks' }> =>
      issue.code === 'prompt-blocks'
  );
  if (promptBlocks) {
    clauses.push(
      `keep or remove ${promptBlocks.count} writing prompt${promptBlocks.count === 1 ? '' : 's'}`
    );
  }
  const missing = issues.find(
    (issue): issue is Extract<CardPublicationIntegrityIssue, { code: 'media-missing' }> =>
      issue.code === 'media-missing'
  );
  if (missing) {
    clauses.push(
      `resolve ${missing.mediaIds.length} missing Media reference${missing.mediaIds.length === 1 ? '' : 's'}`
    );
  }
  const mediaReview = issues.find(
    (issue): issue is Extract<CardPublicationIntegrityIssue, { code: 'media-dimension-review' }> =>
      issue.code === 'media-dimension-review'
  );
  if (mediaReview) {
    clauses.push(
      `review ${mediaReview.media.length} referenced Media item${mediaReview.media.length === 1 ? '' : 's'}`
    );
  }
  const readiness = issues.find(
    (issue): issue is Extract<CardPublicationIntegrityIssue, { code: 'media-readiness' }> =>
      issue.code === 'media-readiness'
  );
  if (readiness) {
    clauses.push(
      `complete readiness for ${readiness.media.length} referenced Media item${readiness.media.length === 1 ? '' : 's'}`
    );
  }
  return `This Card cannot be published yet: ${clauses.join('; ')}.`;
}

export function assertCardPublicationIntegrity(
  card: Card,
  mediaById: ReadonlyMap<string, Media>,
  requirements: ClassificationRequirements = { media: true, cards: true },
  context: { hasActiveCollectionPlacement: boolean } = { hasActiveCollectionPlacement: false }
): void {
  const result = evaluateCardPublicationIntegrity(card, mediaById, requirements, context);
  if (result.ready) return;
  throw new AppError(
    ErrorCode.CARD_PUBLICATION_INTEGRITY,
    publicationBlockMessage(result.issues),
    { issues: result.issues }
  );
}

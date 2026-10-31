import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAuthorSettings } from '@/lib/services/authorSettingsService';
import {
  getCollectionPublicationAttention,
  type CollectionPublicationAttention,
} from '@/lib/services/publicationReadinessService';
import { collectionSchema, type Collection, type CollectionLifecycle } from '@/lib/types/collection';
import { AppError, ErrorCode } from '@/lib/types/error';

export type CollectionPublicationIntegrityIssue =
  | { code: 'content-empty' }
  | { code: 'audience-unconfirmed' }
  | { code: 'cards-missing'; count: number }
  | { code: 'cards-draft'; count: number }
  | { code: 'card-dimension-review'; count: number }
  | { code: 'card-meaningful-what'; count: number }
  | { code: 'media-missing'; count: number }
  | { code: 'media-dimension-review'; count: number }
  | { code: 'media-readiness'; count: number };

export function evaluateCollectionPublicationIntegrity(
  attention: CollectionPublicationAttention
): CollectionPublicationIntegrityIssue[] {
  const issues: CollectionPublicationIntegrityIssue[] = [];
  if (attention.requiredCards === 0) issues.push({ code: 'content-empty' });
  if (attention.audienceSelectionState === 'legacy_all_enabled' || attention.audienceSelectionState === 'none') {
    issues.push({ code: 'audience-unconfirmed' });
  }
  if (attention.missingRequiredCards) {
    issues.push({ code: 'cards-missing', count: attention.missingRequiredCards });
  }
  if (attention.draftCards) issues.push({ code: 'cards-draft', count: attention.draftCards });
  if (attention.cardsNeedingDimensionReview) {
    issues.push({ code: 'card-dimension-review', count: attention.cardsNeedingDimensionReview });
  }
  if (attention.cardsMissingMeaningfulWhat) {
    issues.push({ code: 'card-meaningful-what', count: attention.cardsMissingMeaningfulWhat });
  }
  if (attention.missingMedia) issues.push({ code: 'media-missing', count: attention.missingMedia });
  if (attention.mediaNeedingDimensionReview) {
    issues.push({ code: 'media-dimension-review', count: attention.mediaNeedingDimensionReview });
  }
  const incompleteMedia = attention.mediaReadiness.pending
    + attention.mediaReadiness.failed
    + attention.mediaReadiness.unassessed;
  if (incompleteMedia) issues.push({ code: 'media-readiness', count: incompleteMedia });
  return issues;
}

function publicationMessage(issues: CollectionPublicationIntegrityIssue[]): string {
  const clauses = issues.map((issue) => {
    switch (issue.code) {
      case 'content-empty': return 'add at least one Card';
      case 'audience-unconfirmed': return 'explicitly choose all enabled readers or at least one group or individual';
      case 'cards-missing': return `resolve ${issue.count} missing Card reference${issue.count === 1 ? '' : 's'}`;
      case 'cards-draft': return `publish ${issue.count} draft Card${issue.count === 1 ? '' : 's'}`;
      case 'card-dimension-review': return `complete required review for ${issue.count} Card${issue.count === 1 ? '' : 's'}`;
      case 'card-meaningful-what': return `confirm a meaningful What for ${issue.count} Card${issue.count === 1 ? '' : 's'}`;
      case 'media-missing': return `resolve ${issue.count} missing Media reference${issue.count === 1 ? '' : 's'}`;
      case 'media-dimension-review': return `complete required review for ${issue.count} Media item${issue.count === 1 ? '' : 's'}`;
      case 'media-readiness': return `complete readiness for ${issue.count} Media item${issue.count === 1 ? '' : 's'}`;
    }
  });
  return `This Collection cannot be published yet: ${clauses.join('; ')}.`;
}

export async function updateCollectionLifecycle(args: {
  collectionId: string;
  lifecycle: CollectionLifecycle;
  firestore?: FirebaseFirestore.Firestore;
  now?: number;
}): Promise<Collection> {
  const {
    collectionId,
    lifecycle,
    firestore = getAdminApp().firestore(),
    now = Date.now(),
  } = args;
  const ref = firestore.collection('collections').doc(collectionId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new AppError(ErrorCode.NOT_FOUND, 'Collection not found.');
  const current = collectionSchema.parse({ docId: snapshot.id, ...snapshot.data() });
  if (current.recordState !== 'active') {
    throw new AppError(ErrorCode.CONFLICT, 'Only the active Collection authority can change lifecycle.');
  }
  if (current.lifecycle === lifecycle) return current;

  if (lifecycle === 'published') {
    const settings = await getAuthorSettings(firestore);
    const attention = await getCollectionPublicationAttention(
      collectionId,
      firestore,
      settings.classificationRequirements
    );
    if (!attention) throw new AppError(ErrorCode.NOT_FOUND, 'Active Collection not found.');
    const issues = evaluateCollectionPublicationIntegrity(attention);
    if (issues.length) {
      throw new AppError(
        ErrorCode.COLLECTION_PUBLICATION_INTEGRITY,
        publicationMessage(issues),
        { issues }
      );
    }
  }

  await firestore.runTransaction(async (transaction) => {
    const latestSnapshot = await transaction.get(ref);
    if (!latestSnapshot.exists) throw new AppError(ErrorCode.NOT_FOUND, 'Collection not found.');
    const latest = collectionSchema.parse({ docId: latestSnapshot.id, ...latestSnapshot.data() });
    if (latest.recordState !== 'active') {
      throw new AppError(ErrorCode.CONFLICT, 'The Collection authority changed before lifecycle could be saved.');
    }
    if (
      latest.lifecycle !== current.lifecycle
      || latest.structureRevision !== current.structureRevision
      || latest.updatedAt !== current.updatedAt
    ) {
      throw new AppError(ErrorCode.CONFLICT, 'The Collection changed before lifecycle could be saved. Review it and try again.');
    }
    transaction.update(ref, { lifecycle, updatedAt: now });
  });
  return { ...current, lifecycle, updatedAt: now };
}

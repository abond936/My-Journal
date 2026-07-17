import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  mediaDuplicatePairKey,
  type MediaDuplicateDecision,
  type MediaDuplicateReviewDecision,
} from '@/lib/utils/mediaDuplicateEvidence';

const COLLECTION = 'mediaDuplicateReviews';

export async function recordMediaDuplicateDecision(input: {
  mediaIds: [string, string];
  decision: MediaDuplicateDecision;
  canonicalMediaId?: string;
}): Promise<MediaDuplicateReviewDecision> {
  const mediaIds = [...input.mediaIds].sort() as [string, string];
  if (!mediaIds[0] || !mediaIds[1] || mediaIds[0] === mediaIds[1]) {
    throw new Error('A duplicate decision requires two different media records');
  }
  if (
    input.decision === 'same_asset' &&
    (!input.canonicalMediaId || !mediaIds.includes(input.canonicalMediaId))
  ) {
    throw new Error('Same-asset decisions require one reviewed canonical media record');
  }

  const firestore = getAdminApp().firestore();
  const pairKey = mediaDuplicatePairKey(mediaIds[0], mediaIds[1]);
  const [first, second] = await Promise.all(
    mediaIds.map(mediaId => firestore.collection('media').doc(mediaId).get())
  );
  if (!first.exists || !second.exists) {
    throw new Error('Duplicate decisions require two existing media records');
  }

  const result: MediaDuplicateReviewDecision = {
    pairKey,
    mediaIds,
    decision: input.decision,
    ...(input.canonicalMediaId ? { canonicalMediaId: input.canonicalMediaId } : {}),
    ...(input.decision === 'same_asset' ? { reconciliationStatus: 'pending' as const } : {}),
    decidedAt: Date.now(),
  };
  await firestore.collection(COLLECTION).doc(pairKey).set(result);
  return result;
}

export async function getMediaDuplicateDecision(
  firstMediaId: string,
  secondMediaId: string
): Promise<MediaDuplicateReviewDecision | null> {
  const pairKey = mediaDuplicatePairKey(firstMediaId, secondMediaId);
  const snap = await getAdminApp().firestore().collection(COLLECTION).doc(pairKey).get();
  return snap.exists ? (snap.data() as MediaDuplicateReviewDecision) : null;
}

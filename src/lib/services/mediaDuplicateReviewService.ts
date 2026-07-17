import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  mediaDuplicatePairKey,
  groupExactMediaDuplicates,
  type MediaDuplicateDecision,
  type MediaDuplicateReviewGroup,
  type MediaDuplicateReviewDecision,
  type MediaDuplicateReviewStatus,
} from '@/lib/utils/mediaDuplicateEvidence';
import type { Media } from '@/lib/types/photo';

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
  const firstMedia = { ...first.data(), docId: first.id } as Media;
  const secondMedia = { ...second.data(), docId: second.id } as Media;
  const firstIdentity = firstMedia.contentIdentity;
  const secondIdentity = secondMedia.contentIdentity;
  if (
    !firstIdentity ||
    !secondIdentity ||
    firstIdentity.algorithm !== 'sha256' ||
    secondIdentity.algorithm !== 'sha256' ||
    firstIdentity.basis !== 'source-bytes' ||
    secondIdentity.basis !== 'source-bytes' ||
    firstIdentity.digest !== secondIdentity.digest
  ) {
    throw new Error('These media records are no longer an exact source-byte match');
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

export async function listMediaDuplicateReviewGroups(
  status: MediaDuplicateReviewStatus = 'unresolved'
): Promise<MediaDuplicateReviewGroup[]> {
  const firestore = getAdminApp().firestore();
  const [mediaSnapshot, decisionSnapshot] = await Promise.all([
    firestore.collection('media').select('contentIdentity').get(),
    firestore.collection(COLLECTION).get(),
  ]);
  const evidenceRows = mediaSnapshot.docs.map(doc => ({
    docId: doc.id,
    ...doc.data(),
  })) as Media[];
  const decisions = new Map(
    decisionSnapshot.docs.map(doc => [doc.id, doc.data() as MediaDuplicateReviewDecision] as const)
  );
  const exactPairs = groupExactMediaDuplicates(evidenceRows).flatMap(group =>
    group.mediaIds.flatMap((firstMediaId, index) =>
      group.mediaIds.slice(index + 1).map(secondMediaId => ({
        digest: group.digest,
        mediaIds: [firstMediaId, secondMediaId] as [string, string],
      }))
    )
  );
  const included = exactPairs.filter(group => {
    const decision = decisions.get(mediaDuplicatePairKey(group.mediaIds[0]!, group.mediaIds[1]!));
    const reviewed = decision?.decision === 'same_asset' || decision?.decision === 'keep_both';
    if (status === 'reviewed') return reviewed;
    if (status === 'unresolved') return !reviewed;
    return true;
  });
  const mediaRefs = included.flatMap(group =>
    group.mediaIds.map(mediaId => firestore.collection('media').doc(mediaId))
  );
  const fullSnapshots = mediaRefs.length > 0 ? await firestore.getAll(...mediaRefs) : [];
  const fullMedia = new Map(
    fullSnapshots
      .filter(snapshot => snapshot.exists)
      .map(snapshot => [snapshot.id, { ...snapshot.data(), docId: snapshot.id } as Media] as const)
  );

  return included.map(group => ({
    digest: group.digest,
    media: group.mediaIds.map(mediaId => fullMedia.get(mediaId)).filter((item): item is Media => Boolean(item)),
    decision:
      decisions.get(mediaDuplicatePairKey(group.mediaIds[0]!, group.mediaIds[1]!)) ?? null,
  }));
}

export async function getMediaDuplicateDecision(
  firstMediaId: string,
  secondMediaId: string
): Promise<MediaDuplicateReviewDecision | null> {
  const pairKey = mediaDuplicatePairKey(firstMediaId, secondMediaId);
  const snap = await getAdminApp().firestore().collection(COLLECTION).doc(pairKey).get();
  return snap.exists ? (snap.data() as MediaDuplicateReviewDecision) : null;
}

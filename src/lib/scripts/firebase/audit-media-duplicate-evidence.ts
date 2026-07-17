import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Media } from '@/lib/types/photo';
import { groupExactMediaDuplicates, mediaDuplicatePairKey } from '@/lib/utils/mediaDuplicateEvidence';

async function main() {
  const firestore = getAdminApp().firestore();
  const [mediaSnap, decisionSnap] = await Promise.all([
    firestore.collection('media').select('contentIdentity').get(),
    firestore.collection('mediaDuplicateReviews').get(),
  ]);
  const media = mediaSnap.docs.map(doc => ({ docId: doc.id, ...doc.data() })) as Media[];
  const groups = groupExactMediaDuplicates(media);
  const decidedPairs = new Set(decisionSnap.docs.map(doc => doc.id));
  const unresolvedPairs = groups.flatMap(group =>
    group.mediaIds.flatMap((first, index) =>
      group.mediaIds
        .slice(index + 1)
        .map(second => mediaDuplicatePairKey(first, second))
        .filter(pairKey => !decidedPairs.has(pairKey))
    )
  );

  console.log(
    JSON.stringify(
      {
        mediaCount: media.length,
        evidenceCount: media.filter(item => item.contentIdentity?.digest).length,
        exactDuplicateGroups: groups,
        reviewedPairCount: decisionSnap.size,
        unresolvedPairs,
      },
      null,
      2
    )
  );
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

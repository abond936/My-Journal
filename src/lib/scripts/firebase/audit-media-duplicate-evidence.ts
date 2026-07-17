import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Media } from '@/lib/types/photo';
import { groupExactMediaDuplicates, mediaDuplicatePairKey } from '@/lib/utils/mediaDuplicateEvidence';

async function main() {
  const app = getAdminApp();
  const firestore = app.firestore();
  const [mediaSnap, decisionSnap, identitySnap] = await Promise.all([
    firestore.collection('media').select('contentIdentity').get(),
    firestore.collection('mediaDuplicateReviews').get(),
    firestore.collection('mediaContentIdentities').get(),
  ]);
  const media = mediaSnap.docs.map(doc => ({ docId: doc.id, ...doc.data() })) as Media[];
  const groups = groupExactMediaDuplicates(media);
  const duplicateDigests = new Set(groups.map(group => group.digest));
  const evidencedByDigest = new Map(
    media
      .filter(item => item.contentIdentity?.digest)
      .map(item => [item.contentIdentity!.digest, item.docId] as const)
  );
  const registeredByDigest = new Map(
    identitySnap.docs.map(doc => [doc.id, doc.data().mediaId as string | undefined] as const)
  );
  const missingRegistries = Array.from(evidencedByDigest, ([digest, mediaId]) => ({ digest, mediaId }))
    .filter(item => !duplicateDigests.has(item.digest) && !registeredByDigest.has(item.digest));
  const registryConflicts = Array.from(registeredByDigest, ([digest, mediaId]) => ({
    digest,
    mediaId,
    expectedMediaId: evidencedByDigest.get(digest),
  })).filter(item => item.expectedMediaId && item.mediaId !== item.expectedMediaId);
  const orphanRegistries = Array.from(registeredByDigest, ([digest, mediaId]) => ({ digest, mediaId }))
    .filter(item => !evidencedByDigest.has(item.digest));
  const duplicateRegistries = Array.from(registeredByDigest, ([digest, mediaId]) => ({ digest, mediaId }))
    .filter(item => duplicateDigests.has(item.digest));
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
        identityRegistryCount: identitySnap.size,
        exactDuplicateGroups: groups,
        reviewedPairCount: decisionSnap.size,
        unresolvedPairs,
        missingRegistries,
        registryConflicts,
        orphanRegistries,
        duplicateRegistries,
      },
      null,
      2
    )
  );
  await app.delete();
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

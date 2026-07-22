import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { bulkApplyMediaTags } from '@/lib/services/images/imageImportService';
import { recomputeCardsMediaSignalsForMediaIds } from '@/lib/services/cards/cardMediaLifecycleService';
import type { Media } from '@/lib/types/photo';
import {
  flattenSuggestedTagIds,
  provisionalClusterSchema,
  type ProvisionalCluster,
  type ReviewLens,
  type SuggestedTagIdsByDimension,
} from '@/lib/types/provisionalCluster';
import { buildReviewClustersForLens } from '@/lib/utils/reviewClusterHeuristics';
import { buildReviewClusterMerge } from '@/lib/utils/provisionalClusterMerge';

const COLLECTION = 'provisional_clusters';

function normalizeCluster(raw: unknown, docId: string): ProvisionalCluster {
  const parsed = provisionalClusterSchema.safeParse({ ...(raw as object), docId });
  if (parsed.success) return parsed.data;
  throw new Error(`Invalid provisional cluster document ${docId}`);
}

export async function listPendingReviewClusters(lens: ReviewLens): Promise<ProvisionalCluster[]> {
  const firestore = getAdminApp().firestore();
  const snap = await firestore
    .collection(COLLECTION)
    .where('status', '==', 'pending')
    .where('lens', '==', lens)
    .get();

  return snap.docs
    .map((doc) => normalizeCluster(doc.data(), doc.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listAllPendingReviewClusters(): Promise<ProvisionalCluster[]> {
  const firestore = getAdminApp().firestore();
  const snap = await firestore.collection(COLLECTION).where('status', '==', 'pending').get();
  return snap.docs
    .map((doc) => normalizeCluster(doc.data(), doc.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function collectPendingReviewMemberMediaIds(): Promise<Set<string>> {
  const pending = await listAllPendingReviewClusters();
  const ids = new Set<string>();
  for (const cluster of pending) {
    for (const mediaId of cluster.memberMediaIds) {
      if (mediaId) ids.add(mediaId);
    }
  }
  return ids;
}

async function loadMediaByIds(mediaIds: string[]): Promise<Media[]> {
  if (mediaIds.length === 0) return [];
  const firestore = getAdminApp().firestore();
  const docs = await Promise.all(
    mediaIds.map((id) => firestore.collection('media').doc(id).get())
  );
  const media: Media[] = [];
  for (const doc of docs) {
    if (doc.exists) {
      media.push({ docId: doc.id, ...doc.data() } as Media);
    }
  }
  return media;
}

async function loadMediaForClustering(mediaIds?: string[]): Promise<Media[]> {
  const firestore = getAdminApp().firestore();
  if (mediaIds && mediaIds.length > 0) {
    return loadMediaByIds(mediaIds);
  }
  const snap = await firestore.collection('media').orderBy('createdAt', 'desc').limit(500).get();
  return snap.docs.map((doc) => ({ docId: doc.id, ...doc.data() }) as Media);
}

export async function generateReviewClusters(opts: {
  lens: ReviewLens;
  mediaIds?: string[];
}): Promise<{ created: number; clusters: ProvisionalCluster[] }> {
  const firestore = getAdminApp().firestore();
  const [mediaItems, allTags, alreadyAssigned] = await Promise.all([
    loadMediaForClustering(opts.mediaIds),
    getAllTags(),
    collectPendingReviewMemberMediaIds(),
  ]);

  const unassignedMedia = mediaItems.filter((item) => !alreadyAssigned.has(item.docId));
  const drafts = buildReviewClustersForLens(opts.lens, unassignedMedia, allTags);
  const now = Date.now();

  const batch = firestore.batch();
  const scopedImport = Boolean(opts.mediaIds && opts.mediaIds.length > 0);
  if (!scopedImport) {
    const pendingSnap = await firestore
      .collection(COLLECTION)
      .where('status', '==', 'pending')
      .where('lens', '==', opts.lens)
      .get();

    for (const doc of pendingSnap.docs) {
      batch.delete(doc.ref);
    }
  }

  const createdClusters: ProvisionalCluster[] = [];
  for (const draft of drafts) {
    const ref = firestore.collection(COLLECTION).doc();
    const record: ProvisionalCluster = {
      docId: ref.id,
      lens: draft.lens,
      status: 'pending',
      title: draft.title,
      reason: draft.reason,
      occasionLabel: draft.occasionLabel,
      memberMediaIds: draft.memberMediaIds,
      suggestedTagIds: draft.suggestedTagIds,
      coverageNote: draft.coverageNote,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(ref, record);
    createdClusters.push(record);
  }

  await batch.commit();
  return { created: createdClusters.length, clusters: createdClusters };
}

export async function createEmptyReviewCluster(opts: {
  title: string;
  lens: ReviewLens;
}): Promise<ProvisionalCluster> {
  const firestore = getAdminApp().firestore();
  const trimmedTitle = opts.title.trim();
  if (!trimmedTitle) {
    throw new Error('Pile title is required');
  }

  const now = Date.now();
  const ref = firestore.collection(COLLECTION).doc();
  const record: ProvisionalCluster = {
    docId: ref.id,
    lens: opts.lens,
    status: 'pending',
    title: trimmedTitle,
    reason: 'Author-created empty pile',
    memberMediaIds: [],
    suggestedTagIds: {},
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(record);
  return record;
}

export async function getReviewCluster(clusterId: string): Promise<ProvisionalCluster | null> {
  const firestore = getAdminApp().firestore();
  const doc = await firestore.collection(COLLECTION).doc(clusterId).get();
  if (!doc.exists) return null;
  return normalizeCluster(doc.data(), doc.id);
}

export async function updateReviewClusterSuggestedTags(
  clusterId: string,
  suggestedTagIds: SuggestedTagIdsByDimension
): Promise<ProvisionalCluster> {
  const firestore = getAdminApp().firestore();
  const ref = firestore.collection(COLLECTION).doc(clusterId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Cluster not found');
  const current = normalizeCluster(snap.data(), snap.id);
  if (current.status !== 'pending') throw new Error('Cluster is not pending');

  const next = {
    suggestedTagIds,
    updatedAt: Date.now(),
  };
  await ref.update(next);
  return { ...current, ...next };
}

async function applySuggestedTagsToMembers(cluster: ProvisionalCluster): Promise<number> {
  const tagIds = flattenSuggestedTagIds(cluster.suggestedTagIds);
  if (tagIds.length === 0 || cluster.memberMediaIds.length === 0) return 0;
  const { updatedIds } = await bulkApplyMediaTags(cluster.memberMediaIds, {
    tagIds,
    mode: 'add',
  });
  if (updatedIds.length) {
    await recomputeCardsMediaSignalsForMediaIds(updatedIds);
  }
  return updatedIds.length;
}

export async function acceptReviewClusterTags(clusterId: string): Promise<ProvisionalCluster> {
  const cluster = await getReviewCluster(clusterId);
  if (!cluster) throw new Error('Cluster not found');
  if (cluster.status !== 'pending') throw new Error('Cluster is not pending');
  await applySuggestedTagsToMembers(cluster);
  return cluster;
}

export async function acceptReviewClusterPile(clusterId: string): Promise<ProvisionalCluster> {
  const firestore = getAdminApp().firestore();
  const cluster = await getReviewCluster(clusterId);
  if (!cluster) throw new Error('Cluster not found');
  if (cluster.status !== 'pending') throw new Error('Cluster is not pending');
  await applySuggestedTagsToMembers(cluster);
  const next = { status: 'accepted' as const, updatedAt: Date.now() };
  await firestore.collection(COLLECTION).doc(clusterId).update(next);
  return { ...cluster, ...next };
}

export async function dismissReviewCluster(clusterId: string): Promise<ProvisionalCluster> {
  const firestore = getAdminApp().firestore();
  const cluster = await getReviewCluster(clusterId);
  if (!cluster) throw new Error('Cluster not found');
  if (cluster.status !== 'pending') throw new Error('Cluster is not pending');
  const next = { status: 'dismissed' as const, updatedAt: Date.now() };
  await firestore.collection(COLLECTION).doc(clusterId).update(next);
  return { ...cluster, ...next };
}

export async function splitReviewCluster(
  clusterId: string,
  splitOffMediaIds: string[]
): Promise<{ original: ProvisionalCluster; split: ProvisionalCluster }> {
  const firestore = getAdminApp().firestore();
  const cluster = await getReviewCluster(clusterId);
  if (!cluster) throw new Error('Cluster not found');
  if (cluster.status !== 'pending') throw new Error('Cluster is not pending');

  const splitSet = new Set(splitOffMediaIds.filter(Boolean));
  if (splitSet.size === 0) throw new Error('No media selected to split');

  const remaining = cluster.memberMediaIds.filter((id) => !splitSet.has(id));
  const moving = cluster.memberMediaIds.filter((id) => splitSet.has(id));
  if (remaining.length === 0 || moving.length === 0) {
    throw new Error('Split must leave media in both groups');
  }

  const now = Date.now();
  const splitRef = firestore.collection(COLLECTION).doc();
  const splitCluster: ProvisionalCluster = {
    docId: splitRef.id,
    lens: cluster.lens,
    status: 'pending',
    title: `${cluster.title} (split)`,
    reason: `Split from “${cluster.title}”`,
    occasionLabel: cluster.occasionLabel,
    memberMediaIds: moving,
    suggestedTagIds: cluster.suggestedTagIds,
    coverageNote: cluster.coverageNote,
    createdAt: now,
    updatedAt: now,
  };

  await firestore.runTransaction(async (txn) => {
    const originalRef = firestore.collection(COLLECTION).doc(clusterId);
    txn.update(originalRef, {
      memberMediaIds: remaining,
      updatedAt: now,
    });
    txn.set(splitRef, splitCluster);
  });

  const original = await getReviewCluster(clusterId);
  if (!original) throw new Error('Cluster missing after split');
  return { original, split: splitCluster };
}

export async function moveReviewClusterMembers(opts: {
  mediaIds: string[];
  targetClusterId: string | null;
}): Promise<void> {
  const mediaIds = Array.from(new Set(opts.mediaIds.map((id) => id.trim()).filter(Boolean)));
  if (mediaIds.length === 0) {
    throw new Error('No media to move');
  }

  const firestore = getAdminApp().firestore();
  const mediaSet = new Set(mediaIds);

  if (opts.targetClusterId) {
    const target = await getReviewCluster(opts.targetClusterId);
    if (!target) throw new Error('Target pile not found');
    if (target.status !== 'pending') throw new Error('Target pile is not pending');
  }

  const allPending = await listAllPendingReviewClusters();
  const now = Date.now();

  await firestore.runTransaction(async (txn) => {
    for (const cluster of allPending) {
      if (!cluster.docId) continue;
      const hasMovingMember = cluster.memberMediaIds.some((id) => mediaSet.has(id));
      const isTarget = opts.targetClusterId != null && cluster.docId === opts.targetClusterId;
      if (!hasMovingMember && !isTarget) continue;

      const nextMembers = cluster.memberMediaIds.filter((id) => !mediaSet.has(id));
      if (isTarget && opts.targetClusterId) {
        for (const id of mediaIds) {
          if (!nextMembers.includes(id)) {
            nextMembers.push(id);
          }
        }
      }

      if (
        nextMembers.length !== cluster.memberMediaIds.length ||
        (isTarget && mediaIds.some((id) => !cluster.memberMediaIds.includes(id)))
      ) {
        txn.update(firestore.collection(COLLECTION).doc(cluster.docId), {
          memberMediaIds: nextMembers,
          updatedAt: now,
        });
      }
    }
  });
}

export async function mergeReviewClusters(opts: {
  sourceClusterId: string;
  targetClusterId: string;
}): Promise<{ source: ProvisionalCluster; target: ProvisionalCluster }> {
  const sourceClusterId = opts.sourceClusterId.trim();
  const targetClusterId = opts.targetClusterId.trim();
  if (!sourceClusterId || !targetClusterId) throw new Error('Source and target piles are required');
  if (sourceClusterId === targetClusterId) throw new Error('A pile cannot be merged into itself');

  const firestore = getAdminApp().firestore();
  const sourceRef = firestore.collection(COLLECTION).doc(sourceClusterId);
  const targetRef = firestore.collection(COLLECTION).doc(targetClusterId);

  return firestore.runTransaction(async (txn) => {
    const [sourceSnap, targetSnap] = await Promise.all([txn.get(sourceRef), txn.get(targetRef)]);
    if (!sourceSnap.exists) throw new Error('Source pile not found');
    if (!targetSnap.exists) throw new Error('Target pile not found');

    const source = normalizeCluster(sourceSnap.data(), sourceSnap.id);
    const target = normalizeCluster(targetSnap.data(), targetSnap.id);
    const merged = buildReviewClusterMerge(source, target);
    const targetUpdate = {
      memberMediaIds: merged.target.memberMediaIds,
      updatedAt: merged.target.updatedAt,
    };
    const sourceUpdate = {
      status: merged.source.status,
      mergedIntoClusterId: merged.source.mergedIntoClusterId,
      mergedAt: merged.source.mergedAt,
      updatedAt: merged.source.updatedAt,
    };

    txn.update(targetRef, targetUpdate);
    txn.update(sourceRef, sourceUpdate);

    return merged;
  });
}

export async function countPendingReviewClusters(lens: ReviewLens): Promise<number> {
  const firestore = getAdminApp().firestore();
  const snap = await firestore
    .collection(COLLECTION)
    .where('status', '==', 'pending')
    .where('lens', '==', lens)
    .get();
  return snap.size;
}

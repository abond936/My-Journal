import type { ProvisionalCluster } from '@/lib/types/provisionalCluster';

export function buildReviewClusterMerge(
  source: ProvisionalCluster,
  target: ProvisionalCluster,
  now = Date.now()
): { source: ProvisionalCluster; target: ProvisionalCluster } {
  if (!source.docId || !target.docId) throw new Error('Source and target piles are required');
  if (source.docId === target.docId) throw new Error('A pile cannot be merged into itself');
  if (source.status !== 'pending') throw new Error('Source pile is not pending');
  if (target.status !== 'pending') throw new Error('Target pile is not pending');

  const mergedMembers = Array.from(
    new Set([...target.memberMediaIds, ...source.memberMediaIds].filter(Boolean))
  );
  return {
    source: {
      ...source,
      status: 'merged',
      mergedIntoClusterId: target.docId,
      mergedAt: now,
      updatedAt: now,
    },
    target: { ...target, memberMediaIds: mergedMembers, updatedAt: now },
  };
}

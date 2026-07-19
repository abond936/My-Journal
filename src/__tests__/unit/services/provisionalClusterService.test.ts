import { buildReviewClusterMerge } from '@/lib/utils/provisionalClusterMerge';
import type { ProvisionalCluster } from '@/lib/types/provisionalCluster';

function cluster(
  docId: string,
  memberMediaIds: string[],
  overrides: Partial<ProvisionalCluster> = {}
): ProvisionalCluster {
  return {
    docId,
    lens: 'suggested',
    status: 'pending',
    title: docId,
    reason: 'test',
    memberMediaIds,
    suggestedTagIds: { what: [`${docId}-tag`] },
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

describe('buildReviewClusterMerge', () => {
  it('keeps target order, appends source members, and removes duplicates', () => {
    const source = cluster('source', ['m2', 'm3']);
    const target = cluster('target', ['m1', 'm2']);

    const result = buildReviewClusterMerge(source, target, 100);

    expect(result.target.memberMediaIds).toEqual(['m1', 'm2', 'm3']);
    expect(result.target.title).toBe('target');
    expect(result.target.suggestedTagIds).toEqual({ what: ['target-tag'] });
    expect(result.source).toMatchObject({
      status: 'merged',
      mergedIntoClusterId: 'target',
      mergedAt: 100,
      memberMediaIds: ['m2', 'm3'],
      suggestedTagIds: { what: ['source-tag'] },
    });
  });

  it.each([
    ['source', 'accepted'],
    ['source', 'dismissed'],
    ['source', 'merged'],
    ['target', 'accepted'],
  ] as const)('rejects a non-pending %s pile with %s status', (side, status) => {
    const source = cluster('source', ['m1'], side === 'source' ? { status } : {});
    const target = cluster('target', ['m2'], side === 'target' ? { status } : {});
    expect(() => buildReviewClusterMerge(source, target, 100)).toThrow('not pending');
  });

  it('rejects merging a pile into itself', () => {
    expect(() => buildReviewClusterMerge(cluster('same', ['m1']), cluster('same', ['m2']))).toThrow(
      'cannot be merged into itself'
    );
  });
});

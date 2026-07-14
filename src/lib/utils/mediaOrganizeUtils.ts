import type { Media } from '@/lib/types/photo';
import type { ProvisionalCluster, ReviewLens } from '@/lib/types/provisionalCluster';

export type OrganizeImportScopeMode = 'none' | 'recent' | 'one' | 'many' | 'all';
export type OrganizeSourceMode = 'raw' | 'foldered' | 'phone';

/** Shared batch id for media imported before per-batch `importBatchId` existed. */
export const LEGACY_IMPORT_BATCH_ID = 'batch-legacy';

export type OrganizeImportScopeState = {
  mode: OrganizeImportScopeMode;
  singleBatchId: string;
  manyBatchIds: string[];
};

export function collectImportBatchIdsFromMedia(
  mediaItems: Pick<Media, 'importBatchId'>[]
): string[] {
  const ids = new Set<string>();
  for (const item of mediaItems) {
    const batchId = item.importBatchId?.trim();
    if (batchId) ids.add(batchId);
  }
  return Array.from(ids).sort((a, b) => b.localeCompare(a));
}

export function filterMediaForOrganizeBatch(
  mediaItems: Media[],
  batchFilter: string | null | undefined
): Media[] {
  const trimmed = batchFilter?.trim();
  if (!trimmed) return mediaItems;
  return mediaItems.filter((item) => item.importBatchId === trimmed);
}

export function filterMediaForOrganizeImportScope(
  mediaItems: Media[],
  scope: OrganizeImportScopeState,
  recentBatchId: string
): Media[] {
  switch (scope.mode) {
    case 'none':
      return mediaItems;
    case 'recent':
      return recentBatchId
        ? mediaItems.filter((item) => item.importBatchId === recentBatchId)
        : [];
    case 'one':
      return scope.singleBatchId
        ? mediaItems.filter((item) => item.importBatchId === scope.singleBatchId)
        : [];
    case 'many': {
      const allowed = new Set(scope.manyBatchIds.filter(Boolean));
      if (allowed.size === 0) return [];
      return mediaItems.filter((item) => item.importBatchId && allowed.has(item.importBatchId));
    }
    case 'all':
      return mediaItems.filter((item) => Boolean(item.importBatchId?.trim()));
    default:
      return mediaItems;
  }
}

export function organizeSourceToReviewLens(source: OrganizeSourceMode): ReviewLens {
  switch (source) {
    case 'raw':
      return 'when';
    case 'phone':
      return 'suggested';
    case 'foldered':
    default:
      return 'suggested';
  }
}

export function formatImportBatchLabel(batchId: string): string {
  const trimmed = batchId.trim();
  if (!trimmed) return 'Unknown batch';
  if (trimmed === LEGACY_IMPORT_BATCH_ID) return 'Legacy imports';
  if (trimmed.startsWith('batch-')) {
    const suffix = trimmed.slice('batch-'.length);
    if (/^\d+$/.test(suffix)) {
      return `Import ${new Date(Number(suffix)).toLocaleString()}`;
    }
  }
  return `Import ${trimmed.slice(0, 12)}…`;
}

export type StoryPileOverlaySection = {
  id: string;
  title: string;
  subtitle?: string;
  memberMediaIds: string[];
  clusterId?: string;
  cluster?: ProvisionalCluster;
  oversized?: boolean;
  isUnsorted?: boolean;
};

export function buildStoryPileOverlayGroups(
  mediaItems: Media[],
  clusters: ProvisionalCluster[]
): StoryPileOverlaySection[] {
  const mediaIdSet = new Set(mediaItems.map((item) => item.docId));
  const assigned = new Set<string>();
  const sections: StoryPileOverlaySection[] = [];

  const pendingClusters = clusters
    .filter((cluster) => cluster.status === 'pending')
    .sort((a, b) => b.memberMediaIds.length - a.memberMediaIds.length);

  for (const cluster of pendingClusters) {
    const members = cluster.memberMediaIds.filter(
      (id) => mediaIdSet.has(id) && !assigned.has(id)
    );
    for (const id of members) {
      assigned.add(id);
    }

    const isEmptyAuthorPile = cluster.memberMediaIds.length === 0;
    if (members.length === 0 && !isEmptyAuthorPile) continue;

    sections.push({
      id: cluster.docId ?? cluster.title,
      title: cluster.title,
      subtitle: cluster.reason,
      memberMediaIds: members,
      clusterId: cluster.docId,
      cluster,
      oversized: members.length > 40,
    });
  }

  const ungrouped = mediaItems.map((item) => item.docId).filter((id) => !assigned.has(id));
  sections.push({
    id: 'unsorted',
    title: 'Unsorted',
    subtitle: 'Media not in a story pile',
    memberMediaIds: ungrouped,
    isUnsorted: true,
  });

  return sections;
}

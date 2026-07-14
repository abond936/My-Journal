import type { Media } from '@/lib/types/photo';
import type { ProvisionalCluster } from '@/lib/types/provisionalCluster';
import {
  dayKeyFromTimestamp,
  folderLabelFromSourcePath,
  formatDayTitle,
} from '@/lib/utils/reviewClusterHeuristics';

export type MediaBrowseGroupMode = 'none' | 'folder' | 'day' | 'batch' | 'suggested';

export type MediaBrowseGroup = {
  id: string;
  title: string;
  subtitle?: string;
  memberMediaIds: string[];
  clusterId?: string;
  oversized?: boolean;
};

export function importFolderLabelFromMedia(item: Pick<Media, 'sourcePath'>): string {
  return folderLabelFromSourcePath(item.sourcePath ?? '') ?? 'Unknown folder';
}

export function dayLabelFromMedia(item: Pick<Media, 'createdAt'>): string {
  if (!item.createdAt) return 'Unknown date';
  return formatDayTitle(item.createdAt);
}

export function groupMediaForBrowse(
  mediaItems: Media[],
  mode: MediaBrowseGroupMode,
  clusters: ProvisionalCluster[] = []
): MediaBrowseGroup[] {
  if (mode === 'none' || mediaItems.length === 0) return [];

  if (mode === 'suggested') {
    const assigned = new Set<string>();
    const groups: MediaBrowseGroup[] = [];
    for (const cluster of clusters) {
      const members = cluster.memberMediaIds.filter((id) =>
        mediaItems.some((item) => item.docId === id)
      );
      if (members.length === 0) continue;
      members.forEach((id) => assigned.add(id));
      groups.push({
        id: cluster.docId ?? cluster.title,
        title: cluster.title,
        subtitle: cluster.reason,
        memberMediaIds: members,
        clusterId: cluster.docId,
        oversized: members.length > 40,
      });
    }
    const ungrouped = mediaItems
      .map((item) => item.docId)
      .filter((id) => !assigned.has(id));
    if (ungrouped.length > 0) {
      groups.push({
        id: 'ungrouped',
        title: 'Not in a suggested pile',
        subtitle: 'Import or refresh suggested piles in Review',
        memberMediaIds: ungrouped,
      });
    }
    return groups;
  }

  const map = new Map<string, Media[]>();
  for (const item of mediaItems) {
    let key: string;
    let title: string;
    if (mode === 'folder') {
      key = importFolderLabelFromMedia(item);
      title = key;
    } else if (mode === 'day') {
      key = item.createdAt ? dayKeyFromTimestamp(item.createdAt) : 'unknown-date';
      title = dayLabelFromMedia(item);
    } else {
      key = item.importBatchId?.trim() || 'no-batch';
      title = item.importBatchId ? `Import ${item.importBatchId.slice(0, 8)}…` : 'No import batch';
    }
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .map(([key, members]) => ({
      id: key,
      title:
        mode === 'folder'
          ? key
          : mode === 'day'
            ? members[0]
              ? dayLabelFromMedia(members[0])
              : key
            : key === 'no-batch'
              ? 'No import batch'
              : `Batch ${key.slice(0, 8)}…`,
      memberMediaIds: members.map((item) => item.docId),
      oversized: members.length > 40,
    }))
    .sort((a, b) => b.memberMediaIds.length - a.memberMediaIds.length);
}

export function filterMediaByImportBatch(
  mediaItems: Media[],
  batchId: string | null
): Media[] {
  if (!batchId) return mediaItems;
  return mediaItems.filter((item) => item.importBatchId === batchId);
}

export function filterMediaByImportFolder(
  mediaItems: Media[],
  folder: string | null
): Media[] {
  if (!folder || folder === 'all') return mediaItems;
  return mediaItems.filter((item) => importFolderLabelFromMedia(item) === folder);
}

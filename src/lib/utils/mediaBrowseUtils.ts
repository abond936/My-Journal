import type { Media } from '@/lib/types/photo';
import type { Card } from '@/lib/types/card';
import {
  dayKeyFromTimestamp,
  folderLabelFromSourcePath,
  formatDayTitle,
} from '@/lib/utils/reviewClusterHeuristics';

export type MediaBrowseGroupMode = 'none' | 'folder' | 'day' | 'batch' | 'metadata' | 'card';

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
  galleryCards: Pick<Card, 'docId' | 'title' | 'subtitle' | 'status' | 'galleryMedia'>[] = []
): MediaBrowseGroup[] {
  if (mode === 'none' || mediaItems.length === 0) return [];
  if (mode === 'card') {
    const visibleMediaIds = new Set(mediaItems.map((item) => item.docId));
    const groupedMediaIds = new Set<string>();
    const cardGroups = galleryCards
      .map((card) => {
        const memberMediaIds = Array.from(
          new Set(
            (card.galleryMedia ?? [])
              .map((item) => item.mediaId)
              .filter((mediaId) => visibleMediaIds.has(mediaId))
          )
        );
        memberMediaIds.forEach((mediaId) => groupedMediaIds.add(mediaId));
        return {
          id: `card:${card.docId}`,
          title: card.title?.trim() || card.subtitle?.trim() || 'Untitled Card',
          subtitle: card.status === 'draft' ? 'Draft Gallery Card' : 'Published Gallery Card',
          memberMediaIds,
          oversized: memberMediaIds.length > 40,
        };
      })
      .filter((group) => group.memberMediaIds.length > 0)
      .sort((a, b) => a.title.localeCompare(b.title));

    const unassignedMediaIds = mediaItems
      .map((item) => item.docId)
      .filter((mediaId) => !groupedMediaIds.has(mediaId));
    if (unassignedMediaIds.length > 0) {
      cardGroups.push({
        id: 'card:unassigned',
        title: 'Not in a Gallery Card',
        subtitle: 'Filtered media without Gallery membership',
        memberMediaIds: unassignedMediaIds,
        oversized: unassignedMediaIds.length > 40,
      });
    }
    return cardGroups;
  }

  const map = new Map<string, Media[]>();
  for (const item of mediaItems) {
    let key: string;
    if (mode === 'folder') {
      key = importFolderLabelFromMedia(item);
    } else if (mode === 'day') {
      key = item.createdAt ? dayKeyFromTimestamp(item.createdAt) : 'unknown-date';
    } else if (mode === 'batch') {
      key = item.importBatchId?.trim() || 'no-batch';
    } else {
      key = item.metadataImport?.outcome ?? 'unknown';
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
            : mode === 'metadata'
              ? key === 'found'
                ? 'Metadata found'
                : key === 'none'
                  ? 'No metadata found'
                  : key === 'error'
                    ? 'Metadata read error'
                    : key === 'not_requested'
                      ? 'Metadata not requested'
                      : 'Legacy / unknown'
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

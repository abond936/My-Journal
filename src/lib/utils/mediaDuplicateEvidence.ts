import { createHash } from 'node:crypto';
import type { Media, MediaSourceIdentity } from '@/lib/types/photo';

export type MediaDuplicateDecision = 'same_asset' | 'keep_both' | 'defer';

export interface MediaDuplicateReviewDecision {
  pairKey: string;
  mediaIds: [string, string];
  decision: MediaDuplicateDecision;
  canonicalMediaId?: string;
  reconciliationStatus?: 'pending';
  decidedAt: number;
}

export type MediaDuplicateReviewStatus = 'unresolved' | 'reviewed' | 'all';

export interface MediaDuplicateReviewGroup {
  digest: string;
  media: Media[];
  decision: MediaDuplicateReviewDecision | null;
}

export function sha256SourceBytes(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function buildMediaSourceIdentity(
  provider: MediaSourceIdentity['provider'],
  assetId: string,
  sourcePath?: string,
  importedAt = Date.now(),
  evidence?: Pick<MediaSourceIdentity, 'observedFilename' | 'caption' | 'tagIds' | 'importBatchId'>
): MediaSourceIdentity {
  return {
    provider,
    assetId: assetId.trim(),
    ...(sourcePath ? { sourcePath } : {}),
    importedAt,
    ...(evidence?.observedFilename ? { observedFilename: evidence.observedFilename } : {}),
    ...(evidence?.caption ? { caption: evidence.caption } : {}),
    ...(evidence?.tagIds?.length ? { tagIds: evidence.tagIds } : {}),
    ...(evidence?.importBatchId ? { importBatchId: evidence.importBatchId } : {}),
  };
}

export function mediaDuplicatePairKey(firstMediaId: string, secondMediaId: string): string {
  return [firstMediaId, secondMediaId].sort().join('__');
}

export function groupExactMediaDuplicates(
  media: Array<Pick<Media, 'docId' | 'contentIdentity'>>
): Array<{ digest: string; mediaIds: string[] }> {
  const groups = new Map<string, string[]>();
  for (const item of media) {
    const digest = item.contentIdentity?.digest;
    if (!digest) continue;
    const ids = groups.get(digest) ?? [];
    ids.push(item.docId);
    groups.set(digest, ids);
  }
  return Array.from(groups, ([digest, mediaIds]) => ({ digest, mediaIds: mediaIds.sort() }))
    .filter(group => group.mediaIds.length > 1)
    .sort((a, b) => a.digest.localeCompare(b.digest));
}

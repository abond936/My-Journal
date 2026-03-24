import type { Firestore, Query, QuerySnapshot } from 'firebase-admin/firestore';
import type { Media } from '@/lib/types/photo';

const MEDIA_COLLECTION = 'media';

export function isMediaAssigned(m: Pick<Media, 'referencedByCardIds'>): boolean {
  return Array.isArray(m.referencedByCardIds) && m.referencedByCardIds.length > 0;
}

export function mediaMatchesDimensions(item: Media, dimensions: string | null | undefined): boolean {
  if (!dimensions || dimensions === 'all') return true;
  const aspectRatio = item.width / item.height;
  switch (dimensions) {
    case 'portrait':
      return aspectRatio < 1;
    case 'landscape':
      return aspectRatio > 1;
    case 'square':
      return Math.abs(aspectRatio - 1) < 0.1;
    default:
      return true;
  }
}

export function mediaMatchesSearch(item: Media, search: string | null | undefined): boolean {
  if (!search?.trim()) return true;
  const searchLower = search.toLowerCase();
  return (
    item.filename.toLowerCase().includes(searchLower) ||
    !!(item.caption && item.caption.toLowerCase().includes(searchLower)) ||
    !!(item.sourcePath && item.sourcePath.toLowerCase().includes(searchLower))
  );
}

export type AssignmentSeekMode = 'assigned' | 'unassigned';

const BATCH = 80;

/**
 * Paginates media by assignment (referenced on any card or not) using sequential Firestore scans,
 * because empty/missing referencedByCardIds cannot be queried directly in Firestore.
 */
export async function seekMediaByAssignment(
  baseQuery: Query,
  firestore: Firestore,
  limit: number,
  startAfterDocId: string | null,
  assignment: AssignmentSeekMode,
  dimensions: string | null | undefined,
  search: string | null | undefined
): Promise<{
  media: Media[];
  nextScanCursor: string | null;
  hasNext: boolean;
}> {
  const wantAssigned = assignment === 'assigned';
  const matched: Media[] = [];

  let q: Query = baseQuery.orderBy('createdAt', 'desc').limit(BATCH);
  if (startAfterDocId) {
    const cd = await firestore.collection(MEDIA_COLLECTION).doc(startAfterDocId).get();
    if (cd.exists) {
      q = baseQuery.orderBy('createdAt', 'desc').startAfter(cd).limit(BATCH);
    }
  }

  let lastSnap: QuerySnapshot | null = null;
  let examinedInLastSnap = 0;

  outer: while (matched.length < limit) {
    const snap = await q.get();
    lastSnap = snap;
    examinedInLastSnap = 0;

    if (snap.empty) {
      break;
    }

    for (const doc of snap.docs) {
      examinedInLastSnap++;
      const row: Media = { ...(doc.data() as Media), docId: doc.id };
      const assigned = isMediaAssigned(row);
      if (wantAssigned !== assigned) continue;
      if (!mediaMatchesDimensions(row, dimensions)) continue;
      if (!mediaMatchesSearch(row, search)) continue;
      matched.push(row);
      if (matched.length >= limit) {
        break outer;
      }
    }

    if (snap.docs.length < BATCH) {
      break;
    }
    const lastInBatch = snap.docs[snap.docs.length - 1]!;
    q = baseQuery.orderBy('createdAt', 'desc').startAfter(lastInBatch).limit(BATCH);
  }

  const lastBatchFull = !!lastSnap && lastSnap.docs.length === BATCH;
  const stoppedMidBatch = !!lastSnap && examinedInLastSnap < lastSnap.docs.length;
  const hasNext = !!lastSnap && !lastSnap.empty && (lastBatchFull || stoppedMidBatch);

  let nextScanCursor: string | null = null;
  if (hasNext && lastSnap && examinedInLastSnap > 0) {
    nextScanCursor = lastSnap.docs[examinedInLastSnap - 1]!.id;
  }

  return { media: matched, nextScanCursor, hasNext };
}

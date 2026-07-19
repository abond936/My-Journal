import { NextRequest, NextResponse } from 'next/server';
import type { Firestore, Query, QuerySnapshot } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { isTypesenseConfigured } from '@/lib/config/typesense';
import { Media } from '@/lib/types/photo';
import { PaginatedResult } from '@/lib/types/services';
import { applyPublicStorageUrls } from '@/lib/utils/storageUrl';
import { mediaMatchesSearch } from '@/lib/utils/mediaAssignmentSeek';
import {
  ensureMediaCollection,
  searchMediaTypesense,
} from '@/lib/services/typesenseMediaService';
import {
  type DimensionalTagIdMap,
  dimensionalTagMapHasFilters,
  parseDimensionalTagParamsFromSearchParams,
} from '@/lib/utils/tagUtils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAuthenticatedSession } from '@/lib/auth/readerAccess';

type ExactDimensionalTagIdMap = Partial<Record<'who' | 'what' | 'when' | 'where', string[]>>;

const SEEK_BATCH = 80;

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ message }, { status });
}

function getDimensionIds(item: Media, dimension: string): string[] {
  switch (dimension) {
    case 'who':
      return item.who ?? [];
    case 'what':
      return item.what ?? [];
    case 'when':
      return item.when ?? [];
    case 'where':
      return item.where ?? [];
    default:
      return item.tags ?? [];
  }
}

function mediaMatchesDimensionalTags(
  item: Media,
  dt: DimensionalTagIdMap,
  tagScope: 'all' | 'subject' = 'all'
): boolean {
  if (!dimensionalTagMapHasFilters(dt)) return true;
  const dims: (keyof DimensionalTagIdMap)[] = ['who', 'what', 'when', 'where'];
  for (const dim of dims) {
    const selected = dt[dim];
    if (!selected?.length) continue;
    const idsOnMedia = getDimensionIds(item, dim);
    const ok = selected.some((tid) =>
      tagScope === 'subject'
        ? Boolean(item.subjectFilterTags?.[tid])
        : idsOnMedia.includes(tid) || Boolean(item.filterTags?.[tid])
    );
    if (!ok) return false;
  }
  return true;
}

function parseExactDimensionalTagParams(searchParams: URLSearchParams): ExactDimensionalTagIdMap {
  const result: ExactDimensionalTagIdMap = {};
  const dims: Array<'who' | 'what' | 'when' | 'where'> = ['who', 'what', 'when', 'where'];
  for (const dim of dims) {
    const raw = searchParams.get(`exact${dim[0].toUpperCase()}${dim.slice(1)}`);
    if (!raw) continue;
    const ids = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (ids.length > 0) result[dim] = ids;
  }
  return result;
}

function mediaMatchesExactDimensionalTags(
  item: Media,
  exact: ExactDimensionalTagIdMap,
  tagScope: 'all' | 'subject' = 'all'
): boolean {
  const directTags = new Set(item.tags ?? []);
  const dims: Array<keyof ExactDimensionalTagIdMap> = ['who', 'what', 'when', 'where'];
  for (const dim of dims) {
    const selected = exact[dim];
    if (!selected?.length) continue;
    const ok = selected.some((tid) =>
      tagScope === 'subject'
        ? Boolean(item.subjectFilterTags?.[tid])
        : directTags.has(tid)
    );
    if (!ok) return false;
  }
  return true;
}

async function seekMediaWithPredicates(
  firestore: Firestore,
  limit: number,
  startAfterDocId: string | null,
  predicate: (item: Media) => boolean
): Promise<PaginatedResult<Media>> {
  const mediaRef = firestore.collection('media');
  const matched: Media[] = [];
  let q: Query = mediaRef.orderBy('createdAt', 'desc').limit(SEEK_BATCH);

  if (startAfterDocId) {
    const cd = await firestore.collection('media').doc(startAfterDocId).get();
    if (cd.exists) q = mediaRef.orderBy('createdAt', 'desc').startAfter(cd).limit(SEEK_BATCH);
  }

  let lastSnap: QuerySnapshot | null = null;
  let examinedInLastSnap = 0;

  outer: while (matched.length < limit) {
    const snap = await q.get();
    lastSnap = snap;
    examinedInLastSnap = 0;
    if (snap.empty) break;

    for (const doc of snap.docs) {
      examinedInLastSnap++;
      const row: Media = { ...(doc.data() as Media), docId: doc.id };
      if (!predicate(row)) continue;
      matched.push(row);
      if (matched.length >= limit) break outer;
    }

    if (snap.docs.length < SEEK_BATCH) break;
    q = mediaRef.orderBy('createdAt', 'desc').startAfter(snap.docs[snap.docs.length - 1]!).limit(SEEK_BATCH);
  }

  const lastBatchFull = !!lastSnap && lastSnap.docs.length === SEEK_BATCH;
  const stoppedMidBatch = !!lastSnap && examinedInLastSnap < lastSnap.docs.length;
  const hasMore = !!lastSnap && !lastSnap.empty && (lastBatchFull || stoppedMidBatch);
  let lastDocId: string | undefined;
  if (hasMore && lastSnap && examinedInLastSnap > 0) {
    lastDocId = lastSnap.docs[examinedInLastSnap - 1]!.id;
  }

  return {
    items: applyPublicStorageUrls(matched),
    hasMore,
    lastDocId,
  };
}

async function fetchMediaByIdsInOrder(firestore: Firestore, ids: string[]): Promise<Media[]> {
  if (ids.length === 0) return [];
  const byId = new Map<string, Media>();
  const BATCH = 30;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const snaps = await Promise.all(chunk.map((id) => firestore.collection('media').doc(id).get()));
    for (const s of snaps) {
      if (s.exists) {
        byId.set(s.id, { ...(s.data() as Media), docId: s.id });
      }
    }
  }
  return ids.map((id) => byId.get(id)).filter((m): m is Media => Boolean(m));
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthenticatedSession(session)) {
    return errorResponse('Authentication required.', 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '40', 10), 100);
    const q = searchParams.get('q')?.trim() ?? '';
    const lastDocId = searchParams.get('lastDocId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const dimensionalTags = parseDimensionalTagParamsFromSearchParams(searchParams);
    const exactDimensionalTags = parseExactDimensionalTagParams(searchParams);
    const tagScope = searchParams.get('tagScope') === 'subject' ? 'subject' : 'all';
    const hasDimensionalTagSeek = dimensionalTagMapHasFilters(dimensionalTags);
    const hasExactDimensionalTags = Object.values(exactDimensionalTags).some((ids) => ids && ids.length > 0);

    const firestore = getAdminApp().firestore();

    const canUseTypesense =
      isTypesenseConfigured() &&
      tagScope !== 'subject' &&
      !hasExactDimensionalTags &&
      (q.length > 0 || hasDimensionalTagSeek);

    if (canUseTypesense) {
      await ensureMediaCollection();
      const result = await searchMediaTypesense({
        query: q.length > 0 ? q : '*',
        page,
        perPage: limit,
        source: null,
        dimensions: null,
        hasCaption: null,
        assignment: null,
        dimensionalTags,
      });
      const items = applyPublicStorageUrls(await fetchMediaByIdsInOrder(firestore, result.docIds));
      const filteredItems = items.filter((row) => mediaMatchesDimensionalTags(row, dimensionalTags, tagScope));
      return NextResponse.json({
        items: filteredItems,
        hasMore: result.hasNext,
      } satisfies PaginatedResult<Media>);
    }

    const result = await seekMediaWithPredicates(firestore, limit, lastDocId, (row) => {
      if (hasDimensionalTagSeek && !mediaMatchesDimensionalTags(row, dimensionalTags, tagScope)) return false;
      if (hasExactDimensionalTags && !mediaMatchesExactDimensionalTags(row, exactDimensionalTags, tagScope)) return false;
      if (q && !mediaMatchesSearch(row, q)) return false;
      return true;
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load media.';
    return errorResponse(message);
  }
}

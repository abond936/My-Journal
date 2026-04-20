import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { CollectionReference, Firestore, Query, QuerySnapshot } from 'firebase-admin/firestore';
import { authOptions } from '@/lib/auth/authOptions';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { isTypesenseConfigured } from '@/lib/config/typesense';
import { Media } from '@/lib/types/photo';
import { applyPublicStorageUrls } from '@/lib/utils/storageUrl';
import { isMediaAssigned, mediaMatchesDimensions, mediaMatchesSearch, seekMediaByAssignment } from '@/lib/utils/mediaAssignmentSeek';
import {
  ensureMediaCollection,
  searchMediaTypesense,
} from '@/lib/services/typesenseMediaService';
import {
  type DimensionalTagIdMap,
  dimensionalTagMapHasFilters,
  parseDimensionalTagParamsFromSearchParams,
} from '@/lib/utils/tagUtils';

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

function buildBaseQuery(
  mediaRef: CollectionReference,
  source: string | null,
  hasCaption: string | null
): Query {
  let baseQuery: Query = mediaRef;

  if (source && source !== 'all') {
    baseQuery = baseQuery.where('source', '==', source);
  }

  if (hasCaption && hasCaption !== 'all') {
    if (hasCaption === 'with') {
      baseQuery = baseQuery.where('caption', '!=', '');
    } else if (hasCaption === 'without') {
      baseQuery = baseQuery.where('caption', '==', '');
    }
  }

  return baseQuery;
}

const SEEK_BATCH = 80;

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

function mediaMatchesTagFilter(
  item: Media,
  tagDimension: string | null,
  tagMode: string | null,
  tagValue: string | null
): boolean {
  if (!tagMode || tagMode === 'all') return true;
  const dim = (tagDimension || 'any').toLowerCase();
  const ids = getDimensionIds(item, dim);
  if (tagMode === 'unassigned') {
    return ids.length === 0;
  }
  if (tagMode === 'match' && tagValue) {
    if (dim === 'any') {
      return Boolean(item.filterTags?.[tagValue]) || ids.includes(tagValue);
    }
    return ids.includes(tagValue);
  }
  return true;
}

/** Aligns with getCards dimensional filtering: intra-dimension OR, inter-dimension AND. */
function mediaMatchesDimensionalTags(item: Media, dt: DimensionalTagIdMap): boolean {
  if (!dimensionalTagMapHasFilters(dt)) return true;

  const dims: (keyof DimensionalTagIdMap)[] = ['who', 'what', 'when', 'where'];
  for (const dim of dims) {
    const selected = dt[dim];
    if (!selected?.length) continue;
    const idsOnMedia = getDimensionIds(item, dim);
    const ok = selected.some(
      (tid) => idsOnMedia.includes(tid) || Boolean(item.filterTags?.[tid])
    );
    if (!ok) return false;
  }
  return true;
}

async function seekMediaWithPredicates(
  baseQuery: Query,
  firestore: FirebaseFirestore.Firestore,
  limit: number,
  startAfterDocId: string | null,
  predicate: (item: Media) => boolean
): Promise<{ media: Media[]; nextScanCursor: string | null; hasNext: boolean }> {
  const matched: Media[] = [];
  let q: Query = baseQuery.orderBy('createdAt', 'desc').limit(SEEK_BATCH);
  if (startAfterDocId) {
    const cd = await firestore.collection('media').doc(startAfterDocId).get();
    if (cd.exists) q = baseQuery.orderBy('createdAt', 'desc').startAfter(cd).limit(SEEK_BATCH);
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
    q = baseQuery.orderBy('createdAt', 'desc').startAfter(snap.docs[snap.docs.length - 1]!).limit(SEEK_BATCH);
  }

  const lastBatchFull = !!lastSnap && lastSnap.docs.length === SEEK_BATCH;
  const stoppedMidBatch = !!lastSnap && examinedInLastSnap < lastSnap.docs.length;
  const hasNext = !!lastSnap && !lastSnap.empty && (lastBatchFull || stoppedMidBatch);
  let nextScanCursor: string | null = null;
  if (hasNext && lastSnap && examinedInLastSnap > 0) {
    nextScanCursor = lastSnap.docs[examinedInLastSnap - 1]!.id;
  }

  return { media: matched, nextScanCursor, hasNext };
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
  if (!session || session.user.role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Forbidden.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const cursor = searchParams.get('cursor');
    const prevCursor = searchParams.get('prevCursor');
    const source = searchParams.get('source');
    const dimensions = searchParams.get('dimensions');
    const hasCaption = searchParams.get('hasCaption');
    const search = searchParams.get('search');
    const assignment = searchParams.get('assignment') || 'all';
    const tagDimension = searchParams.get('tagDimension');
    const tagMode = searchParams.get('tagMode');
    const tagValue = searchParams.get('tagValue');
    const dimensionalTags = parseDimensionalTagParamsFromSearchParams(searchParams);
    const hasDimensionalTagSeek = dimensionalTagMapHasFilters(dimensionalTags);

    const app = getAdminApp();
    const firestore = app.firestore();
    const mediaRef = firestore.collection('media');
    const baseQuery = buildBaseQuery(mediaRef, source, hasCaption);

    const shouldUseLegacyTagSeek = !!tagMode && tagMode !== 'all';

    const searchTrimmed = search?.trim() ?? '';
    if (searchTrimmed.length > 0 && !isTypesenseConfigured()) {
      return errorResponse(
        {
          ok: false,
          message:
            'Text search for media requires Typesense (TYPESENSE_HOST and TYPESENSE_API_KEY). Configure Typesense or clear the search box.',
          code: 'SEARCH_UNAVAILABLE',
          severity: 'warning',
          retryable: false,
        },
        503
      );
    }

    const wantTypesense =
      isTypesenseConfigured() &&
      !shouldUseLegacyTagSeek &&
      (searchTrimmed.length > 0 ||
        hasDimensionalTagSeek ||
        assignment === 'unassigned' ||
        assignment === 'assigned');

    if (wantTypesense) {
      const listPage = Math.max(1, parseInt(searchParams.get('listPage') || '1', 10) || 1);
      await ensureMediaCollection();
      const tsResult = await searchMediaTypesense({
        query: searchTrimmed.length > 0 ? searchTrimmed : '*',
        page: listPage,
        perPage: limit,
        source,
        dimensions,
        hasCaption,
        assignment,
        dimensionalTags,
      });

      const media = await fetchMediaByIdsInOrder(firestore, tsResult.docIds);
      const mediaWithUrls = applyPublicStorageUrls(media);

      return NextResponse.json({
        media: mediaWithUrls,
        pagination: {
          limit,
          total: tsResult.found,
          totalPages: Math.max(1, Math.ceil(tsResult.found / limit)),
          seekMode: true,
          engine: 'typesense',
          listPage: tsResult.page,
          hasNext: tsResult.hasNext,
          hasPrev: tsResult.page > 1,
          nextCursor: null,
          prevCursor: null,
          nextListPage: tsResult.hasNext ? tsResult.page + 1 : null,
          prevListPage: tsResult.page > 1 ? tsResult.page - 1 : null,
        },
      });
    }

    if (hasDimensionalTagSeek || shouldUseLegacyTagSeek) {
      const predicate = (row: Media) => {
        if (assignment === 'assigned' && !isMediaAssigned(row)) return false;
        if (assignment === 'unassigned' && isMediaAssigned(row)) return false;
        if (!mediaMatchesDimensions(row, dimensions)) return false;
        if (!mediaMatchesSearch(row, search)) return false;
        if (hasDimensionalTagSeek) {
          if (!mediaMatchesDimensionalTags(row, dimensionalTags)) return false;
        }
        if (shouldUseLegacyTagSeek) {
          if (!mediaMatchesTagFilter(row, tagDimension, tagMode, tagValue)) return false;
        }
        return true;
      };
      const { media, nextScanCursor, hasNext } = await seekMediaWithPredicates(
        baseQuery,
        firestore,
        limit,
        cursor,
        predicate
      );
      const mediaWithUrls = applyPublicStorageUrls(media);
      return NextResponse.json({
        media: mediaWithUrls,
        pagination: {
          limit,
          total: null,
          totalPages: null,
          seekMode: true,
          hasNext,
          hasPrev: false,
          nextCursor: hasNext ? nextScanCursor : null,
          prevCursor: null,
        },
      });
    }

    // Assignment filter: sequential scan (referencedByCardIds not queryable as "empty")
    if (assignment === 'unassigned' || assignment === 'assigned') {
      const { media, nextScanCursor, hasNext } = await seekMediaByAssignment(
        baseQuery,
        firestore,
        limit,
        cursor,
        assignment,
        dimensions,
        search
      );

      const mediaWithUrls = applyPublicStorageUrls(media);

      return NextResponse.json({
        media: mediaWithUrls,
        pagination: {
          limit,
          total: null,
          totalPages: null,
          seekMode: true,
          hasNext,
          hasPrev: false,
          nextCursor: hasNext ? nextScanCursor : null,
          prevCursor: null,
        },
      });
    }

    // --- Default: index-aligned pagination ---
    let total = 0;
    try {
      const countSnapshot = await baseQuery.count().get();
      total = countSnapshot.data().count;
    } catch (countErr) {
      console.warn('[media API] Count aggregation failed, total unknown:', countErr);
    }

    let paginatedQuery: Query = baseQuery.orderBy('createdAt', 'desc').limit(limit + 1);

    if (prevCursor) {
      const prevDoc = await firestore.collection('media').doc(prevCursor).get();
      if (prevDoc.exists) {
        paginatedQuery = baseQuery.orderBy('createdAt', 'desc').endBefore(prevDoc).limit(limit + 1);
      }
    } else if (cursor) {
      const cursorDoc = await firestore.collection('media').doc(cursor).get();
      if (cursorDoc.exists) {
        paginatedQuery = baseQuery.orderBy('createdAt', 'desc').startAfter(cursorDoc).limit(limit + 1);
      }
    }

    const snapshot = await paginatedQuery.get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    const media: Media[] = [];
    docs.forEach(doc => {
      const data = doc.data() as Media;
      media.push({ ...data, docId: doc.id });
    });

    let filteredMedia = media;

    if (dimensions && dimensions !== 'all') {
      filteredMedia = filteredMedia.filter(item => {
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
      });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredMedia = filteredMedia.filter(item =>
        item.filename.toLowerCase().includes(searchLower) ||
        (item.caption && item.caption.toLowerCase().includes(searchLower)) ||
        (item.sourcePath && item.sourcePath.toLowerCase().includes(searchLower))
      );
    }

    const firstDocId = docs.length > 0 ? docs[0].id : null;
    const lastDocId = docs.length > 0 ? docs[docs.length - 1].id : null;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    const mediaWithUrls = applyPublicStorageUrls(filteredMedia);

    return NextResponse.json({
      media: mediaWithUrls,
      pagination: {
        limit,
        total,
        totalPages,
        seekMode: false,
        hasNext: hasMore,
        hasPrev: !!(prevCursor || cursor),
        nextCursor: hasMore ? lastDocId : null,
        prevCursor: prevCursor || cursor ? firstDocId : null,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching media:', errorMessage);
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_LIST_FETCH_FAILED',
        message: 'Error fetching media.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
  }
}

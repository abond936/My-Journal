import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { CollectionReference, Firestore, Query, QuerySnapshot } from 'firebase-admin/firestore';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { isTypesenseConfigured } from '@/lib/config/typesense';
import { Media } from '@/lib/types/photo';
import { folderLabelFromSourcePath } from '@/lib/utils/reviewClusterHeuristics';
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
import { groupExactMediaDuplicates } from '@/lib/utils/mediaDuplicateEvidence';
import { matchesSelectedTags, readTagSelectionMode, type TagSelectionMode } from '@/lib/utils/tagSelectionMode';

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
  source: string | null
): Query {
  let baseQuery: Query = mediaRef;

  if (source && source !== 'all') {
    baseQuery = baseQuery.where('source', '==', source);
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

function mediaMatchesCaptionFilter(item: Media, hasCaption: string | null): boolean {
  if (!hasCaption || hasCaption === 'all') return true;
  const hasValue = Boolean(item.caption && item.caption.trim());
  if (hasCaption === 'with') return hasValue;
  if (hasCaption === 'without') return !hasValue;
  return true;
}

function mediaIsCodificationComplete(item: Media): boolean {
  return Boolean(item.hasWho && item.hasWhat && item.hasWhen && item.hasWhere);
}

function mediaMatchesLibraryWorkflowFilters(
  item: Media,
  filters: {
    codification: string | null;
    unresolvedDimension: string | null;
    importBatchId: string | null;
    importFolder: string | null;
    metadataOutcome: string | null;
  }
): boolean {
  const complete = mediaIsCodificationComplete(item);
  if (filters.codification === 'complete' && !complete) return false;
  if (filters.codification === 'incomplete' && complete) return false;

  const unresolvedField = {
    who: 'hasWho',
    what: 'hasWhat',
    when: 'hasWhen',
    where: 'hasWhere',
  }[filters.unresolvedDimension ?? ''];
  if (unresolvedField && item[unresolvedField as 'hasWho' | 'hasWhat' | 'hasWhen' | 'hasWhere']) {
    return false;
  }
  if (filters.importBatchId && item.importBatchId !== filters.importBatchId) return false;
  if (filters.importFolder && filters.importFolder !== 'all') {
    const folder = folderLabelFromSourcePath(item.sourcePath ?? '') ?? 'Unknown folder';
    if (folder !== filters.importFolder) return false;
  }
  if (filters.metadataOutcome && filters.metadataOutcome !== 'all') {
    const outcome = item.metadataImport?.outcome ?? 'unknown';
    if (outcome !== filters.metadataOutcome) return false;
  }
  return true;
}

async function loadExactMatchMediaIds(firestore: Firestore): Promise<Set<string>> {
  const snapshot = await firestore.collection('media').select('contentIdentity').get();
  const evidenceRows = snapshot.docs.map((doc) => ({
    docId: doc.id,
    ...doc.data(),
  })) as Media[];
  return new Set(groupExactMediaDuplicates(evidenceRows).flatMap((group) => group.mediaIds));
}

/** Aligns with getCards dimensional filtering: intra-dimension OR, inter-dimension AND. */
function mediaMatchesDimensionalTags(
  item: Media,
  dt: DimensionalTagIdMap,
  tagScope: 'all' | 'subject',
  tagSelectionMode: TagSelectionMode = 'any'
): boolean {
  if (!dimensionalTagMapHasFilters(dt)) return true;

  const dims: (keyof DimensionalTagIdMap)[] = ['who', 'what', 'when', 'where'];
  for (const dim of dims) {
    const selected = dt[dim];
    if (!selected?.length) continue;
    const idsOnMedia = getDimensionIds(item, dim);
    const candidates = tagScope === 'subject'
      ? Object.keys(item.subjectFilterTags ?? {}).filter((id) => item.subjectFilterTags?.[id])
      : [...idsOnMedia, ...Object.keys(item.filterTags ?? {}).filter((id) => item.filterTags?.[id])];
    const ok = matchesSelectedTags(candidates, selected, tagSelectionMode);
    if (!ok) return false;
  }
  return true;
}

async function loadTagNameLookup(firestore: Firestore): Promise<Map<string, string>> {
  const snapshot = await firestore.collection('tags').select('name').get();
  const lookup = new Map<string, string>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data() as { name?: string };
    lookup.set(doc.id, typeof data.name === 'string' && data.name.trim() ? data.name : doc.id);
  });
  return lookup;
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
  if (!isAdminSession(session)) {
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
    const matchStatus = searchParams.get('matchStatus') || 'all';
    const codification = searchParams.get('codification');
    const unresolvedDimension = searchParams.get('unresolvedDimension');
    const importBatchId = searchParams.get('importBatchId');
    const importFolder = searchParams.get('importFolder');
    const metadataOutcome = searchParams.get('metadataOutcome');
    const tagScope = searchParams.get('tagScope') === 'subject' ? 'subject' : 'all';
    const tagSelectionMode = readTagSelectionMode(searchParams.get('tagOperator'));
    const dimensionPresence = Object.fromEntries(
      (['who', 'what', 'when', 'where'] as const)
        .map((dimension) => [dimension, searchParams.get(`${dimension}Presence`)])
        .filter((entry): entry is [string, 'hasAny' | 'isEmpty'] => entry[1] === 'hasAny' || entry[1] === 'isEmpty')
    ) as Partial<Record<'who' | 'what' | 'when' | 'where', 'hasAny' | 'isEmpty'>>;
    const hasDimensionPresenceSeek = Object.keys(dimensionPresence).length > 0;
    const includeTotal = searchParams.get('includeTotal') !== 'false';
    const tagDimension = searchParams.get('tagDimension');
    const tagMode = searchParams.get('tagMode');
    const tagValue = searchParams.get('tagValue');
    const dimensionalTags = parseDimensionalTagParamsFromSearchParams(searchParams);
    const hasDimensionalTagSeek = dimensionalTagMapHasFilters(dimensionalTags);

    const app = getAdminApp();
    const firestore = app.firestore();
    const mediaRef = firestore.collection('media');
    const baseQuery = buildBaseQuery(mediaRef, source);

    const shouldUseLegacyTagSeek = !!tagMode && tagMode !== 'all';
    const hasCaptionSeek = !!hasCaption && hasCaption !== 'all';
    const hasSourceSeek = !!source && source !== 'all';

    const searchTrimmed = search?.trim() ?? '';
    const hasSearchSeek = searchTrimmed.length > 0;
    const hasLibraryWorkflowSeek = Boolean(
      (codification && codification !== 'all') ||
      (unresolvedDimension && unresolvedDimension !== 'all') ||
      importBatchId ||
      (importFolder && importFolder !== 'all') ||
      (metadataOutcome && metadataOutcome !== 'all')
    );
    const hasMatchStatusSeek = matchStatus === 'matches' || matchStatus === 'no_matches';
    const exactMatchMediaIds = hasMatchStatusSeek
      ? await loadExactMatchMediaIds(firestore)
      : null;

    const wantTypesense =
      isTypesenseConfigured() &&
      !hasMatchStatusSeek &&
      !hasLibraryWorkflowSeek &&
      !shouldUseLegacyTagSeek &&
      !hasDimensionPresenceSeek &&
      !(tagScope === 'subject' && hasDimensionalTagSeek) &&
      (hasSearchSeek ||
        hasCaptionSeek ||
        hasDimensionalTagSeek ||
        assignment === 'unassigned' ||
        assignment === 'assigned');

    const tagNameLookup =
      hasSearchSeek && !wantTypesense ? await loadTagNameLookup(firestore) : undefined;

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
        tagSelectionMode,
      });

      const media = await fetchMediaByIdsInOrder(firestore, tsResult.docIds);
      const filteredMedia = media.filter((item) =>
        mediaMatchesDimensionalTags(item, dimensionalTags, tagScope, tagSelectionMode)
      );
      const mediaWithUrls = applyPublicStorageUrls(filteredMedia);

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

    if (hasSearchSeek || hasDimensionalTagSeek || shouldUseLegacyTagSeek || hasCaptionSeek || hasSourceSeek || hasDimensionPresenceSeek || hasLibraryWorkflowSeek || hasMatchStatusSeek) {
      const predicate = (row: Media) => {
        if (hasSourceSeek && row.source !== source) return false;
        if (assignment === 'assigned' && !isMediaAssigned(row)) return false;
        if (assignment === 'unassigned' && isMediaAssigned(row)) return false;
        if (matchStatus === 'matches' && !exactMatchMediaIds?.has(row.docId)) return false;
        if (matchStatus === 'no_matches' && exactMatchMediaIds?.has(row.docId)) return false;
        if (!mediaMatchesCaptionFilter(row, hasCaption)) return false;
        if (!mediaMatchesDimensions(row, dimensions)) return false;
        if (!mediaMatchesSearch(row, searchTrimmed, tagNameLookup)) return false;
        if (!mediaMatchesLibraryWorkflowFilters(row, {
          codification,
          unresolvedDimension,
          importBatchId,
          importFolder,
          metadataOutcome,
        })) return false;
        if (hasDimensionalTagSeek) {
          if (!mediaMatchesDimensionalTags(row, dimensionalTags, tagScope, tagSelectionMode)) return false;
        }
        for (const dimension of ['who', 'what', 'when', 'where'] as const) {
          const presence = dimensionPresence[dimension];
          if (!presence) continue;
          const hasValue = tagScope === 'subject'
            ? Boolean((row[dimension] ?? []).some((tagId) => row.subjectFilterTags?.[tagId]))
            : (row[dimension] ?? []).length > 0;
          if (presence === 'hasAny' && !hasValue) return false;
          if (presence === 'isEmpty' && hasValue) return false;
        }
        if (shouldUseLegacyTagSeek) {
          if (!mediaMatchesTagFilter(row, tagDimension, tagMode, tagValue)) return false;
        }
        return true;
      };
      const { media, nextScanCursor, hasNext } = await seekMediaWithPredicates(
        mediaRef,
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
    let total: number | null = null;
    if (includeTotal) {
      try {
        const countSnapshot = await baseQuery.count().get();
        total = countSnapshot.data().count;
      } catch (countErr) {
        console.warn('[media API] Count aggregation failed, total unknown:', countErr);
      }
    }

    let paginatedQuery: Query = baseQuery.orderBy('createdAt', 'desc').limit(limit + 1);

    if (prevCursor) {
      const prevDoc = await firestore.collection('media').doc(prevCursor).get();
      if (prevDoc.exists) {
        paginatedQuery = baseQuery.orderBy('createdAt', 'desc').endBefore(prevDoc).limitToLast(limit + 1);
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

    if (hasCaption && hasCaption !== 'all') {
      filteredMedia = filteredMedia.filter((item) => mediaMatchesCaptionFilter(item, hasCaption));
    }

    if (searchTrimmed) {
      filteredMedia = filteredMedia.filter((item) => mediaMatchesSearch(item, searchTrimmed, tagNameLookup));
    }

    const firstDocId = docs.length > 0 ? docs[0].id : null;
    const lastDocId = docs.length > 0 ? docs[docs.length - 1].id : null;
    const totalPages = typeof total === 'number' ? Math.max(1, Math.ceil(total / limit)) : null;

    const mediaWithUrls = applyPublicStorageUrls(filteredMedia);

    return NextResponse.json({
      media: mediaWithUrls,
      pagination: {
        limit,
        total,
        totalPages,
        seekMode: !includeTotal,
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

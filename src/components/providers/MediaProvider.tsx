'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { usePathname } from 'next/navigation';
import { Media } from '@/lib/types/photo';
import { useCardContext } from '@/components/providers/CardProvider';
import { useTag } from '@/components/providers/TagProvider';
import {
  appendDimensionalTagQueryParams,
  dimensionalTagMapHasFilters,
  groupSelectedTagIdsByDimension,
  mergeDimensionalTagMaps,
  type DimensionalTagIdMap,
} from '@/lib/utils/tagUtils';
import { isMediaAssigned, mediaMatchesDimensions, mediaMatchesSearch } from '@/lib/utils/mediaAssignmentSeek';
import {
  DEFAULT_MEDIA_ADMIN_STORED_FILTERS,
  readStoredMediaAdminStoredFilterPreferences,
  writeStoredMediaAdminStoredFilterPreferences,
} from '@/lib/preferences/adminFilters';

interface MediaListResponse {
  media: Media[];
  pagination: {
    page?: number;
    limit: number;
    total: number | null;
    totalPages: number | null;
    seekMode?: boolean;
    /** Present when listing uses Typesense (`GET /api/media`). */
    engine?: 'typesense' | 'firestore';
    listPage?: number;
    nextListPage?: number | null;
    prevListPage?: number | null;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string | null;
    prevCursor?: string | null;
  };
}

type ApiErrorResponse = {
  message?: string;
  code?: string;
  severity?: 'error' | 'warning';
  retryable?: boolean;
  error?: string;
};

export type MediaErrorSeverity = 'error' | 'warning';

export type MediaUiError = Error & {
  code?: string;
  severity?: MediaErrorSeverity;
  retryable?: boolean;
};

export type MediaBulkTagUpdateRequest = {
  tagIds?: string[];
  mode?: 'add' | 'replace' | 'remove';
  subjectTagId?: string | null;
  subjectTagIdProvided?: boolean;
  subjectTagIds?: string[];
  subjectTagIdsProvided?: boolean;
};

function toUserFacingError(prefix: string, payload: ApiErrorResponse, fallback: string): MediaUiError {
  const parts: string[] = [];
  if (typeof payload.message === 'string' && payload.message.trim()) {
    parts.push(payload.message);
  } else {
    parts.push(fallback);
  }
  if (typeof payload.code === 'string' && payload.code.trim()) {
    parts.push(`(${payload.code})`);
  }
  if (typeof payload.retryable === 'boolean') {
    parts.push(payload.retryable ? 'Retryable.' : 'Not retryable.');
  }
  const error = new Error(`${prefix}: ${parts.join(' ')}`) as MediaUiError;
  if (typeof payload.code === 'string' && payload.code.trim()) {
    error.code = payload.code;
  }
  if (payload.severity === 'warning' || payload.severity === 'error') {
    error.severity = payload.severity;
  }
  if (typeof payload.retryable === 'boolean') {
    error.retryable = payload.retryable;
  }
  return error;
}

function dedupeMediaByDocId(items: Media[]): Media[] {
  const seen = new Set<string>();
  const out: Media[] = [];
  for (const item of items) {
    if (!item?.docId || seen.has(item.docId)) continue;
    seen.add(item.docId);
    out.push(item);
  }
  return out;
}

function getDimensionIds(item: Media, dimension: keyof DimensionalTagIdMap): string[] {
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
      return [];
  }
}

function mediaMatchesCaptionFilter(item: Media, hasCaption: string): boolean {
  if (!hasCaption || hasCaption === 'all') return true;
  const hasValue = Boolean(item.caption && item.caption.trim());
  if (hasCaption === 'with') return hasValue;
  if (hasCaption === 'without') return !hasValue;
  return true;
}

function mediaMatchesDimensionalTags(
  item: Media,
  dt: DimensionalTagIdMap,
  tagScope: MediaFilters['tagScope']
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

export function getMediaErrorSeverity(error: Error | null): MediaErrorSeverity {
  if (!error) return 'error';
  const maybeMediaError = error as MediaUiError;
  return maybeMediaError.severity === 'warning' ? 'warning' : 'error';
}

export interface MediaFilters {
  source: string;
  dimensions: string;
  hasCaption: string;
  search: string;
  /** all | unassigned | assigned — unassigned/assigned use seek pagination (forward-only). */
  assignment: string;
  matchStatus: 'all' | 'matches' | 'no_matches';
  codification: 'all' | 'complete' | 'incomplete';
  unresolvedDimension: 'all' | 'who' | 'what' | 'when' | 'where';
  importBatchId: string;
  importFolder: string;
  metadataOutcome: 'all' | 'found' | 'none' | 'error' | 'not_requested' | 'unknown';
  tagScope: 'all' | 'subject';
  dimensionPresence?: Partial<Record<'who' | 'what' | 'when' | 'where', 'hasAny' | 'isEmpty'>>;
}

type CachedMediaQueryResult = {
  media: Media[];
  pagination: MediaListResponse['pagination'];
  currentPage: number;
  nextCursor: string | null;
  prevCursor: string | null;
  cursorStack: (string | null)[];
  cachedAt: number;
};

interface MediaContextType {
  // Data
  media: Media[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  loadMoreError: Error | null;
  
  // Pagination
  pagination: MediaListResponse['pagination'] | null;
  currentPage: number;
  hasMore: boolean;
  
  // Filters
  filters: MediaFilters;
  
  // Actions
  fetchMedia: (page?: number, newFilters?: Partial<MediaFilters>) => Promise<void>;
  loadMore: () => Promise<void>;
  refreshMedia: () => Promise<void>;
  updateMedia: (id: string, updates: Partial<Media>) => Promise<Media | undefined>;
  deleteMedia: (id: string) => Promise<void>;
  deleteMultipleMedia: (ids: string[]) => Promise<void>;
  clearError: () => void;
  /** Bulk edit media tags and/or subject using authoritative server-side derived updates. */
  bulkApplyTags: (mediaIds: string[], updates: MediaBulkTagUpdateRequest) => Promise<void>;
  registerCreatedMedia: (item: Media) => void;
  reconcileCardMediaAssignments: (
    cardId: string,
    addedMediaIds: string[],
    removedMediaIds: string[]
  ) => void;
  
  // Filter actions
  setFilter: (key: keyof MediaFilters, value: string) => void;
  clearFilters: () => void;
  /** Admin Studio: who/what/when/where tag ids for GET /api/media (single MacroTagSelector in embedded Studio). */
  dimensionalQueryOverlay: DimensionalTagIdMap;
  setDimensionalQueryOverlay: (
    map: DimensionalTagIdMap | ((prev: DimensionalTagIdMap) => DimensionalTagIdMap)
  ) => void;
  /** Studio Map preview only — merged at fetch time, never persisted to localStorage. */
  transientDimensionalQueryOverlay: DimensionalTagIdMap;
  setTransientDimensionalQueryOverlay: (
    map: DimensionalTagIdMap | ((prev: DimensionalTagIdMap) => DimensionalTagIdMap)
  ) => void;
  
  // Selection
  selectedMediaIds: string[];
  setSelectedMediaIds: Dispatch<SetStateAction<string[]>>;
  toggleMediaSelection: (id: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  resolveMediaById: (id: string) => Media | undefined;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

const defaultFilters: MediaFilters = DEFAULT_MEDIA_ADMIN_STORED_FILTERS;

const MEDIA_QUERY_CACHE_TTL_MS = 15_000;
const MEDIA_QUERY_CACHE_LIMIT = 24;
const MEDIA_RECORD_CACHE_LIMIT = 400;

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const initialMediaAdminPrefsRef = useRef(readStoredMediaAdminStoredFilterPreferences());
  const pathname = usePathname();
  const mediaPageLimit = pathname?.startsWith('/admin/studio') ? '100' : '50';

  const { selectedTags } = useCardContext();
  const { tags: allTags } = useTag();

  const dimensionalTagMap = useMemo(
    () => groupSelectedTagIdsByDimension(selectedTags, allTags),
    [selectedTags, allTags]
  );

  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<MediaListResponse['pagination'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([]);
  const [filters, setFilters] = useState<MediaFilters>(initialMediaAdminPrefsRef.current.filters);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [dimensionalQueryOverlay, setDimensionalQueryOverlayState] = useState<DimensionalTagIdMap>(
    initialMediaAdminPrefsRef.current.dimensionalQueryOverlay
  );
  const dimensionalQueryOverlayRef = useRef<DimensionalTagIdMap>(
    initialMediaAdminPrefsRef.current.dimensionalQueryOverlay
  );
  const [transientDimensionalQueryOverlay, setTransientDimensionalQueryOverlayState] =
    useState<DimensionalTagIdMap>({});
  const transientDimensionalQueryOverlayRef = useRef<DimensionalTagIdMap>({});
  const lastMediaEngineRef = useRef<'typesense' | 'firestore' | null>(null);
  const mediaRequestSeqRef = useRef(0);
  const activeMediaRequestControllerRef = useRef<AbortController | null>(null);
  const currentPageRef = useRef(1);
  const nextCursorRef = useRef<string | null>(null);
  const prevCursorRef = useRef<string | null>(null);
  const cursorStackRef = useRef<(string | null)[]>([]);
  const filtersRef = useRef<MediaFilters>(defaultFilters);
  const mediaRef = useRef<Media[]>([]);
  const mediaQueryCacheRef = useRef(new Map<string, CachedMediaQueryResult>());
  const mediaQueryCacheOrderRef = useRef<string[]>([]);
  const mediaByIdCacheRef = useRef(new Map<string, Media>());
  const mediaByIdCacheOrderRef = useRef<string[]>([]);
  const mediaPrefetchInFlightRef = useRef(new Set<string>());
  const mediaPrefetchPromiseRef = useRef(new Map<string, Promise<void>>());

  const cacheMediaRecord = useCallback((item: Media | null | undefined) => {
    if (!item?.docId) return;
    mediaByIdCacheRef.current.set(item.docId, item);
    mediaByIdCacheOrderRef.current = mediaByIdCacheOrderRef.current.filter((id) => id !== item.docId);
    mediaByIdCacheOrderRef.current.push(item.docId);
    while (mediaByIdCacheOrderRef.current.length > MEDIA_RECORD_CACHE_LIMIT) {
      const oldestId = mediaByIdCacheOrderRef.current.shift();
      if (oldestId) {
        mediaByIdCacheRef.current.delete(oldestId);
      }
    }
  }, []);

  const cacheMediaRecords = useCallback((items: Media[]) => {
    items.forEach((item) => cacheMediaRecord(item));
  }, [cacheMediaRecord]);

  const resolveMediaById = useCallback((id: string) => {
    return mediaByIdCacheRef.current.get(id);
  }, []);

  const clearMediaQueryCache = useCallback(() => {
    mediaQueryCacheRef.current.clear();
    mediaQueryCacheOrderRef.current = [];
  }, []);

  const rememberMediaQueryCacheEntry = useCallback((key: string, entry: CachedMediaQueryResult) => {
    mediaQueryCacheRef.current.set(key, entry);
    mediaQueryCacheOrderRef.current = mediaQueryCacheOrderRef.current.filter((existingKey) => existingKey !== key);
    mediaQueryCacheOrderRef.current.push(key);
    while (mediaQueryCacheOrderRef.current.length > MEDIA_QUERY_CACHE_LIMIT) {
      const oldestKey = mediaQueryCacheOrderRef.current.shift();
      if (oldestKey) {
        mediaQueryCacheRef.current.delete(oldestKey);
      }
    }
  }, []);

  const cacheMediaQueryEntryIfFresh = useCallback((key: string) => {
    const cached = mediaQueryCacheRef.current.get(key);
    if (!cached) return null;
    if (Date.now() - cached.cachedAt > MEDIA_QUERY_CACHE_TTL_MS) {
      mediaQueryCacheRef.current.delete(key);
      mediaQueryCacheOrderRef.current = mediaQueryCacheOrderRef.current.filter((existingKey) => existingKey !== key);
      return null;
    }
    return cached;
  }, []);

  const prefetchMediaQuery = useCallback(
    async (queryString: string, entry: Omit<CachedMediaQueryResult, 'cachedAt'>) => {
      if (cacheMediaQueryEntryIfFresh(queryString) || mediaPrefetchInFlightRef.current.has(queryString)) {
        return;
      }
      mediaPrefetchInFlightRef.current.add(queryString);
      const prefetchPromise = (async () => {
      try {
        const response = await fetch(`/api/media?${queryString}`);
        if (!response.ok) return;
        const data: MediaListResponse = await response.json();
        cacheMediaRecords(data.media);
        rememberMediaQueryCacheEntry(queryString, {
          media: data.media,
          pagination: {
            ...data.pagination,
            page: entry.currentPage,
            hasPrev: Boolean(data.pagination.hasPrev || entry.currentPage > 1),
          },
          currentPage: entry.currentPage,
          nextCursor: data.pagination.nextCursor ?? null,
          prevCursor: data.pagination.prevCursor ?? null,
          cursorStack: entry.cursorStack,
          cachedAt: Date.now(),
        });
      } catch {
        // Ignore background prefetch failures; foreground fetch keeps correctness.
      } finally {
        mediaPrefetchInFlightRef.current.delete(queryString);
        mediaPrefetchPromiseRef.current.delete(queryString);
      }
      })();
      mediaPrefetchPromiseRef.current.set(queryString, prefetchPromise);
      await prefetchPromise;
    },
    [cacheMediaQueryEntryIfFresh, cacheMediaRecords, rememberMediaQueryCacheEntry]
  );

  const adjustPaginationAfterDelete = useCallback((deletedCount: number) => {
    if (deletedCount <= 0) return;
    setPagination((prev) => {
      if (!prev) return prev;
      const nextTotal =
        typeof prev.total === 'number' ? Math.max(0, prev.total - deletedCount) : prev.total;
      const nextTotalPages =
        typeof nextTotal === 'number' ? Math.max(1, Math.ceil(nextTotal / prev.limit)) : prev.totalPages;
      const nextPage = typeof prev.page === 'number' ? prev.page : currentPage;
      return {
        ...prev,
        total: nextTotal,
        totalPages: nextTotalPages,
        hasNext:
          typeof nextTotalPages === 'number'
            ? nextPage < nextTotalPages
            : prev.hasNext,
      };
    });
  }, [currentPage]);

  const setDimensionalQueryOverlay = useCallback(
    (mapOrFn: DimensionalTagIdMap | ((prev: DimensionalTagIdMap) => DimensionalTagIdMap)) => {
      setDimensionalQueryOverlayState((prev) => {
        const next = typeof mapOrFn === 'function' ? mapOrFn(prev) : mapOrFn;
        dimensionalQueryOverlayRef.current = next;
        return next;
      });
    },
    []
  );

  const setTransientDimensionalQueryOverlay = useCallback(
    (mapOrFn: DimensionalTagIdMap | ((prev: DimensionalTagIdMap) => DimensionalTagIdMap)) => {
      setTransientDimensionalQueryOverlayState((prev) => {
        const next = typeof mapOrFn === 'function' ? mapOrFn(prev) : mapOrFn;
        transientDimensionalQueryOverlayRef.current = next;
        return next;
      });
    },
    []
  );

  const resolveDimensionalTagsForFetch = useCallback((): DimensionalTagIdMap => {
    const isStudioPath = pathname?.startsWith('/admin/studio');
    const cardDimensionalForFetch = isStudioPath ? ({} as DimensionalTagIdMap) : dimensionalTagMap;
    return mergeDimensionalTagMaps(
      cardDimensionalForFetch,
      dimensionalQueryOverlayRef.current,
      transientDimensionalQueryOverlayRef.current
    );
  }, [dimensionalTagMap, pathname]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    prevCursorRef.current = prevCursor;
  }, [prevCursor]);

  useEffect(() => {
    cursorStackRef.current = cursorStack;
  }, [cursorStack]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    writeStoredMediaAdminStoredFilterPreferences({
      filters,
      dimensionalQueryOverlay,
    });
  }, [dimensionalQueryOverlay, filters]);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  const buildQueryString = useCallback((
    mediaFilters: MediaFilters,
    dimMap: DimensionalTagIdMap,
    opts?: { cursor?: string; prevCursor?: string; listPage?: number; includeTotal?: boolean }
  ) => {
    const params = new URLSearchParams();
    params.append('limit', mediaPageLimit);
    if (opts?.cursor) params.append('cursor', opts.cursor);
    if (opts?.prevCursor) params.append('prevCursor', opts.prevCursor);
    if (opts?.listPage !== undefined && opts.listPage > 1) {
      params.set('listPage', String(opts.listPage));
    }
    if (opts?.includeTotal === false) {
      params.set('includeTotal', 'false');
    }

    if (mediaFilters.source !== 'all') params.append('source', mediaFilters.source);
    if (mediaFilters.dimensions !== 'all') params.append('dimensions', mediaFilters.dimensions);
    if (mediaFilters.hasCaption !== 'all') params.append('hasCaption', mediaFilters.hasCaption);
    if (mediaFilters.search) params.append('search', mediaFilters.search);
    if (mediaFilters.assignment !== 'all') params.append('assignment', mediaFilters.assignment);
    if (mediaFilters.matchStatus !== 'all') params.append('matchStatus', mediaFilters.matchStatus);
    if (mediaFilters.codification !== 'all') params.append('codification', mediaFilters.codification);
    if (mediaFilters.unresolvedDimension !== 'all') params.append('unresolvedDimension', mediaFilters.unresolvedDimension);
    if (mediaFilters.importBatchId) params.append('importBatchId', mediaFilters.importBatchId);
    if (mediaFilters.importFolder !== 'all') params.append('importFolder', mediaFilters.importFolder);
    if (mediaFilters.metadataOutcome !== 'all') params.append('metadataOutcome', mediaFilters.metadataOutcome);
    if (mediaFilters.tagScope === 'subject') params.append('tagScope', 'subject');
    for (const dimension of ['who', 'what', 'when', 'where'] as const) {
      const presence = mediaFilters.dimensionPresence?.[dimension];
      if (presence) params.set(`${dimension}Presence`, presence);
    }
    appendDimensionalTagQueryParams(dimMap, params);

    return params.toString();
  }, []);

  const fetchMedia = useCallback(async (page = 1, newFilters?: Partial<MediaFilters>) => {
    const requestSeq = mediaRequestSeqRef.current + 1;
    mediaRequestSeqRef.current = requestSeq;
    activeMediaRequestControllerRef.current?.abort();
    const controller = new AbortController();
    activeMediaRequestControllerRef.current = controller;
    const currentPageValue = currentPageRef.current;
    const nextCursorValue = nextCursorRef.current;
    const prevCursorValue = prevCursorRef.current;
    const cursorStackValue = cursorStackRef.current;
    const appendMode = !newFilters && page > currentPageValue;
    setLoading(!appendMode);
    setLoadingMore(appendMode && mediaRef.current.length > 0);
    if (appendMode) {
      setLoadMoreError(null);
    } else {
      setError(null);
      setLoadMoreError(null);
    }

    try {
      const updatedFilters = { ...filtersRef.current, ...newFilters };
      const isStudioPath = pathname?.startsWith('/admin/studio');
      const allowBackgroundPrefetch = !isStudioPath;
      const mergedDimensional = resolveDimensionalTagsForFetch();
      const includeTotal = !isStudioPath;
      const assignmentSeek =
        updatedFilters.assignment === 'unassigned' || updatedFilters.assignment === 'assigned';
      const tagSeek = dimensionalTagMapHasFilters(mergedDimensional);
      const useSeekPagination = assignmentSeek || tagSeek;
      const searchSeek = updatedFilters.search.trim().length > 0;
      const typesensePaging =
        lastMediaEngineRef.current === 'typesense' && (searchSeek || assignmentSeek || tagSeek);
      let opts: { cursor?: string; prevCursor?: string; listPage?: number } | undefined;

      if (page === 1 || newFilters) {
        opts = undefined;
      } else if (typesensePaging && page > 1) {
        opts = { listPage: page };
      } else if (useSeekPagination) {
        if (page > currentPageValue && nextCursorValue) {
          opts = { cursor: nextCursorValue };
        } else if (page < currentPageValue && page >= 2 && cursorStackValue[page - 2]) {
          opts = { cursor: cursorStackValue[page - 2]! };
        } else {
          opts = undefined;
        }
      } else if (page > currentPageValue && nextCursorValue) {
        opts = { cursor: nextCursorValue };
      } else if (page < currentPageValue && prevCursorValue) {
        opts = { prevCursor: prevCursorValue };
      } else if (page === currentPageValue && page >= 2 && cursorStackValue[page - 2]) {
        opts = { cursor: cursorStackValue[page - 2]! };
      }

      const queryString = buildQueryString(updatedFilters, mergedDimensional, {
        ...opts,
        includeTotal,
      });
      const cacheKey = queryString;
      const cached = cacheMediaQueryEntryIfFresh(cacheKey);
      if (cached) {
        setMedia((prev) => (appendMode ? dedupeMediaByDocId([...prev, ...cached.media]) : cached.media));
        mediaRef.current = appendMode ? dedupeMediaByDocId([...mediaRef.current, ...cached.media]) : cached.media;
        setPagination(cached.pagination);
        setCurrentPage(cached.currentPage);
        currentPageRef.current = cached.currentPage;
        setNextCursor(cached.nextCursor);
        nextCursorRef.current = cached.nextCursor;
        setPrevCursor(cached.prevCursor);
        prevCursorRef.current = cached.prevCursor;
        setCursorStack(cached.cursorStack);
        cursorStackRef.current = cached.cursorStack;
        if (newFilters) {
          setFilters(updatedFilters);
          filtersRef.current = updatedFilters;
        }
        cacheMediaRecords(cached.media);
        return;
      }
      const inFlightPrefetch = mediaPrefetchPromiseRef.current.get(cacheKey);
      if (inFlightPrefetch) {
        await inFlightPrefetch.catch(() => undefined);
        const cachedAfterPrefetch = cacheMediaQueryEntryIfFresh(cacheKey);
        if (cachedAfterPrefetch) {
          setMedia((prev) => (appendMode ? dedupeMediaByDocId([...prev, ...cachedAfterPrefetch.media]) : cachedAfterPrefetch.media));
          mediaRef.current = appendMode ? dedupeMediaByDocId([...mediaRef.current, ...cachedAfterPrefetch.media]) : cachedAfterPrefetch.media;
          setPagination(cachedAfterPrefetch.pagination);
          setCurrentPage(cachedAfterPrefetch.currentPage);
          currentPageRef.current = cachedAfterPrefetch.currentPage;
          setNextCursor(cachedAfterPrefetch.nextCursor);
          nextCursorRef.current = cachedAfterPrefetch.nextCursor;
          setPrevCursor(cachedAfterPrefetch.prevCursor);
          prevCursorRef.current = cachedAfterPrefetch.prevCursor;
          setCursorStack(cachedAfterPrefetch.cursorStack);
          cursorStackRef.current = cachedAfterPrefetch.cursorStack;
          if (newFilters) {
            setFilters(updatedFilters);
            filtersRef.current = updatedFilters;
          }
          cacheMediaRecords(cachedAfterPrefetch.media);
          return;
        }
      }
      const response = await fetch(`/api/media?${queryString}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        if (response.status === 503 && errBody.code === 'SEARCH_UNAVAILABLE') {
          throw toUserFacingError(
            'Media search unavailable',
            errBody,
            'Media search requires Typesense. Clear search or configure TYPESENSE_* env vars.'
          );
        }
        throw toUserFacingError('Failed to fetch media', errBody, response.statusText);
      }

      const data: MediaListResponse = await response.json();
      if (requestSeq !== mediaRequestSeqRef.current) return;
      lastMediaEngineRef.current = data.pagination.engine ?? 'firestore';
      cacheMediaRecords(data.media);
      const nextPagination = {
        ...data.pagination,
        page,
        hasPrev: Boolean(data.pagination.hasPrev || page > 1),
      };
      let nextCursorStack: (string | null)[];
      if (page === 1 || newFilters) {
        nextCursorStack = data.pagination.nextCursor ? [data.pagination.nextCursor] : [];
      } else if (page > currentPageValue && data.pagination.nextCursor) {
        nextCursorStack = [...cursorStackValue, data.pagination.nextCursor];
      } else if (page < currentPageValue) {
        nextCursorStack = cursorStackValue.slice(0, -1);
      } else {
        nextCursorStack = cursorStackValue;
      }
      const nextMedia = appendMode ? dedupeMediaByDocId([...mediaRef.current, ...data.media]) : data.media;
      setMedia(nextMedia);
      mediaRef.current = nextMedia;
      setPagination(nextPagination);
      setCurrentPage(page);
      currentPageRef.current = page;
      setNextCursor(data.pagination.nextCursor);
      nextCursorRef.current = data.pagination.nextCursor ?? null;
      setPrevCursor(data.pagination.prevCursor);
      prevCursorRef.current = data.pagination.prevCursor ?? null;
      setCursorStack(nextCursorStack);
      cursorStackRef.current = nextCursorStack;
      rememberMediaQueryCacheEntry(cacheKey, {
        media: data.media,
        pagination: nextPagination,
        currentPage: page,
        nextCursor: data.pagination.nextCursor ?? null,
        prevCursor: data.pagination.prevCursor ?? null,
        cursorStack: nextCursorStack,
        cachedAt: Date.now(),
      });

      if (newFilters) {
        setFilters(updatedFilters);
        filtersRef.current = updatedFilters;
      }

      const prefetchedPage = page + 1;
      const nextListPage =
        typeof data.pagination.nextListPage === 'number'
          ? data.pagination.nextListPage
          : prefetchedPage;
      const canPrefetchNext =
        Boolean(data.pagination.hasNext) &&
        (Boolean(data.pagination.nextCursor) || lastMediaEngineRef.current === 'typesense');
      if (allowBackgroundPrefetch && canPrefetchNext) {
        const prefetchOpts =
          lastMediaEngineRef.current === 'typesense'
            ? { listPage: nextListPage, includeTotal }
            : { cursor: data.pagination.nextCursor ?? undefined, includeTotal };
        const prefetchCursorStack =
          data.pagination.nextCursor ? [...nextCursorStack, data.pagination.nextCursor] : nextCursorStack;
        const prefetchQueryString = buildQueryString(updatedFilters, mergedDimensional, prefetchOpts);
        void prefetchMediaQuery(prefetchQueryString, {
          media: [],
          pagination: nextPagination,
          currentPage: prefetchedPage,
          nextCursor: null,
          prevCursor: data.pagination.prevCursor ?? null,
          cursorStack: prefetchCursorStack,
        });
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      if (appendMode) {
        setLoadMoreError(error);
      } else {
        setError(error);
      }
      console.error('Error fetching media:', error);
    } finally {
      if (requestSeq === mediaRequestSeqRef.current) {
        activeMediaRequestControllerRef.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [
    cacheMediaRecords,
    buildQueryString,
    resolveDimensionalTagsForFetch,
    prefetchMediaQuery,
    cacheMediaQueryEntryIfFresh,
    rememberMediaQueryCacheEntry,
  ]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    if (!pagination?.hasNext) return;
    await fetchMedia(currentPageRef.current + 1);
  }, [fetchMedia, loading, loadingMore, pagination?.hasNext]);

  const refreshMedia = useCallback(async () => {
    const targetPage = Math.max(1, currentPageRef.current);
    await fetchMedia(1, filtersRef.current);
    for (let page = 2; page <= targetPage; page += 1) {
      await fetchMedia(page);
    }
  }, [fetchMedia]);

  const mediaMatchesCurrentView = useCallback(
    (item: Media, currentFilters: MediaFilters = filtersRef.current) => {
      const currentDimensional = resolveDimensionalTagsForFetch();
      const assignmentMatches =
        currentFilters.assignment === 'all' ||
        (currentFilters.assignment === 'assigned' && isMediaAssigned(item)) ||
        (currentFilters.assignment === 'unassigned' && !isMediaAssigned(item));

      return (
        (currentFilters.source === 'all' || currentFilters.source === item.source) &&
        mediaMatchesDimensions(item, currentFilters.dimensions) &&
        mediaMatchesCaptionFilter(item, currentFilters.hasCaption) &&
        mediaMatchesSearch(item, currentFilters.search) &&
        assignmentMatches &&
        mediaMatchesDimensionalTags(item, currentDimensional, currentFilters.tagScope)
      );
    },
    [resolveDimensionalTagsForFetch]
  );

  const updateMedia = useCallback(async (id: string, updates: Partial<Media>): Promise<Media | undefined> => {
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const body = (await response.json().catch(() => ({}))) as ApiErrorResponse & { media?: Media };

      if (!response.ok) {
        throw toUserFacingError('Failed to update media', body, response.statusText);
      }

      const updated = body.media;
      if (updated?.docId) {
        cacheMediaRecord(updated);
        clearMediaQueryCache();
        const matchesCurrentView = mediaMatchesCurrentView(updated);
        if (!matchesCurrentView) {
          setSelectedMediaIds((prev) => prev.filter((selectedId) => selectedId !== id));
          adjustPaginationAfterDelete(1);
        }
        setMedia((prev) => {
          const next = prev.flatMap((item) => {
            if (item.docId !== id) return [item];
            return matchesCurrentView ? [{ ...updated, docId: updated.docId }] : [];
          });
          mediaRef.current = next;
          return next;
        });
        return updated;
      }

      await refreshMedia();
      return undefined;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error updating media:', error);
      return undefined;
    }
  }, [adjustPaginationAfterDelete, cacheMediaRecord, clearMediaQueryCache, mediaMatchesCurrentView, refreshMedia]);

  const deleteMedia = useCallback(async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw toUserFacingError('Failed to delete media', payload, response.statusText);
      }

      // Remove from local state
      mediaByIdCacheRef.current.delete(id);
      mediaByIdCacheOrderRef.current = mediaByIdCacheOrderRef.current.filter((cachedId) => cachedId !== id);
      clearMediaQueryCache();
      setMedia(prev => prev.filter(m => m.docId !== id));
      setSelectedMediaIds(prev => prev.filter(selectedId => selectedId !== id));
      adjustPaginationAfterDelete(1);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error deleting media:', error);
      throw error;
    }
  }, [adjustPaginationAfterDelete, clearMediaQueryCache]);

  const deleteMultipleMedia = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    const deletedIds: string[] = [];
    let failedCount = 0;
    let lastError: Error | null = null;

    try {
      setError(null);
      for (const id of ids) {
        try {
          const response = await fetch(`/api/images/${id}`, { method: 'DELETE' });
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
            throw toUserFacingError(`Failed to delete ${id}`, payload, response.statusText);
          }
          deletedIds.push(id);
        } catch (err) {
          failedCount += 1;
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      if (deletedIds.length > 0) {
        deletedIds.forEach((deletedId) => mediaByIdCacheRef.current.delete(deletedId));
        mediaByIdCacheOrderRef.current = mediaByIdCacheOrderRef.current.filter((cachedId) => !deletedIds.includes(cachedId));
        clearMediaQueryCache();
        setMedia((prev) => prev.filter((m) => !deletedIds.includes(m.docId)));
        setSelectedMediaIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
        adjustPaginationAfterDelete(deletedIds.length);

      }
      if (failedCount > 0) {
        if (failedCount === 1 && lastError) {
          setError(lastError);
        } else {
          const aggregate = new Error(
            `Failed to delete ${failedCount} media item${failedCount === 1 ? '' : 's'}.${
              lastError ? ` ${lastError.message}` : ''
            }`
          ) as MediaUiError;
          const lastMediaError = lastError as MediaUiError | null;
          if (lastMediaError?.code) aggregate.code = lastMediaError.code;
          if (lastMediaError?.severity) aggregate.severity = lastMediaError.severity;
          if (typeof lastMediaError?.retryable === 'boolean') {
            aggregate.retryable = lastMediaError.retryable;
          }
          setError(aggregate);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error deleting multiple media:', error);
    }
  }, [adjustPaginationAfterDelete, clearMediaQueryCache]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const bulkApplyTags = useCallback(
    async (mediaIds: string[], updates: MediaBulkTagUpdateRequest) => {
      if (mediaIds.length === 0) return;
      setError(null);
      try {
        const payload: {
          mediaIds: string[];
          tags?: string[];
          mode?: 'add' | 'replace' | 'remove';
          subjectTagId?: string | null;
          subjectTagIds?: string[];
        } = { mediaIds };

        if (Object.prototype.hasOwnProperty.call(updates, 'tagIds')) {
          payload.tags = updates.tagIds ?? [];
          payload.mode = updates.mode ?? 'add';
        }
        if (updates.subjectTagIdProvided) {
          payload.subjectTagId = updates.subjectTagId ?? null;
        }
        if (updates.subjectTagIdsProvided) {
          payload.subjectTagIds = updates.subjectTagIds ?? [];
        }

        const response = await fetch('/api/admin/media/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as ApiErrorResponse;
          throw toUserFacingError('Bulk tag update failed', data, response.statusText);
        }
        const body = (await response.json().catch(() => ({}))) as { media?: Media[] };
        const updatedItems = Array.isArray(body.media)
          ? body.media.filter((item): item is Media => Boolean(item?.docId))
          : [];
        clearMediaQueryCache();
        if (updatedItems.length > 0) {
          updatedItems.forEach((item) => cacheMediaRecord(item));
          const updatedById = new Map(updatedItems.map((item) => [item.docId, item] as const));
          setMedia((prev) => {
            const next = prev
              .map((item) => {
                if (!item.docId) return item;
                const updated = updatedById.get(item.docId);
                if (!updated) return item;
                return mediaMatchesCurrentView(updated) ? updated : null;
              })
              .filter((item): item is Media => Boolean(item?.docId));
            mediaRef.current = next;
            return next;
          });
        } else {
          await refreshMedia();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [cacheMediaRecord, clearMediaQueryCache, mediaMatchesCurrentView, refreshMedia]
  );

  const registerCreatedMedia = useCallback(
    (item: Media) => {
      if (!item?.docId) return;
      cacheMediaRecord(item);
      clearMediaQueryCache();

      const currentFilters = filtersRef.current;
      const matchesCurrentView =
        currentPageRef.current === 1 && mediaMatchesCurrentView(item, currentFilters);

      if (!matchesCurrentView) return;

      setMedia((prev) => {
        const next = [item, ...prev.filter((existing) => existing.docId !== item.docId)];
        mediaRef.current = next;
        return next;
      });
      setPagination((prev) => {
        if (!prev) return prev;
        const nextTotal = typeof prev.total === 'number' ? prev.total + 1 : prev.total;
        const nextTotalPages =
          typeof nextTotal === 'number' ? Math.max(1, Math.ceil(nextTotal / prev.limit)) : prev.totalPages;
        return {
          ...prev,
          total: nextTotal,
          totalPages: nextTotalPages,
        };
      });
    },
    [cacheMediaRecord, clearMediaQueryCache, mediaMatchesCurrentView]
  );

  const reconcileCardMediaAssignments = useCallback(
    (cardId: string, addedMediaIds: string[], removedMediaIds: string[]) => {
      const added = new Set(addedMediaIds.filter((id) => typeof id === 'string' && id.trim().length > 0));
      const removed = new Set(removedMediaIds.filter((id) => typeof id === 'string' && id.trim().length > 0));
      if (!cardId || (added.size === 0 && removed.size === 0)) return;

      const patchRefs = (item: Media): Media => {
        let nextRefs = Array.isArray(item.referencedByCardIds) ? [...item.referencedByCardIds] : [];
        if (added.has(item.docId) && !nextRefs.includes(cardId)) {
          nextRefs = [cardId, ...nextRefs];
        }
        if (removed.has(item.docId)) {
          nextRefs = nextRefs.filter((id) => id !== cardId);
        }
        return { ...item, referencedByCardIds: nextRefs };
      };

      for (const mediaId of new Set([...added, ...removed])) {
        const cached = mediaByIdCacheRef.current.get(mediaId);
        if (!cached?.docId) continue;
        mediaByIdCacheRef.current.set(mediaId, patchRefs(cached));
      }

      clearMediaQueryCache();
      setMedia((prev) => {
        const assignmentFilter = filtersRef.current.assignment;
        const next = prev
          .map((item) => {
            if (!item.docId || (!added.has(item.docId) && !removed.has(item.docId))) return item;
            return patchRefs(item);
          })
          .filter((item) => {
            if (assignmentFilter === 'unassigned') {
              return !Array.isArray(item.referencedByCardIds) || item.referencedByCardIds.length === 0;
            }
            if (assignmentFilter === 'assigned') {
              return Array.isArray(item.referencedByCardIds) && item.referencedByCardIds.length > 0;
            }
            return true;
          });
        mediaRef.current = next;
        return next;
      });
    },
    [clearMediaQueryCache]
  );

  const setFilter = useCallback((key: keyof MediaFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      filtersRef.current = next;
      return next;
    });
  }, [mediaPageLimit]);

  const clearFilters = useCallback(() => {
    lastMediaEngineRef.current = null;
    dimensionalQueryOverlayRef.current = {};
    transientDimensionalQueryOverlayRef.current = {};
    setDimensionalQueryOverlayState({});
    setTransientDimensionalQueryOverlayState({});
    setFilters(defaultFilters);
    filtersRef.current = defaultFilters;
    setCursorStack([]);
    cursorStackRef.current = [];
    setNextCursor(null);
    nextCursorRef.current = null;
    setPrevCursor(null);
    prevCursorRef.current = null;
    void fetchMedia(1, defaultFilters);
  }, [fetchMedia]);

  const toggleMediaSelection = useCallback((id: string) => {
    setSelectedMediaIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedMediaIds(mediaRef.current.map((m) => m.docId));
  }, []);

  const selectNone = useCallback(() => {
    setSelectedMediaIds([]);
  }, []);

  useEffect(() => {
    return () => {
      activeMediaRequestControllerRef.current?.abort();
      activeMediaRequestControllerRef.current = null;
    };
  }, []);

  const value: MediaContextType = {
    media,
    loading,
    loadingMore,
    error,
    loadMoreError,
    pagination,
    currentPage,
    hasMore: Boolean(pagination?.hasNext),
    filters,
    fetchMedia,
    loadMore,
    refreshMedia,
    updateMedia,
    deleteMedia,
    deleteMultipleMedia,
    clearError,
    bulkApplyTags,
    registerCreatedMedia,
    reconcileCardMediaAssignments,
    setFilter,
    clearFilters,
    dimensionalQueryOverlay,
    setDimensionalQueryOverlay,
    transientDimensionalQueryOverlay,
    setTransientDimensionalQueryOverlay,
    selectedMediaIds,
    setSelectedMediaIds,
    toggleMediaSelection,
    selectAll,
    selectNone,
    resolveMediaById,
  };

  return (
    <MediaContext.Provider value={value}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const context = useContext(MediaContext);
  if (context === undefined) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
} 

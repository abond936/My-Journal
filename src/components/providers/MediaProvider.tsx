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

function applyMediaTagMutation(
  existingTags: string[] | undefined,
  nextTags: string[],
  mode: 'add' | 'replace' | 'remove'
): string[] {
  if (mode === 'replace') return [...nextTags];
  const tagSet = new Set(existingTags ?? []);
  if (mode === 'add') {
    nextTags.forEach((tagId) => tagSet.add(tagId));
    return Array.from(tagSet);
  }
  nextTags.forEach((tagId) => tagSet.delete(tagId));
  return Array.from(tagSet);
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
  error: Error | null;
  
  // Pagination
  pagination: MediaListResponse['pagination'] | null;
  currentPage: number;
  
  // Filters
  filters: MediaFilters;
  
  // Actions
  fetchMedia: (page?: number, newFilters?: Partial<MediaFilters>) => Promise<void>;
  updateMedia: (id: string, updates: Partial<Media>) => Promise<Media | undefined>;
  deleteMedia: (id: string) => Promise<void>;
  deleteMultipleMedia: (ids: string[]) => Promise<void>;
  /** Bulk edit media tags using add|replace|remove semantics. */
  bulkApplyTags: (mediaIds: string[], tags: string[], mode?: 'add' | 'replace' | 'remove') => Promise<void>;
  
  // Filter actions
  setFilter: (key: keyof MediaFilters, value: string) => void;
  clearFilters: () => void;
  /** Admin Studio: who/what/when/where tag ids for GET /api/media (single MacroTagSelector in embedded Studio). */
  dimensionalQueryOverlay: DimensionalTagIdMap;
  setDimensionalQueryOverlay: (
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

const defaultFilters: MediaFilters = {
  source: 'all',
  dimensions: 'all',
  hasCaption: 'all',
  search: '',
  assignment: 'all',
};

const MEDIA_QUERY_CACHE_TTL_MS = 15_000;
const MEDIA_QUERY_CACHE_LIMIT = 24;
const MEDIA_RECORD_CACHE_LIMIT = 400;

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMediaListRoute = Boolean(pathname?.startsWith('/admin/studio'));

  const { selectedTags } = useCardContext();
  const { tags: allTags } = useTag();

  const dimensionalTagMap = useMemo(
    () => groupSelectedTagIdsByDimension(selectedTags, allTags),
    [selectedTags, allTags]
  );

  const dimensionalTagKey = useMemo(() => JSON.stringify(dimensionalTagMap), [dimensionalTagMap]);

  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<MediaListResponse['pagination'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([]);
  const [filters, setFilters] = useState<MediaFilters>(defaultFilters);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [dimensionalQueryOverlay, setDimensionalQueryOverlayState] = useState<DimensionalTagIdMap>({});
  const dimensionalQueryOverlayRef = useRef<DimensionalTagIdMap>({});
  const lastMediaEngineRef = useRef<'typesense' | 'firestore' | null>(null);
  const mediaRequestSeqRef = useRef(0);
  const activeMediaRequestControllerRef = useRef<AbortController | null>(null);
  const mediaQueryCacheRef = useRef(new Map<string, CachedMediaQueryResult>());
  const mediaQueryCacheOrderRef = useRef<string[]>([]);
  const mediaByIdCacheRef = useRef(new Map<string, Media>());
  const mediaByIdCacheOrderRef = useRef<string[]>([]);
  const mediaPrefetchInFlightRef = useRef(new Set<string>());

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
      }
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

  const buildQueryString = useCallback((
    mediaFilters: MediaFilters,
    dimMap: DimensionalTagIdMap,
    opts?: { cursor?: string; prevCursor?: string; listPage?: number; includeTotal?: boolean }
  ) => {
    const params = new URLSearchParams();
    params.append('limit', '50');
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
    appendDimensionalTagQueryParams(dimMap, params);

    return params.toString();
  }, []);

  const fetchMedia = useCallback(async (page = 1, newFilters?: Partial<MediaFilters>) => {
    const requestSeq = mediaRequestSeqRef.current + 1;
    mediaRequestSeqRef.current = requestSeq;
    activeMediaRequestControllerRef.current?.abort();
    const controller = new AbortController();
    activeMediaRequestControllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const updatedFilters = { ...filters, ...newFilters };
      const isStudioPath = pathname?.startsWith('/admin/studio');
      /** Embedded Studio: media list uses only the overlay; full-page and PhotoPicker merge card context + overlay. */
      const cardDimensionalForFetch = isStudioPath ? ({} as DimensionalTagIdMap) : dimensionalTagMap;
      const mergedDimensional = mergeDimensionalTagMaps(
        cardDimensionalForFetch,
        dimensionalQueryOverlayRef.current
      );
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
        if (page > currentPage && nextCursor) {
          opts = { cursor: nextCursor };
        } else if (page < currentPage && page >= 2 && cursorStack[page - 2]) {
          opts = { cursor: cursorStack[page - 2]! };
        } else {
          opts = undefined;
        }
      } else if (page > currentPage && nextCursor) {
        opts = { cursor: nextCursor };
      } else if (page < currentPage && prevCursor) {
        opts = { prevCursor };
      } else if (page === currentPage && page >= 2 && cursorStack[page - 2]) {
        opts = { cursor: cursorStack[page - 2]! };
      }

      const queryString = buildQueryString(updatedFilters, mergedDimensional, {
        ...opts,
        includeTotal,
      });
      const cacheKey = queryString;
      const cached = cacheMediaQueryEntryIfFresh(cacheKey);
      if (cached) {
        setMedia(cached.media);
        setPagination(cached.pagination);
        setCurrentPage(cached.currentPage);
        setNextCursor(cached.nextCursor);
        setPrevCursor(cached.prevCursor);
        setCursorStack(cached.cursorStack);
        if (newFilters) {
          setFilters(updatedFilters);
        }
        setLoading(false);
        cacheMediaRecords(cached.media);
        return;
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
      } else if (page > currentPage && data.pagination.nextCursor) {
        nextCursorStack = [...cursorStack, data.pagination.nextCursor];
      } else if (page < currentPage) {
        nextCursorStack = cursorStack.slice(0, -1);
      } else {
        nextCursorStack = cursorStack;
      }
      setMedia(data.media);
      setPagination(nextPagination);
      setCurrentPage(page);
      setNextCursor(data.pagination.nextCursor);
      setPrevCursor(data.pagination.prevCursor);
      setCursorStack(nextCursorStack);
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
      }

      const prefetchedPage = page + 1;
      const nextListPage =
        typeof data.pagination.nextListPage === 'number'
          ? data.pagination.nextListPage
          : prefetchedPage;
      const canPrefetchNext =
        Boolean(data.pagination.hasNext) &&
        (Boolean(data.pagination.nextCursor) || lastMediaEngineRef.current === 'typesense');
      if (canPrefetchNext) {
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
      setError(error);
      console.error('Error fetching media:', error);
    } finally {
      if (requestSeq === mediaRequestSeqRef.current) {
        activeMediaRequestControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [
    cacheMediaRecords,
    filters,
    buildQueryString,
    currentPage,
    nextCursor,
    prevCursor,
    cursorStack,
    dimensionalTagMap,
    pathname,
    prefetchMediaQuery,
    cacheMediaQueryEntryIfFresh,
    rememberMediaQueryCacheEntry,
  ]);

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
        setMedia((prev) => prev.map((m) => (m.docId === id ? { ...updated, docId: updated.docId } : m)));
        return updated;
      }

      await fetchMedia(currentPage);
      return undefined;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error updating media:', error);
      return undefined;
    }
  }, [cacheMediaRecord, clearMediaQueryCache, fetchMedia, currentPage]);

  const deleteMedia = useCallback(async (id: string) => {
    try {
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
      
      // Refresh pagination if needed
      if (pagination && media.length === 1 && currentPage > 1) {
        await fetchMedia(currentPage - 1);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error deleting media:', error);
    }
  }, [adjustPaginationAfterDelete, clearMediaQueryCache, fetchMedia, currentPage, pagination, media.length]);

  const deleteMultipleMedia = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    const CONCURRENT_DELETES = 5;
    const deletedIds: string[] = [];

    try {
      for (let i = 0; i < ids.length; i += CONCURRENT_DELETES) {
        const chunk = ids.slice(i, i + CONCURRENT_DELETES);
        const results = await Promise.allSettled(
          chunk.map(async (id) => {
            const response = await fetch(`/api/images/${id}`, { method: 'DELETE' });
            if (!response.ok) {
              const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
              throw toUserFacingError(`Failed to delete ${id}`, payload, response.statusText);
            }
            return id;
          })
        );
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value) deletedIds.push(r.value);
          else if (r.status === 'rejected')
            setError(r.reason instanceof Error ? r.reason : new Error(String(r.reason)));
        });
      }

      if (deletedIds.length > 0) {
        deletedIds.forEach((deletedId) => mediaByIdCacheRef.current.delete(deletedId));
        mediaByIdCacheOrderRef.current = mediaByIdCacheOrderRef.current.filter((cachedId) => !deletedIds.includes(cachedId));
        clearMediaQueryCache();
        setMedia((prev) => prev.filter((m) => !deletedIds.includes(m.docId)));
        setSelectedMediaIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
        adjustPaginationAfterDelete(deletedIds.length);

        if (pagination && media.length <= deletedIds.length && currentPage > 1) {
          await fetchMedia(currentPage - 1);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error deleting multiple media:', error);
    }
  }, [adjustPaginationAfterDelete, clearMediaQueryCache, fetchMedia, currentPage, pagination, media.length]);

  const bulkApplyTags = useCallback(
    async (mediaIds: string[], tags: string[], mode: 'add' | 'replace' | 'remove' = 'add') => {
      if (mediaIds.length === 0) return;
      setError(null);
      try {
        const response = await fetch('/api/admin/media/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaIds, tags, mode }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as ApiErrorResponse;
          throw toUserFacingError('Bulk tag update failed', data, response.statusText);
        }
        const idSet = new Set(mediaIds);
        clearMediaQueryCache();
        setMedia((prev) =>
          prev.map((item) =>
            item.docId && idSet.has(item.docId)
              ? (() => {
                  const nextItem = {
                    ...item,
                    tags: applyMediaTagMutation(item.tags, tags, mode),
                  };
                  cacheMediaRecord(nextItem);
                  return nextItem;
                })()
              : item
          )
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [cacheMediaRecord, clearMediaQueryCache]
  );

  const setFilter = useCallback((key: keyof MediaFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    lastMediaEngineRef.current = null;
    dimensionalQueryOverlayRef.current = {};
    setDimensionalQueryOverlayState({});
    setFilters(defaultFilters);
    setCursorStack([]);
    setNextCursor(null);
    setPrevCursor(null);
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
    setSelectedMediaIds(media.map(m => m.docId));
  }, [media]);

  const selectNone = useCallback(() => {
    setSelectedMediaIds([]);
  }, []);

  // Load / refresh list only on media list surfaces (avoid fetching on Card admin, etc.).
  useEffect(() => {
    if (!isMediaListRoute) return;
    void fetchMedia(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchMedia identity changes with cursors/stack; dimensionalTagKey is the intended trigger
  }, [dimensionalTagKey, isMediaListRoute]);

  useEffect(() => {
    return () => {
      activeMediaRequestControllerRef.current?.abort();
      activeMediaRequestControllerRef.current = null;
    };
  }, []);

  const value: MediaContextType = {
    media,
    loading,
    error,
    pagination,
    currentPage,
    filters,
    fetchMedia,
    updateMedia,
    deleteMedia,
    deleteMultipleMedia,
    bulkApplyTags,
    setFilter,
    clearFilters,
    dimensionalQueryOverlay,
    setDimensionalQueryOverlay,
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

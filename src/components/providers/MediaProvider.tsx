'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Media } from '@/lib/types/photo';
import { useCardContext } from '@/components/providers/CardProvider';
import { useTag } from '@/components/providers/TagProvider';
import {
  appendDimensionalTagQueryParams,
  dimensionalTagMapHasFilters,
  groupSelectedTagIdsByDimension,
} from '@/lib/utils/tagUtils';

interface MediaListResponse {
  media: Media[];
  pagination: {
    page?: number;
    limit: number;
    total: number | null;
    totalPages: number | null;
    seekMode?: boolean;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string | null;
    prevCursor?: string | null;
  };
}

export interface MediaFilters {
  status: string;
  source: string;
  dimensions: string;
  hasCaption: string;
  search: string;
  /** all | unassigned | assigned — unassigned/assigned use seek pagination (forward-only). */
  assignment: string;
}

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
  
  // Selection
  selectedMediaIds: string[];
  setSelectedMediaIds: (ids: string[]) => void;
  toggleMediaSelection: (id: string) => void;
  selectAll: () => void;
  selectNone: () => void;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

const defaultFilters: MediaFilters = {
  status: 'all',
  source: 'all',
  dimensions: 'all',
  hasCaption: 'all',
  search: '',
  assignment: 'all',
};

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMediaAdminRoute = Boolean(pathname?.startsWith('/admin/media-admin'));

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

  const buildQueryString = useCallback((
    mediaFilters: MediaFilters,
    dimMap: ReturnType<typeof groupSelectedTagIdsByDimension>,
    opts?: { cursor?: string; prevCursor?: string }
  ) => {
    const params = new URLSearchParams();
    params.append('limit', '50');
    if (opts?.cursor) params.append('cursor', opts.cursor);
    if (opts?.prevCursor) params.append('prevCursor', opts.prevCursor);

    if (mediaFilters.status !== 'all') params.append('status', mediaFilters.status);
    if (mediaFilters.source !== 'all') params.append('source', mediaFilters.source);
    if (mediaFilters.dimensions !== 'all') params.append('dimensions', mediaFilters.dimensions);
    if (mediaFilters.hasCaption !== 'all') params.append('hasCaption', mediaFilters.hasCaption);
    if (mediaFilters.search) params.append('search', mediaFilters.search);
    if (mediaFilters.assignment !== 'all') params.append('assignment', mediaFilters.assignment);
    appendDimensionalTagQueryParams(dimMap, params);

    return params.toString();
  }, []);

  const fetchMedia = useCallback(async (page = 1, newFilters?: Partial<MediaFilters>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedFilters = { ...filters, ...newFilters };
      const assignmentSeek =
        updatedFilters.assignment === 'unassigned' || updatedFilters.assignment === 'assigned';
      const tagSeek = dimensionalTagMapHasFilters(dimensionalTagMap);
      const useSeekPagination = assignmentSeek || tagSeek;
      let opts: { cursor?: string; prevCursor?: string } | undefined;

      if (page === 1 || newFilters) {
        opts = undefined;
      } else if (useSeekPagination) {
        if (page > currentPage && nextCursor) {
          opts = { cursor: nextCursor };
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

      const queryString = buildQueryString(updatedFilters, dimensionalTagMap, opts);
      const response = await fetch(`/api/media?${queryString}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }

      const data: MediaListResponse = await response.json();
      setMedia(data.media);
      setPagination({ ...data.pagination, page });
      setCurrentPage(page);
      setNextCursor(data.pagination.nextCursor);
      setPrevCursor(data.pagination.prevCursor);

      if (page === 1 || newFilters) {
        setCursorStack(data.pagination.nextCursor ? [data.pagination.nextCursor] : []);
      } else if (page > currentPage && data.pagination.nextCursor) {
        setCursorStack((prev) => [...prev, data.pagination.nextCursor!]);
      } else if (page < currentPage) {
        setCursorStack((prev) => prev.slice(0, -1));
      }

      if (newFilters) {
        setFilters(updatedFilters);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, buildQueryString, currentPage, nextCursor, prevCursor, cursorStack, dimensionalTagMap]);

  const updateMedia = useCallback(async (id: string, updates: Partial<Media>): Promise<Media | undefined> => {
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update media: ${response.statusText}`);
      }

      // Refresh the current page to get updated data
      await fetchMedia(currentPage);
      return media.find(m => m.docId === id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error updating media:', error);
      return undefined;
    }
  }, [fetchMedia, currentPage, media]);

  const deleteMedia = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete media: ${response.statusText}`);
      }

      // Remove from local state
      setMedia(prev => prev.filter(m => m.docId !== id));
      setSelectedMediaIds(prev => prev.filter(selectedId => selectedId !== id));
      
      // Refresh pagination if needed
      if (pagination && media.length === 1 && currentPage > 1) {
        await fetchMedia(currentPage - 1);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error deleting media:', error);
    }
  }, [fetchMedia, currentPage, pagination, media.length]);

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
            if (!response.ok) throw new Error(`Failed to delete ${id}`);
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
        setMedia((prev) => prev.filter((m) => !deletedIds.includes(m.docId)));
        setSelectedMediaIds((prev) => prev.filter((id) => !deletedIds.includes(id)));

        if (pagination && media.length <= deletedIds.length && currentPage > 1) {
          await fetchMedia(currentPage - 1);
        } else {
          await fetchMedia(currentPage);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      console.error('Error deleting multiple media:', error);
    }
  }, [fetchMedia, currentPage, pagination, media.length]);

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
          const data = await response.json().catch(() => ({}));
          throw new Error(typeof data.message === 'string' ? data.message : response.statusText);
        }
        await fetchMedia(currentPage);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [fetchMedia, currentPage]
  );

  const setFilter = useCallback((key: keyof MediaFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
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

  // Load / refresh list only on Media admin (avoid fetching on every sidebar change while on Card admin, etc.).
  useEffect(() => {
    if (!isMediaAdminRoute) return;
    void fetchMedia(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchMedia identity changes with cursors/stack; dimensionalTagKey is the intended trigger
  }, [dimensionalTagKey, isMediaAdminRoute]);

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
    selectedMediaIds,
    setSelectedMediaIds,
    toggleMediaSelection,
    selectAll,
    selectNone,
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
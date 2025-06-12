'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useFilter } from '@/components/providers/FilterProvider';
import { Entry } from '@/lib/types/entry';
import { Album } from '@/lib/types/album';
import { EntryType } from '@/lib/types/entryType';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { PaginatedResult } from '../types/services';
import { getAlbums } from '@/lib/services/albumService';

// Check if a fetched item is an Album by looking for a property unique to Albums
function isAlbum(item: Entry | Album): item is Album {
  return 'images' in item; 
}

export type ContentItem = (Entry | Album) & { type: 'entry' | 'album' };

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useContent() {
  const { contentType, selectedTags, entryType } = useFilter();

  const [optimisticContent, setOptimisticContent] = useState<ContentItem[]>([]);

  // --- Data Fetching ---
  const {
    data: paginatedEntries,
    error: entriesError,
    isLoading: entriesLoading,
    setSize: setEntriesSize,
    size: entriesSize,
    mutate: mutateEntries,
  } = useSWRInfinite<PaginatedResult<Entry>>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.hasMore) return null;
      const params = new URLSearchParams();
      params.set('limit', '10');
      if (pageIndex > 0 && previousPageData?.lastDocId) {
        params.set('lastDocId', previousPageData.lastDocId);
      }
      if (selectedTags.length > 0) {
        params.set('tags', selectedTags.join(','));
      }
      if (contentType === 'entries' && entryType !== 'all') {
        params.set('type', entryType);
      }
      return `/api/entries?${params.toString()}`;
    },
    fetcher
  );

  // --- Paginated Albums ---
  const {
    data: paginatedAlbums,
    error: albumsError,
    isLoading: albumsLoading,
    setSize: setAlbumsSize,
    size: albumsSize,
    mutate: mutateAlbums,
  } = useSWRInfinite<PaginatedResult<Album>>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.hasMore) return null;
      const params: any = { limit: 10 };
      if (pageIndex > 0 && previousPageData?.lastDocId) {
        params.lastDocId = previousPageData.lastDocId;
      }
      if (selectedTags.length > 0) {
        params.tags = selectedTags;
      }
      return params;
    },
    async (params: any) => getAlbums(params)
  );

  // --- State Aggregation & Memoization ---
  const allEntries = useMemo(() => paginatedEntries?.flatMap(page => page.items) || [], [paginatedEntries]);
  const allAlbums = useMemo(() => paginatedAlbums?.flatMap(page => page.items) || [], [paginatedAlbums]);

  const sourceOfTruthContent = useMemo(() => {
    const entriesWithT: ContentItem[] = allEntries.map(e => ({ ...e, type: 'entry' }));
    const albumsWithT: ContentItem[] = allAlbums.map(a => ({ ...a, type: 'album' }));
    return [...entriesWithT, ...albumsWithT].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [allEntries, allAlbums]);
  
  // This effect synchronizes the optimistic state with the server state.
  // It runs ONLY when the data from the server (sourceOfTruthContent) changes.
  useEffect(() => {
    setOptimisticContent(sourceOfTruthContent);
  }, [sourceOfTruthContent]);

  // This effect handles the INSTANT optimistic UI update when filters change.
  // It runs ONLY when a filter is changed by the user.
  useEffect(() => {
    // It applies the new filters to the content that is CURRENTLY visible.
    setOptimisticContent(currentContent => {
      let items = sourceOfTruthContent; // Start with the full, unfiltered source

      // Apply content type filter
      if (contentType !== 'all') {
        items = items.filter(item => item.type === contentType);
      }
      
      // Apply entry type filter
      if (contentType === 'entries' && entryType !== 'all') {
        items = items.filter(item => (item as Entry).type === entryType);
      }
  
      // Apply tag filter
      if (selectedTags.length > 0) {
        items = items.filter(item =>
          selectedTags.every(tagId => item.tags?.includes(tagId))
        );
      }

      return items;
    });

    // SWR automatically re-fetches when its keys (which depend on filters) change.
    // No manual mutation is needed here.

  }, [contentType, selectedTags, entryType]);


  // --- Derived State for UI ---
  const isLoading = (entriesLoading && !paginatedEntries) || (albumsLoading && !paginatedAlbums);
  const hasMoreEntries = paginatedEntries?.[paginatedEntries.length - 1]?.hasMore ?? true;
  const hasMoreAlbums = paginatedAlbums?.[paginatedAlbums.length - 1]?.hasMore ?? true;
  const hasMore = hasMoreEntries || hasMoreAlbums;
  const error = entriesError || albumsError;

  const loadMore = useCallback(() => {
    if (!isLoading) {
      setEntriesSize(entriesSize + 1);
      setAlbumsSize(albumsSize + 1);
    }
  }, [isLoading, setEntriesSize, setAlbumsSize, entriesSize, albumsSize]);

  return useMemo(() => ({
    content: optimisticContent, // <-- UI now uses optimistic content
    loading: isLoading,
    loadingMore: isLoading && (entriesSize > 1 || albumsSize > 1),
    error,
    hasMore,
    loadMore,
  }), [optimisticContent, isLoading, error, hasMore, loadMore, entriesSize, albumsSize]);
} 
'use client';

import { useMemo } from 'react';
import { useFilter } from '@/components/providers/FilterProvider';
import { Entry } from '@/lib/types/entry';
import { Album } from '@/lib/types/album';
import { EntryType } from '@/lib/types/entryType';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { PaginatedResult } from '../types/services';

// Check if a fetched item is an Album by looking for a property unique to Albums
function isAlbum(item: Entry | Album): item is Album {
  return 'images' in item; 
}

export type ContentItem = (Entry | Album) & { type: 'entry' | 'album' };

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useContent() {
  const { contentType, selectedTags, entryType } = useFilter();

  // --- Data Fetching ---
  const getKey = (pageIndex: number, previousPageData: PaginatedResult<Entry> | null) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    const params = new URLSearchParams();
    params.set('limit', '10');
    if (pageIndex > 0 && previousPageData?.lastDoc?.id) {
      params.set('lastDocId', previousPageData.lastDoc.id);
    }
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }
    return `/api/entries?${params.toString()}`;
  };

  const {
    data: paginatedEntries,
    error: entriesError,
    isLoading: entriesLoading,
    setSize,
    size,
    isValidating,
  } = useSWRInfinite<PaginatedResult<Entry>>(getKey, fetcher);
  
  // For now, we fetch all albums at once. This can be updated later if pagination is needed.
  const { data: albums, error: albumsError, isLoading: albumsLoading } = useSWR<Album[]>('/api/albums', fetcher);

  // --- State Aggregation & Memoization ---

  const allEntries = useMemo(() => paginatedEntries?.flatMap(page => page.items) || [], [paginatedEntries]);
  const allAlbums = useMemo(() => albums || [], [albums]);

  const combinedContent = useMemo(() => {
    const entriesWithT: ContentItem[] = allEntries.map(e => ({ ...e, type: 'entry' }));
    const albumsWithT: ContentItem[] = allAlbums.map(a => ({ ...a, type: 'album' }));
    
    return [...entriesWithT, ...albumsWithT].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [allEntries, allAlbums]);

  const filteredContent = useMemo(() => {
    let items = combinedContent;

    if (contentType !== 'all') {
      items = items.filter(item => item.type === contentType);
    }
    
    if (contentType === 'entries' && entryType !== 'all') {
        items = items.filter(item => (item as Entry).entryType === entryType);
    }

    if (selectedTags.length > 0) {
      items = items.filter(item =>
        selectedTags.every(tagId => item.tags?.includes(tagId))
      );
    }
    
    return items;
  }, [combinedContent, contentType, selectedTags, entryType]);

  // --- Derived State for UI ---

  const isLoadingInitialData = (entriesLoading && !paginatedEntries) || (albumsLoading && !albums);
  const isLoadingMore = (size > 0 && paginatedEntries && typeof paginatedEntries[size - 1] === 'undefined') || isValidating;
  const hasMore = paginatedEntries?.[paginatedEntries.length - 1]?.hasMore ?? true;
  const error = entriesError || albumsError;

  return {
    content: filteredContent,
    loading: isLoadingInitialData,
    loadingMore: isLoadingMore,
    error,
    hasMore,
    loadMore: () => setSize(size + 1),
  };
} 
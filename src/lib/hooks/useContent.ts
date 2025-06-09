'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFilter } from '@/lib/contexts/FilterContext';
import { Entry } from '@/lib/types/entry';
import { Album } from '@/lib/types/album';
import { EntryType } from '@/lib/types/entryType';

// Check if a fetched item is an Album by looking for a property unique to Albums
function isAlbum(item: Entry | Album): item is Album {
  return 'images' in item; 
}

export type ContentItem = (Entry | Album) & { type: 'entry' | 'album', entryType?: EntryType };

export function useContent() {
  const { contentType, selectedTags, entryType } = useFilter();

  // 1. MASTER LIST: Stores ALL unique items ever fetched from the server.
  const [masterContentList, setMasterContentList] = useState<ContentItem[]>([]);
  // 2. FILTERED LIST: The list the UI actually displays. It's derived from the master list.
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Pagination State
  const [entryLastDocId, setEntryLastDocId] = useState<string | null>(null);
  const [albumLastDocId, setAlbumLastDocId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // This effect runs instantly whenever the master list or the user's filters change.
  // It does NOT make a network request.
  useEffect(() => {
    let items = masterContentList;

    // Filter by content type ('all', 'entries', 'albums')
    if (contentType !== 'all') {
      items = items.filter(item => item.type === contentType);
    }

    // NEW: Filter by specific entry type if content type is 'entries'
    if (contentType === 'entries' && entryType !== 'all') {
      items = items.filter(item => item.type === 'entry' && item.entryType === entryType);
    }

    // Filter by selected tags. An item must have ALL selected tags.
    if (selectedTags.length > 0) {
      items = items.filter(item =>
        selectedTags.every(tagId => item.tags?.includes(tagId))
      );
    }
    
    // Update the list that the UI will display.
    setFilteredContent(items);
  }, [masterContentList, contentType, selectedTags, entryType]);


  const loadMore = useCallback(async () => {
    // Stop if we are already fetching or if the server has no more data.
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    // Only show the main loading spinner on the very first fetch.
    if (masterContentList.length === 0) {
      setLoading(true);
    }
    setError(null);

    const params = new URLSearchParams();
    // ALWAYS fetch 'all' content types. DO NOT send tags to the API.
    params.set('type', 'all'); 
    if (entryLastDocId) params.set('entryLastDocId', entryLastDocId);
    if (albumLastDocId) params.set('albumLastDocId', albumLastDocId);

    try {
      const response = await fetch(`/api/content?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch content');

      const data = await response.json();
      const newItems: ContentItem[] = data.items.map((item: Entry | Album) => ({
        ...item,
        type: isAlbum(item) ? 'album' : 'entry',
        entryType: isAlbum(item) ? undefined : item.type as EntryType,
      }));

      // Add new items to the master list, ensuring no duplicates.
      setMasterContentList(prevList => {
        const existingIds = new Set(prevList.map(item => item.id));
        const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
        return [...prevList, ...uniqueNewItems];
      });

      // Update pagination state for the next fetch.
      setEntryLastDocId(data.entryLastDocId);
      setAlbumLastDocId(data.albumLastDocId);
      setHasMore(data.hasMore);

    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, masterContentList.length, entryLastDocId, albumLastDocId]);

  // Initial Data Load
  useEffect(() => {
    // Fetch the first batch of content only once when the component mounts.
    if (masterContentList.length === 0) {
      loadMore();
    }
  }, [loadMore, masterContentList.length]);

  return { 
    content: filteredContent, // <-- The UI now uses the instantly-filtered list
    loading, 
    error, 
    hasMore, 
    loadingMore, 
    loadMore 
  };
} 
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import useSWRInfinite, { SWRInfiniteResponse } from 'swr/infinite';
import { FilterableEntryType } from '@/lib/types/entry';
import { Entry } from '@/lib/types/entry';
import { Album } from '@/lib/types/album';
import { PaginatedResult } from '@/lib/types/services';
import { getAlbums } from '@/lib/services/albumService';
import { getEntries } from '@/lib/services/entryService';

export type ContentType = 'all' | 'entries' | 'albums';
export type ContentStatus = 'all' | 'draft' | 'published';
export type ContentItem = (Entry | Album) & { type: 'entry' | 'album' };

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface IContentContext {
  // Filter state
  selectedTags: string[];
  contentType: ContentType;
  entryType: FilterableEntryType;
  searchTerm: string;
  status: ContentStatus;

  // Filter actions
  addTag: (tagId: string) => void;
  removeTag: (tagId: string) => void;
  toggleTag: (tagId: string) => void;
  setContentType: (type: ContentType) => void;
  setEntryType: (type: FilterableEntryType) => void;
  setSearchTerm: (term: string) => void;
  setStatus: (status: ContentStatus) => void;
  clearFilters: () => void;

  // SWR/Data state
  content: ContentItem[];
  error: any;
  isLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  mutate: SWRInfiniteResponse<PaginatedResult<ContentItem>>['mutate'];
}

const ContentContext = createContext<IContentContext | undefined>(undefined);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  // --- Filter State ---
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>('all');
  const [entryType, setEntryType] = useState<FilterableEntryType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<ContentStatus>('all');

  // --- Data Fetching Logic (moved from useContent) ---
  const {
    data,
    error,
    isLoading: swrLoading,
    size,
    setSize,
    mutate
  } = useSWRInfinite<PaginatedResult<Entry | Album>>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.hasMore) return null;

      const endpoint = contentType === 'albums' ? '/api/albums' : '/api/entries';
      const params = new URLSearchParams({
        limit: '10',
      });

      const statusQuery = status === 'all' ? (isAdmin ? 'all' : 'published') : status;
      params.set('status', statusQuery);
      
      if (selectedTags.length > 0) {
        params.set('tags', selectedTags.join(','));
      }
      if (searchTerm) {
        params.set('q', searchTerm);
      }
      if (contentType === 'entries' && entryType !== 'all') {
        params.set('type', entryType);
      }
      if (pageIndex > 0 && previousPageData?.lastDocId) {
        params.set('lastDocId', previousPageData.lastDocId);
      }

      return `${endpoint}?${params.toString()}`;
    },
    fetcher
  );

  // --- Derived State ---
  const isLoading = swrLoading && !data;
  const loadingMore = swrLoading && size > 1;
  const paginatedContent = useMemo(() => data?.flatMap(page => page.items) || [], [data]);

  const content = useMemo(() => {
    return paginatedContent.map(item => ({
      ...item,
      type: 'images' in item ? 'album' : 'entry'
    })).sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }, [paginatedContent]);

  const hasMore = data?.[data.length - 1]?.hasMore ?? true;
  
  const loadMore = useCallback(() => {
    if (!swrLoading) {
      setSize(size + 1);
    }
  }, [swrLoading, setSize, size]);

  // --- Filter Actions ---
  const addTag = useCallback((tagId: string) => {
    setSelectedTags(prevTags => [...new Set([...prevTags, tagId])]);
  }, []);

  const removeTag = useCallback((tagId: string) => {
    setSelectedTags(prevTags => prevTags.filter(t => t !== tagId));
  }, []);

  const toggleTag = useCallback((tagId:string) => {
    setSelectedTags(prevTags => {
      const newTags = new Set(prevTags);
      if (newTags.has(tagId)) {
        newTags.delete(tagId);
      } else {
        newTags.add(tagId);
      }
      return Array.from(newTags);
    });
  }, []);

  const handleSetContentType = useCallback((type: ContentType) => {
    setContentType(type);
    if (type !== 'entries') {
      setEntryType('all');
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setContentType('all');
    setEntryType('all');
    setSearchTerm('');
    setStatus('all');
  }, []);

  const value = useMemo(() => ({
    selectedTags,
    contentType,
    entryType,
    searchTerm,
    status,
    addTag,
    removeTag,
    toggleTag,
    setContentType: handleSetContentType,
    setEntryType,
    setSearchTerm,
    setStatus,
    clearFilters,
    content,
    error,
    isLoading,
    loadingMore,
    hasMore,
    loadMore,
    mutate
  }), [
    selectedTags, contentType, entryType, searchTerm, status, addTag, removeTag, toggleTag, handleSetContentType, setEntryType, setSearchTerm, setStatus, clearFilters,
    content, error, isLoading, loadingMore, hasMore, loadMore, mutate
  ]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};

export const useContentContext = (): IContentContext => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContentContext must be used within a ContentProvider');
  }
  return context;
}; 
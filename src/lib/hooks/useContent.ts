'use client';

import { useMemo } from 'react';
import { useContentContext } from '@/components/providers/ContentProvider';
import { Entry } from '@/lib/types/entry';
import { Album } from '@/lib/types/album';

export type ContentItem = (Entry | Album) & { type: 'entry' | 'album' };

export function useContent() {
  const { 
    content, 
    loading, 
    loadingMore, 
    error, 
    hasMore, 
    loadMore 
  } = useContentContext();

  return useMemo(() => ({
    content,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  }), [content, loading, loadingMore, error, hasMore, loadMore]);
} 
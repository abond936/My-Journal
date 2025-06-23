'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWRInfinite, { SWRInfiniteResponse } from 'swr/infinite';
import { usePathname } from 'next/navigation';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';
import { useTag } from './TagProvider';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export type CardFilterType = 'all' | 'story' | 'qa' | 'quote' | 'callout' | 'gallery';
export type CardStatus = 'all' | 'draft' | 'published';

export interface ICardContext {
  // Filter state
  selectedTags: string[];
  cardType: CardFilterType;
  searchTerm: string;
  status: CardStatus;

  // Filter actions
  toggleTag: (tagId: string) => void;
  setCardType: (type: CardFilterType) => void;
  setSearchTerm: (term: string) => void;
  setStatus: (status: CardStatus) => void;
  clearFilters: () => void;
  setPageLimit: (limit: number) => void;
  
  // Data state
  cards: Card[];
  error: any;
  isLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  mutate: SWRInfiniteResponse<PaginatedResult<Card>>['mutate'];
  isValidating: boolean;
}

const CardContext = createContext<ICardContext | undefined>(undefined);

interface CardProviderProps {
  children: ReactNode;
  collectionId?: string; // For TOC/Curated view
}

export const CardProvider = ({ children, collectionId }: CardProviderProps) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const pathname = usePathname();

  // --- Global Filter State ---
  const { selectedFilterTagIds, setFilterTags } = useTag();

  // --- Local Filter State ---
  const [cardType, setCardType] = useState<CardFilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<CardStatus>(isAdmin ? 'all' : 'published');
  const [pageLimit, setPageLimit] = useState(20); // Default limit for cards
  
  // Define which paths should trigger card fetching
  const activePaths = ['/view', '/admin/card-admin', '/search'];
  const isFetchActive = activePaths.some(path => pathname.startsWith(path));

  const {
    data,
    error,
    isLoading: swrLoading,
    size,
    setSize,
    mutate,
    isValidating,
  } = useSWRInfinite<PaginatedResult<Card>>(
    (pageIndex, previousPageData) => {
      // Stop fetching if we're not on an active path
      if (!isFetchActive) return null;

      // Handle end of data for pagination
      if (previousPageData && !previousPageData.hasMore) return null;

      // TODO: Implement collectionId fetching logic here
      if (collectionId) {
        // This will be implemented next. For now, it does nothing.
        return null; 
      }

      // --- Build Query for Filtered Card List ---
      const endpoint = '/api/cards';
      const params = new URLSearchParams({
        limit: String(pageLimit),
      });
      
      params.set('status', status);
        
      if (selectedFilterTagIds && selectedFilterTagIds.length > 0) {
        params.set('tags', selectedFilterTagIds.join(','));
      }
      if (searchTerm && searchTerm.trim() !== '') {
        params.set('q', searchTerm);
      }
      if (cardType && cardType !== 'all') {
        params.set('type', cardType);
      }
      
      if (pageIndex > 0 && previousPageData?.lastDocId) {
        params.set('lastDocId', previousPageData.lastDocId);
      }

      return `${endpoint}?${params.toString()}`;
    },
    fetcher,
    { revalidateFirstPage: false }
  );

  // --- Derived State ---
  const isLoading = swrLoading && !data;
  const loadingMore = swrLoading && size > 1;
  const cards = useMemo(() => (Array.isArray(data) ? data : []).filter(Boolean).flatMap(page => page.items) || [], [data]);
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;
  
  const loadMore = useCallback(() => {
    if (!swrLoading && hasMore) {
      setSize(size + 1);
    }
  }, [swrLoading, setSize, size, hasMore]);
  
    // --- Filter Actions ---
  const toggleTag = useCallback((tagId:string) => {
    const newTags = new Set(selectedFilterTagIds);
    if (newTags.has(tagId)) {
      newTags.delete(tagId);
    } else {
      newTags.add(tagId);
    }
    setFilterTags(Array.from(newTags));
  }, [selectedFilterTagIds, setFilterTags]);

  const clearFilters = useCallback(() => {
    setFilterTags([]);
    setCardType('all');
    setSearchTerm('');
    setStatus(isAdmin ? 'all' : 'published');
  }, [isAdmin, setFilterTags]);

  const value = useMemo(() => ({
    // State
    cards,
    error,
    isLoading,
    loadingMore,
    hasMore,
    selectedTags: selectedFilterTagIds,
    cardType,
    searchTerm,
    status,
    isValidating,
    // Actions
    loadMore,
    mutate,
    toggleTag,
    setCardType,
    setSearchTerm,
    setStatus,
    clearFilters,
    setPageLimit,
  }), [
    cards, error, isLoading, loadingMore, hasMore, selectedFilterTagIds, cardType, searchTerm, status, isValidating,
    loadMore, mutate, toggleTag, setCardType, setSearchTerm, setStatus, clearFilters, setPageLimit,
  ]);

  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
};

export const useCardContext = (): ICardContext => {
  const context = useContext(CardContext);
  if (context === undefined) {
    throw new Error('useCardContext must be used within a CardProvider');
  }
  return context;
}; 
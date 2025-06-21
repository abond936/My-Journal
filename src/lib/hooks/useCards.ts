import { useCallback, useMemo, useEffect, useState } from 'react';
import useSWRInfinite, { SWRInfiniteKeyLoader } from 'swr/infinite';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';

const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error: Error & { info?: any; status?: number } = new Error(
      'An error occurred while fetching the data.'
    );
    // Attach extra info to the error object.
    try {
      error.info = await res.json();
    } catch (e) {
      // If the response body is not valid JSON
      error.info = { message: await res.text() };
    }
    error.status = res.status;
    throw error;
  }

  return res.json();
};

const SESSION_STORAGE_KEY = 'cardAdminState';
const UPDATED_CARD_KEY = 'updatedCardState';

interface UseCardsOptions {
  searchTerm?: string;
  status?: Card['status'] | 'all';
  type?: Card['type'] | 'all';
  tags?: string[];
  limit?: number;
}

export function useCards({
  searchTerm = '',
  status = 'all',
  type = 'all',
  tags,
  limit = 50,
}: UseCardsOptions) {

  const getKey: SWRInfiniteKeyLoader = (pageIndex, previousPageData: PaginatedResult<Card> | null) => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;

    const params = new URLSearchParams();
    params.set('limit', String(limit));

    // Add filters for all pages
    if (searchTerm) params.set('q', searchTerm);
    if (status !== 'all') params.set('status', status);
    if (type !== 'all') params.set('type', type);
    if (tags && tags.length > 0) params.set('tags', tags.join(','));

    // For the first page, we don't have a cursor
    if (pageIndex === 0) {
        return `/api/cards?${params.toString()}`;
    }

    // For subsequent pages, use the cursor from the previous page
    if (previousPageData?.lastDocId) {
        params.set('lastDocId', previousPageData.lastDocId);
        return `/api/cards?${params.toString()}`;
    }

    // If there's no previous page data and it's not the first page, we can't fetch
    return null;
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<PaginatedResult<Card>>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      // You can add other SWR options here if needed
    }
  );

  const updateCardInCache = useCallback(async (updatedCard: Card) => {
    mutate((currentData) => {
      if (!currentData) return [];
      const newData = currentData.map(page => ({
        ...page,
        items: page.items.map(card => (card.id === updatedCard.id ? updatedCard : card)),
      }));
      return newData;
    }, { revalidate: false });
  }, [mutate]);

  useEffect(() => {
    const savedStateJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const updatedCardJSON = sessionStorage.getItem(UPDATED_CARD_KEY);

    if (savedStateJSON) {
      try {
        let savedData = JSON.parse(savedStateJSON);

        if (updatedCardJSON) {
          const updatedCard = JSON.parse(updatedCardJSON);
          // Apply the single update on top of the restored full state
          savedData = savedData.map((page: PaginatedResult<Card>) => ({
            ...page,
            items: page.items.map(card => 
              card.id === updatedCard.id ? updatedCard : card
            ),
          }));
        }

        mutate(savedData, { revalidate: false });
      } catch (e) {
        console.error("Failed to parse state from sessionStorage", e);
      } finally {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(UPDATED_CARD_KEY);
      }
    }
  }, [mutate]);

  const cards: Card[] = useMemo(() => data ? data.flatMap(page => page.items) : [], [data]);
  const isLoadingInitialData = !data && !error;
  const isLoadingMore =
    isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.items.length === 0;
  const hasMore = useMemo(() => data ? data[data.length - 1]?.hasMore : true, [data]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  }, [isLoadingMore, hasMore, setSize, size]);
  
  const saveStateToSession = useCallback(() => {
    if (data) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  const removeCardFromCache = useCallback(async (cardId: string) => {
    mutate((currentData) => {
      if (!currentData) return [];
      const newData = currentData.map(page => ({
        ...page,
        items: page.items.filter(card => card.id !== cardId),
      }));
      return newData;
    }, { revalidate: false });
  }, [mutate]);


  return {
    cards,
    error,
    isLoading: isLoadingInitialData,
    isLoadingMore,
    isEmpty,
    hasMore,
    size,
    loadMore,
    mutate,
    updateCardInCache,
    removeCardFromCache,
    saveStateToSession,
  };
} 
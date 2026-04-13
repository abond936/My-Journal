'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import useSWRInfinite, { SWRInfiniteResponse } from 'swr/infinite';
import { usePathname } from 'next/navigation';
import { Card } from '@/lib/types/card';

/** Keeps first occurrence of each docId when infinite pages overlap (stable Firestore cursors). */
function dedupeCardsByDocId(cards: Card[]): Card[] {
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const card of cards) {
    const id = card.docId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(card);
  }
  return out;
}
import { PaginatedResult } from '@/lib/types/services';
import { useTag } from './TagProvider';
import { groupCardsForFeed, type FeedGroupBy } from '@/lib/utils/feedGrouping';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export type CardFilterType = 'all' | 'story' | 'qa' | 'quote' | 'callout' | 'gallery';
export type CardStatus = 'all' | 'draft' | 'published';
export type ActiveDimension = 'all' | 'who' | 'what' | 'when' | 'where' | 'collections';

/** Main feed ordering. `random` shuffles cards loaded so far (same pages as newest). */
export type FeedSortOrder = 'newest' | 'oldest' | 'random';

export type { FeedGroupBy };

export interface ICardContext {
  // Filter state
  selectedTags: string[];
  cardType: CardFilterType;
  searchTerm: string;
  status: CardStatus;
  activeDimension: ActiveDimension;
  collectionId: string | null;
  collectionCards: Card[]; // Flat list of collection parent cards
  feedSort: FeedSortOrder;
  feedGroupBy: FeedGroupBy;
  /** Grouped sections for the main feed; null when grouping is off or not applicable. */
  feedSections: { heading: string; cards: Card[] }[] | null;

  // Filter actions
  toggleTag: (tagId: string) => void;
  setCardType: (type: CardFilterType) => void;
  setSearchTerm: (term: string) => void;
  setStatus: (status: CardStatus) => void;
  setActiveDimension: (dim: ActiveDimension) => void;
  setCollectionId: (id: string | null) => void;
  setFeedSort: (order: FeedSortOrder) => void;
  setFeedGroupBy: (g: FeedGroupBy) => void;
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

const DIMENSION_STORAGE_KEY = 'myjournal-active-dimension';
const COLLECTION_STORAGE_KEY = 'myjournal-collection-id';
const FEED_SORT_KEY = 'myjournal-feed-sort';
const FEED_GROUP_KEY = 'myjournal-feed-group';

const FEED_SORT_VALUES = new Set<string>(['newest', 'oldest', 'random']);
const FEED_GROUP_VALUES = new Set<string>(['none', 'who', 'what', 'when', 'where']);

function normalizeStoredActiveDimension(raw: string | null): ActiveDimension {
  if (!raw) return 'all';
  if (raw === 'reflection') return 'what';
  const allowed: ActiveDimension[] = ['all', 'who', 'what', 'when', 'where', 'collections'];
  return (allowed as string[]).includes(raw) ? (raw as ActiveDimension) : 'all';
}

function readStoredFeedSort(): FeedSortOrder {
  if (typeof window === 'undefined') return 'newest';
  const raw = sessionStorage.getItem(FEED_SORT_KEY);
  if (!raw || !FEED_SORT_VALUES.has(raw)) return 'newest';
  return raw as FeedSortOrder;
}

function readStoredFeedGroup(): FeedGroupBy {
  if (typeof window === 'undefined') return 'none';
  const raw = sessionStorage.getItem(FEED_GROUP_KEY);
  if (!raw || !FEED_GROUP_VALUES.has(raw)) return 'none';
  return raw as FeedGroupBy;
}

function shuffleCards<T extends { docId?: string }>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const CardContext = createContext<ICardContext | undefined>(undefined);

interface CardProviderProps {
  children: ReactNode;
}

export const CardProvider = ({ children }: CardProviderProps) => {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const pathname = usePathname();

  // --- Global Filter State ---
  const { selectedFilterTagIds, setFilterTags, tags: allTags } = useTag();

  // --- Local Filter State ---
  const [cardType, setCardType] = useState<CardFilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Default published so pre-session and non-admin requests never send status=all (403 on API).
  const [status, setStatus] = useState<CardStatus>('published');
  const [pageLimit, setPageLimit] = useState(20);
  const [activeDimension, setActiveDimensionState] = useState<ActiveDimension>(() => {
    if (typeof window === 'undefined') return 'all';
    return normalizeStoredActiveDimension(sessionStorage.getItem(DIMENSION_STORAGE_KEY));
  });
  const [collectionId, setCollectionIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(COLLECTION_STORAGE_KEY) || null;
  });
  const [feedSort, setFeedSortState] = useState<FeedSortOrder>(() => readStoredFeedSort());
  const [feedGroupBy, setFeedGroupByState] = useState<FeedGroupBy>(() => readStoredFeedGroup());

  const setFeedSort = useCallback((order: FeedSortOrder) => {
    setFeedSortState(order);
    if (typeof window !== 'undefined') sessionStorage.setItem(FEED_SORT_KEY, order);
  }, []);

  const setFeedGroupBy = useCallback((g: FeedGroupBy) => {
    setFeedGroupByState(g);
    if (typeof window !== 'undefined') sessionStorage.setItem(FEED_GROUP_KEY, g);
  }, []);

  const setActiveDimension = useCallback((dim: ActiveDimension) => {
    setActiveDimensionState(dim);
    if (typeof window !== 'undefined') sessionStorage.setItem(DIMENSION_STORAGE_KEY, dim);
    if (dim !== 'collections') setCollectionIdState(null);
    if (dim !== 'collections' && typeof window !== 'undefined') sessionStorage.removeItem(COLLECTION_STORAGE_KEY);
  }, []);

  const setCollectionId = useCallback((id: string | null) => {
    setCollectionIdState(id);
    if (typeof window !== 'undefined') {
      if (id) sessionStorage.setItem(COLLECTION_STORAGE_KEY, id);
      else sessionStorage.removeItem(COLLECTION_STORAGE_KEY);
    }
  }, []);

  const hasAppliedSessionStatusDefault = useRef(false);
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      hasAppliedSessionStatusDefault.current = false;
      setStatus('published');
      return;
    }
    if (hasAppliedSessionStatusDefault.current) return;
    hasAppliedSessionStatusDefault.current = true;
    setStatus(session?.user?.role === 'admin' ? 'all' : 'published');
  }, [sessionStatus, session?.user?.role]);

  // Define which paths should trigger card fetching
  const activePaths = ['/view', '/admin/card-admin', '/search'];
  const isFetchActive = activePaths.some(path => pathname.startsWith(path));

  // Organize selected tags by dimension
  const dimensionalTags = useMemo(() => {
    if (!selectedFilterTagIds || !allTags) return {};
    
    const dimensionalMap: {
      who?: string[];
      what?: string[];
      when?: string[];
      where?: string[];
    } = {};
    
    selectedFilterTagIds.forEach(tagId => {
      const tag = allTags.find(t => t.docId === tagId);
      if (tag && tag.dimension) {
        const dim = String(tag.dimension) === 'reflection' ? 'what' : tag.dimension;
        if (!dimensionalMap[dim]) {
          dimensionalMap[dim] = [];
        }
        dimensionalMap[dim]!.push(tagId);
      }
    });
    
    return dimensionalMap;
  }, [selectedFilterTagIds, allTags]);

  // Hydration: admin list needs only covers (saves reads); content feed needs full (galleries, content images)
  const needsFullHydration = pathname?.startsWith('/view') || pathname?.startsWith('/search');
  const adminFetcher = useCallback(async (url: string) => {
    const urlObj = new URL(url, window.location.origin);
    if (isAdmin && !needsFullHydration) {
      urlObj.searchParams.set('hydration', 'cover-only');
    }
    const response = await fetch(urlObj.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }, [isAdmin, needsFullHydration]);

  // Fetch collection list when Collections dimension is active with no selection
  const shouldFetchCollections =
    isFetchActive && activeDimension === 'collections' && !collectionId;
  const collectionsUrl = shouldFetchCollections
    ? `/api/cards?collectionsOnly=true&status=${isAdmin ? 'all' : 'published'}${isAdmin && !needsFullHydration ? '&hydration=cover-only' : ''}`
    : null;
  const { data: collectionListData, isLoading: collectionsLoading } = useSWR<{ items: Card[] }>(
    collectionsUrl,
    (url) => {
      const urlObj = new URL(url, window.location.origin);
      if (isAdmin && !needsFullHydration) urlObj.searchParams.set('hydration', 'cover-only');
      return fetch(urlObj.toString()).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))));
    },
    { revalidateOnFocus: false }
  );
  const collectionCards = collectionListData?.items ?? [];

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
      if (!isFetchActive) return null;
      if (previousPageData && !previousPageData.hasMore) return null;

      // Collections dimension with no selection: main feed shows collection list (handled by collectionCards)
      if (activeDimension === 'collections' && !collectionId) return null;

      const endpoint = '/api/cards';
      const params = new URLSearchParams({ limit: String(pageLimit) });
      params.set('status', status);

      // Fetch a specific collection's children
      if (collectionId) {
        params.set('collectionId', collectionId);
        if (pageIndex > 0 && previousPageData?.lastDocId) {
          params.set('lastDocId', previousPageData.lastDocId);
        }
        if (isAdmin && !needsFullHydration) params.set('hydration', 'cover-only');
        return `${endpoint}?${params.toString()}`;
      }

      // Explore / All: normal filtered list
      Object.entries(dimensionalTags).forEach(([dimension, tagIds]) => {
        if (tagIds && tagIds.length > 0) params.set(dimension, tagIds.join(','));
      });
      if (searchTerm?.trim()) params.set('q', searchTerm);
      if (cardType && cardType !== 'all') params.set('type', cardType);
      if (pageIndex > 0 && previousPageData?.lastDocId) params.set('lastDocId', previousPageData.lastDocId);
      if (isAdmin && !needsFullHydration) params.set('hydration', 'cover-only');
      if (!searchTerm?.trim()) {
        params.set('sort', feedSort === 'oldest' ? 'oldest' : 'newest');
      }

      return `${endpoint}?${params.toString()}`;
    },
    adminFetcher,
    { 
      revalidateFirstPage: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: isAdmin ? 0 : 60000, // No deduping for admin, 1 minute for others
      focusThrottleInterval: isAdmin ? 0 : 60000 // No throttling for admin, 1 minute for others
    }
  );

  // --- Derived State ---
  const paginatedCards = useMemo(() => {
    const flat =
      (Array.isArray(data) ? data : []).filter(Boolean).flatMap((page) => page.items) || [];
    return dedupeCardsByDocId(flat);
  }, [data]);
  const orderedPaginatedCards = useMemo(() => {
    if (feedSort !== 'random') return paginatedCards;
    if (collectionId) return paginatedCards;
    return shuffleCards(paginatedCards);
  }, [paginatedCards, feedSort, collectionId]);
  const cards = useMemo(() => {
    if (activeDimension === 'collections' && !collectionId) return collectionCards;
    return orderedPaginatedCards;
  }, [activeDimension, collectionId, collectionCards, orderedPaginatedCards]);

  const tagNameById = useMemo(
    () => new Map(allTags?.filter((t) => t.docId).map((t) => [t.docId!, t.name]) ?? []),
    [allTags]
  );

  const isCollectionsListMode = activeDimension === 'collections' && !collectionId;
  const feedSections = useMemo(() => {
    if (feedGroupBy === 'none' || isCollectionsListMode) return null;
    return groupCardsForFeed(cards, feedGroupBy, tagNameById);
  }, [cards, feedGroupBy, tagNameById, isCollectionsListMode]);
  const isLoading = isCollectionsListMode ? collectionsLoading : (swrLoading && !data);
  const loadingMore = swrLoading && size > 1;
  const hasMore = isCollectionsListMode ? false : (data?.[data.length - 1]?.hasMore ?? false);
  
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
    setCollectionId(null);
    setFeedSort('newest');
    setFeedGroupBy('none');
  }, [isAdmin, setFilterTags, setCollectionId, setFeedSort, setFeedGroupBy]);

  const value = useMemo(
    () => ({
      cards,
      error,
      isLoading,
      loadingMore,
      hasMore,
      selectedTags: selectedFilterTagIds,
      cardType,
      searchTerm,
      status,
      activeDimension,
      collectionId,
      collectionCards,
      feedSort,
      feedGroupBy,
      feedSections,
      loadMore,
      mutate,
      toggleTag,
      setCardType,
      setSearchTerm,
      setStatus,
      setActiveDimension,
      setCollectionId,
      setFeedSort,
      setFeedGroupBy,
      clearFilters,
      setPageLimit,
      isValidating,
    }),
    [
      cards,
      error,
      isLoading,
      loadingMore,
      hasMore,
      selectedFilterTagIds,
      cardType,
      searchTerm,
      status,
      activeDimension,
      collectionId,
      collectionCards,
      feedSort,
      feedGroupBy,
      feedSections,
      loadMore,
      mutate,
      toggleTag,
      setCardType,
      setSearchTerm,
      setStatus,
      setActiveDimension,
      setCollectionId,
      setFeedSort,
      setFeedGroupBy,
      clearFilters,
      setPageLimit,
      isValidating,
    ]
  );

  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
};

export const useCardContext = (): ICardContext => {
  const context = useContext(CardContext);
  if (context === undefined) {
    throw new Error('useCardContext must be used within a CardProvider');
  }
  return context;
}; 
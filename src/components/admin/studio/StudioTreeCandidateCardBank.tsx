'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { FilterX, X } from 'lucide-react';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import { useTag } from '@/components/providers/TagProvider';
import BulkEditTagsModal from '@/components/admin/studio/cards/BulkEditTagsModal';
import CardAdminGrid from '@/components/admin/studio/cards/CardAdminGrid';
import EditModal from '@/components/admin/studio/cards/EditModal';
import AdminDimensionalTagFilter from '@/components/admin/common/AdminDimensionalTagFilter';
import DebouncedSearchInput from '@/components/admin/common/DebouncedSearchInput';
import AdminTileSizeControl from '@/components/admin/common/AdminTileSizeControl';
import type { EmbeddedUnparentedBankContext } from '@/components/admin/collections/embeddedUnparentedBankContext';
import {
  listCuratedTreeAttachCandidates,
} from '@/lib/utils/curatedTreeAttachCandidates';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { buildParentIdsByChild } from '@/lib/utils/curatedCollectionTree';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import { Card } from '@/lib/types/card';
import {
  buildBulkCardDeletePrompt,
  buildSingleCardDeletePrompt,
  fetchCardDeleteParents,
} from '@/lib/utils/cardDeleteWarnings';
import {
  DIMENSION_KEYS,
  type DimensionalTagIdMap,
  dimensionalTagMapHasFilters,
  groupSelectedTagIdsByDimension,
} from '@/lib/utils/tagUtils';
import { applyModifierSelection } from '@/lib/utils/adminListSelection';
import { cardMatchesCodificationFilter } from '@/lib/utils/cardCodification';
import cardAdminStyles from '@/components/admin/studio/cards/studioCardsShell.module.css';
import { mergeStudioCatalogCard, toStudioCatalogCard } from '@/components/admin/studio/studioCardProjection';
import type { StudioSelectedPreview } from '@/components/admin/studio/studioCardTypes';
import {
  DEFAULT_ADMIN_DIMENSION_FILTERS,
  DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES,
  readStoredStudioCardBankLocalFilterPreferences,
  writeStoredStudioCardBankLocalFilterPreferences,
  type AdminTagFilterScope,
  type AdminDimensionFilterMode,
  type AdminDimensionFilterState,
  type StudioCardBankCodificationFilter,
} from '@/lib/preferences/adminFilters';
import styles from './StudioTreeCandidateCardBank.module.css';

type CandidateSort = 'titleAsc' | 'titleDesc' | 'createdDesc' | 'createdAsc';
type DimensionKey = 'who' | 'what' | 'when' | 'where';

type CardTypeFilter = 'all' | NonNullable<Card['type']>;
type DisplayModeFilter = 'all' | NonNullable<Card['displayMode']>;
type CatalogOverrideMap = Record<string, Card | null>;

function cardDisplayMode(card: Card): NonNullable<Card['displayMode']> {
  return card.displayMode ?? 'navigate';
}

function cardMatchesOnCardDimensionalMap(
  card: Card,
  dt: DimensionalTagIdMap,
  tagFilterScope: AdminTagFilterScope
): boolean {
  if (!dimensionalTagMapHasFilters(dt)) return true;
  for (const dim of DIMENSION_KEYS) {
    const selected = dt[dim];
    if (!selected?.length) continue;
    const idsOnCard = (card[dim] as string[] | undefined) ?? [];
    const ok = selected.some((tid) =>
      tagFilterScope === 'subject'
        ? Boolean(card.subjectFilterTags?.[tid])
        : idsOnCard.includes(tid)
    );
    if (!ok) return false;
  }
  return true;
}

function cardHasSubjectInDimension(card: Card, dimension: DimensionKey): boolean {
  return Boolean(card.subjectTagId && ((card[dimension] as string[] | undefined) ?? []).includes(card.subjectTagId));
}

function applyCatalogOverrides(catalog: Card[], overrides: CatalogOverrideMap): Card[] {
  if (Object.keys(overrides).length === 0) return catalog;
  const byId = new Map<string, Card>();
  for (const card of catalog) {
    if (card.docId) byId.set(card.docId, card);
  }
  for (const [cardId, card] of Object.entries(overrides)) {
    if (!card) {
      byId.delete(cardId);
      continue;
    }
    byId.set(cardId, card);
  }
  return Array.from(byId.values());
}

function shouldRefreshWorkspaceQueryAfterCardUpdate(updateData: Partial<Card>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(updateData, 'title') ||
    Object.prototype.hasOwnProperty.call(updateData, 'status') ||
    Object.prototype.hasOwnProperty.call(updateData, 'type') ||
    Object.prototype.hasOwnProperty.call(updateData, 'displayMode') ||
    Object.prototype.hasOwnProperty.call(updateData, 'tags') ||
    Object.prototype.hasOwnProperty.call(updateData, 'subjectTagId') ||
    Object.prototype.hasOwnProperty.call(updateData, 'who') ||
    Object.prototype.hasOwnProperty.call(updateData, 'what') ||
    Object.prototype.hasOwnProperty.call(updateData, 'when') ||
    Object.prototype.hasOwnProperty.call(updateData, 'where') ||
    Object.prototype.hasOwnProperty.call(updateData, 'childrenIds') ||
    Object.prototype.hasOwnProperty.call(updateData, 'isCollectionRoot') ||
    Object.prototype.hasOwnProperty.call(updateData, 'collectionRootOrder')
  );
}

function shouldRefreshCollectionsStructureAfterCardUpdate(updateData: Partial<Card>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(updateData, 'childrenIds') ||
    Object.prototype.hasOwnProperty.call(updateData, 'isCollectionRoot') ||
    Object.prototype.hasOwnProperty.call(updateData, 'collectionRootOrder')
  );
}

function shouldRefreshTagCountsAfterCardUpdate(updateData: Partial<Card>): boolean {
  return Object.prototype.hasOwnProperty.call(updateData, 'tags') ||
    Object.prototype.hasOwnProperty.call(updateData, 'status');
}

type StudioTreeCandidateCardBankProps = EmbeddedUnparentedBankContext & {
  autoSelectFirstCard?: boolean;
  registerCatalogRemove?: ((fn: ((cardId: string) => void) | null) => void) | undefined;
  registerDeleteFallbackResolver?:
    | ((fn: ((deletedCardId: string) => StudioSelectedPreview | null) | null) => void)
    | undefined;
};

export default function StudioTreeCandidateCardBank(props: StudioTreeCandidateCardBankProps) {
  const {
    refreshStructure,
    upsertCard,
    collectionCards,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    onSelectCard: onStudioSelectCard,
    saving,
    curatedTreeDnd,
    autoSelectFirstCard = false,
    registerCatalogRemove,
    registerDeleteFallbackResolver,
  } = props;

  const { selectedLoadState, notifyQuestionCardDeleted, removeCollectionsCardStructure } = useStudioShell();
  const { active } = useDndContext();
  const feedback = useAppFeedback();
  const {
    tags: allTags,
    studioCardFilterTagIds: filterTagIds,
    setStudioCardFilterTagIds: setFilterTagIds,
    studioCardFiltersHydrated,
    mutate: mutateTags,
  } = useTag();
  const initialLocalFilterPrefsRef = useRef(readStoredStudioCardBankLocalFilterPreferences());
  const [workspaceCards, setWorkspaceCards] = useState<Card[]>([]);
  const [catalogOverrides, setCatalogOverrides] = useState<CatalogOverrideMap>({});
  const [workspaceQueryRefreshTick, setWorkspaceQueryRefreshTick] = useState(0);
  const [loadingWorkspaceCards, setLoadingWorkspaceCards] = useState(true);
  const [bulkSelectedCardIds, setBulkSelectedCardIds] = useState<Set<string>>(() => new Set());
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState<CandidateSort>('titleAsc');
  const [tagFilterScope, setTagFilterScope] = useState<AdminTagFilterScope>(
    initialLocalFilterPrefsRef.current.tagFilterScope
  );
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>(initialLocalFilterPrefsRef.current.typeFilter);
  const [displayModeFilter, setDisplayModeFilter] = useState<DisplayModeFilter>(
    initialLocalFilterPrefsRef.current.displayModeFilter
  );
  const [codificationFilter, setCodificationFilter] = useState<StudioCardBankCodificationFilter>(
    initialLocalFilterPrefsRef.current.codificationFilter
  );
  const [dimensionFilters, setDimensionFilters] = useState<AdminDimensionFilterState>(
    initialLocalFilterPrefsRef.current.dimensionFilters
  );
  const [gridTileMinPx, setGridTileMinPx] = useState(initialLocalFilterPrefsRef.current.gridTileMinPx);
  const [isStreamingMore, setIsStreamingMore] = useState(false);
  const [workspaceHasMore, setWorkspaceHasMore] = useState(false);
  const [workspaceLastDocId, setWorkspaceLastDocId] = useState<string | undefined>(undefined);
  const [workspaceLoadMoreError, setWorkspaceLoadMoreError] = useState<string | null>(null);
  const [pendingFocusCardId, setPendingFocusCardId] = useState<string | null>(null);
  const [deleteConfirmCard, setDeleteConfirmCard] = useState<Card | null>(null);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState('');
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const deferredFilterTagIds = useDeferredValue(filterTagIds);
  const deferredTypeFilter = useDeferredValue(typeFilter);
  const deferredDisplayModeFilter = useDeferredValue(displayModeFilter);
  const deferredCodificationFilter = useDeferredValue(codificationFilter);
  const deferredDimensionFilters = useDeferredValue(dimensionFilters);
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const deferredSortMode = useDeferredValue(sortMode);
  const trimmedSearch = search.trim();
  const dragActiveRef = useRef(false);
  const workspaceRequestIdRef = useRef(0);
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const autoSelectedCardIdRef = useRef<string | null>(null);

  const WORKSPACE_INITIAL_PAGE_SIZE = 100;

  useEffect(() => {
    dragActiveRef.current = Boolean(active);
  }, [active]);

  useEffect(() => {
    if (!studioCardFiltersHydrated) return;
    writeStoredStudioCardBankLocalFilterPreferences({
      typeFilter,
      displayModeFilter,
      codificationFilter,
      filterTagIds,
      tagFilterScope,
      dimensionFilters,
      gridTileMinPx,
    });
  }, [codificationFilter, dimensionFilters, displayModeFilter, filterTagIds, gridTileMinPx, studioCardFiltersHydrated, tagFilterScope, typeFilter]);

  // Workspace query owner: the Studio card bank owns a server-shaped card query
  // rather than filtering a large local mega-catalog. Results still append in
  // stable chunks so the pane keeps its growing-list behavior, but the server
  // now shapes the active card universe by the current workspace filters/sort.
  useEffect(() => {
    let cancelled = false;
    const requestId = ++workspaceRequestIdRef.current;
    const isCurrent = () => workspaceRequestIdRef.current === requestId;
    setLoadingWorkspaceCards(true);
    setIsStreamingMore(false);
    setWorkspaceHasMore(false);
    setWorkspaceLastDocId(undefined);
    setWorkspaceLoadMoreError(null);

    (async () => {
      const params = new URLSearchParams({
        limit: String(WORKSPACE_INITIAL_PAGE_SIZE),
        status: deferredStatusFilter,
        hydration: 'cover-only',
        searchScope: 'admin-title',
      });
      const trimmedSearch = deferredSearch.trim();
      if (trimmedSearch) params.set('q', trimmedSearch);
      if (deferredTypeFilter !== 'all') params.set('type', deferredTypeFilter);
      if (deferredDisplayModeFilter !== 'all') params.set('displayMode', deferredDisplayModeFilter);
      if (deferredCodificationFilter !== 'all') params.set('codification', deferredCodificationFilter);
      const sortMap: Record<CandidateSort, { sortBy: string; sortDir: 'asc' | 'desc' }> = {
        titleAsc: { sortBy: 'title', sortDir: 'asc' },
        titleDesc: { sortBy: 'title', sortDir: 'desc' },
        createdDesc: { sortBy: 'created', sortDir: 'desc' },
        createdAsc: { sortBy: 'created', sortDir: 'asc' },
      };
      const sort = sortMap[deferredSortMode];
      params.set('sortBy', sort.sortBy);
      params.set('sortDir', sort.sortDir);
      for (const dimension of DIMENSION_KEYS) {
        const state = deferredDimensionFilters[dimension];
        if (state.mode === 'matches' && state.tagId) {
          params.set(`exact${dimension.charAt(0).toUpperCase()}${dimension.slice(1)}`, state.tagId);
        } else if (state.mode === 'isEmpty') {
          params.set(`${dimension}Missing`, 'true');
        } else if (state.mode === 'hasAny') {
          params.set(`${dimension}Present`, 'true');
        }
      }
      const groupedFilterTagIds = groupSelectedTagIdsByDimension(deferredFilterTagIds, allTags ?? []);
      for (const dimension of DIMENSION_KEYS) {
        const selected = groupedFilterTagIds[dimension];
        if (selected?.length) {
          params.set(dimension, selected.join(','));
        }
      }
      const hasScopedDimensionRules = Array.from(DIMENSION_KEYS).some(
        (dimension) => deferredDimensionFilters[dimension].mode !== 'any'
      );
      if (
        tagFilterScope === 'subject' &&
        (dimensionalTagMapHasFilters(groupedFilterTagIds) || hasScopedDimensionRules)
      ) {
        params.set('tagScope', 'subject');
      }

      let pageData: { items?: Card[]; hasMore?: boolean; lastDocId?: string } = {};
      let ok = false;
      try {
        const res = await fetch(`/api/cards?${params.toString()}`);
        ok = res.ok;
        if (ok) pageData = (await res.json().catch(() => ({}))) as typeof pageData;
      } catch {
        ok = false;
      }
      if (cancelled || !isCurrent()) return;
      if (!ok) {
        setLoadingWorkspaceCards(false);
        setWorkspaceHasMore(false);
        return;
      }

      const items = Array.isArray(pageData.items) ? pageData.items : [];
      const nextCards: Card[] = [];
      const seen = new Set<string>();
      for (const item of items) {
        if (item.docId && !seen.has(item.docId)) {
          nextCards.push(toStudioCatalogCard(item));
          seen.add(item.docId);
        }
      }

      setCatalogOverrides({});
      setWorkspaceCards(nextCards);
      setWorkspaceHasMore(Boolean(pageData.hasMore && items.length > 0));
      setWorkspaceLastDocId(pageData.lastDocId);
      setLoadingWorkspaceCards(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    allTags,
    deferredDimensionFilters,
    deferredCodificationFilter,
    deferredDisplayModeFilter,
    deferredFilterTagIds,
    deferredSearch,
    deferredSortMode,
    deferredStatusFilter,
    deferredTypeFilter,
    tagFilterScope,
    workspaceQueryRefreshTick,
  ]);

  const loadMoreWorkspaceCards = useCallback(async () => {
    if (loadingWorkspaceCards || isStreamingMore || !workspaceHasMore || !workspaceLastDocId) return;
    const requestId = workspaceRequestIdRef.current;
    const isCurrent = () => workspaceRequestIdRef.current === requestId;

    const waitForStableDragSurface = async () => {
      while (dragActiveRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (!isCurrent()) return false;
      }
      return true;
    };

    setIsStreamingMore(true);
    setWorkspaceLoadMoreError(null);

    const params = new URLSearchParams({
      limit: String(WORKSPACE_INITIAL_PAGE_SIZE),
      status: deferredStatusFilter,
      hydration: 'cover-only',
      searchScope: 'admin-title',
      lastDocId: workspaceLastDocId,
    });
    const trimmedSearch = deferredSearch.trim();
    if (trimmedSearch) params.set('q', trimmedSearch);
    if (deferredTypeFilter !== 'all') params.set('type', deferredTypeFilter);
    if (deferredDisplayModeFilter !== 'all') params.set('displayMode', deferredDisplayModeFilter);
    if (deferredCodificationFilter !== 'all') params.set('codification', deferredCodificationFilter);
    const sortMap: Record<CandidateSort, { sortBy: string; sortDir: 'asc' | 'desc' }> = {
      titleAsc: { sortBy: 'title', sortDir: 'asc' },
      titleDesc: { sortBy: 'title', sortDir: 'desc' },
      createdDesc: { sortBy: 'created', sortDir: 'desc' },
      createdAsc: { sortBy: 'created', sortDir: 'asc' },
    };
    const sort = sortMap[deferredSortMode];
    params.set('sortBy', sort.sortBy);
    params.set('sortDir', sort.sortDir);
    for (const dimension of DIMENSION_KEYS) {
      const state = deferredDimensionFilters[dimension];
      if (state.mode === 'matches' && state.tagId) {
        params.set(`exact${dimension.charAt(0).toUpperCase()}${dimension.slice(1)}`, state.tagId);
      } else if (state.mode === 'isEmpty') {
        params.set(`${dimension}Missing`, 'true');
      } else if (state.mode === 'hasAny') {
        params.set(`${dimension}Present`, 'true');
      }
    }
    const groupedFilterTagIds = groupSelectedTagIdsByDimension(deferredFilterTagIds, allTags ?? []);
    for (const dimension of DIMENSION_KEYS) {
      const selected = groupedFilterTagIds[dimension];
      if (selected?.length) {
        params.set(dimension, selected.join(','));
      }
    }
    const hasScopedDimensionRules = Array.from(DIMENSION_KEYS).some(
      (dimension) => deferredDimensionFilters[dimension].mode !== 'any'
    );
    if (
      tagFilterScope === 'subject' &&
      (dimensionalTagMapHasFilters(groupedFilterTagIds) || hasScopedDimensionRules)
    ) {
      params.set('tagScope', 'subject');
    }

    try {
      const res = await fetch(`/api/cards?${params.toString()}`);
      if (!isCurrent()) return;
      if (!res.ok) {
        setWorkspaceLoadMoreError('Failed to load more cards.');
        return;
      }
      const pageData = (await res.json().catch(() => ({}))) as {
        items?: Card[];
        hasMore?: boolean;
        lastDocId?: string;
      };
      if (!isCurrent()) return;
      const canApply = await waitForStableDragSurface();
      if (!canApply || !isCurrent()) return;

      const items = Array.isArray(pageData.items) ? pageData.items : [];
      setWorkspaceCards((current) => {
        if (items.length === 0) return current;
        const seen = new Set(current.map((entry) => entry.docId).filter(Boolean));
        const appended = items
          .filter((item) => item.docId && !seen.has(item.docId))
          .map((item) => toStudioCatalogCard(item));
        if (appended.length === 0) return current;
        return [...current, ...appended];
      });
      setWorkspaceHasMore(Boolean(pageData.hasMore && items.length > 0));
      setWorkspaceLastDocId(pageData.lastDocId);
    } catch {
      if (!isCurrent()) return;
      setWorkspaceLoadMoreError('Failed to load more cards.');
    } finally {
      if (isCurrent()) {
        setIsStreamingMore(false);
      }
    }
  }, [
    allTags,
    deferredCodificationFilter,
    deferredDimensionFilters,
    deferredDisplayModeFilter,
    deferredFilterTagIds,
    deferredSearch,
    deferredSortMode,
    deferredStatusFilter,
    deferredTypeFilter,
    isStreamingMore,
    loadingWorkspaceCards,
    tagFilterScope,
    workspaceHasMore,
    workspaceLastDocId,
  ]);

  useEffect(() => {
    const root = resultsScrollRef.current;
    const node = loadMoreSentinelRef.current;
    if (!root || !node || !workspaceHasMore || loadingWorkspaceCards || isStreamingMore || workspaceLoadMoreError) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        void loadMoreWorkspaceCards();
      },
      { root, rootMargin: '1200px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    isStreamingMore,
    loadMoreWorkspaceCards,
    loadingWorkspaceCards,
    workspaceHasMore,
    workspaceLoadMoreError,
  ]);

  useEffect(() => {
    if (selectedLoadState === 'loading') return;
    setPendingFocusCardId(null);
  }, [selectedLoadState]);

  const onCardTagDimensionalMap = useMemo(
    () => groupSelectedTagIdsByDimension(deferredFilterTagIds, allTags ?? []),
    [deferredFilterTagIds, allTags]
  );

  const matchesFilters = useCallback(
    (card: Card) => {
      const q = deferredSearch.trim().toLowerCase();
      if (q && !(card.title || '').toLowerCase().includes(q)) return false;
      if (deferredTypeFilter !== 'all' && card.type !== deferredTypeFilter) return false;
      if (deferredDisplayModeFilter !== 'all' && cardDisplayMode(card) !== deferredDisplayModeFilter) return false;
      if (!cardMatchesCodificationFilter(card, deferredCodificationFilter)) return false;
      if (!cardMatchesOnCardDimensionalMap(card, onCardTagDimensionalMap, tagFilterScope)) return false;
      for (const dimension of DIMENSION_KEYS) {
        const state = deferredDimensionFilters[dimension];
        const ids = Array.isArray(card[dimension]) ? (card[dimension] as string[]) : [];
        if (state.mode === 'any') continue;
        if (tagFilterScope === 'subject') {
          const hasSubjectInDimension = cardHasSubjectInDimension(card, dimension);
          if (state.mode === 'hasAny' && !hasSubjectInDimension) return false;
          if (state.mode === 'isEmpty' && hasSubjectInDimension) return false;
          if (state.mode === 'matches' && state.tagId && !card.subjectFilterTags?.[state.tagId]) return false;
          continue;
        }
        if (state.mode === 'hasAny' && ids.length === 0) return false;
        if (state.mode === 'isEmpty' && ids.length > 0) return false;
        if (state.mode === 'matches' && state.tagId && !ids.includes(state.tagId)) return false;
      }
      return true;
    },
    [
      deferredSearch,
      deferredTypeFilter,
      deferredDisplayModeFilter,
      deferredCodificationFilter,
      onCardTagDimensionalMap,
      deferredDimensionFilters,
      tagFilterScope,
    ]
  );

  const handleClearAllFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setSortMode('titleAsc');
    setTypeFilter('all');
    setDisplayModeFilter('all');
    setCodificationFilter('all');
    setFilterTagIds([]);
    setTagFilterScope('all');
    setDimensionFilters(DEFAULT_ADMIN_DIMENSION_FILTERS);
    setBulkSelectedCardIds(new Set());
  }, [setFilterTagIds, setSearch, setStatusFilter]);

  const updateDimensionFilter = useCallback(
    (dimension: DimensionKey, patch: Partial<{ mode: AdminDimensionFilterMode; tagId: string }>) => {
      setDimensionFilters((prev) => ({
        ...prev,
        [dimension]: {
          ...prev[dimension],
          ...patch,
        },
      }));
    },
    []
  );

  const collectionCardsById = useMemo(
    () => new Map(collectionCards.filter((card) => card.docId).map((card) => [card.docId!, card])),
    [collectionCards]
  );

  const mergedWorkspaceCards = useMemo(() => {
    const cardsWithPropMerges = workspaceCards.map((card) => {
      const fromCollections = card.docId ? collectionCardsById.get(card.docId) : null;
      return fromCollections ? mergeStudioCatalogCard(card, fromCollections) : card;
    });
    return applyCatalogOverrides(cardsWithPropMerges, catalogOverrides);
  }, [catalogOverrides, collectionCardsById, workspaceCards]);
  const deferredMergedWorkspaceCards = useDeferredValue(mergedWorkspaceCards);

  const upsertCatalogCard = useCallback((card: Card) => {
    if (!card.docId) return;
    setWorkspaceCards((current) => {
      const index = current.findIndex((entry) => entry.docId === card.docId);
      if (index === -1) return [toStudioCatalogCard(card), ...current];
      const next = [...current];
      next[index] = mergeStudioCatalogCard(toStudioCatalogCard(next[index]), card);
      return next;
    });
    setCatalogOverrides((current) => ({
      ...current,
      [card.docId!]: toStudioCatalogCard(card),
    }));
  }, []);

  const removeCatalogCard = useCallback((cardId: string) => {
    setWorkspaceCards((current) => current.filter((entry) => entry.docId !== cardId));
    setCatalogOverrides((current) => ({
      ...current,
      [cardId]: null,
    }));
  }, []);

  useEffect(() => {
    registerCatalogRemove?.(removeCatalogCard);
    return () => registerCatalogRemove?.(null);
  }, [registerCatalogRemove, removeCatalogCard]);

  const candidateCards = useMemo(() => {
    const raw = listCuratedTreeAttachCandidates(deferredMergedWorkspaceCards, {
      matchesFilters,
      statusFilter: deferredStatusFilter,
    });
    const base = [...raw];
    base.sort((a, b) => {
      switch (deferredSortMode) {
        case 'titleDesc':
          return (b.title || '').localeCompare(a.title || '', undefined, { sensitivity: 'base' });
        case 'createdDesc':
          return (b.createdAt ?? 0) - (a.createdAt ?? 0);
        case 'createdAsc':
          return (a.createdAt ?? 0) - (b.createdAt ?? 0);
        default:
          return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
      }
    });
    const selectedCard =
      props.selectedCardId
        ? collectionCardsById.get(props.selectedCardId) ?? null
        : null;
    if (!selectedCard?.docId) return base;
    if (deferredStatusFilter !== 'all' && (selectedCard.status ?? 'draft') !== deferredStatusFilter) return base;
    if (!matchesFilters(selectedCard)) return base;
    if (base.some((card) => card.docId === selectedCard.docId)) return base;
    return [selectedCard, ...base];
  }, [collectionCardsById, deferredMergedWorkspaceCards, matchesFilters, deferredStatusFilter, deferredSortMode, props.selectedCardId]);

  useEffect(() => {
    if (props.selectedCardId) {
      autoSelectedCardIdRef.current = props.selectedCardId;
    }
  }, [props.selectedCardId]);

  useEffect(() => {
    if (!autoSelectFirstCard) return;
    if (props.selectedCardId) return;
    if (loadingWorkspaceCards) return;
    const firstCandidate = candidateCards.find((card) => card.docId);
    if (!firstCandidate?.docId) return;
    if (autoSelectedCardIdRef.current === firstCandidate.docId) return;
    autoSelectedCardIdRef.current = firstCandidate.docId;
    onStudioSelectCard(firstCandidate.docId, firstCandidate);
  }, [autoSelectFirstCard, candidateCards, loadingWorkspaceCards, onStudioSelectCard, props.selectedCardId]);

  const resolveDeleteFallback = useCallback(
    (deletedCardId: string): StudioSelectedPreview | null => {
      const deletedIndex = candidateCards.findIndex((card) => card.docId === deletedCardId);
      if (deletedIndex === -1) {
        const firstRemaining = candidateCards.find((card) => card.docId && card.docId !== deletedCardId);
        return firstRemaining ? toStudioCatalogCard(firstRemaining) : null;
      }
      for (let index = deletedIndex + 1; index < candidateCards.length; index += 1) {
        const nextCard = candidateCards[index];
        if (nextCard?.docId && nextCard.docId !== deletedCardId) {
          return toStudioCatalogCard(nextCard);
        }
      }
      for (let index = deletedIndex - 1; index >= 0; index -= 1) {
        const previousCard = candidateCards[index];
        if (previousCard?.docId && previousCard.docId !== deletedCardId) {
          return toStudioCatalogCard(previousCard);
        }
      }
      return null;
    },
    [candidateCards]
  );

  useEffect(() => {
    registerDeleteFallbackResolver?.(resolveDeleteFallback);
    return () => registerDeleteFallbackResolver?.(null);
  }, [registerDeleteFallbackResolver, resolveDeleteFallback]);

  const parentIdsByChild = useMemo(
    () => buildParentIdsByChild(collectionCards),
    [collectionCards]
  );

  const titleById = useMemo(
    () =>
      new Map(
        collectionCards
          .filter((card) => card.docId)
          .map((card) => [card.docId!, card.title?.trim() || 'Untitled'] as const)
      ),
    [collectionCards]
  );

  const collectionStateMetaById = useMemo(() => {

    return new Map(
      collectionCards
        .filter((card) => card.docId)
        .map((card) => {
          const parentIds = parentIdsByChild.get(card.docId!) ?? [];
          const childCount = card.childrenIds?.length ?? 0;
          const labelParts: string[] = [];
          if (card.isCollectionRoot === true) labelParts.push('Root');
          if (parentIds.length > 0 || childCount > 0) labelParts.push(`${parentIds.length}/${childCount}`);
          const parentNames = parentIds
            .map((id) => titleById.get(id))
            .filter((value): value is string => Boolean(value));
          const titleParts: string[] = [];
          if (parentNames.length > 0) {
            titleParts.push(`Attached to ${parentNames.join(', ')}`);
          } else if (card.isCollectionRoot === true) {
            titleParts.push('Shown at the top level of Collections');
          }
          if (parentIds.length > 0 || childCount > 0) {
            titleParts.push(`${parentIds.length} parent${parentIds.length === 1 ? '' : 's'}, ${childCount} child${childCount === 1 ? '' : 'ren'}`);
          }
          const title = titleParts.length > 0 ? titleParts.join(' · ') : undefined;
          return [card.docId!, labelParts.length > 0 ? { label: labelParts.join(' · '), title } : null] as const;
        })
    );
  }, [collectionCards, parentIdsByChild, titleById]);

  const orderedCandidateIds = useMemo(
    () => candidateCards.map((c) => c.docId).filter(Boolean) as string[],
    [candidateCards]
  );

  const handleBulkSelectCard = useCallback(
    (cardId: string, index: number, e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      applyModifierSelection({
        orderedIds: orderedCandidateIds,
        id: cardId,
        index,
        modifiers: e,
        selected: Array.from(bulkSelectedCardIds),
        setSelected: (ids) => setBulkSelectedCardIds(new Set(ids)),
        anchorIndexRef: selectionAnchorIndexRef,
      });
    },
    [orderedCandidateIds, bulkSelectedCardIds]
  );

  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setBulkSelectedCardIds(new Set(orderedCandidateIds));
        selectionAnchorIndexRef.current = orderedCandidateIds.length > 0 ? orderedCandidateIds.length - 1 : null;
      } else {
        setBulkSelectedCardIds(new Set());
        selectionAnchorIndexRef.current = null;
      }
    },
    [orderedCandidateIds]
  );

  const handleBulkUpdate = useCallback(
    async (field: keyof Card, value: string) => {
      if (!value) return;
      if (bulkSelectedCardIds.size === 0) return;
      const shouldUpdate = await feedback.confirm({
        title: 'Update selected cards',
        message: `Update ${field} for ${bulkSelectedCardIds.size} selected cards?`,
        confirmLabel: 'Update',
        cancelLabel: 'Cancel',
      });
      if (!shouldUpdate) return;
      const ids = Array.from(bulkSelectedCardIds);
      try {
        const updatedCards = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/cards/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [field]: value }),
            });
            const data = await res.json().catch(() => ({}));
            throwIfJsonApiFailed(res, data, `Card ${id} could not be updated. Try again.`);
            return data as Card;
          })
        );
        updatedCards.forEach((card) => {
          upsertCatalogCard(card);
          upsertCard(card);
        });
        if (field === 'status') await mutateTags();
        setWorkspaceQueryRefreshTick((t) => t + 1);
        setBulkSelectedCardIds(new Set());
      } catch (err) {
        console.error(`Error updating ${String(field)}:`, err);
        feedback.showError(
          err instanceof Error ? err.message : `An error occurred while updating ${String(field)}.`,
          'Could not update cards'
        );
        setWorkspaceQueryRefreshTick((t) => t + 1);
      }
    },
    [bulkSelectedCardIds, feedback, mutateTags, upsertCard, upsertCatalogCard]
  );

  const handleBulkDelete = useCallback(async () => {
    if (bulkSelectedCardIds.size === 0) return;
    const selectedCards = mergedWorkspaceCards.filter(
      (card) => card.docId && bulkSelectedCardIds.has(card.docId)
    );
    const prompt = buildBulkCardDeletePrompt({
      selectedCards,
      parentIdsByChild,
      titleById,
    });
    if (prompt.blocked) {
      await feedback.alert({
        title: 'Cannot delete cards',
        message: prompt.message,
      });
      return;
    }
    const shouldDelete = await feedback.confirm({
      title: 'Delete selected cards',
      message: prompt.message,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!shouldDelete) return;
    const idsToDelete = Array.from(bulkSelectedCardIds);
    setBulkSelectedCardIds(new Set());
    try {
      await Promise.all(
        idsToDelete.map(async (id) => {
          const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
          const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
          throwIfJsonApiFailed(res, data, `Card ${id} could not be deleted. Try again.`);
        })
      );
      selectedCards.forEach((card) => {
        if (card.docId) {
          removeCollectionsCardStructure(card.docId);
          notifyQuestionCardDeleted(card.docId, card.questionId ?? null);
        }
      });
      await mutateTags();
      setWorkspaceQueryRefreshTick((t) => t + 1);
    } catch (err) {
      console.error('Error deleting cards:', err);
      feedback.showError(
        err instanceof Error ? err.message : 'An error occurred while deleting cards.',
        'Could not delete cards'
      );
      setWorkspaceQueryRefreshTick((t) => t + 1);
      await refreshStructure();
    }
  }, [bulkSelectedCardIds, feedback, mergedWorkspaceCards, mutateTags, notifyQuestionCardDeleted, parentIdsByChild, refreshStructure, removeCollectionsCardStructure, titleById]);

  const handleOpenBulkTags = useCallback(() => {
    setBulkTagModalOpen(true);
  }, []);

  const onUpdateCard = useCallback(
    async (cardId: string, updateData: Partial<Card>) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await res.json().catch(() => ({}));
      throwIfJsonApiFailed(res, data, 'This card could not be updated. Try again.');
      upsertCatalogCard(data as Card);
      upsertCard(data as Card);
      if (shouldRefreshTagCountsAfterCardUpdate(updateData)) await mutateTags();
      if (shouldRefreshWorkspaceQueryAfterCardUpdate(updateData)) {
        setWorkspaceQueryRefreshTick((t) => t + 1);
      }
      if (shouldRefreshCollectionsStructureAfterCardUpdate(updateData)) {
        await refreshStructure();
      }
    },
    [mutateTags, refreshStructure, upsertCard, upsertCatalogCard]
  );

  const onDeleteCard = useCallback(
    async (cardId: string, questionId?: string | null) => {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      const data =
        res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as unknown);
      throwIfJsonApiFailed(res, data, 'This card could not be deleted. Try again.');
      removeCatalogCard(cardId);
      removeCollectionsCardStructure(cardId);
      notifyQuestionCardDeleted(cardId, questionId ?? null);
      setWorkspaceQueryRefreshTick((t) => t + 1);
      await mutateTags();
    },
    [mutateTags, notifyQuestionCardDeleted, removeCatalogCard, removeCollectionsCardStructure]
  );

  const requestDeleteCard = useCallback(async (card: Card) => {
    setDeleteConfirmCard(card);
    setDeleteConfirmLoading(true);
    try {
      const { parentTitles, verificationFailed } = await fetchCardDeleteParents(card.docId);
      const prompt = buildSingleCardDeletePrompt({
        title: card.title,
        isCollectionRoot: card.isCollectionRoot,
        childCount: card.childrenIds?.length ?? 0,
        parentTitles,
        verificationFailed,
      });
      setDeleteConfirmMessage(prompt.message);
    } finally {
      setDeleteConfirmLoading(false);
    }
  }, []);

  const studioDrag = Boolean(curatedTreeDnd);
  const hasActiveCardStructuralFilters =
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    displayModeFilter !== 'all' ||
    filterTagIds.length > 0 ||
    Object.values(dimensionFilters).some(state => state.mode !== 'any');
  const handleStudioFocusCard = useCallback(
    (card: Card) => {
      if (!card.docId) return;
      if (props.selectedCardId === card.docId) {
        void Promise.resolve(onStudioSelectCard(card.docId, card)).catch(() => undefined);
        return;
      }
      setPendingFocusCardId(card.docId);
      void Promise.resolve(onStudioSelectCard(card.docId, card))
        .then((switched) => {
          if (switched === false) {
            setPendingFocusCardId(null);
          }
        })
        .catch(() => {
          setPendingFocusCardId(null);
        });
    },
    [onStudioSelectCard, props.selectedCardId]
  );

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
      <div className={styles.studioCardFilters} role="search">
        <label className={`${styles.studioCardField} ${styles.studioPaneSearchField}`}>
          <span className={styles.studioCardPanelTitle}>Cards</span>
          <span className={styles.studioCardSearchControl} data-active={trimmedSearch ? 'true' : 'false'}>
            <DebouncedSearchInput
              value={search}
              onCommit={setSearch}
              className={styles.studioCardSearchInput}
              placeholder="Search card titles"
              ariaLabel="Search card titles"
            />
            {trimmedSearch ? (
              <button
                type="button"
                className={styles.studioCardSearchClear}
                onClick={() => setSearch('')}
                aria-label="Clear card search"
                title="Clear card search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </label>
        <label className={styles.studioCardField}>
          <select
            value={codificationFilter}
            onChange={(e) => setCodificationFilter(e.target.value as StudioCardBankCodificationFilter)}
            className={styles.studioCardSelect}
            aria-label="Filter by codification"
          >
            <option value="all">All Codification</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </label>
        <label className={styles.studioCardField}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CardTypeFilter)}
            className={styles.studioCardSelect}
            aria-label="Filter by card type"
          >
            <option value="all">All types</option>
            <option value="story">Story</option>
            <option value="qa">Question</option>
            <option value="quote">Quote</option>
            <option value="callout">Callout</option>
            <option value="gallery">Gallery</option>
          </select>
        </label>
        <label className={styles.studioCardField}>
          <select
            value={displayModeFilter}
            onChange={(e) => setDisplayModeFilter(e.target.value as DisplayModeFilter)}
            className={styles.studioCardSelect}
            aria-label="Filter by display mode"
          >
            <option value="all">All Modes</option>
            <option value="inline">Inline</option>
            <option value="navigate">Navigate</option>
            <option value="static">Static</option>
          </select>
        </label>
        <label className={styles.studioCardField}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
            className={styles.studioCardSelect}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label className={styles.studioCardField}>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as CandidateSort)}
            className={styles.studioCardSelect}
            aria-label="Sort cards"
          >
            <option value="titleAsc">Title A–Z</option>
            <option value="titleDesc">Title Z–A</option>
            <option value="createdDesc">Newest</option>
            <option value="createdAsc">Oldest</option>
          </select>
        </label>
        <AdminTileSizeControl
          value={gridTileMinPx}
          min={228}
          max={360}
          step={10}
          defaultValue={DEFAULT_STUDIO_CARD_BANK_LOCAL_FILTER_PREFERENCES.gridTileMinPx}
          onChange={setGridTileMinPx}
          surfaceLabel="Cards"
        />
        <button
          type="button"
          className={styles.studioCardClearButton}
          onClick={handleClearAllFilters}
          aria-label="Clear card filters"
          title="Clear card filters"
        >
          <FilterX size={16} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.studioCardMacroBlock}>
        <AdminDimensionalTagFilter
          className={styles.studioCardMacroTagSelector}
          selectedTagIds={filterTagIds}
          allTags={allTags || []}
          onSelectedTagIdsChange={setFilterTagIds}
          tagScope={tagFilterScope}
          onTagScopeChange={setTagFilterScope}
          dimensionFilters={dimensionFilters}
          onDimensionFilterChange={updateDimensionFilter}
          surfaceLabel="Cards"
        />
      </div>
      {loadingWorkspaceCards ? (
        <div className={styles.toolbar}>
        {loadingWorkspaceCards ? <span className={styles.catalogHint}>Loading card workspace…</span> : null}
        </div>
      ) : null}

      {bulkSelectedCardIds.size > 0 ? (
        <div className={cardAdminStyles.bulkActions}>
          <span>
            {bulkSelectedCardIds.size} card{bulkSelectedCardIds.size === 1 ? '' : 's'} selected
          </span>
          <div className={cardAdminStyles.actions}>
            <select
              onChange={(e) => void handleBulkUpdate('status', e.target.value)}
              className={cardAdminStyles.filterSelect}
              defaultValue=""
              aria-label="Update status for selected cards"
            >
              <option value="" disabled>
                Update Status
              </option>
              <option value="draft">Set to Draft</option>
              <option value="published">Set to Published</option>
            </select>
            <select
              onChange={(e) => void handleBulkUpdate('type', e.target.value)}
              className={cardAdminStyles.filterSelect}
              defaultValue=""
              aria-label="Update type for selected cards"
            >
              <option value="" disabled>
                Update Type
              </option>
              <option value="story">Set to Story</option>
              <option value="qa">Set to Question</option>
              <option value="quote">Set to Quote</option>
              <option value="callout">Set to Callout</option>
              <option value="gallery">Set to Gallery</option>
            </select>
            <select
              onChange={(e) => void handleBulkUpdate('displayMode', e.target.value)}
              className={cardAdminStyles.filterSelect}
              defaultValue=""
              aria-label="Update display mode for selected cards"
            >
              <option value="" disabled>
                Update Display Mode
              </option>
              <option value="inline">Set to Inline</option>
              <option value="navigate">Set to Navigate</option>
              <option value="static">Set to Static</option>
            </select>
            <button type="button" onClick={handleOpenBulkTags} className={cardAdminStyles.actionButton}>
              Edit tags…
            </button>
            <button
              type="button"
              onClick={() => setBulkSelectedCardIds(new Set())}
              className={cardAdminStyles.actionButton}
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              className={`${cardAdminStyles.actionButton} ${cardAdminStyles.deleteButton}`}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
      </div>

      <div ref={resultsScrollRef} className={styles.resultsScroll}>
        {!loadingWorkspaceCards ? <CardAdminGrid
          cards={candidateCards}
          selectedCardIds={bulkSelectedCardIds}
          allTags={allTags || []}
          getCardSecondaryMeta={(card) => collectionStateMetaById.get(card.docId) ?? null}
          onSelectCard={handleBulkSelectCard}
          onSelectAll={handleSelectAll}
          onSaveScrollPosition={() => {}}
          onUpdateCard={onUpdateCard}
          onDeleteCard={onDeleteCard}
          onRequestDeleteCard={requestDeleteCard}
          studioCuratedTreeDrag={studioDrag}
          studioEmbedCellClickSelects
          onStudioFocusCard={handleStudioFocusCard}
          pendingFocusCardId={pendingFocusCardId}
          interactionDisabled={saving}
          compactStudioGrid
          gridTileMinPx={gridTileMinPx}
          emptyState={
            trimmedSearch ? (
              <div className={styles.studioSearchEmptyState}>
                <p>No cards match &ldquo;{trimmedSearch}&rdquo;.</p>
                <button type="button" onClick={() => setSearch('')}>
                  Clear search
                </button>
              </div>
            ) : hasActiveCardStructuralFilters ? (
              <div className={styles.studioSearchEmptyState}>
                <p>No cards match the current filters.</p>
                <button type="button" onClick={handleClearAllFilters}>
                  Clear filters
                </button>
              </div>
            ) : undefined
          }
        /> : null}
        {(workspaceHasMore || isStreamingMore || workspaceLoadMoreError) ? (
          <div className={styles.loadMoreFooter}>
            {workspaceHasMore ? (
              <button
                type="button"
                onClick={() => void loadMoreWorkspaceCards()}
                disabled={isStreamingMore || loadingWorkspaceCards}
                className={styles.loadMoreButton}
              >
                {isStreamingMore ? 'Loading more cards...' : 'Load more cards'}
              </button>
            ) : null}
            {isStreamingMore ? (
              <span className={styles.catalogHint} aria-live="polite">
                Loading more cards... ({workspaceCards.length} loaded)
              </span>
            ) : null}
            {workspaceLoadMoreError ? (
              <span className={styles.catalogHint} role="alert">
                {workspaceLoadMoreError}
              </span>
            ) : null}
            {workspaceHasMore ? (
              <div ref={loadMoreSentinelRef} className={styles.loadMoreSentinel} aria-hidden="true" />
            ) : null}
          </div>
        ) : null}
      </div>

      <EditModal
        isOpen={Boolean(deleteConfirmCard)}
        onClose={() => {
          if (deleteConfirmLoading) return;
          setDeleteConfirmCard(null);
          setDeleteConfirmMessage('');
        }}
        title="Delete card"
      >
        <div className={styles.studioDeleteConfirmBody}>
          {deleteConfirmLoading ? (
            <p className={styles.studioDeleteConfirmText}>Checking delete rules…</p>
          ) : (
            <>
              {deleteConfirmMessage.split('\n').filter(Boolean).map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className={index === 0 ? styles.studioDeleteConfirmLead : styles.studioDeleteConfirmText}
                >
                  {line}
                </p>
              ))}
              <div className={styles.studioDeleteConfirmActions}>
                <button
                  type="button"
                  className={styles.studioDeleteConfirmPrimary}
                  onClick={async () => {
                    const card = deleteConfirmCard;
                    if (!card) return;
                    setDeleteConfirmCard(null);
                    setDeleteConfirmMessage('');
                    try {
                      await onDeleteCard(card.docId, card.questionId ?? null);
                    } catch (err) {
                      feedback.showError(
                        err instanceof Error ? err.message : 'An unknown error occurred.',
                        'Could not delete card'
                      );
                    }
                  }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className={styles.studioDeleteConfirmSecondary}
                  onClick={() => {
                    setDeleteConfirmCard(null);
                    setDeleteConfirmMessage('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </EditModal>

      <BulkEditTagsModal
        cardIds={Array.from(bulkSelectedCardIds)}
        isOpen={bulkTagModalOpen}
        onClose={() => setBulkTagModalOpen(false)}
        onSave={async ({ cards }) => {
          cards.forEach((card) => {
            upsertCatalogCard(card);
            upsertCard(card);
          });
          await mutateTags();
          setWorkspaceQueryRefreshTick((t) => t + 1);
          setBulkSelectedCardIds(new Set());
        }}
      />
    </div>
  );
}

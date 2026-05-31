'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { FilterX, Pencil } from 'lucide-react';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import { useTag } from '@/components/providers/TagProvider';
import BulkEditTagsModal from '@/components/admin/card-admin/BulkEditTagsModal';
import CardAdminGrid from '@/components/admin/card-admin/CardAdminGrid';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import EditModal from '@/components/admin/card-admin/EditModal';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import DebouncedSearchInput from '@/components/admin/common/DebouncedSearchInput';
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
import cardAdminStyles from '@/app/admin/card-admin/card-admin.module.css';
import { mergeStudioCatalogCard, toStudioCatalogCard } from '@/components/admin/studio/studioCardProjection';
import type { StudioSelectedPreview } from '@/components/admin/studio/studioCardTypes';
import {
  DEFAULT_ADMIN_DIMENSION_FILTERS,
  readStoredStudioCardBankLocalFilterPreferences,
  writeStoredStudioCardBankLocalFilterPreferences,
  type AdminDimensionFilterMode,
  type AdminDimensionFilterState,
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

function cardMatchesOnCardDimensionalMap(card: Card, dt: DimensionalTagIdMap): boolean {
  if (!dimensionalTagMapHasFilters(dt)) return true;
  for (const dim of DIMENSION_KEYS) {
    const selected = dt[dim];
    if (!selected?.length) continue;
    const idsOnCard = (card[dim] as string[] | undefined) ?? [];
    const ok = selected.some((tid) => idsOnCard.includes(tid));
    if (!ok) return false;
  }
  return true;
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

type StudioTreeCandidateCardBankProps = EmbeddedUnparentedBankContext & {
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
    registerCatalogRemove,
    registerDeleteFallbackResolver,
  } = props;

  const { selectedLoadState, notifyQuestionCardDeleted, removeCollectionsCardStructure } = useStudioShell();
  const { active } = useDndContext();
  const feedback = useAppFeedback();
  const { tags: allTags } = useTag();
  const initialLocalFilterPrefsRef = useRef(readStoredStudioCardBankLocalFilterPreferences());
  const [workspaceCards, setWorkspaceCards] = useState<Card[]>([]);
  const [catalogOverrides, setCatalogOverrides] = useState<CatalogOverrideMap>({});
  const [workspaceQueryRefreshTick, setWorkspaceQueryRefreshTick] = useState(0);
  const [loadingWorkspaceCards, setLoadingWorkspaceCards] = useState(true);
  const [bulkSelectedCardIds, setBulkSelectedCardIds] = useState<Set<string>>(() => new Set());
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState<CandidateSort>('titleAsc');
  const [filterTagIds, setFilterTagIds] = useState<string[]>(initialLocalFilterPrefsRef.current.filterTagIds);
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>(initialLocalFilterPrefsRef.current.typeFilter);
  const [displayModeFilter, setDisplayModeFilter] = useState<DisplayModeFilter>(
    initialLocalFilterPrefsRef.current.displayModeFilter
  );
  const [tagFilterModalOpen, setTagFilterModalOpen] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState<AdminDimensionFilterState>(
    initialLocalFilterPrefsRef.current.dimensionFilters
  );
  const [isStreamingMore, setIsStreamingMore] = useState(false);
  const [pendingFocusCardId, setPendingFocusCardId] = useState<string | null>(null);
  const [deleteConfirmCard, setDeleteConfirmCard] = useState<Card | null>(null);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState('');
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const deferredFilterTagIds = useDeferredValue(filterTagIds);
  const deferredTypeFilter = useDeferredValue(typeFilter);
  const deferredDisplayModeFilter = useDeferredValue(displayModeFilter);
  const deferredDimensionFilters = useDeferredValue(dimensionFilters);
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const deferredSortMode = useDeferredValue(sortMode);
  const dragActiveRef = useRef(false);
  const workspaceRequestIdRef = useRef(0);

  useEffect(() => {
    dragActiveRef.current = Boolean(active);
  }, [active]);

  useEffect(() => {
    writeStoredStudioCardBankLocalFilterPreferences({
      typeFilter,
      displayModeFilter,
      filterTagIds,
      dimensionFilters,
    });
  }, [dimensionFilters, displayModeFilter, filterTagIds, typeFilter]);

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

    const PAGE_SIZE = 250;

    (async () => {
      const waitForStableDragSurface = async () => {
        while (!cancelled && dragActiveRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };

      let lastDocId: string | undefined;
      let firstChunkPainted = false;
      const accumulated: Card[] = [];
      const seen = new Set<string>();

      while (true) {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          status: deferredStatusFilter,
          hydration: 'cover-only',
          searchScope: 'admin-title',
        });
        const trimmedSearch = deferredSearch.trim();
        if (trimmedSearch) params.set('q', trimmedSearch);
        if (deferredTypeFilter !== 'all') params.set('type', deferredTypeFilter);
        if (deferredDisplayModeFilter !== 'all') params.set('displayMode', deferredDisplayModeFilter);
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
          }
        }
        const groupedFilterTagIds = groupSelectedTagIdsByDimension(deferredFilterTagIds, allTags ?? []);
        for (const dimension of DIMENSION_KEYS) {
          const selected = groupedFilterTagIds[dimension];
          if (selected?.length) {
            params.set(dimension, selected.join(','));
          }
        }
        if (lastDocId) params.set('lastDocId', lastDocId);

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
        if (!ok) break;

        const items = Array.isArray(pageData.items) ? pageData.items : [];
        for (const item of items) {
          if (item.docId && !seen.has(item.docId)) {
            accumulated.push(toStudioCatalogCard(item));
            seen.add(item.docId);
          }
        }

        if (firstChunkPainted) {
          await waitForStableDragSurface();
          if (cancelled || !isCurrent()) return;
        }

        setWorkspaceCards([...accumulated]);

        if (!firstChunkPainted) {
          setCatalogOverrides({});
          setLoadingWorkspaceCards(false);
          firstChunkPainted = true;
          if (pageData.hasMore && items.length > 0) {
            setIsStreamingMore(true);
          }
        }

        if (!pageData.hasMore || items.length === 0) break;
        lastDocId = pageData.lastDocId;
      }

      if (cancelled || !isCurrent()) return;
      if (!firstChunkPainted) setLoadingWorkspaceCards(false);
      setIsStreamingMore(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    allTags,
    deferredDimensionFilters,
    deferredDisplayModeFilter,
    deferredFilterTagIds,
    deferredSearch,
    deferredSortMode,
    deferredStatusFilter,
    deferredTypeFilter,
    workspaceQueryRefreshTick,
  ]);

  useEffect(() => {
    if (selectedLoadState === 'loading') return;
    setPendingFocusCardId(null);
  }, [selectedLoadState]);

  const onCardTagDimensionalMap = useMemo(
    () => groupSelectedTagIdsByDimension(deferredFilterTagIds, allTags ?? []),
    [deferredFilterTagIds, allTags]
  );

  const selectedFilterTags = useMemo(
    () => (allTags ?? []).filter((t) => t.docId && filterTagIds.includes(t.docId!)),
    [allTags, filterTagIds]
  );

  const matchesFilters = useCallback(
    (card: Card) => {
      const q = deferredSearch.trim().toLowerCase();
      if (q && !(card.title || '').toLowerCase().includes(q)) return false;
      if (deferredTypeFilter !== 'all' && card.type !== deferredTypeFilter) return false;
      if (deferredDisplayModeFilter !== 'all' && cardDisplayMode(card) !== deferredDisplayModeFilter) return false;
      if (!cardMatchesOnCardDimensionalMap(card, onCardTagDimensionalMap)) return false;
      for (const dimension of DIMENSION_KEYS) {
        const state = deferredDimensionFilters[dimension];
        const ids = Array.isArray(card[dimension]) ? (card[dimension] as string[]) : [];
        if (state.mode === 'any') continue;
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
      onCardTagDimensionalMap,
      deferredDimensionFilters,
    ]
  );

  const handleClearAllFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setSortMode('titleAsc');
    setTypeFilter('all');
    setDisplayModeFilter('all');
    setFilterTagIds([]);
    setDimensionFilters(DEFAULT_ADMIN_DIMENSION_FILTERS);
    setBulkSelectedCardIds(new Set());
  }, [setSearch, setStatusFilter]);

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
            throwIfJsonApiFailed(res, data, `Failed to update card ${id}`);
            return data as Card;
          })
        );
        updatedCards.forEach((card) => {
          upsertCatalogCard(card);
          upsertCard(card);
        });
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
    [bulkSelectedCardIds, feedback, upsertCard, upsertCatalogCard]
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
          throwIfJsonApiFailed(res, data, `Failed to delete card ${id}`);
        })
      );
      selectedCards.forEach((card) => {
        if (card.docId) {
          removeCollectionsCardStructure(card.docId);
          notifyQuestionCardDeleted(card.docId, card.questionId ?? null);
        }
      });
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
  }, [bulkSelectedCardIds, feedback, mergedWorkspaceCards, notifyQuestionCardDeleted, parentIdsByChild, refreshStructure, removeCollectionsCardStructure, titleById]);

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
      throwIfJsonApiFailed(res, data, 'Failed to update card');
      upsertCatalogCard(data as Card);
      upsertCard(data as Card);
      if (shouldRefreshWorkspaceQueryAfterCardUpdate(updateData)) {
        setWorkspaceQueryRefreshTick((t) => t + 1);
      }
      if (shouldRefreshCollectionsStructureAfterCardUpdate(updateData)) {
        await refreshStructure();
      }
    },
    [refreshStructure, upsertCard, upsertCatalogCard]
  );

  const onDeleteCard = useCallback(
    async (cardId: string, questionId?: string | null) => {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      const data =
        res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as unknown);
      throwIfJsonApiFailed(res, data, 'Failed to delete card');
      removeCatalogCard(cardId);
      removeCollectionsCardStructure(cardId);
      notifyQuestionCardDeleted(cardId, questionId ?? null);
      setWorkspaceQueryRefreshTick((t) => t + 1);
    },
    [notifyQuestionCardDeleted, removeCatalogCard, removeCollectionsCardStructure]
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
  const handleStudioFocusCard = useCallback(
    (card: Card) => {
      if (!card.docId) return;
      setPendingFocusCardId(card.docId);
      onStudioSelectCard(card.docId, card);
    },
    [onStudioSelectCard]
  );

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
      <div className={styles.studioCardFilters} role="search">
        <label className={`${styles.studioCardField} ${styles.studioPaneSearchField}`}>
          <span className={styles.studioCardPanelTitle}>Cards</span>
          <DebouncedSearchInput
            value={search}
            onCommit={setSearch}
            className={styles.studioCardSearchInput}
            placeholder="Search"
            aria-label="Search cards"
          />
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
        <button
          type="button"
          className={styles.studioCardClearButton}
          onClick={handleClearAllFilters}
          aria-label="Clear card filters"
          title="Clear card filters"
        >
          <FilterX size={16} aria-hidden="true" />
        </button>
        {isStreamingMore ? (
          <span
            aria-live="polite"
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-muted, #888)',
              alignSelf: 'center',
              marginLeft: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            Loading more cards… ({workspaceCards.length} loaded)
          </span>
        ) : null}
      </div>

      <div className={styles.studioCardMacroBlock}>
        <CardDimensionalTagCommandBar
          className={styles.studioCardMacroTagSelector}
          card={{ tags: filterTagIds }}
          allTags={allTags || []}
          onUpdateTags={(next) => setFilterTagIds(next)}
          variant="compact"
          searchPlaceholder="Edit tags..."
          trailingSlot={
            <div className={styles.studioTagsActions}>
              <button
                type="button"
                className={styles.studioTagsEditButton}
                onClick={() => setTagFilterModalOpen(true)}
                aria-label="Edit card tag filters"
                title="Edit card tag filters"
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
            </div>
          }
          footerContent={
            <div className={styles.studioRuleMatrix}>
              {Array.from(DIMENSION_KEYS).map((dimension) => {
                const state = dimensionFilters[dimension];
                const options = (allTags || []).filter((t) => t.dimension === dimension && t.docId);
                return (
                  <div key={dimension} className={styles.studioRuleColumn}>
                    <select
                      className={styles.studioCardSelect}
                      value={state.mode}
                      onChange={(e) =>
                        updateDimensionFilter(dimension, {
                          mode: e.target.value as AdminDimensionFilterMode,
                        })
                      }
                    >
                      <option value="any">Any</option>
                      <option value="hasAny">Has any</option>
                      <option value="isEmpty">Is empty</option>
                      <option value="matches">Matches tag</option>
                    </select>
                    {state.mode === 'matches' ? (
                      <select
                        className={styles.studioCardSelect}
                        value={state.tagId}
                        onChange={(e) => updateDimensionFilter(dimension, { tagId: e.target.value })}
                      >
                        <option value="">Select tag...</option>
                        {options.map((tag) => (
                          <option key={tag.docId} value={tag.docId}>
                            {tag.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          }
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
              Clear
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

      <div className={styles.resultsScroll}>
        <CardAdminGrid
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
        />
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
        onSave={async () => {
          setWorkspaceQueryRefreshTick((t) => t + 1);
          setBulkSelectedCardIds(new Set());
        }}
      />
      <EditModal
        isOpen={tagFilterModalOpen}
        onClose={() => setTagFilterModalOpen(false)}
        title="Card filters"
      >
        <MacroTagSelector
          startExpanded
          selectedTags={selectedFilterTags}
          allTags={allTags || []}
          onChange={setFilterTagIds}
          collapsedSummary="none"
        />
      </EditModal>
    </div>
  );
}

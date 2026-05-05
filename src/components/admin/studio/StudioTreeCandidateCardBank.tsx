'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import { useTag } from '@/components/providers/TagProvider';
import CardAdminGrid from '@/components/admin/card-admin/CardAdminGrid';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import EditModal from '@/components/admin/card-admin/EditModal';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import type { EmbeddedUnparentedBankContext } from '@/components/admin/collections/embeddedUnparentedBankContext';
import {
  listCuratedTreeAttachCandidates,
  mergeCardCatalogs,
} from '@/lib/utils/curatedTreeAttachCandidates';
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
import mediaAdminStyles from '@/app/admin/media-admin/media-admin.module.css';
import { mergeStudioCatalogCard, toStudioCatalogCard } from '@/components/admin/studio/studioCardProjection';
import styles from './StudioTreeCandidateCardBank.module.css';

type CandidateSort = 'titleAsc' | 'titleDesc' | 'createdDesc' | 'createdAsc';
type DimensionKey = 'who' | 'what' | 'when' | 'where';
type DimensionFilterMode = 'any' | 'hasAny' | 'isEmpty' | 'matches';
type DimensionFilterState = Record<
  DimensionKey,
  {
    mode: DimensionFilterMode;
    tagId: string;
  }
>;

type CardTypeFilter = 'all' | NonNullable<Card['type']>;
type DisplayModeFilter = 'all' | NonNullable<Card['displayMode']>;
type CatalogOverrideMap = Record<string, Card | null>;

function cardDisplayMode(card: Card): NonNullable<Card['displayMode']> {
  return card.displayMode ?? 'navigate';
}

const DEFAULT_DIMENSION_FILTERS: DimensionFilterState = {
  who: { mode: 'any', tagId: '' },
  what: { mode: 'any', tagId: '' },
  when: { mode: 'any', tagId: '' },
  where: { mode: 'any', tagId: '' },
};

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

function shouldRefreshCollectionsAfterCardUpdate(updateData: Partial<Card>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(updateData, 'title') ||
    Object.prototype.hasOwnProperty.call(updateData, 'childrenIds') ||
    Object.prototype.hasOwnProperty.call(updateData, 'isCollectionRoot') ||
    Object.prototype.hasOwnProperty.call(updateData, 'collectionRootOrder')
  );
}

type StudioTreeCandidateCardBankProps = EmbeddedUnparentedBankContext & {
  registerCatalogRemove?: ((fn: ((cardId: string) => void) | null) => void) | undefined;
};

export default function StudioTreeCandidateCardBank(props: StudioTreeCandidateCardBankProps) {
  const {
    refreshCards,
    collectionCards,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    onSelectCard: onStudioSelectCard,
    saving,
    curatedTreeDnd,
    registerCatalogRemove,
  } = props;

  const { selectedLoadState } = useStudioShell();
  const { tags: allTags } = useTag();
  const [fullCatalog, setFullCatalog] = useState<Card[]>([]);
  const [catalogOverrides, setCatalogOverrides] = useState<CatalogOverrideMap>({});
  const [catalogRefreshTick, setCatalogRefreshTick] = useState(0);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [bulkSelectedCardIds, setBulkSelectedCardIds] = useState<Set<string>>(() => new Set());
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [pendingBulkTags, setPendingBulkTags] = useState<string[]>([]);
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [bulkTagApplying, setBulkTagApplying] = useState(false);
  const [sortMode, setSortMode] = useState<CandidateSort>('titleAsc');
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>('all');
  const [displayModeFilter, setDisplayModeFilter] = useState<DisplayModeFilter>('all');
  const [tagFilterModalOpen, setTagFilterModalOpen] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState<DimensionFilterState>(DEFAULT_DIMENSION_FILTERS);
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

  // Catalog load: first chunk paints fast (250 cards), remaining pages stream in
  // background under the server's stable `created desc` order. Filters operate
  // on whatever is loaded; the streaming indicator next to the Clear button
  // tells the operator a request like search may be working against a partial
  // set. See docs/01-Vision-Architecture.md → Frontend Principles (chunked list
  // delivery + stable ordering).
  useEffect(() => {
    let cancelled = false;
    setLoadingCatalog(true);
    setIsStreamingMore(false);

    const PAGE_SIZE = 250;

    (async () => {
      let lastDocId: string | undefined;
      let firstChunkPainted = false;
      const accumulated: Card[] = [];
      const seen = new Set<string>();
      let page = 0;

      while (true) {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          page: String(page),
          status: 'all',
          hydration: 'cover-only',
          sortBy: 'created',
          sortDir: 'desc',
        });
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
        if (cancelled) return;
        if (!ok) break;

        const items = Array.isArray(pageData.items) ? pageData.items : [];
        for (const item of items) {
          if (item.docId && !seen.has(item.docId)) {
            accumulated.push(toStudioCatalogCard(item));
            seen.add(item.docId);
          }
        }

        setFullCatalog([...accumulated]);

        if (!firstChunkPainted) {
          setCatalogOverrides({});
          setLoadingCatalog(false);
          firstChunkPainted = true;
          if (pageData.hasMore && items.length > 0) {
            setIsStreamingMore(true);
          }
        }

        if (!pageData.hasMore || items.length === 0) break;
        lastDocId = pageData.lastDocId;
        page += 1;
      }

      if (cancelled) return;
      if (!firstChunkPainted) setLoadingCatalog(false);
      setIsStreamingMore(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogRefreshTick]);

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
    setDimensionFilters(DEFAULT_DIMENSION_FILTERS);
    setBulkSelectedCardIds(new Set());
  }, [setSearch, setStatusFilter]);

  const updateDimensionFilter = useCallback(
    (dimension: DimensionKey, patch: Partial<{ mode: DimensionFilterMode; tagId: string }>) => {
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

  const mergedCatalog = useMemo(
    () => applyCatalogOverrides(mergeCardCatalogs(fullCatalog, collectionCards), catalogOverrides),
    [catalogOverrides, fullCatalog, collectionCards]
  );
  const deferredMergedCatalog = useDeferredValue(mergedCatalog);

  const upsertCatalogCard = useCallback((card: Card) => {
    if (!card.docId) return;
    setFullCatalog((current) => {
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
    setFullCatalog((current) => current.filter((entry) => entry.docId !== cardId));
    setCatalogOverrides((current) => ({
      ...current,
      [cardId]: null,
    }));
  }, []);

  useEffect(() => {
    registerCatalogRemove?.(removeCatalogCard);
    return () => registerCatalogRemove?.(null);
  }, [registerCatalogRemove, removeCatalogCard]);

  const patchCatalogCards = useCallback(
    (cardIds: string[], patcher: (card: Card) => Card) => {
      if (cardIds.length === 0) return;
      const idSet = new Set(cardIds);
      const mergedById = new Map(
        deferredMergedCatalog.filter((card) => card.docId).map((card) => [card.docId!, card] as const)
      );
      setFullCatalog((current) =>
        current.map((card) => (card.docId && idSet.has(card.docId) ? patcher(card) : card))
      );
      setCatalogOverrides((current) => {
        const next = { ...current };
        for (const cardId of cardIds) {
          const base = mergedById.get(cardId);
          if (!base) continue;
          next[cardId] = patcher(base);
        }
        return next;
      });
    },
    [deferredMergedCatalog]
  );

  const candidateCards = useMemo(() => {
    const raw = listCuratedTreeAttachCandidates(deferredMergedCatalog, {
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
        ? deferredMergedCatalog.find((card) => card.docId === props.selectedCardId) ?? null
        : null;
    if (!selectedCard?.docId) return base;
    if (deferredStatusFilter !== 'all' && (selectedCard.status ?? 'draft') !== deferredStatusFilter) return base;
    if (!matchesFilters(selectedCard)) return base;
    if (base.some((card) => card.docId === selectedCard.docId)) return base;
    return [selectedCard, ...base];
  }, [deferredMergedCatalog, matchesFilters, deferredStatusFilter, deferredSortMode, props.selectedCardId]);

  const parentIdsByChild = useMemo(
    () => buildParentIdsByChild(deferredMergedCatalog),
    [deferredMergedCatalog]
  );

  const titleById = useMemo(
    () =>
      new Map(
        deferredMergedCatalog
          .filter((card) => card.docId)
          .map((card) => [card.docId!, card.title?.trim() || 'Untitled'] as const)
      ),
    [deferredMergedCatalog]
  );

  const collectionStateMetaById = useMemo(() => {

    return new Map(
      deferredMergedCatalog
        .filter((card) => card.docId)
        .map((card) => {
          const parentIds = parentIdsByChild.get(card.docId!) ?? [];
          const labelParts: string[] = [];
          if (card.isCollectionRoot === true) labelParts.push('Root');
          if (parentIds.length > 0) labelParts.push(parentIds.length === 1 ? '1 parent' : `${parentIds.length} parents`);
          const parentNames = parentIds
            .map((id) => titleById.get(id))
            .filter((value): value is string => Boolean(value));
          const title =
            parentNames.length > 0
              ? `Attached to ${parentNames.join(', ')}`
              : card.isCollectionRoot === true
                ? 'Shown at the top level of Collections'
                : undefined;
          return [card.docId!, labelParts.length > 0 ? { label: labelParts.join(' · '), title } : null] as const;
        })
    );
  }, [deferredMergedCatalog, parentIdsByChild, titleById]);

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
      if (!confirm(`Are you sure you want to update ${field} for ${bulkSelectedCardIds.size} selected cards?`)) return;
      const ids = Array.from(bulkSelectedCardIds);
      try {
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/cards/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [field]: value }),
            })
          )
        );
        patchCatalogCards(ids, (card) => ({ ...card, [field]: value, updatedAt: Date.now() }));
        setBulkSelectedCardIds(new Set());
      } catch (err) {
        console.error(`Error updating ${String(field)}:`, err);
        alert(`An error occurred while updating ${String(field)}.`);
        setCatalogRefreshTick((t) => t + 1);
        await refreshCards();
      }
    },
    [bulkSelectedCardIds, patchCatalogCards, refreshCards]
  );

  const handleBulkDelete = useCallback(async () => {
    if (bulkSelectedCardIds.size === 0) return;
    const selectedCards = mergedCatalog.filter(
      (card) => card.docId && bulkSelectedCardIds.has(card.docId)
    );
    const prompt = buildBulkCardDeletePrompt({
      selectedCards,
      parentIdsByChild,
      titleById,
    });
    if (prompt.blocked) {
      alert(prompt.message);
      return;
    }
    if (!confirm(prompt.message)) return;
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
      setCatalogRefreshTick((t) => t + 1);
      await refreshCards();
    } catch (err) {
      console.error('Error deleting cards:', err);
      alert(err instanceof Error ? err.message : 'An error occurred while deleting cards.');
      setCatalogRefreshTick((t) => t + 1);
      await refreshCards();
    }
  }, [bulkSelectedCardIds, mergedCatalog, parentIdsByChild, refreshCards, titleById]);

  const handleOpenBulkTags = useCallback(() => {
    setPendingBulkTags([]);
    setBulkTagMode('add');
    setBulkTagModalOpen(true);
  }, []);

  const handleSaveBulkTagSelection = useCallback(
    async (newSelection: string[]) => {
      if (bulkSelectedCardIds.size === 0) return;
      setBulkTagApplying(true);
      try {
        const cardIds = Array.from(bulkSelectedCardIds);
        let res: Response;
        if (bulkTagMode === 'replace') {
          res = await fetch('/api/cards/bulk-update-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardIds, tags: newSelection }),
          });
        } else {
          const addTagIds = bulkTagMode === 'add' ? newSelection : [];
          const removeTagIds = bulkTagMode === 'remove' ? newSelection : [];
          res = await fetch('/api/cards/bulk-update-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardIds, addTagIds, removeTagIds }),
          });
        }
        const data = await res.json().catch(() => ({}));
        throwIfJsonApiFailed(res, data, 'Failed to save tags.');
        patchCatalogCards(cardIds, (card) => {
          const currentTags = new Set(card.tags ?? []);
          let nextTags: string[];
          if (bulkTagMode === 'replace') {
            nextTags = [...newSelection];
          } else if (bulkTagMode === 'add') {
            newSelection.forEach((tagId) => currentTags.add(tagId));
            nextTags = Array.from(currentTags);
          } else {
            newSelection.forEach((tagId) => currentTags.delete(tagId));
            nextTags = Array.from(currentTags);
          }
          return {
            ...card,
            tags: nextTags,
            updatedAt: Date.now(),
          };
        });
        setBulkTagModalOpen(false);
        setBulkSelectedCardIds(new Set());
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Failed to apply tags.');
      } finally {
        setBulkTagApplying(false);
      }
    },
    [bulkSelectedCardIds, bulkTagMode, patchCatalogCards]
  );

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
      if (shouldRefreshCollectionsAfterCardUpdate(updateData)) {
        await refreshCards();
      }
    },
    [refreshCards, upsertCatalogCard]
  );

  const onDeleteCard = useCallback(
    async (cardId: string) => {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      const data =
        res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as unknown);
      throwIfJsonApiFailed(res, data, 'Failed to delete card');
      removeCatalogCard(cardId);
      await refreshCards();
    },
    [refreshCards, removeCatalogCard]
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
          <span className={styles.studioCardFieldLabel}>Search title</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.studioCardSearchInput}
            placeholder="Type to filter…"
            aria-label="Search cards by title"
          />
        </label>
        <label className={styles.studioCardField}>
          <span className={styles.studioCardFieldLabel}>Type</span>
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
          <span className={styles.studioCardFieldLabel}>Display</span>
          <select
            value={displayModeFilter}
            onChange={(e) => setDisplayModeFilter(e.target.value as DisplayModeFilter)}
            className={styles.studioCardSelect}
            aria-label="Filter by display mode"
          >
            <option value="all">All modes</option>
            <option value="inline">Inline</option>
            <option value="navigate">Navigate</option>
            <option value="static">Static</option>
          </select>
        </label>
        <label className={styles.studioCardField}>
          <span className={styles.studioCardFieldLabel}>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
            className={styles.studioCardSelect}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label className={styles.studioCardField}>
          <span className={styles.studioCardFieldLabel}>Sort</span>
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
        <button type="button" className={styles.studioCardClearButton} onClick={handleClearAllFilters}>
          Clear
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
            Loading more cards… ({fullCatalog.length} loaded)
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
              >
                Edit
              </button>
              <button
                type="button"
                className={styles.studioTagsEditButton}
                aria-expanded={rulesExpanded}
                onClick={() => setRulesExpanded((open) => !open)}
              >
                Rules
              </button>
            </div>
          }
          footerContent={
            rulesExpanded ? (
              <div className={styles.studioRuleMatrix}>
                {Array.from(DIMENSION_KEYS).map((dimension) => {
                  const state = dimensionFilters[dimension];
                  const options = (allTags || []).filter((t) => t.dimension === dimension && t.docId);
                  return (
                    <div key={dimension} className={styles.studioRuleColumn}>
                      <div className={styles.studioRuleColumnTitle}>
                        {dimension[0]!.toUpperCase() + dimension.slice(1)}
                      </div>
                      <select
                        className={styles.studioCardSelect}
                        value={state.mode}
                        onChange={(e) =>
                          updateDimensionFilter(dimension, {
                            mode: e.target.value as DimensionFilterMode,
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
            ) : null
          }
        />
      </div>
      {loadingCatalog ? (
        <div className={styles.toolbar}>
        {loadingCatalog ? <span className={styles.catalogHint}>Loading catalog merge…</span> : null}
        </div>
      ) : null}

      <div className={cardAdminStyles.bulkActions}>
        <span>
          {bulkSelectedCardIds.size === 0
            ? 'No cards selected'
            : `${bulkSelectedCardIds.size} card(s) selected`}
        </span>
        {bulkSelectedCardIds.size > 0 ? (
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
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              className={`${cardAdminStyles.actionButton} ${cardAdminStyles.deleteButton}`}
            >
              Delete Selected
            </button>
          </div>
        ) : null}
      </div>
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
          studioCuratedTreeUnparentedRowTarget={studioDrag}
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
                      await onDeleteCard(card.docId);
                    } catch (err) {
                      window.alert(err instanceof Error ? err.message : 'An unknown error occurred.');
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

      <EditModal
        isOpen={bulkTagModalOpen}
        onClose={() => setBulkTagModalOpen(false)}
        title="Tags for selected cards"
      >
        <p className={mediaAdminStyles.bulkTagHint}>
          Choose how to apply tags, select tags, then click <strong>Save</strong>.
        </p>
        <div className={mediaAdminStyles.filterGroup}>
          <label htmlFor="studio-bulk-card-tag-mode">Bulk tag action:</label>
          <select
            id="studio-bulk-card-tag-mode"
            value={bulkTagMode}
            onChange={(e) => setBulkTagMode(e.target.value as 'add' | 'replace' | 'remove')}
            disabled={bulkTagApplying}
          >
            <option value="add">Add selected tags (keep existing)</option>
            <option value="replace">Replace all tags with selected</option>
            <option value="remove">Remove selected tags</option>
          </select>
        </div>
        <MacroTagSelector
          startExpanded
          onSaveSelection={handleSaveBulkTagSelection}
          onRequestClose={() => setBulkTagModalOpen(false)}
          selectedTags={(allTags || []).filter((t) => t.docId && pendingBulkTags.includes(t.docId!))}
          allTags={allTags || []}
          onChange={setPendingBulkTags}
        />
      </EditModal>
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

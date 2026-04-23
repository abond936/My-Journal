'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import CardAdminList from '@/components/admin/card-admin/CardAdminList';
import CardAdminGrid from '@/components/admin/card-admin/CardAdminGrid';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import EditModal from '@/components/admin/card-admin/EditModal';
import type { EmbeddedUnparentedBankContext } from '@/components/admin/collections/embeddedUnparentedBankContext';
import {
  listCuratedTreeAttachCandidates,
  mergeCardCatalogs,
} from '@/lib/utils/curatedTreeAttachCandidates';
import { getCuratedTreeMasterId } from '@/lib/config/curatedTreeDnd';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import { Card } from '@/lib/types/card';
import {
  DIMENSION_KEYS,
  type DimensionalTagIdMap,
  dimensionalTagMapHasFilters,
  groupSelectedTagIdsByDimension,
} from '@/lib/utils/tagUtils';
import { applyModifierSelection } from '@/lib/utils/adminListSelection';
import cardAdminStyles from '@/app/admin/card-admin/card-admin.module.css';
import mediaAdminStyles from '@/app/admin/media-admin/media-admin.module.css';
import styles from './StudioTreeCandidateCardBank.module.css';

const STUDIO_CANDIDATE_VIEW_KEY = 'studio-tree-candidate-bank-view';

type ViewMode = 'grid' | 'table';

type CandidateSort = 'titleAsc' | 'titleDesc' | 'createdDesc' | 'createdAsc';

type CardTypeFilter = 'all' | NonNullable<Card['type']>;
type DisplayModeFilter = 'all' | NonNullable<Card['displayMode']>;

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

export default function StudioTreeCandidateCardBank(props: EmbeddedUnparentedBankContext) {
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
  } = props;

  const { tags: allTags } = useTag();
  const [fullCatalog, setFullCatalog] = useState<Card[]>([]);
  const [catalogRefreshTick, setCatalogRefreshTick] = useState(0);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [bulkSelectedCardIds, setBulkSelectedCardIds] = useState<Set<string>>(() => new Set());
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [pendingBulkTags, setPendingBulkTags] = useState<string[]>([]);
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [bulkTagApplying, setBulkTagApplying] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    return window.localStorage.getItem(STUDIO_CANDIDATE_VIEW_KEY) === 'table' ? 'table' : 'grid';
  });
  const [sortMode, setSortMode] = useState<CandidateSort>('titleAsc');
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>('all');
  const [displayModeFilter, setDisplayModeFilter] = useState<DisplayModeFilter>('all');

  useEffect(() => {
    try {
      window.localStorage.setItem(STUDIO_CANDIDATE_VIEW_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  useEffect(() => {
    let cancelled = false;
    setLoadingCatalog(true);
    (async () => {
      try {
        const params = new URLSearchParams({
          limit: '2500',
          status: 'all',
          hydration: 'cover-only',
          sortBy: 'created',
          sortDir: 'desc',
        });
        const res = await fetch(`/api/cards?${params.toString()}`);
        const data = (await res.json().catch(() => ({}))) as { items?: Card[] };
        if (!cancelled && res.ok && Array.isArray(data.items)) {
          setFullCatalog(data.items);
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogRefreshTick]);

  const onCardTagDimensionalMap = useMemo(
    () => groupSelectedTagIdsByDimension(filterTagIds, allTags ?? []),
    [filterTagIds, allTags]
  );

  const selectedFilterTags = useMemo(
    () => (allTags ?? []).filter((t) => t.docId && filterTagIds.includes(t.docId!)),
    [allTags, filterTagIds]
  );

  const curatedTreeMasterId = getCuratedTreeMasterId();

  const matchesFilters = useCallback(
    (card: Card) => {
      const q = search.trim().toLowerCase();
      if (q && !(card.title || '').toLowerCase().includes(q)) return false;
      if (typeFilter !== 'all' && card.type !== typeFilter) return false;
      if (displayModeFilter !== 'all' && cardDisplayMode(card) !== displayModeFilter) return false;
      if (!cardMatchesOnCardDimensionalMap(card, onCardTagDimensionalMap)) return false;
      return true;
    },
    [search, typeFilter, displayModeFilter, onCardTagDimensionalMap]
  );

  const handleClearAllFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setSortMode('titleAsc');
    setTypeFilter('all');
    setDisplayModeFilter('all');
    setFilterTagIds([]);
    setBulkSelectedCardIds(new Set());
  }, [setSearch, setStatusFilter]);

  const mergedCatalog = useMemo(
    () => mergeCardCatalogs(fullCatalog, collectionCards),
    [fullCatalog, collectionCards]
  );

  const candidateCards = useMemo(() => {
    const raw = listCuratedTreeAttachCandidates(mergedCatalog, {
      curatedTreeMasterId,
      matchesFilters,
      statusFilter,
    });
    const base = [...raw];
    base.sort((a, b) => {
      switch (sortMode) {
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
    return base;
  }, [mergedCatalog, curatedTreeMasterId, matchesFilters, statusFilter, sortMode]);

  const orderedCandidateIds = useMemo(
    () => candidateCards.map((c) => c.docId).filter(Boolean) as string[],
    [candidateCards]
  );

  const handleBulkSelectCard = useCallback(
    (cardId: string, index: number, e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
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
        setBulkSelectedCardIds(new Set());
        setCatalogRefreshTick((t) => t + 1);
        await refreshCards();
      } catch (err) {
        console.error(`Error updating ${String(field)}:`, err);
        alert(`An error occurred while updating ${String(field)}.`);
        setCatalogRefreshTick((t) => t + 1);
        await refreshCards();
      }
    },
    [bulkSelectedCardIds, refreshCards]
  );

  const handleBulkDelete = useCallback(async () => {
    if (bulkSelectedCardIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${bulkSelectedCardIds.size} cards?`)) return;
    const idsToDelete = Array.from(bulkSelectedCardIds);
    setBulkSelectedCardIds(new Set());
    try {
      await Promise.all(idsToDelete.map((id) => fetch(`/api/cards/${id}`, { method: 'DELETE' })));
      setCatalogRefreshTick((t) => t + 1);
      await refreshCards();
    } catch (err) {
      console.error('Error deleting cards:', err);
      alert('An error occurred while deleting cards.');
      setCatalogRefreshTick((t) => t + 1);
      await refreshCards();
    }
  }, [bulkSelectedCardIds, refreshCards]);

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
        setBulkTagModalOpen(false);
        setBulkSelectedCardIds(new Set());
        setCatalogRefreshTick((t) => t + 1);
        await refreshCards();
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Failed to apply tags.');
      } finally {
        setBulkTagApplying(false);
      }
    },
    [bulkSelectedCardIds, bulkTagMode, refreshCards]
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
      await refreshCards();
      // Re-merge catalog so the table / grid `candidateCards` list shows new tags, etc.
      setCatalogRefreshTick((t) => t + 1);
    },
    [refreshCards]
  );

  const onDeleteCard = useCallback(
    async (cardId: string) => {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      const data =
        res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as unknown);
      throwIfJsonApiFailed(res, data, 'Failed to delete card');
      await refreshCards();
    },
    [refreshCards]
  );

  const studioDrag = Boolean(curatedTreeDnd);

  return (
    <div className={styles.root}>
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
            <option value="qa">Q&amp;A</option>
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
      </div>

      <div className={styles.studioCardMacroBlock}>
        <MacroTagSelector
          className={styles.studioCardMacroTagSelector}
          selectedTags={selectedFilterTags}
          allTags={allTags || []}
          onChange={(newIds) => setFilterTagIds(newIds)}
          collapsedSummary="sparseTrees"
        />
      </div>
      <div className={styles.toolbar} role="group" aria-label="Card list view">
        <div className={cardAdminStyles.viewToggleButtonGroup}>
          <button
            type="button"
            className={`${cardAdminStyles.viewToggleButton} ${viewMode === 'grid' ? cardAdminStyles.viewToggleActive : ''}`}
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
          >
            Grid
          </button>
          <button
            type="button"
            className={`${cardAdminStyles.viewToggleButton} ${viewMode === 'table' ? cardAdminStyles.viewToggleActive : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
          >
            Table
          </button>
        </div>
        {loadingCatalog ? <span className={styles.catalogHint}>Loading catalog merge…</span> : null}
      </div>

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
              <option value="qa">Set to Q&amp;A</option>
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

      {viewMode === 'table' ? (
        <CardAdminList
          cards={candidateCards}
          selectedCardIds={bulkSelectedCardIds}
          allTags={allTags || []}
          onSelectCard={handleBulkSelectCard}
          onSelectAll={handleSelectAll}
          onSaveScrollPosition={() => {}}
          onUpdateCard={onUpdateCard}
          onDeleteCard={onDeleteCard}
          studioCuratedTreeDrag={studioDrag}
          studioCuratedTreeUnparentedRowTarget={studioDrag}
          interactionDisabled={saving}
          hideDimensionMediaSuggestions
        />
      ) : (
        <CardAdminGrid
          cards={candidateCards}
          selectedCardIds={bulkSelectedCardIds}
          allTags={allTags || []}
          onSelectCard={handleBulkSelectCard}
          onSelectAll={handleSelectAll}
          onSaveScrollPosition={() => {}}
          onUpdateCard={onUpdateCard}
          onDeleteCard={onDeleteCard}
          studioCuratedTreeDrag={studioDrag}
          studioCuratedTreeUnparentedRowTarget={studioDrag}
          studioEmbedCellClickSelects
          onStudioFocusCard={onStudioSelectCard}
          interactionDisabled={saving}
          compactStudioGrid
        />
      )}

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
    </div>
  );
}

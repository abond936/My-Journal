'use client';

import React, { useLayoutEffect, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTag } from '@/components/providers/TagProvider';
import { useCardContext } from '@/components/providers/CardProvider';
import { Card } from '@/lib/types/card';
import styles from './card-admin.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CardAdminList from '@/components/admin/card-admin/CardAdminList';
import CardAdminGrid from '@/components/admin/card-admin/CardAdminGrid';
import CollectionsManagerPanel from '@/components/admin/card-admin/CollectionsManagerPanel';
import BulkEditTagsModal from '@/components/admin/card-admin/BulkEditTagsModal';
import ImportFolderModal from '@/components/admin/card-admin/ImportFolderModal';
import { sortAdminCards, type AdminCardSortMode } from '@/lib/utils/adminCardSort';
import {
  listCuratedTreeAttachCandidates,
  mergeCardCatalogs,
} from '@/lib/utils/curatedTreeAttachCandidates';
import { getCuratedTreeMasterId } from '@/lib/config/curatedTreeDnd';
import { applyModifierSelection } from '@/lib/utils/adminListSelection';

const CARD_VIEW_MODE_KEY = 'card-admin-view-mode';
/** Neighbor row in admin list order when the primary `scrollToCardId` row is removed (e.g. delete). */
const SCROLL_TO_CARD_IF_REMOVED_KEY = 'scrollToCardIdIfRemoved';
type ViewMode = 'grid' | 'table' | 'collections';

function intersectsAny(haystack: string[] | undefined, needles: string[]): boolean {
  if (!needles.length) return true;
  const set = new Set(haystack || []);
  return needles.some((id) => set.has(id));
}

export default function AdminCardsPage() {
  const router = useRouter();
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = localStorage.getItem(CARD_VIEW_MODE_KEY);
    return (saved === 'table' ? 'table' : 'grid') as ViewMode;
  });
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isImportFolderModalOpen, setIsImportFolderModalOpen] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [adminSortMode, setAdminSortMode] = useState<AdminCardSortMode>('whenDesc');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [displayCards, setDisplayCards] = useState<Card[]>([]);
  /** Full-card snapshot for curated-tree attach candidate filter (grid/table only). */
  const [fullCatalogForTree, setFullCatalogForTree] = useState<Card[]>([]);
  const [loadingFullCatalogForTree, setLoadingFullCatalogForTree] = useState(false);
  const [treeCandidateFilter, setTreeCandidateFilter] = useState(false);
  /** Admin page only: narrow visible rows by denormalized media-tag ids on each card (never sent to `/api/cards`). */
  const [adminMediaRowFilter, setAdminMediaRowFilter] = useState<{
    who: string;
    what: string;
    when: string;
    where: string;
  }>({ who: '', what: '', when: '', where: '' });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    tags: allTags,
    loading: tagsLoading,
    selectedFilterTagIds,
  } = useTag();

  const {
    cards,
    error,
    isLoading,
    loadingMore,
    hasMore,
    loadMore,
    mutate,
    searchTerm,
    status,
    setSearchTerm,
    setStatus,
    setPageLimit,
    isValidating,
    cardDimensionMissing,
    setCardDimensionMissing,
    cardType,
  } = useCardContext();

  const tagsByDimension = useMemo(() => {
    const source = allTags || [];
    return {
      who: source.filter((tag) => tag.dimension === 'who'),
      what: source.filter((tag) => String(tag.dimension) === 'what' || String(tag.dimension) === 'reflection'),
      when: source.filter((tag) => tag.dimension === 'when'),
      where: source.filter((tag) => tag.dimension === 'where'),
    };
  }, [allTags]);

  const dimensionalTagsForTree = useMemo(() => {
    const map: { who?: string[]; what?: string[]; when?: string[]; where?: string[] } = {};
    const all = allTags || [];
    selectedFilterTagIds.forEach((tagId) => {
      const tag = all.find((t) => t.docId === tagId);
      if (!tag?.dimension) return;
      const dim = String(tag.dimension) === 'reflection' ? 'what' : String(tag.dimension);
      if (dim !== 'who' && dim !== 'what' && dim !== 'when' && dim !== 'where') return;
      if (!map[dim]) map[dim] = [];
      map[dim]!.push(tagId);
    });
    return map;
  }, [selectedFilterTagIds, allTags]);

  const matchesTreeSidebarFilters = useCallback(
    (card: Card): boolean => {
      if (cardType && cardType !== 'all' && card.type !== cardType) return false;
      const q = searchTerm?.trim().toLowerCase();
      if (q) {
        const title = (card.title || '').toLowerCase();
        if (!title.includes(q)) return false;
      }
      const { who, what, when, where } = dimensionalTagsForTree;
      if (who?.length && !intersectsAny(card.who, who)) return false;
      if (what?.length && !intersectsAny(card.what, what)) return false;
      if (when?.length && !intersectsAny(card.when, when)) return false;
      if (where?.length && !intersectsAny(card.where, where)) return false;
      return true;
    },
    [cardType, searchTerm, dimensionalTagsForTree]
  );

  const matchesDimensionMissingRow = useCallback(
    (card: Card) => {
      const m = cardDimensionMissing;
      if (m.who && (card.who?.length ?? 0) > 0) return false;
      if (m.what && (card.what?.length ?? 0) > 0) return false;
      if (m.when && (card.when?.length ?? 0) > 0) return false;
      if (m.where && (card.where?.length ?? 0) > 0) return false;
      return true;
    },
    [cardDimensionMissing]
  );

  // Set the desired page limit for the admin section
  useEffect(() => {
    setPageLimit(50);
    // On unmount, reset to the default
    return () => {
      setPageLimit(20);
    };
  }, [setPageLimit]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CARD_VIEW_MODE_KEY, viewMode);
    }
  }, [viewMode]);

  // --- Scroll Restoration ---
  const prevIsValidating = useRef(true);
  const stickyTopRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      const stickyEl = stickyTopRef.current;
      if (!tabsEl || !stickyEl) return;
      const tabsHeight = tabsEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsHeight}px`);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  
  useEffect(() => {
    if (prevIsValidating.current && !isValidating) {
      const primary = sessionStorage.getItem('scrollToCardId');
      const fallback = sessionStorage.getItem(SCROLL_TO_CARD_IF_REMOVED_KEY);
      const tryScroll = (id: string) => {
        const element = document.getElementById(`card-${id}`);
        if (!element) return false;
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sessionStorage.removeItem('scrollToCardId');
          sessionStorage.removeItem(SCROLL_TO_CARD_IF_REMOVED_KEY);
        }, 100);
        return true;
      };
      if (primary && tryScroll(primary)) {
        // ok
      } else if (fallback && tryScroll(fallback)) {
        // primary row gone (e.g. deleted) — stay near same list position
      }
    }
    prevIsValidating.current = isValidating;
  }, [isValidating]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedCardIds(new Set());
  }, [
    searchTerm,
    status,
    cardDimensionMissing,
    adminMediaRowFilter.who,
    adminMediaRowFilter.what,
    adminMediaRowFilter.when,
    adminMediaRowFilter.where,
    treeCandidateFilter,
  ]);

  useEffect(() => {
    if (!treeCandidateFilter) return;
    let cancelled = false;
    setLoadingFullCatalogForTree(true);
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
          setFullCatalogForTree(data.items);
        }
      } finally {
        if (!cancelled) setLoadingFullCatalogForTree(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [treeCandidateFilter]);

  useEffect(() => {
    setSearchInputValue(searchTerm);
  }, [searchTerm]);

  const handleSearchInput = useCallback((value: string) => {
    setSearchInputValue(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchTerm(value);
    }, 300);
  }, [setSearchTerm]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !tagsLoading) {
      setHasLoadedOnce(true);
    }
  }, [isLoading, tagsLoading]);

  const handleBulkUpdate = async (field: keyof Card, value: string) => {
    const confirmMessage = `Are you sure you want to update ${field} for ${selectedCardIds.size} selected cards?`;
    if (!confirm(confirmMessage)) return;
    
    const updates = Array.from(selectedCardIds).map(id => ({
      id,
      update: { [field]: value }
    }));
    
    try {
      await Promise.all(
        updates.map(({ id, update }) =>
          fetch(`/api/cards/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          })
        )
      );
      mutate(undefined, { revalidate: true }); // Revalidate from server
      setSelectedCardIds(new Set()); // Clear selections after successful update
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      alert(`An error occurred while updating ${field}. Reverting changes.`);
      mutate(undefined, { revalidate: true }); // Revert on error
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCardIds.size} cards?`)) return;
    
    const idsToDelete = Array.from(selectedCardIds);
    setSelectedCardIds(new Set());
    
    try {
      await Promise.all(idsToDelete.map(id => fetch(`/api/cards/${id}`, { method: 'DELETE' })));
      mutate(undefined, { revalidate: true }); // Revalidate after deleting
    } catch (err) {
      console.error('Error deleting cards:', err);
      alert('An error occurred while deleting cards. Reverting changes.');
      mutate(undefined, { revalidate: true });
    }
  };

  const handleBulkApplyMediaSuggestions = async () => {
    if (selectedCardIds.size === 0) return;
    const selectedCards = displayCards.filter((card) => selectedCardIds.has(card.docId));
    if (selectedCards.length === 0) return;
    const updates = selectedCards
      .map((card) => {
        const suggestions = [
          ...(card.mediaWho || []),
          ...(card.mediaWhat || []),
          ...(card.mediaWhen || []),
          ...(card.mediaWhere || []),
        ].filter((tagId) => !(card.tags || []).includes(tagId));
        if (!suggestions.length) return null;
        const nextTags = Array.from(new Set([...(card.tags || []), ...suggestions]));
        return { id: card.docId, tags: nextTags };
      })
      .filter((entry): entry is { id: string; tags: string[] } => Boolean(entry));

    if (!updates.length) {
      alert('No media suggestions available on selected cards.');
      return;
    }

    try {
      await Promise.all(
        updates.map((entry) =>
          fetch(`/api/cards/${entry.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: entry.tags }),
          })
        )
      );
      await mutate(undefined, { revalidate: true });
      setSelectedCardIds(new Set());
    } catch (error) {
      console.error('Failed to apply media suggestions in bulk', error);
      alert('Failed to apply media suggestions. Please retry.');
      await mutate(undefined, { revalidate: true });
    }
  };

  const handleUpdateCard = async (cardId: string, updateData: Partial<Card>) => {
    try {
      // Keep the edited row in view after SWR revalidation.
      onSaveScrollPosition(cardId);
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update card.');
      }
      const updatedCard = (await response.json()) as Card;

      // Patch the updated card into current SWR pages to avoid full-table refetch/repaint.
      // Overlay `updateData` last so `tags` and other fields always reflect the PATCH the client
      // sent if the JSON body omits a key (e.g. serialization) or the merge would otherwise
      // keep a stale in-memory row.
      await mutate(
        (current) => {
          if (!current) return current;
          return current.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.docId !== cardId) return item;
              return {
                ...item,
                ...updatedCard,
                ...updateData,
                docId: item.docId,
              };
            }),
          }));
        },
        { revalidate: false }
      );
    } catch (err) {
      console.error(`Error updating card ${cardId}:`, err);
      // It's good practice to inform the user and maybe revert UI changes
      alert(`An error occurred while updating the card. Please refresh and try again.`);
      // Re-fetch data to ensure UI consistency
      await mutate(undefined, { revalidate: true });
      throw err; // Re-throw to allow caller to handle it
    }
  };

  const sortedCards = useMemo(
    () => sortAdminCards([...cards], adminSortMode, allTags || []),
    [cards, adminSortMode, allTags]
  );

  const adminVisibleRows = useMemo(() => {
    return sortedCards.filter((card) => {
      const f = adminMediaRowFilter;
      if (f.who && !(card.mediaWho || []).includes(f.who)) return false;
      if (f.what && !(card.mediaWhat || []).includes(f.what)) return false;
      if (f.when && !(card.mediaWhen || []).includes(f.when)) return false;
      if (f.where && !(card.mediaWhere || []).includes(f.where)) return false;
      return true;
    });
  }, [sortedCards, adminMediaRowFilter]);

  const mergedCatalogForTree = useMemo(() => {
    if (!treeCandidateFilter || !fullCatalogForTree.length) return [];
    return mergeCardCatalogs(fullCatalogForTree, cards);
  }, [treeCandidateFilter, fullCatalogForTree, cards]);

  const treeCandidateRows = useMemo(() => {
    if (!treeCandidateFilter || !mergedCatalogForTree.length) return [];
    const candidates = listCuratedTreeAttachCandidates(mergedCatalogForTree, {
      curatedTreeMasterId: getCuratedTreeMasterId(),
      matchesFilters: matchesTreeSidebarFilters,
      statusFilter: status,
    });
    const afterMissing = candidates.filter(matchesDimensionMissingRow);
    const afterMedia = afterMissing.filter((card) => {
      const f = adminMediaRowFilter;
      if (f.who && !(card.mediaWho || []).includes(f.who)) return false;
      if (f.what && !(card.mediaWhat || []).includes(f.what)) return false;
      if (f.when && !(card.mediaWhen || []).includes(f.when)) return false;
      if (f.where && !(card.mediaWhere || []).includes(f.where)) return false;
      return true;
    });
    return sortAdminCards(afterMedia, adminSortMode, allTags || []);
  }, [
    treeCandidateFilter,
    mergedCatalogForTree,
    matchesTreeSidebarFilters,
    status,
    matchesDimensionMissingRow,
    adminMediaRowFilter,
    adminSortMode,
    allTags,
  ]);

  const listForDisplay = useMemo(() => {
    if (!treeCandidateFilter) return adminVisibleRows;
    return treeCandidateRows;
  }, [treeCandidateFilter, adminVisibleRows, treeCandidateRows]);

  const handleSelectCard = useCallback(
    (cardId: string, index: number, e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const orderedIds = listForDisplay.map((c) => c.docId).filter(Boolean) as string[];
      applyModifierSelection({
        orderedIds,
        id: cardId,
        index,
        modifiers: e,
        selected: Array.from(selectedCardIds),
        setSelected: (ids) => setSelectedCardIds(new Set(ids)),
        anchorIndexRef: selectionAnchorIndexRef,
      });
    },
    [listForDisplay, selectedCardIds]
  );

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(listForDisplay.map((c) => c.docId).filter(Boolean) as string[]);
      setSelectedCardIds(allIds);
      selectionAnchorIndexRef.current = listForDisplay.length > 0 ? listForDisplay.length - 1 : null;
    } else {
      setSelectedCardIds(new Set());
      selectionAnchorIndexRef.current = null;
    }
  }, [listForDisplay]);

  const onSaveScrollPosition = useCallback((cardId: string) => {
    sessionStorage.setItem('scrollToCardId', cardId);
    const idx = listForDisplay.findIndex((c) => c.docId === cardId);
    const neighbor =
      idx > 0
        ? listForDisplay[idx - 1]!.docId
        : idx >= 0 && idx + 1 < listForDisplay.length
          ? listForDisplay[idx + 1]!.docId
          : '';
    if (neighbor) sessionStorage.setItem(SCROLL_TO_CARD_IF_REMOVED_KEY, neighbor);
    else sessionStorage.removeItem(SCROLL_TO_CARD_IF_REMOVED_KEY);
  }, [listForDisplay]);

  useEffect(() => {
    const activelySearching = Boolean(searchInputValue.trim()) && isValidating;
    if (!activelySearching) {
      setDisplayCards(listForDisplay);
      return;
    }
    // Keep current rows visible while next title-only search request is in flight.
    if (listForDisplay.length > 0) {
      setDisplayCards(listForDisplay);
      return;
    }
    setDisplayCards([]);
  }, [listForDisplay, isValidating, searchInputValue]);

  const handleDeleteCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete card.');
      }
      // Refresh the list without page reload
      await mutate(undefined, { revalidate: true });
    } catch (err) {
      console.error(`Error deleting card ${cardId}:`, err);
      throw err; // Re-throw to allow caller to handle it
    }
  };

  if (!hasLoadedOnce && (isLoading || tagsLoading)) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>{error.message || 'Failed to load cards.'}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop} ref={stickyTopRef}>
        <div className={styles.header}>
          <h1 className={styles.title}>Cards Management</h1>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setIsImportFolderModalOpen(true)}
          >
            Import Folder
          </button>
        </div>

        <div className={styles.viewToggleBar}>
          <span className={styles.viewToggleButtonGroup}>
            <button
              type="button"
              className={`${styles.viewToggleButton} ${viewMode === 'grid' ? styles.viewToggleActive : ''}`}
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
            >
              Grid
            </button>
            <button
              type="button"
              className={`${styles.viewToggleButton} ${viewMode === 'table' ? styles.viewToggleActive : ''}`}
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
            >
              Table
            </button>
          </span>
          <div className={styles.viewToggleSupplementary}>
            <button
              type="button"
              className={`${styles.viewToggleButton} ${styles.viewToggleButtonSupplementary} ${
                viewMode === 'collections' ? styles.viewToggleActive : ''
              }`}
              onClick={() => setViewMode('collections')}
              aria-pressed={viewMode === 'collections'}
            >
              Collections
            </button>
            <span className={styles.viewToggleStudioHint}>
              Prefer <Link href="/admin/studio">Studio</Link> for tree + cards + media together; use this for
              full-page curated work when needed.
            </span>
          </div>
        </div>

        {viewMode !== 'collections' && (
        <div className={styles.filterSection}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search cards..."
              value={searchInputValue}
              onChange={e => handleSearchInput(e.target.value)}
              className={styles.searchBox}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  setSearchTerm(searchInputValue);
                }
              }}
            />
            {searchInputValue && (
              <button
                type="button"
                onClick={() => {
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  setSearchInputValue('');
                  setSearchTerm('');
                }}
                className={styles.actionButton}
                style={{ padding: '0.5rem 0.75rem', lineHeight: 1 }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <select
              value={status}
              onChange={e => setStatus(e.target.value as typeof status)}
              className={styles.filterSelect}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <select
              value={adminSortMode}
              onChange={e => setAdminSortMode(e.target.value as AdminCardSortMode)}
              className={styles.filterSelect}
            >
              <option value="whenDesc">When (Desc)</option>
              <option value="whenAsc">When (Asc)</option>
              <option value="createdDesc">Created (Desc)</option>
              <option value="createdAsc">Created (Asc)</option>
              <option value="titleAsc">Title (A-Z)</option>
              <option value="titleDesc">Title (Z-A)</option>
              <option value="whoAsc">Who (A-Z)</option>
              <option value="whatAsc">What (A-Z)</option>
              <option value="whereAsc">Where (A-Z)</option>
            </select>
            <select
              value={cardDimensionMissing.who ? 'missing' : ''}
              onChange={(e) => setCardDimensionMissing('who', e.target.value === 'missing')}
              className={styles.filterSelect}
            >
              <option value="">Card Who: Any</option>
              <option value="missing">Card Who: No tags</option>
            </select>
            <select
              value={cardDimensionMissing.what ? 'missing' : ''}
              onChange={(e) => setCardDimensionMissing('what', e.target.value === 'missing')}
              className={styles.filterSelect}
            >
              <option value="">Card What: Any</option>
              <option value="missing">Card What: No tags</option>
            </select>
            <select
              value={cardDimensionMissing.when ? 'missing' : ''}
              onChange={(e) => setCardDimensionMissing('when', e.target.value === 'missing')}
              className={styles.filterSelect}
            >
              <option value="">Card When: Any</option>
              <option value="missing">Card When: No tags</option>
            </select>
            <select
              value={cardDimensionMissing.where ? 'missing' : ''}
              onChange={(e) => setCardDimensionMissing('where', e.target.value === 'missing')}
              className={styles.filterSelect}
            >
              <option value="">Card Where: Any</option>
              <option value="missing">Card Where: No tags</option>
            </select>
            <select
              title="This page only — rows whose aggregated media tags include this id. Does not change the main card feed API."
              value={adminMediaRowFilter.who}
              onChange={(e) =>
                setAdminMediaRowFilter((prev) => ({ ...prev, who: e.target.value }))
              }
              className={styles.filterSelect}
            >
              <option value="">Media Who: Any</option>
              {tagsByDimension.who.map((tag) => (
                <option key={tag.docId} value={tag.docId!}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select
              title="This page only — rows whose aggregated media tags include this id. Does not change the main card feed API."
              value={adminMediaRowFilter.what}
              onChange={(e) =>
                setAdminMediaRowFilter((prev) => ({ ...prev, what: e.target.value }))
              }
              className={styles.filterSelect}
            >
              <option value="">Media What: Any</option>
              {tagsByDimension.what.map((tag) => (
                <option key={tag.docId} value={tag.docId!}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select
              title="This page only — rows whose aggregated media tags include this id. Does not change the main card feed API."
              value={adminMediaRowFilter.when}
              onChange={(e) =>
                setAdminMediaRowFilter((prev) => ({ ...prev, when: e.target.value }))
              }
              className={styles.filterSelect}
            >
              <option value="">Media When: Any</option>
              {tagsByDimension.when.map((tag) => (
                <option key={tag.docId} value={tag.docId!}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select
              title="This page only — rows whose aggregated media tags include this id. Does not change the main card feed API."
              value={adminMediaRowFilter.where}
              onChange={(e) =>
                setAdminMediaRowFilter((prev) => ({ ...prev, where: e.target.value }))
              }
              className={styles.filterSelect}
            >
              <option value="">Media Where: Any</option>
              {tagsByDimension.where.map((tag) => (
                <option key={tag.docId} value={tag.docId!}>
                  {tag.name}
                </option>
              ))}
            </select>
            {isValidating && searchInputValue.trim() && (
              <span className={styles.searchingHint} aria-live="polite">
                Searching...
              </span>
            )}
            <label className={styles.treeCandidateToggle}>
              <input
                type="checkbox"
                checked={treeCandidateFilter}
                onChange={(e) => setTreeCandidateFilter(e.target.checked)}
              />
              Tree attach candidates
            </label>
            {treeCandidateFilter && loadingFullCatalogForTree ? (
              <span className={styles.searchingHint} aria-live="polite">
                Loading catalog…
              </span>
            ) : null}
          </div>
        </div>
        )}
        
        {viewMode !== 'collections' && (
        <div className={styles.bulkActions}>
          <span>
            {selectedCardIds.size === 0
              ? 'No cards selected'
              : `${selectedCardIds.size} card(s) selected`}
          </span>
          <div className={styles.actions}>
            <select
              onChange={e => handleBulkUpdate('status', e.target.value)}
              className={styles.filterSelect}
              defaultValue=""
              disabled={selectedCardIds.size === 0}
            >
              <option value="" disabled>Update Status</option>
              <option value="draft">Set to Draft</option>
              <option value="published">Set to Published</option>
            </select>
            <select
              onChange={e => handleBulkUpdate('type', e.target.value)}
              className={styles.filterSelect}
              defaultValue=""
              disabled={selectedCardIds.size === 0}
            >
              <option value="" disabled>Update Type</option>
              <option value="story">Set to Story</option>
              <option value="qa">Set to Q&A</option>
              <option value="quote">Set to Quote</option>
              <option value="callout">Set to Callout</option>
              <option value="gallery">Set to Gallery</option>
            </select>
            <select
              onChange={e => handleBulkUpdate('displayMode', e.target.value)}
              className={styles.filterSelect}
              defaultValue=""
              disabled={selectedCardIds.size === 0}
            >
              <option value="" disabled>Update Display Mode</option>
              <option value="inline">Set to Inline</option>
              <option value="navigate">Set to Navigate</option>
              <option value="static">Set to Static</option>
            </select>
            <button 
              onClick={() => setIsBulkTagModalOpen(true)} 
              className={styles.actionButton}
              disabled={selectedCardIds.size === 0}
            >
              Edit Tags
            </button>
            <button
              type="button"
              onClick={() => void handleBulkApplyMediaSuggestions()}
              className={styles.actionButton}
              disabled={selectedCardIds.size === 0}
            >
              Apply Media Suggestions
            </button>
            <button 
              onClick={handleBulkDelete} 
              className={`${styles.actionButton} ${styles.deleteButton}`}
              disabled={selectedCardIds.size === 0}
            >
              Delete Selected
            </button>
          </div>
        </div>
        )}
      </div>

      {viewMode === 'grid' ? (
        <CardAdminGrid
          cards={displayCards}
          selectedCardIds={selectedCardIds}
          allTags={allTags || []}
          onSelectCard={handleSelectCard}
          onSelectAll={handleSelectAll}
          onSaveScrollPosition={onSaveScrollPosition}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
        />
      ) : viewMode === 'table' ? (
        <CardAdminList
          cards={displayCards}
          selectedCardIds={selectedCardIds}
          allTags={allTags || []}
          onSelectCard={handleSelectCard}
          onSelectAll={handleSelectAll}
          onSaveScrollPosition={onSaveScrollPosition}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
        />
      ) : (
        <CollectionsManagerPanel
          cards={viewMode === 'collections' ? adminVisibleRows : displayCards}
          collectionsActive={viewMode === 'collections'}
        />
      )}

      {viewMode !== 'collections' && hasMore && !treeCandidateFilter && (
        <div className={styles.loadMoreContainer}>
          <button onClick={loadMore} disabled={loadingMore} className={styles.loadMoreButton}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      <BulkEditTagsModal
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        cardIds={Array.from(selectedCardIds)}
        onSave={async ({ cardIds, addTagIds, removeTagIds }) => {
          const add = new Set(addTagIds);
          const remove = new Set(removeTagIds);
          await mutate((currentPages) => {
            if (!currentPages) return currentPages;
            const targetIds = new Set(cardIds);
            return currentPages.map((page) => ({
              ...page,
              items: page.items.map((card) => {
                if (!targetIds.has(card.docId)) return card;
                const nextTags = new Set(card.tags || []);
                add.forEach((tagId) => nextTags.add(tagId));
                remove.forEach((tagId) => nextTags.delete(tagId));
                return {
                  ...card,
                  tags: Array.from(nextTags),
                };
              }),
            }));
          }, { revalidate: false });
          setSelectedCardIds(new Set()); // Clear selections after successful tag update
        }}
      />

      <ImportFolderModal
        isOpen={isImportFolderModalOpen}
        onClose={() => setIsImportFolderModalOpen(false)}
        onSuccess={async (cardId) => {
          await mutate(undefined, { revalidate: true });
          setIsImportFolderModalOpen(false);
          router.push(`/admin/card-admin/${cardId}/edit`);
        }}
      />
    </div>
  );
}

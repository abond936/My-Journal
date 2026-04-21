'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import CardAdminList from '@/components/admin/card-admin/CardAdminList';
import CardAdminGrid from '@/components/admin/card-admin/CardAdminGrid';
import type { EmbeddedUnparentedBankContext } from '@/components/admin/collections/embeddedUnparentedBankContext';
import {
  listCuratedTreeAttachCandidates,
  mergeCardCatalogs,
} from '@/lib/utils/curatedTreeAttachCandidates';
import { getCuratedTreeMasterId } from '@/lib/config/curatedTreeDnd';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_KEYS } from '@/lib/utils/tagUtils';
import cardAdminStyles from '@/app/admin/card-admin/card-admin.module.css';
import styles from './StudioTreeCandidateCardBank.module.css';

const STUDIO_CANDIDATE_VIEW_KEY = 'studio-tree-candidate-bank-view';

type ViewMode = 'grid' | 'table';

type CandidateSort = 'titleAsc' | 'titleDesc' | 'createdDesc' | 'createdAsc';

type DimensionKey = (typeof DIMENSION_KEYS)[number];

const EMPTY_DIM_TAG: Record<DimensionKey, string> = {
  who: '',
  what: '',
  when: '',
  where: '',
};

const MEDIA_DIM_KEY: Record<DimensionKey, keyof Card> = {
  who: 'mediaWho',
  what: 'mediaWhat',
  when: 'mediaWhen',
  where: 'mediaWhere',
};

function tagsForDimension(allTags: Tag[], dimension: DimensionKey): Tag[] {
  return allTags.filter((t) => {
    if (!t.docId) return false;
    const dim = t.dimension === 'reflection' ? 'what' : t.dimension;
    return dim === dimension;
  });
}

function cardHasAssignedDimensionTag(card: Card, dimension: DimensionKey, tagId: string): boolean {
  const arr = (card[dimension] as string[] | undefined) ?? [];
  return arr.includes(tagId);
}

function cardHasMediaDerivedDimensionTag(card: Card, dimension: DimensionKey, tagId: string): boolean {
  const key = MEDIA_DIM_KEY[dimension];
  const arr = (card[key] as string[] | undefined) ?? [];
  return arr.includes(tagId);
}

function dimensionTitle(dimension: DimensionKey): string {
  return dimension === 'who'
    ? 'Who'
    : dimension === 'what'
      ? 'What'
      : dimension === 'when'
        ? 'When'
        : 'Where';
}

export default function StudioTreeCandidateCardBank(props: EmbeddedUnparentedBankContext) {
  const {
    refreshCards,
    collectionCards,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedCardId,
    onSelectCard,
    saving,
    curatedTreeDnd,
  } = props;

  const { tags: allTags } = useTag();
  const [fullCatalog, setFullCatalog] = useState<Card[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    return window.localStorage.getItem(STUDIO_CANDIDATE_VIEW_KEY) === 'table' ? 'table' : 'grid';
  });
  const [sortMode, setSortMode] = useState<CandidateSort>('titleAsc');
  const [cardDimTagId, setCardDimTagId] = useState<Record<DimensionKey, string>>(() => ({ ...EMPTY_DIM_TAG }));
  const [mediaOnCardDimTagId, setMediaOnCardDimTagId] = useState<Record<DimensionKey, string>>(() => ({
    ...EMPTY_DIM_TAG,
  }));

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
  }, []);

  const curatedTreeMasterId = getCuratedTreeMasterId();

  const matchesFilters = useCallback(
    (card: Card) => {
      const q = search.trim().toLowerCase();
      if (q && !(card.title || '').toLowerCase().includes(q)) return false;
      for (const dim of DIMENSION_KEYS) {
        const onCard = cardDimTagId[dim];
        if (onCard && !cardHasAssignedDimensionTag(card, dim, onCard)) return false;
        const onMedia = mediaOnCardDimTagId[dim];
        if (onMedia && !cardHasMediaDerivedDimensionTag(card, dim, onMedia)) return false;
      }
      return true;
    },
    [search, cardDimTagId, mediaOnCardDimTagId]
  );

  const clearTagFilters = useCallback(() => {
    setCardDimTagId({ ...EMPTY_DIM_TAG });
    setMediaOnCardDimTagId({ ...EMPTY_DIM_TAG });
  }, []);

  const tagFiltersActive = useMemo(
    () =>
      DIMENSION_KEYS.some((d) => Boolean(cardDimTagId[d]) || Boolean(mediaOnCardDimTagId[d])),
    [cardDimTagId, mediaOnCardDimTagId]
  );

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

  const selectedSet = useMemo(
    () => new Set(selectedCardId ? [selectedCardId] : []),
    [selectedCardId]
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

  const noopSelectAll = useCallback((_e: React.ChangeEvent<HTMLInputElement>) => {}, []);

  const studioDrag = Boolean(curatedTreeDnd);

  return (
    <div className={styles.root}>
      <h3 className={styles.studioCardFiltersHeading}>Filter cards</h3>
      <div className={styles.studioCardFilters} role="search">
        <label className={styles.studioCardField}>
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
      </div>
      <p className={styles.studioCardDimSectionLabel}>Tags on card vs on attached media</p>
      <div className={styles.studioCardDimMatrix}>
        {DIMENSION_KEYS.map((dimension) => {
          const options = tagsForDimension(allTags || [], dimension);
          const title = dimensionTitle(dimension);
          return (
            <div key={dimension} className={styles.studioCardDimColumn}>
              <div className={styles.studioCardDimColumnTitle}>{title}</div>
              <label className={styles.studioCardDimField}>
                <span className={styles.studioCardDimBadge}>On card</span>
                <select
                  className={styles.studioCardDimSelect}
                  value={cardDimTagId[dimension]}
                  aria-label={`${title} tag on card`}
                  onChange={(e) =>
                    setCardDimTagId((prev) => ({ ...prev, [dimension]: e.target.value }))
                  }
                >
                  <option value="">Any</option>
                  {options.map((tag) => (
                    <option key={tag.docId} value={tag.docId!}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.studioCardDimField}>
                <span className={styles.studioCardDimBadge}>On media</span>
                <select
                  className={styles.studioCardDimSelect}
                  value={mediaOnCardDimTagId[dimension]}
                  aria-label={`${title} tag from card’s media`}
                  onChange={(e) =>
                    setMediaOnCardDimTagId((prev) => ({ ...prev, [dimension]: e.target.value }))
                  }
                >
                  <option value="">Any</option>
                  {options.map((tag) => (
                    <option key={tag.docId} value={tag.docId!}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </div>
      {tagFiltersActive ? (
        <div className={styles.studioCardTagFilterActions}>
          <button type="button" className={styles.studioCardClearTagsButton} onClick={clearTagFilters}>
            Clear tag filters
          </button>
        </div>
      ) : null}
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
      {viewMode === 'table' ? (
        <CardAdminList
          cards={candidateCards}
          selectedCardIds={selectedSet}
          allTags={allTags || []}
          onSelectCard={onSelectCard}
          onSelectAll={noopSelectAll}
          onSaveScrollPosition={() => {}}
          onUpdateCard={onUpdateCard}
          onDeleteCard={onDeleteCard}
          studioCuratedTreeDrag={studioDrag}
          studioCuratedTreeUnparentedRowTarget={studioDrag}
          hideBulkSelectHeader
          interactionDisabled={saving}
        />
      ) : (
        <CardAdminGrid
          cards={candidateCards}
          selectedCardIds={selectedSet}
          allTags={allTags || []}
          onSelectCard={onSelectCard}
          onSelectAll={noopSelectAll}
          onSaveScrollPosition={() => {}}
          onUpdateCard={onUpdateCard}
          onDeleteCard={onDeleteCard}
          studioCuratedTreeDrag={studioDrag}
          studioCuratedTreeUnparentedRowTarget={studioDrag}
          studioEmbedCellClickSelects
          hideBulkSelectRow
          interactionDisabled={saving}
          compactStudioGrid
        />
      )}
    </div>
  );
}

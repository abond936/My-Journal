'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTag } from '@/components/providers/TagProvider';
import { useCardContext, type FeedSortOrder } from '@/components/providers/CardProvider';
import TagTree from '@/components/common/TagTree';
import { filterTreesBySearch } from '@/lib/utils/tagUtils';
import { groupCollectionsByDimension } from '@/lib/utils/cardUtils';
import styles from './GlobalSidebar.module.css';

interface GlobalSidebarProps {
  isOpen: boolean;
}

export default function GlobalSidebar({ isOpen }: GlobalSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const [browseMode, setBrowseMode] = useState<'freeform' | 'curated'>(() => {
    if (typeof window === 'undefined') return 'freeform';
    const saved = sessionStorage.getItem('myjournal-sidebar-browse-mode');
    return saved === 'curated' ? 'curated' : 'freeform';
  });
  const {
    tags,
    loading: tagsLoading,
    selectedFilterTagIds,
    setFilterTags,
    dimensionTree,
    masterTree,
    updateTag,
  } = useTag();

  const [tagSearch, setTagSearch] = useState('');

  const {
    cardType,
    setCardType,
    activeDimension,
    setActiveDimension,
    collectionId,
    setCollectionId,
    collectionCards,
    feedSort,
    setFeedSort,
    clearFilters,
  } = useCardContext();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const handleSetDefaultExpanded = useCallback(
    (tagId: string, expanded: boolean) => {
      updateTag(tagId, { defaultExpanded: expanded });
    },
    [updateTag]
  );

  const cardTypeLabels: Record<string, string> = {
    story: 'Story',
    qa: 'Q&A',
    quote: 'Quote',
    callout: 'Callout',
    gallery: 'Gallery',
  };

  const hasActiveFilters = cardType !== 'all' || selectedFilterTagIds.length > 0;

  const removeCardTypeFilter = () => setCardType('all');
  const removeTagFilter = (tagId: string) => {
    setFilterTags(selectedFilterTagIds.filter(id => id !== tagId));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const DIMENSION_TABS = [
    { id: 'all', label: 'All' },
    { id: 'who', label: 'Who' },
    { id: 'what', label: 'What' },
    { id: 'when', label: 'When' },
    { id: 'where', label: 'Where' },
    { id: 'reflection', label: 'Reflection' },
  ] as const;

  const dimensionTreeForTab =
    activeDimension === 'collections'
      ? []
      : activeDimension === 'all'
        ? masterTree
        : (dimensionTree[activeDimension] ?? []);

  const isCollectionsMode = browseMode === 'curated';
  const isTagMode = !isCollectionsMode;

  const collectionsByDimension = useMemo(
    () => groupCollectionsByDimension(collectionCards),
    [collectionCards]
  );

  const DIMENSION_GROUP_ORDER = ['who', 'what', 'when', 'where', 'reflection', 'uncategorized'] as const;

  const filteredTagTree = useMemo(
    () => filterTreesBySearch(dimensionTreeForTab, tagSearch),
    [dimensionTreeForTab, tagSearch]
  );

  const handleSelectionChange = (tagId: string, isSelected: boolean) => {
    const newSelection = isSelected
      ? (selectedFilterTagIds.includes(tagId) ? selectedFilterTagIds : [...selectedFilterTagIds, tagId])
      : selectedFilterTagIds.filter(id => id !== tagId);
    setFilterTags(newSelection);
  };

  const handleClearFiltersClick = () => {
    clearFilters();
    if (browseMode === 'curated') {
      setCollectionId(null);
      setActiveDimension('collections');
      return;
    }
    setActiveDimension('all');
  };

  const handleSetBrowseMode = (nextMode: 'freeform' | 'curated') => {
    setBrowseMode(nextMode);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('myjournal-sidebar-browse-mode', nextMode);
    }
    if (nextMode === 'curated') {
      setActiveDimension('collections');
      return;
    }
    if (activeDimension === 'collections') {
      setCollectionId(null);
      setActiveDimension('all');
    }
  };

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
      <h2 className={styles.title}>Explore</h2>
      {mounted && (
        <>
          <div className={styles.modeTabs} role="tablist" aria-label="Browsing mode">
            <button
              type="button"
              role="tab"
              aria-selected={browseMode === 'freeform'}
              className={`${styles.modeTab} ${browseMode === 'freeform' ? styles.modeTabActive : ''}`}
              onClick={() => handleSetBrowseMode('freeform')}
            >
              Freeform
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={browseMode === 'curated'}
              className={`${styles.modeTab} ${browseMode === 'curated' ? styles.modeTabActive : ''}`}
              onClick={() => handleSetBrowseMode('curated')}
            >
              Curated
            </button>
          </div>
          {isTagMode ? (
            <>
              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionHeading}>Card type</h3>
                <select
                  id="card-type-filter"
                  value={cardType}
                  onChange={e => setCardType(e.target.value as typeof cardType)}
                  className={styles.compactControl}
                  aria-label="Filter by card type"
                >
                  <option value="all">All Types</option>
                  <option value="story">Story</option>
                  <option value="qa">Q&A</option>
                  <option value="quote">Quote</option>
                  <option value="callout">Callout</option>
                  <option value="gallery">Gallery</option>
                </select>
              </div>

              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionHeading}>Tags</h3>
                <div className={styles.dimensionsBlock}>
                  <span className={styles.dimensionsLabel} id="dimensions-label">
                    Dimensions
                  </span>
                  <div
                    className={styles.dimensionTabs}
                    role="tablist"
                    aria-labelledby="dimensions-label"
                  >
                    {DIMENSION_TABS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={activeDimension === id}
                        className={`${styles.dimensionTab} ${activeDimension === id ? styles.dimensionTabActive : ''}`}
                        onClick={() => setActiveDimension(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.searchBlock}>
                  <label htmlFor="tag-search-input" className={styles.searchTagsLabel}>
                    Search tags
                  </label>
                  <input
                    id="tag-search-input"
                    type="search"
                    placeholder="Type to filter…"
                    value={tagSearch}
                    onChange={e => setTagSearch(e.target.value)}
                    className={styles.compactControl}
                    aria-label="Search tags in tree"
                  />
                </div>

                {hasActiveFilters && (
                  <div className={styles.activeFilters}>
                    <span className={styles.activeFiltersLabel}>Active</span>
                    <div className={styles.activeFiltersChips}>
                      {cardType !== 'all' && (
                        <span className={styles.filterChip}>
                          {cardTypeLabels[cardType] ?? cardType}
                          <button
                            type="button"
                            onClick={removeCardTypeFilter}
                            className={styles.filterChipRemove}
                            aria-label={`Remove ${cardTypeLabels[cardType] ?? cardType} filter`}
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {selectedFilterTagIds.map(tagId => {
                        const tagName = tags?.find(t => t.docId === tagId)?.name ?? tagId;
                        return (
                          <span key={tagId} className={styles.filterChip}>
                            {tagName}
                            <button
                              type="button"
                              onClick={() => removeTagFilter(tagId)}
                              className={styles.filterChipRemove}
                              aria-label={`Remove ${tagName} filter`}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionHeading}>Sort by</h3>
                <select
                  id="feed-sort-select"
                  value={feedSort}
                  onChange={e => setFeedSort(e.target.value as FeedSortOrder)}
                  className={styles.compactControl}
                  aria-label="Sort card feed"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="random">Random</option>
                </select>
                <p className={styles.sortHint}>
                  Title search uses alphabetical order. Random shuffles cards loaded so far.
                </p>
              </div>

              <nav className={styles.navigation}>
                <TagTree
                  tree={filteredTagTree}
                  selectedTags={selectedFilterTagIds}
                  onSelectionChange={handleSelectionChange}
                  loading={tagsLoading}
                  forceExpandAll={!!tagSearch.trim()}
                  onSetDefaultExpanded={handleSetDefaultExpanded}
                  showDefaultExpandControl={isAdmin}
                  emptyMessage={
                    tagSearch.trim()
                      ? 'No tags match your search.'
                      : `No tags in ${activeDimension === 'all' ? 'any category' : DIMENSION_TABS.find(t => t.id === activeDimension)?.label ?? activeDimension}.`
                  }
                />
              </nav>
            </>
          ) : (
            <>
              <div className={styles.dimensionsBlock}>
                <div className={styles.dimensionTabs} role="tablist" aria-label="Dimensions">
                  {DIMENSION_TABS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={activeDimension === id}
                      className={`${styles.dimensionTab} ${activeDimension === id ? styles.dimensionTabActive : ''}`}
                      onClick={() => setActiveDimension(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <nav className={styles.navigation}>
                {collectionId ? (
                  <div className={styles.collectionBack}>
                    <button
                      type="button"
                      className={styles.collectionBackButton}
                      onClick={() => setCollectionId(null)}
                      aria-label="Back to collections list"
                    >
                      ← Back to collections
                    </button>
                  </div>
                ) : (
                  <div className={styles.collectionGroups}>
                    {collectionCards.length === 0 ? (
                      <div className={styles.collectionEmpty}>No collections yet.</div>
                    ) : (
                      DIMENSION_GROUP_ORDER.map(dimKey => {
                        const cardsInGroup = collectionsByDimension[dimKey] ?? [];
                        if (cardsInGroup.length === 0) return null;
                        const groupLabel =
                          dimKey === 'uncategorized'
                            ? 'Uncategorized'
                            : dimKey.charAt(0).toUpperCase() + dimKey.slice(1);
                        return (
                          <div key={dimKey} className={styles.collectionGroup}>
                            <div className={styles.collectionGroupLabel}>{groupLabel}</div>
                            <ul className={styles.collectionList}>
                              {cardsInGroup.map(card => (
                                <li key={card.docId}>
                                  <button
                                    type="button"
                                    className={styles.collectionItem}
                                    onClick={() => setCollectionId(card.docId!)}
                                  >
                                    {card.title || card.subtitle || 'Untitled'}
                                    {card.childrenIds && (
                                      <span className={styles.collectionCount}>({card.childrenIds.length})</span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </nav>
            </>
          )}
          <div className={styles.filterControls}>
            <button type="button" onClick={handleClearFiltersClick} className={styles.clearButton}>
              Clear filters
            </button>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTag } from '@/components/providers/TagProvider';
import {
  useCardContext,
  FEED_CARD_TYPES_ORDER,
  type FeedSortOrder,
  type FeedGroupBy,
} from '@/components/providers/CardProvider';
import TagTree from '@/components/common/TagTree';
import { filterTreesBySearch } from '@/lib/utils/tagUtils';
import { groupCollectionsByDimension } from '@/lib/utils/cardUtils';
import ViewTagLibrarySidebarPane from '@/components/view/ViewTagLibrarySidebarPane';
import { User, Square, Calendar, MapPin } from 'lucide-react';
import styles from './GlobalSidebar.module.css';

const VIEW_TAG_SIDEBAR_TAB_KEY = 'myjournal-view-sidebar-tag-tab';

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
  const [viewTagSidebarTab, setViewTagSidebarTab] = useState<'filter' | 'library'>(() => {
    if (typeof window === 'undefined') return 'filter';
    return sessionStorage.getItem(VIEW_TAG_SIDEBAR_TAB_KEY) === 'library' ? 'library' : 'filter';
  });
  const {
    tags,
    loading: tagsLoading,
    selectedFilterTagIds,
    setFilterTags,
    dimensionTree,
    updateTag,
  } = useTag();

  const [tagSearch, setTagSearch] = useState('');

  const {
    setCardType,
    feedCardTypes,
    toggleFeedCardType,
    isFeedCardTypesFilterActive,
    activeDimension,
    setActiveDimension,
    collectionId,
    setCollectionId,
    collectionCards,
    feedSort,
    setFeedSort,
    feedGroupBy,
    setFeedGroupBy,
    clearFilters,
  } = useCardContext();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const pathname = usePathname();
  const isViewRoute = pathname === '/view' || (pathname?.startsWith('/view/') ?? false);

  const handleSetDefaultExpanded = useCallback(
    (tagId: string, expanded: boolean) => {
      updateTag(tagId, { defaultExpanded: expanded });
    },
    [updateTag]
  );

  const cardTypeLabels: Record<string, string> = {
    story: 'Story',
    gallery: 'Gallery',
    qa: 'Q&A',
    quote: 'Quote',
    callout: 'Callout',
  };

  const hasActiveFilters = isFeedCardTypesFilterActive || selectedFilterTagIds.length > 0;

  const clearCardTypeFilters = () => setCardType('all');
  const removeTagFilter = (tagId: string) => {
    setFilterTags(selectedFilterTagIds.filter(id => id !== tagId));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const CURATED_DIMENSION_TABS = [
    { id: 'all', label: 'All' },
    { id: 'who', label: 'Who' },
    { id: 'what', label: 'What' },
    { id: 'when', label: 'When' },
    { id: 'where', label: 'Where' },
  ] as const;

  const FREEFORM_DIMENSION_TABS = [
    { id: 'who', label: 'Who', Icon: User },
    { id: 'what', label: 'What', Icon: Square },
    { id: 'when', label: 'When', Icon: Calendar },
    { id: 'where', label: 'Where', Icon: MapPin },
  ] as const;

  const FREEFORM_DIM_LABEL: Record<(typeof FREEFORM_DIMENSION_TABS)[number]['id'], string> = {
    who: 'Who',
    what: 'What',
    when: 'When',
    where: 'Where',
  };

  const browseDimension: (typeof FREEFORM_DIMENSION_TABS)[number]['id'] =
    activeDimension === 'who' ||
    activeDimension === 'what' ||
    activeDimension === 'when' ||
    activeDimension === 'where'
      ? activeDimension
      : 'who';

  const isCollectionsMode = browseMode === 'curated';
  const isTagMode = !isCollectionsMode;
  const showViewTagLibrary = Boolean(isAdmin && isTagMode && isViewRoute);

  const persistViewTagSidebarTab = useCallback((tab: 'filter' | 'library') => {
    setViewTagSidebarTab(tab);
    if (typeof window !== 'undefined') sessionStorage.setItem(VIEW_TAG_SIDEBAR_TAB_KEY, tab);
  }, []);

  const collectionsByDimension = useMemo(
    () => groupCollectionsByDimension(collectionCards),
    [collectionCards]
  );

  const DIMENSION_GROUP_ORDER = ['who', 'what', 'when', 'where', 'uncategorized'] as const;

  const filteredTagTree = useMemo(() => {
    const treeForTab =
      activeDimension === 'collections' ? [] : (dimensionTree[browseDimension] ?? []);
    return filterTreesBySearch(treeForTab, tagSearch);
  }, [activeDimension, browseDimension, dimensionTree, tagSearch]);

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
    setActiveDimension('who');
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
      setActiveDimension('who');
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
              aria-selected={browseMode === 'curated'}
              className={`${styles.modeTab} ${browseMode === 'curated' ? styles.modeTabActive : ''}`}
              onClick={() => handleSetBrowseMode('curated')}
            >
              Curated
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={browseMode === 'freeform'}
              className={`${styles.modeTab} ${browseMode === 'freeform' ? styles.modeTabActive : ''}`}
              onClick={() => handleSetBrowseMode('freeform')}
            >
              Freeform
            </button>
          </div>
          {isTagMode ? (
            <>
              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionHeading}>Cards</h3>
                <div className={styles.cardTypeChips} role="group" aria-label="Filter by card type">
                  {FEED_CARD_TYPES_ORDER.map((t) => {
                    const on = feedCardTypes.has(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`${styles.cardTypeChip} ${on ? styles.cardTypeChipActive : ''}`}
                        aria-pressed={on}
                        onClick={() => toggleFeedCardType(t)}
                      >
                        {cardTypeLabels[t] ?? t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionHeading}>Tags</h3>
                {showViewTagLibrary ? (
                  <div className={styles.viewTagSidebarTabs} role="tablist" aria-label="Tag sidebar mode">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewTagSidebarTab === 'filter'}
                      className={`${styles.viewTagSidebarTab} ${viewTagSidebarTab === 'filter' ? styles.viewTagSidebarTabActive : ''}`}
                      onClick={() => persistViewTagSidebarTab('filter')}
                    >
                      Filter feed
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewTagSidebarTab === 'library'}
                      className={`${styles.viewTagSidebarTab} ${viewTagSidebarTab === 'library' ? styles.viewTagSidebarTabActive : ''}`}
                      onClick={() => persistViewTagSidebarTab('library')}
                    >
                      Edit library
                    </button>
                  </div>
                ) : null}
                {(!showViewTagLibrary || viewTagSidebarTab === 'filter') ? (
                  <>
                    <div className={styles.dimensionsBlock}>
                      <div
                        className={styles.dimensionTabs}
                        role="tablist"
                        aria-label="Tag dimensions"
                      >
                        {FREEFORM_DIMENSION_TABS.map(({ id, label, Icon }) => (
                          <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={browseDimension === id}
                            title={label}
                            className={`${styles.dimensionTab} ${browseDimension === id ? styles.dimensionTabActive : ''}`}
                            onClick={() => setActiveDimension(id)}
                          >
                            <span className={styles.srOnly}>{label}</span>
                            <span className={styles.dimensionTabIcon} aria-hidden>
                              <Icon strokeWidth={2} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.searchBlock}>
                      <label htmlFor="tag-search-input" className={styles.srOnly}>
                        Search tags
                      </label>
                      <input
                        id="tag-search-input"
                        type="search"
                        placeholder="Search tags…"
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
                          {isFeedCardTypesFilterActive &&
                            FEED_CARD_TYPES_ORDER.filter((t) => feedCardTypes.has(t)).map((t) => (
                              <span key={t} className={styles.filterChip}>
                                {cardTypeLabels[t] ?? t}
                                <button
                                  type="button"
                                  onClick={() => toggleFeedCardType(t)}
                                  className={styles.filterChipRemove}
                                  aria-label={`Remove ${cardTypeLabels[t] ?? t} filter`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          {isFeedCardTypesFilterActive ? (
                            <button
                              type="button"
                              className={styles.activeFiltersResetTypes}
                              onClick={clearCardTypeFilters}
                            >
                              All card types
                            </button>
                          ) : null}
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
                  </>
                ) : null}
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
                  <option value="random">Random</option>
                  <option value="whenDesc">When (Desc)</option>
                  <option value="whenAsc">When (Asc)</option>
                  <option value="createdDesc">Created (Desc)</option>
                  <option value="createdAsc">Created (Asc)</option>
                  <option value="titleAsc">Title (A-Z)</option>
                  <option value="titleDesc">Title (Z-A)</option>
                  <option value="whoAsc">Who (A-Z)</option>
                  <option value="whoDesc">Who (Z-A)</option>
                  <option value="whatAsc">What (A-Z)</option>
                  <option value="whatDesc">What (Z-A)</option>
                  <option value="whereAsc">Where (A-Z)</option>
                  <option value="whereDesc">Where (Z-A)</option>
                </select>
              </div>

              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionHeading}>Group by</h3>
                <select
                  id="feed-group-select"
                  value={feedGroupBy}
                  onChange={e => setFeedGroupBy(e.target.value as FeedGroupBy)}
                  className={styles.compactControl}
                  aria-label="Group card feed"
                >
                  <option value="none">None</option>
                  <option value="when">When</option>
                  <option value="who">Who</option>
                  <option value="where">Where</option>
                  <option value="what">What</option>
                </select>
              </div>

              <nav className={styles.navigation}>
                {!showViewTagLibrary || viewTagSidebarTab === 'filter' ? (
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
                        : `No tags in ${FREEFORM_DIM_LABEL[browseDimension]}.`
                    }
                  />
                ) : (
                  <ViewTagLibrarySidebarPane />
                )}
              </nav>
            </>
          ) : (
            <>
              <div className={styles.dimensionsBlock}>
                <div className={styles.dimensionTabs} role="tablist" aria-label="Dimensions">
                  {CURATED_DIMENSION_TABS.map(({ id, label }) => (
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

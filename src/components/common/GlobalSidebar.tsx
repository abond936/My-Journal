'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
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
import { listCollectionRootCards, normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';
import ViewTagLibrarySidebarPane from '@/components/view/ViewTagLibrarySidebarPane';
import {
  User,
  Square,
  Calendar,
  MapPin,
  BookOpen,
  FunnelX,
  Image,
  CircleHelp,
  Quote,
  Megaphone,
} from 'lucide-react';
import styles from './GlobalSidebar.module.css';

const VIEW_TAG_SIDEBAR_TAB_KEY = 'myjournal-view-sidebar-tag-tab';
const CURATED_TREE_EXPANDED_KEY = 'myjournal-curated-tree-expanded';

interface GlobalSidebarProps {
  isOpen: boolean;
}

export default function GlobalSidebar({ isOpen }: GlobalSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const [browseMode, setBrowseMode] = useState<'freeform' | 'curated'>(() => {
    if (typeof window === 'undefined') return 'curated';
    const saved =
      window.localStorage.getItem('myjournal-sidebar-browse-mode') ??
      window.sessionStorage.getItem('myjournal-sidebar-browse-mode');
    return saved === 'freeform' ? 'freeform' : 'curated';
  });
  const [viewTagSidebarTab, setViewTagSidebarTab] = useState<'filter' | 'library'>(() => {
    if (typeof window === 'undefined') return 'filter';
    const saved =
      window.localStorage.getItem(VIEW_TAG_SIDEBAR_TAB_KEY) ??
      window.sessionStorage.getItem(VIEW_TAG_SIDEBAR_TAB_KEY);
    return saved === 'library' ? 'library' : 'filter';
  });
  const [expandedCollectionIds, setExpandedCollectionIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const raw =
      window.localStorage.getItem(CURATED_TREE_EXPANDED_KEY) ??
      window.sessionStorage.getItem(CURATED_TREE_EXPANDED_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set();
    } catch {
      return new Set();
    }
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
    collectionTreeCards,
    feedSort,
    setFeedSort,
    feedGroupBy,
    setFeedGroupBy,
    includeChildrenInFeed,
    setIncludeChildrenInFeed,
    clearFilters,
  } = useCardContext();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const pathname = usePathname();
  const router = useRouter();
  const isViewRoute = pathname === '/view' || (pathname?.startsWith('/view/') ?? false);
  const isViewDetailRoute = pathname?.startsWith('/view/') ?? false;

  const handleSetDefaultExpanded = useCallback(
    (tagId: string, expanded: boolean) => {
      updateTag(tagId, { defaultExpanded: expanded });
    },
    [updateTag]
  );

  const cardTypeLabels: Record<string, string> = {
    story: 'Story',
    gallery: 'Gallery',
    qa: 'Question',
    quote: 'Quote',
    callout: 'Callout',
  };
  const cardTypeIcons: Record<string, React.ComponentType<{ strokeWidth?: number }>> = {
    story: BookOpen,
    gallery: Image,
    qa: CircleHelp,
    quote: Quote,
    callout: Megaphone,
  };

  const hasActiveFilters = isFeedCardTypesFilterActive || selectedFilterTagIds.length > 0;

  const clearCardTypeFilters = () => setCardType('all');
  const removeTagFilter = (tagId: string) => {
    setFilterTags(selectedFilterTagIds.filter((id) => id !== tagId));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (typeof window !== 'undefined') window.localStorage.setItem(VIEW_TAG_SIDEBAR_TAB_KEY, tab);
  }, []);

  const collectionCardById = useMemo(
    () => new Map(collectionTreeCards.filter((card) => card.docId).map((card) => [card.docId!, card])),
    [collectionTreeCards]
  );

  const collectionRoots = useMemo(() => listCollectionRootCards(collectionTreeCards), [collectionTreeCards]);
  const publishedCollectionRootCount = useMemo(
    () => collectionRoots.filter((card) => card.status === 'published').length,
    [collectionRoots]
  );

  useEffect(() => {
    if (collectionTreeCards.length === 0) return;
    setExpandedCollectionIds((current) => {
      if (current.size > 0) return current;
      const defaults = collectionTreeCards
        .filter((card) => card.docId && normalizeCuratedChildIds(card.childrenIds).length > 0)
        .map((card) => card.docId as string);
      return new Set(defaults);
    });
  }, [collectionTreeCards]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CURATED_TREE_EXPANDED_KEY, JSON.stringify(Array.from(expandedCollectionIds)));
  }, [expandedCollectionIds]);

  const filteredTagTree = useMemo(() => {
    const treeForTab =
      activeDimension === 'collections' ? [] : (dimensionTree[browseDimension] ?? []);
    return filterTreesBySearch(treeForTab, tagSearch);
  }, [activeDimension, browseDimension, dimensionTree, tagSearch]);

  const handleSelectionChange = (tagId: string, isSelected: boolean) => {
    const newSelection = isSelected
      ? (selectedFilterTagIds.includes(tagId) ? selectedFilterTagIds : [...selectedFilterTagIds, tagId])
      : selectedFilterTagIds.filter((id) => id !== tagId);
    setFilterTags(newSelection);
  };

  const handleClearFiltersClick = () => {
    handleSetBrowseMode('curated');
    persistViewTagSidebarTab('filter');
    clearFilters();
    setTagSearch('');
  };

  const handleSetBrowseMode = (nextMode: 'freeform' | 'curated') => {
    setBrowseMode(nextMode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('myjournal-sidebar-browse-mode', nextMode);
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

  const toggleCollectionExpanded = useCallback((cardId: string) => {
    setExpandedCollectionIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const handleSelectCollection = useCallback(
    (nextCollectionId: string) => {
      setCollectionId(nextCollectionId);
      if (isViewDetailRoute) {
        router.push('/view');
      }
    },
    [isViewDetailRoute, router, setCollectionId]
  );

  const renderCollectionNode = (cardId: string, level: number, seen: Set<string>): React.ReactNode => {
    const card = collectionCardById.get(cardId);
    if (!card?.docId || seen.has(card.docId)) return null;

    const nextSeen = new Set(seen);
    nextSeen.add(card.docId);

    const children = normalizeCuratedChildIds(card.childrenIds)
      .map((childId) => collectionCardById.get(childId))
      .filter((child): child is NonNullable<typeof child> => Boolean(child?.docId));
    const isSelected = collectionId === card.docId;
    const hasChildren = children.length > 0;
    const isExpanded = hasChildren && expandedCollectionIds.has(card.docId);
    const showDraftTitle = isAdmin && card.status === 'draft';

    return (
      <li key={card.docId} className={styles.collectionTreeNode}>
        <div className={styles.collectionRow} style={{ marginLeft: `${level * 0.65}rem` }}>
          <button
            type="button"
            className={styles.collectionExpandButton}
            onClick={() => hasChildren && toggleCollectionExpanded(card.docId!)}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-label={
              hasChildren
                ? `${isExpanded ? 'Collapse' : 'Expand'} ${card.title || card.subtitle || 'Untitled'}`
                : undefined
            }
            disabled={!hasChildren}
          >
            {hasChildren ? <span className={styles.collectionExpandIcon}>{isExpanded ? '▼' : '▶'}</span> : null}
          </button>
          <button
            type="button"
            className={`${styles.collectionItem} ${isSelected ? styles.collectionItemActive : ''}`}
            onClick={() => handleSelectCollection(card.docId!)}
          >
            <span className={styles.collectionItemContent}>
              <span className={styles.collectionItemMainRow}>
                <span
                  className={`${styles.collectionItemLabel} ${showDraftTitle ? styles.collectionItemLabelDraft : ''}`}
                >
                  {card.title || card.subtitle || 'Untitled'}
                </span>
                {card.childrenIds?.length ? (
                  <span className={styles.collectionCount}>({card.childrenIds.length})</span>
                ) : null}
              </span>
            </span>
          </button>
        </div>
        {hasChildren && isExpanded ? (
          <ul className={styles.collectionTreeList}>
            {children.map((child) => renderCollectionNode(child.docId!, level + 1, nextSeen))}
          </ul>
        ) : null}
      </li>
    );
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
              <div className={styles.modeActions}>
                <button
                  type="button"
                  onClick={handleClearFiltersClick}
                  className={styles.clearButtonCompact}
                  aria-label="Clear filters"
                  title="Clear filters"
                >
                  <FunnelX strokeWidth={2} />
                  <span className={styles.srOnly}>Clear filters</span>
                </button>
              </div>
              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionHeading}>Cards</h3>
                <div className={styles.cardTypeChips} role="group" aria-label="Filter by card type">
                  {FEED_CARD_TYPES_ORDER.map((t) => {
                    const on = feedCardTypes.has(t);
                    const Icon = cardTypeIcons[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`${styles.cardTypeChip} ${on ? styles.cardTypeChipActive : ''}`}
                        aria-pressed={on}
                        aria-label={cardTypeLabels[t] ?? t}
                        title={cardTypeLabels[t] ?? t}
                        onClick={() => toggleFeedCardType(t)}
                      >
                        <span className={styles.srOnly}>{cardTypeLabels[t] ?? t}</span>
                        {Icon ? (
                          <span className={styles.cardTypeChipIcon} aria-hidden>
                            <Icon strokeWidth={2} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.sidebarSection}>
                {!showViewTagLibrary || viewTagSidebarTab === 'filter' ? (
                  <h3 className={styles.sectionHeading}>Tags</h3>
                ) : null}
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
                {!showViewTagLibrary || viewTagSidebarTab === 'filter' ? (
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
                        placeholder="Search tags..."
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
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
                          {selectedFilterTagIds.map((tagId) => {
                            const tagName = tags?.find((t) => t.docId === tagId)?.name ?? tagId;
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
                <div className={styles.dualFieldRow}>
                  <div className={styles.inlineFieldRow}>
                    <select
                      id="feed-sort-select"
                      value={feedSort}
                      onChange={(e) => setFeedSort(e.target.value as FeedSortOrder)}
                      className={`${styles.compactControl} ${styles.compactControlInline}`}
                      aria-label="Sort card feed"
                    >
                      <option value="random">Sort by Random</option>
                      <option value="whenDesc">Sort by When (Desc)</option>
                      <option value="whenAsc">Sort by When (Asc)</option>
                      <option value="createdDesc">Sort by Created (Desc)</option>
                      <option value="createdAsc">Sort by Created (Asc)</option>
                      <option value="titleAsc">Sort by Title (A-Z)</option>
                      <option value="titleDesc">Sort by Title (Z-A)</option>
                      <option value="whoAsc">Sort by Who (A-Z)</option>
                      <option value="whoDesc">Sort by Who (Z-A)</option>
                      <option value="whatAsc">Sort by What (A-Z)</option>
                      <option value="whatDesc">Sort by What (Z-A)</option>
                      <option value="whereAsc">Sort by Where (A-Z)</option>
                      <option value="whereDesc">Sort by Where (Z-A)</option>
                    </select>
                  </div>
                  <div className={styles.inlineFieldRow}>
                    <select
                      id="feed-group-select"
                      value={feedGroupBy}
                      onChange={(e) => setFeedGroupBy(e.target.value as FeedGroupBy)}
                      className={`${styles.compactControl} ${styles.compactControlInline}`}
                      aria-label="Group card feed"
                    >
                      <option value="none">Group by None</option>
                      <option value="when">Group by When</option>
                      <option value="who">Group by Who</option>
                      <option value="where">Group by Where</option>
                      <option value="what">Group by What</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.sidebarSection}>
                <label className={styles.feedToggleRow}>
                  <input
                    type="checkbox"
                    checked={includeChildrenInFeed}
                    onChange={(e) => setIncludeChildrenInFeed(e.target.checked)}
                  />
                  <span>Include children</span>
                </label>
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
            <nav className={styles.navigation}>
              <div className={styles.collectionGroups}>
                {collectionCards.length === 0 ? (
                  <div className={styles.collectionEmpty}>No collections yet.</div>
                ) : (
                  <>
                    {isAdmin && collectionRoots.length > 0 && publishedCollectionRootCount === 0 ? (
                      <div className={styles.collectionAdminNotice}>
                        Curated roots are currently draft-only, so readers will not see them until at least one root is
                        published.
                      </div>
                    ) : null}
                    <ul className={styles.collectionTreeList}>
                      {collectionRoots.map((root) => renderCollectionNode(root.docId!, 0, new Set()))}
                    </ul>
                  </>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

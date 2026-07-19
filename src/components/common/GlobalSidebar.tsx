'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTag } from '@/components/providers/TagProvider';
import {
  useCardContext,
  FEED_CARD_TYPES_ORDER,
  type FeedSortOrder,
} from '@/components/providers/CardProvider';
import TagTree from '@/components/common/TagTree';
import { filterTreesBySearch } from '@/lib/utils/tagUtils';
import { listCollectionRootCards, normalizeCuratedChildIds } from '@/lib/utils/curatedCollectionTree';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';
import { getSafeReaderReturnTo } from '@/lib/utils/readerReturnTo';
import { resolveReaderRouteMode } from '@/lib/utils/readerMode';
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
  ChevronsDown,
  ChevronsUp,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import styles from './GlobalSidebar.module.css';

const CURATED_TREE_EXPANDED_KEY = 'myjournal-curated-tree-expanded';
const FREEFORM_DIMENSION_KEY = 'myjournal-freeform-dimension';
const CONTENT_VIEW_SCROLL_POSITION_KEY = 'contentViewScrollPos';
const CONTENT_VIEW_FOCUS_CARD_KEY = 'contentViewFocusCardId';

interface GlobalSidebarProps {
  isOpen: boolean;
  onRequestClose?: () => void;
}

type TagDimension = 'who' | 'what' | 'when' | 'where';

export default function GlobalSidebar({ isOpen, onRequestClose }: GlobalSidebarProps) {
  const [showFeedOptions, setShowFeedOptions] = useState(false);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const treeControlsRef = useRef<{ expandAll: () => void; collapseAll: () => void } | null>(null);
  const [expandedCollectionIds, setExpandedCollectionIds] = useState<Set<string>>(() => new Set());

  const {
    tags,
    loading: tagsLoading,
    selectedFilterTagIds: readerFilterTagIds,
    setFilterTags: setReaderFilterTagIds,
    studioCardFilterTagIds,
    setStudioCardFilterTagIds,
    dimensionTree,
  } = useTag();

  const [tagSearch, setTagSearch] = useState('');

  const {
    feedCardTypes,
    toggleFeedCardType,
    activeDimension,
    readerMode,
    setReaderMode,
    browseTarget,
    setBrowseTarget,
    setActiveDimension,
    collectionId,
    setCollectionId,
    collectionCards,
    collectionTreeCards,
    feedSort,
    setFeedSort,
    refreshRandomOrder,
    includeSubTagsInFeed,
    setIncludeSubTagsInFeed,
    readerTagFilterScope,
    setReaderTagFilterScope,
    clearFilters,
  } = useCardContext();

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isStudioRoute = pathname?.startsWith('/admin/studio') ?? false;
  const selectedFilterTagIds = isStudioRoute ? studioCardFilterTagIds : readerFilterTagIds;
  const setFilterTags = isStudioRoute ? setStudioCardFilterTagIds : setReaderFilterTagIds;
  const isViewRoute = pathname === '/view' || (pathname?.startsWith('/view/') ?? false);
  const isSearchRoute = pathname === '/search' || (pathname?.startsWith('/search/') ?? false);
  const isReaderFilterRoute = isViewRoute || isSearchRoute;
  const isViewDetailRoute = pathname?.startsWith('/view/') ?? false;
  const effectiveReaderMode = resolveReaderRouteMode(pathname, searchParams.get('mode'), readerMode);
  const returnToFeedIfViewingDetail = useCallback(() => {
    if (isViewDetailRoute) {
      const returnTo = typeof window === 'undefined'
        ? null
        : new URLSearchParams(window.location.search).get('returnTo');
      router.push(getSafeReaderReturnTo(returnTo) ?? '/view');
    }
  }, [isViewDetailRoute, router]);
  const clearReaderReturnPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(CONTENT_VIEW_SCROLL_POSITION_KEY);
    window.sessionStorage.removeItem(CONTENT_VIEW_FOCUS_CARD_KEY);
  }, []);

  const tagTreeExpansionStorageKey = `myjournal:tag-tree:expanded:${session?.user?.id ?? session?.user?.email ?? 'unknown'}`;

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

  const removeTagFilter = useCallback(
    (tagId: string) => {
      setFilterTags(selectedFilterTagIds.filter((id) => id !== tagId));
      returnToFeedIfViewingDetail();
    },
    [returnToFeedIfViewingDetail, selectedFilterTagIds, setFilterTags]
  );

  const handleTreeControlsReady = useCallback((controls: { expandAll: () => void; collapseAll: () => void }) => {
    treeControlsRef.current = controls;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawExpanded =
      window.localStorage.getItem(CURATED_TREE_EXPANDED_KEY) ??
      window.sessionStorage.getItem(CURATED_TREE_EXPANDED_KEY);
    if (rawExpanded) {
      try {
        const parsed = JSON.parse(rawExpanded);
        if (Array.isArray(parsed)) {
          setExpandedCollectionIds(
            new Set(parsed.filter((id): id is string => typeof id === 'string'))
          );
        }
      } catch {
        // ignore corrupt persisted expansion state
      }
    }
    setPreferencesHydrated(true);
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

  const isCollectionsMode = effectiveReaderMode === 'guided';
  const isTagMode = !isCollectionsMode;
  const effectiveBrowseTarget = isCollectionsMode ? 'cards' : browseTarget;
  const isMediaBrowse = effectiveBrowseTarget === 'media';
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeDimension === 'who' || activeDimension === 'what' || activeDimension === 'when' || activeDimension === 'where') {
      window.localStorage.setItem(FREEFORM_DIMENSION_KEY, activeDimension);
    }
  }, [activeDimension]);

  const readStoredFreeformDimension = useCallback((): TagDimension => {
    if (typeof window === 'undefined') return 'who';
    const stored = window.localStorage.getItem(FREEFORM_DIMENSION_KEY);
    return stored === 'who' || stored === 'what' || stored === 'when' || stored === 'where' ? stored : 'who';
  }, []);

  const filteredTagTree = useMemo(() => {
    const treeForTab =
      activeDimension === 'collections' ? [] : (dimensionTree[browseDimension] ?? []);
    return filterTreesBySearch(treeForTab, tagSearch);
  }, [activeDimension, browseDimension, dimensionTree, tagSearch]);

  const handleSelectionChange = useCallback(
    (tagId: string, isSelected: boolean) => {
      const newSelection = isSelected
        ? (selectedFilterTagIds.includes(tagId) ? selectedFilterTagIds : [...selectedFilterTagIds, tagId])
        : selectedFilterTagIds.filter((id) => id !== tagId);
      setFilterTags(newSelection);
      returnToFeedIfViewingDetail();
    },
    [returnToFeedIfViewingDetail, selectedFilterTagIds, setFilterTags]
  );

  const handleClearFiltersClick = useCallback(() => {
    if (!isStudioRoute && effectiveReaderMode === 'guided') return;
    if (isStudioRoute) setFilterTags([]);
    else clearFilters();
    setTagSearch('');
    returnToFeedIfViewingDetail();
  }, [clearFilters, effectiveReaderMode, isStudioRoute, returnToFeedIfViewingDetail, setFilterTags]);

  const handleSetBrowseMode = useCallback(
    (nextMode: 'freeform' | 'guided') => {
      setReaderMode(nextMode);
      if (nextMode === 'guided') {
        clearReaderReturnPosition();
        setActiveDimension('collections');
        returnToFeedIfViewingDetail();
        return;
      }
      if (activeDimension === 'collections') {
        setCollectionId(null);
        setActiveDimension(readStoredFreeformDimension());
      }
      returnToFeedIfViewingDetail();
    },
    [
      activeDimension,
      clearReaderReturnPosition,
      readStoredFreeformDimension,
      returnToFeedIfViewingDetail,
      setActiveDimension,
      setCollectionId,
      setReaderMode,
    ]
  );

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
      clearReaderReturnPosition();
      const nextCard = collectionCardById.get(nextCollectionId);
      const hasChildren = Boolean(nextCard && normalizeCuratedChildIds(nextCard.childrenIds).length > 0);
      if (!hasChildren) {
        router.push(`/view/${encodeURIComponent(nextCollectionId)}?mode=guided`);
        onRequestClose?.();
        return;
      }
      setActiveDimension('collections');
      setCollectionId(nextCollectionId);
      returnToFeedIfViewingDetail();
    },
    [clearReaderReturnPosition, collectionCardById, onRequestClose, returnToFeedIfViewingDetail, router, setActiveDimension, setCollectionId]
  );

  const selectedTagsByDimension = useMemo(() => {
    const resolvedDimensionById = buildResolvedTagDimensionMap(tags);
    const groups: Record<TagDimension, Array<{ id: string; name: string }>> = {
      who: [],
      what: [],
      when: [],
      where: [],
    };

    selectedFilterTagIds.forEach((tagId) => {
      const dimension = resolvedDimensionById.get(tagId);
      if (!dimension) return;
      const name = tags.find((tag) => tag.docId === tagId)?.name ?? tagId;
      groups[dimension].push({ id: tagId, name });
    });

    return groups;
  }, [selectedFilterTagIds, tags]);

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
      <>
          <div className={styles.sidebarHeader}>
            <div className={styles.headerTopRow}>
              <h2 className={styles.title}>Explore</h2>
            </div>
            <div
              className={`${styles.modeTabs} ${
                isTagMode ? styles.modeTabsWithTwoActions : isStudioRoute ? styles.modeTabsWithClear : ''
              }`}
              role="tablist"
              aria-label="Browsing mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={effectiveReaderMode === 'guided'}
                className={`${styles.modeTab} ${effectiveReaderMode === 'guided' ? styles.modeTabActive : ''}`}
                onClick={() => handleSetBrowseMode('guided')}
              >
                Guided
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={effectiveReaderMode === 'freeform'}
                className={`${styles.modeTab} ${effectiveReaderMode === 'freeform' ? styles.modeTabActive : ''}`}
                onClick={() => handleSetBrowseMode('freeform')}
              >
                Freeform
              </button>
              {isTagMode ? (
                <button
                  type="button"
                  className={`${styles.iconActionButton} ${showFeedOptions ? styles.iconActionButtonActive : ''}`}
                  onClick={() => setShowFeedOptions((current) => !current)}
                  aria-expanded={showFeedOptions}
                  aria-pressed={showFeedOptions}
                  aria-label="More controls"
                  title="More controls"
                >
                  <SlidersHorizontal strokeWidth={2} />
                </button>
              ) : null}
              {isTagMode || isStudioRoute ? (
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
              ) : null}
            </div>
            {isTagMode ? (
              <>
                <div className={styles.browseTargetTabs} role="tablist" aria-label="Browse target">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveBrowseTarget === 'cards'}
                    className={`${styles.browseTargetTab} ${effectiveBrowseTarget === 'cards' ? styles.browseTargetTabActive : ''}`}
                    onClick={() => setBrowseTarget('cards')}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveBrowseTarget === 'media'}
                    className={`${styles.browseTargetTab} ${effectiveBrowseTarget === 'media' ? styles.browseTargetTabActive : ''}`}
                    onClick={() => setBrowseTarget('media')}
                  >
                    Media
                  </button>
                </div>
                {!isMediaBrowse ? (
                  <div className={`${styles.sectionControlRow} ${styles.headerTypeControls}`}>
                    <h3 className={styles.sectionHeading}>Type</h3>
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
                            onClick={() => {
                              toggleFeedCardType(t);
                              returnToFeedIfViewingDetail();
                            }}
                          >
                            <span className={styles.srOnly}>{cardTypeLabels[t] ?? t}</span>
                            {Icon ? <span className={styles.cardTypeChipIcon} aria-hidden><Icon strokeWidth={2} /></span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className={`${styles.sectionControlRow} ${styles.headerDimensionControls}`}>
                  <h3 className={styles.sectionHeading}>Tags</h3>
                  <div className={styles.sectionControlRowMain}>
                    <div className={styles.dimensionTabs} role="tablist" aria-label="Tag dimensions">
                      {FREEFORM_DIMENSION_TABS.map(({ id, label, Icon }) => (
                        <button key={id} type="button" role="tab" aria-selected={browseDimension === id} title={label} className={`${styles.dimensionTab} ${browseDimension === id ? styles.dimensionTabActive : ''}`} onClick={() => setActiveDimension(id)}>
                          <span className={styles.srOnly}>{label}</span>
                          <span className={styles.dimensionTabIcon} aria-hidden><Icon strokeWidth={2} /></span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <div className={styles.sidebarBody}>

          {isTagMode ? (
            <>
              <div className={styles.sidebarSection}>
                <>
                    {selectedFilterTagIds.length > 0 ? (
                      <div className={styles.activeFilters}>
                        <span className={styles.activeFiltersLabel}>Active</span>
                        <div className={styles.activeFiltersChips}>
                          {(Object.entries(selectedTagsByDimension) as Array<[TagDimension, Array<{ id: string; name: string }>]>)
                            .filter(([, tagRows]) => tagRows.length > 0)
                            .map(([dimension, tagRows]) => (
                              <div key={dimension} className={styles.activeFilterGroup}>
                                <span className={styles.activeFilterGroupLabel}>{FREEFORM_DIM_LABEL[dimension]}</span>
                                <div className={styles.activeFilterGroupChips}>
                                  {tagRows.map(({ id, name }) => (
                                    <span key={id} className={styles.filterChip} data-dimension={dimension}>
                                      {name}
                                      <button
                                        type="button"
                                        onClick={() => removeTagFilter(id)}
                                        className={styles.filterChipRemove}
                                        aria-label={`Remove ${name} filter`}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null}
                </>
              </div>

              {showFeedOptions ? (
                <div className={styles.sidebarSection}>
                  {showFeedOptions ? (
                    <>
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
                      <div className={styles.refinementRow}>
                        <label className={styles.compactCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={includeSubTagsInFeed}
                            onChange={(e) => {
                              setIncludeSubTagsInFeed(e.target.checked);
                              returnToFeedIfViewingDetail();
                            }}
                          />
                          <span>Subtags</span>
                        </label>
                        {isReaderFilterRoute ? (
                          <div className={styles.matchControlRow}>
                            <label htmlFor="reader-tag-filter-scope">Match</label>
                            <select
                              id="reader-tag-filter-scope"
                              value={readerTagFilterScope}
                              onChange={(e) => {
                                setReaderTagFilterScope(e.target.value as 'all' | 'subject');
                                returnToFeedIfViewingDetail();
                              }}
                              className={`${styles.compactControl} ${styles.compactControlInline}`}
                              aria-label="Tag match scope"
                            >
                              <option value="all">Any assigned</option>
                              <option value="subject">Subject only</option>
                            </select>
                          </div>
                        ) : null}
                      </div>
                      <div className={`${styles.inlineFieldRow} ${styles.randomSortRow}`}>
                        <select
                          id="feed-sort-select"
                          value={feedSort}
                          onChange={(e) => {
                            setFeedSort(e.target.value as FeedSortOrder);
                            returnToFeedIfViewingDetail();
                          }}
                          className={`${styles.compactControl} ${styles.compactControlInline}`}
                          aria-label="Sort card feed"
                        >
                          <option value="random">Sort: Random</option>
                          <option value="whoAsc">Sort: Who ↑</option>
                          <option value="whoDesc">Sort: Who ↓</option>
                          <option value="whatAsc">Sort: What ↑</option>
                          <option value="whatDesc">Sort: What ↓</option>
                          <option value="whenDesc">Sort: When ↓</option>
                          <option value="whenAsc">Sort: When ↑</option>
                          <option value="whereAsc">Sort: Where ↑</option>
                          <option value="whereDesc">Sort: Where ↓</option>
                          <option value="titleAsc">Sort: Title ↑</option>
                          <option value="titleDesc">Sort: Title ↓</option>
                          <option value="createdDesc">Sort: Created ↓</option>
                          <option value="createdAsc">Sort: Created ↑</option>
                        </select>
                        {feedSort === 'random' ? (
                          <button
                            type="button"
                            className={styles.iconActionButton}
                            onClick={refreshRandomOrder}
                            aria-label="Refresh random order"
                            title="Refresh random order"
                          >
                            <RefreshCw strokeWidth={2} />
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.sidebarSection}>
                <div className={styles.treeActionRow}>
                  <div className={styles.treeActions}>
                    <button
                      type="button"
                      className={styles.iconActionButton}
                      onClick={() => treeControlsRef.current?.expandAll()}
                      aria-label="Expand all tags"
                      title="Expand all tags"
                    >
                      <ChevronsDown strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconActionButton}
                      onClick={() => treeControlsRef.current?.collapseAll()}
                      aria-label="Collapse all tags"
                      title="Collapse all tags"
                    >
                      <ChevronsUp strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>

              <nav className={styles.navigation}>
                {!preferencesHydrated || tagsLoading ? (
                  <div className={styles.loadingPlaceholder} aria-busy="true">
                    Loading explore filters...
                  </div>
                ) : (
                  <TagTree
                    tree={filteredTagTree}
                    selectedTags={selectedFilterTagIds}
                    onSelectionChange={handleSelectionChange}
                    loading={tagsLoading}
                    forceExpandAll={!!tagSearch.trim()}
                    showTreeControls={false}
                    onControlsReady={handleTreeControlsReady}
                    expansionStorageKey={tagTreeExpansionStorageKey}
                    emptyMessage={
                      tagSearch.trim()
                        ? 'No tags match your search.'
                        : `No tags in ${FREEFORM_DIM_LABEL[browseDimension]}.`
                    }
                  />
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
          </div>
        </>
    </div>
  );
}

'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMediaErrorSeverity, useMedia, type MediaFilters } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import MediaAdminList from '@/components/admin/media-admin/MediaAdminList';
import MediaAdminGrid from '@/components/admin/media-admin/MediaAdminGrid';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import cardAdminStyles from '@/app/admin/card-admin/card-admin.module.css';
import styles from './media-admin.module.css';
import {
  flattenDimensionalTagMapToTagIds,
  groupSelectedTagIdsByDimension,
} from '@/lib/utils/tagUtils';

const MEDIA_VIEW_MODE_KEY = 'media-admin-view-mode';
const MEDIA_VIEW_MODE_STUDIO_KEY = 'media-admin-view-mode-studio';
type ViewMode = 'grid' | 'table';

export type MediaAdminContentProps = {
  /** When true (e.g. Admin Studio column), use compact scroll layout and do not share view-mode storage with the full page. */
  embedded?: boolean;
  /** When embedded in Studio, table rows register as drag sources for cover/gallery. */
  studioSourceDraggable?: boolean;
};
type DimensionKey = 'who' | 'what' | 'when' | 'where';
type DimensionFilterMode = 'any' | 'hasAny' | 'isEmpty' | 'matches';
type ApiErrorResponse = {
  message?: string;
  code?: string;
  details?: string[];
};

type DimensionFilterState = Record<
  DimensionKey,
  {
    mode: DimensionFilterMode;
    tagId: string;
  }
>;

const DEFAULT_DIMENSION_FILTERS: DimensionFilterState = {
  who: { mode: 'any', tagId: '' },
  what: { mode: 'any', tagId: '' },
  when: { mode: 'any', tagId: '' },
  where: { mode: 'any', tagId: '' },
};

export default function MediaAdminContent(props: MediaAdminContentProps = {}) {
  const { embedded = false, studioSourceDraggable = false } = props;
  const router = useRouter();
  const { 
    loading, 
    error, 
    pagination,
    filters,
    setFilter,
    clearFilters,
    fetchMedia,
    currentPage,
    selectedMediaIds,
    selectNone,
    deleteMultipleMedia,
    setSelectedMediaIds,
    bulkApplyTags,
    dimensionalQueryOverlay,
    setDimensionalQueryOverlay,
  } = useMedia();

  const { tags: allTags } = useTag();
  const errorSeverity = getMediaErrorSeverity(error);

  const viewModeStorageKey = embedded ? MEDIA_VIEW_MODE_STUDIO_KEY : MEDIA_VIEW_MODE_KEY;

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return embedded ? 'table' : 'grid';
    const saved = localStorage.getItem(viewModeStorageKey);
    if (embedded) {
      return (saved === 'grid' ? 'grid' : 'table') as ViewMode;
    }
    return (saved === 'table' ? 'table' : 'grid') as ViewMode;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(viewModeStorageKey, viewMode);
    }
  }, [viewMode, viewModeStorageKey]);

  // Embedded Studio: load the media list when the pane mounts (Studio is not the media-admin route in MediaProvider).
  useEffect(() => {
    if (!embedded) return;
    void fetchMedia(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / embedded only
  }, [embedded]);

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedMediaIds.length} media item(s)?`)) {
      await deleteMultipleMedia(selectedMediaIds);
    }
  };

  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [pendingBulkTags, setPendingBulkTags] = useState<string[]>([]);
  const [bulkTagApplying, setBulkTagApplying] = useState(false);
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [duplicateTriageMode, setDuplicateTriageMode] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState<DimensionFilterState>(DEFAULT_DIMENSION_FILTERS);
  const [clientSort, setClientSort] = useState<'none' | 'filenameAsc' | 'filenameDesc'>('none');

  const handleOpenBulkTags = () => {
    setPendingBulkTags([]);
    setBulkTagMode('add');
    setBulkTagModalOpen(true);
  };

  const handleSaveBulkTagSelection = async (newSelection: string[]) => {
    if (selectedMediaIds.length === 0) return;
    setBulkTagApplying(true);
    try {
      await bulkApplyTags(selectedMediaIds, newSelection, bulkTagMode);
      setBulkTagModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to apply tags.');
    } finally {
      setBulkTagApplying(false);
    }
  };

  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const handleCreateCardFromSelection = async () => {
    if (selectedMediaIds.length === 0) return;
    setIsCreatingCard(true);
    try {
      const galleryMedia = selectedMediaIds
        .map((mediaId, order) => ({
          mediaId,
          order,
        }))
        .filter(item => item.mediaId);

      if (galleryMedia.length === 0) {
        alert('No valid media selected.');
        return;
      }

      const firstMediaId = galleryMedia[0]!.mediaId;
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled',
          type: 'gallery',
          status: 'draft',
          coverImageId: firstMediaId,
          galleryMedia,
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(err.message || err.details?.[0] || `HTTP ${response.status}`);
      }

      const newCard = await response.json();
      setSelectedMediaIds([]);
      router.push(`/admin/card-admin/${newCard.docId}/edit`);
    } catch (err) {
      console.error('Create card from selection failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to create card.');
    } finally {
      setIsCreatingCard(false);
    }
  };

  const handleFilterChange = (key: keyof MediaFilters, value: string) => {
    setFilter(key, value);
    fetchMedia(1, { [key]: value });
    if (key === 'assignment' && value !== 'unassigned') {
      setDuplicateTriageMode(false);
    }
  };

  const handleSearch = (search: string) => {
    setFilter('search', search);
    fetchMedia(1, { search });
  };

  const handleClearFilters = () => {
    clearFilters();
    setDuplicateTriageMode(false);
    setDimensionFilters(DEFAULT_DIMENSION_FILTERS);
    setClientSort('none');
  };

  const handleStudioDimensionalFilterChange = (newIds: string[]) => {
    const next = groupSelectedTagIdsByDimension(newIds, allTags);
    if (Object.keys(next).length === 0) {
      setDimensionalQueryOverlay({});
    } else {
      setDimensionalQueryOverlay(next);
    }
    void fetchMedia(1);
  };

  const studioSelectedFilterTags = useMemo(() => {
    const ids = new Set(flattenDimensionalTagMapToTagIds(dimensionalQueryOverlay));
    return allTags.filter((t) => t.docId && ids.has(t.docId!));
  }, [allTags, dimensionalQueryOverlay]);

  const updateDimensionFilter = (
    dimension: DimensionKey,
    patch: Partial<{ mode: DimensionFilterMode; tagId: string }>
  ) => {
    setDimensionFilters((prev) => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        ...patch,
      },
    }));
  };

  /** Whole controls block (title/toggle/search/filters/bulk bar) stays sticky above the table. */
  const stickyTopRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const stickyEl = stickyTopRef.current;
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      const sticky = stickyTopRef.current;
      if (!tabsEl || !sticky) return;
      const tabsH = tabsEl.getBoundingClientRect().height;
      const stickyH = sticky.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsH}px`);
      document.documentElement.style.setProperty('--media-admin-chrome-offset', `${tabsH + stickyH}px`);
    };

    measure();
    window.addEventListener('resize', measure);
    const ro =
      stickyEl && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    if (stickyEl && ro) ro.observe(stickyEl);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, []);

  /** Embedded Studio: dimensional tag filtering is only via API (MacroTagSelector); avoid a second page-level filter. */
  const effectiveDimensionFilters = embedded ? DEFAULT_DIMENSION_FILTERS : dimensionFilters;

  const mainBody = (
    <>
      {/* Loading and Error States */}
      {loading && <p>Loading media...</p>}
      {error && (
        <p className={errorSeverity === 'warning' ? styles.warning : styles.error}>{error.message}</p>
      )}

      {/* Media list or grid */}
      {!loading && !error && (
        viewMode === 'grid' ? (
          <MediaAdminGrid
            sourcePathFirst={duplicateTriageMode}
            dimensionFilters={effectiveDimensionFilters}
            studioSourceDraggable={embedded && studioSourceDraggable}
            clientSort={embedded ? clientSort : 'none'}
          />
        ) : (
          <MediaAdminList
            variant={embedded ? 'compact' : 'full'}
            sourcePathFirst={duplicateTriageMode}
            dimensionFilters={effectiveDimensionFilters}
            studioSourceDraggable={embedded && studioSourceDraggable}
            clientSort={embedded ? clientSort : 'none'}
          />
        )
      )}

      {/* Pagination */}
      {pagination &&
        (pagination.seekMode
          ? pagination.hasNext || currentPage > 1
          : (pagination.totalPages ?? 1) > 1) && (
          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => fetchMedia(currentPage - 1)}
              disabled={!pagination.hasPrev}
              className={styles.pageButton}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>
              {pagination.seekMode ? (
                <>
                  Page {currentPage}
                  {pagination.hasNext ? ' · more available (Next)' : ''}
                  <span className={styles.paginationHint}>
                    {' '}
                    — scans newest first; Clear filters returns to page 1
                  </span>
                </>
              ) : (
                <>
                  Page {pagination.page ?? currentPage} of {pagination.totalPages ?? 1}
                  {pagination.total != null && ` (${pagination.total} total items)`}
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => fetchMedia(currentPage + 1)}
              disabled={!pagination.hasNext}
              className={styles.pageButton}
            >
              Next
            </button>
          </div>
        )}
    </>
  );

  return (
    <div className={embedded ? `${styles.container} ${styles.containerEmbedded}` : styles.container}>
      <div className={styles.stickyTop} ref={stickyTopRef}>
        {embedded ? (
          <>
            <h2 className={styles.embeddedTitle}>Media</h2>
            <div className={styles.studioMediaEmbeddedStack}>
              <div className={styles.studioMediaRowOne}>
                <label
                  className={`${styles.studioInlineLabel} ${styles.studioPaneSearchField}`}
                  htmlFor="media-admin-search-studio"
                >
                  Search
                  <input
                    id="media-admin-search-studio"
                    type="search"
                    placeholder="Typesense when non-empty…"
                    value={filters.search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className={styles.studioMediaSearchInput}
                    autoComplete="off"
                    aria-label="Search media (filename, caption, path, tag names)"
                  />
                </label>
                <label className={styles.studioInlineLabel}>
                  Source
                  <select
                    className={styles.studioFilterSelect}
                    value={filters.source}
                    onChange={(e) => handleFilterChange('source', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="local">Local</option>
                    <option value="paste">Paste</option>
                  </select>
                </label>
                <label className={styles.studioInlineLabel}>
                  Caption
                  <select
                    className={styles.studioFilterSelect}
                    value={filters.hasCaption}
                    onChange={(e) => handleFilterChange('hasCaption', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="with">With</option>
                    <option value="without">Without</option>
                  </select>
                </label>
                <label className={styles.studioInlineLabel}>
                  Assigned
                  <select
                    className={styles.studioFilterSelect}
                    value={filters.assignment}
                    onChange={(e) => handleFilterChange('assignment', e.target.value)}
                    title="Cover, gallery, or content references"
                  >
                    <option value="all">All</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="assigned">Assigned</option>
                  </select>
                </label>
                {filters.assignment === 'unassigned' ? (
                  <label className={styles.studioInlineLabel}>
                    Dupes
                    <select
                      className={styles.studioFilterSelect}
                      value={duplicateTriageMode ? 'sourcePath' : 'none'}
                      onChange={(e) => setDuplicateTriageMode(e.target.value === 'sourcePath')}
                    >
                      <option value="none">Normal</option>
                      <option value="sourcePath">Source path</option>
                    </select>
                  </label>
                ) : null}
                <label className={styles.studioInlineLabel}>
                  Sort
                  <select
                    className={styles.studioFilterSelect}
                    value={clientSort}
                    onChange={(e) =>
                      setClientSort(e.target.value as 'none' | 'filenameAsc' | 'filenameDesc')
                    }
                  >
                    <option value="none">Default</option>
                    <option value="filenameAsc">File A–Z</option>
                    <option value="filenameDesc">File Z–A</option>
                  </select>
                </label>
                <button type="button" onClick={handleClearFilters} className={styles.studioClearButton}>
                  Clear
                </button>
              </div>
              <div className={styles.studioMediaMacroBlock}>
                <MacroTagSelector
                  className={styles.studioMediaMacroTagSelector}
                  selectedTags={studioSelectedFilterTags}
                  allTags={allTags}
                  onChange={handleStudioDimensionalFilterChange}
                  collapsedSummary="sparseTrees"
                />
              </div>
              <div className={styles.studioViewToggleRow}>
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
              </div>
            </div>
            {!loading && !error && (
              <div className={cardAdminStyles.bulkActions}>
                <span>
                  {selectedMediaIds.length === 0
                    ? 'No media selected'
                    : `${selectedMediaIds.length} media selected`}
                </span>
                {selectedMediaIds.length > 0 ? (
                  <div className={cardAdminStyles.actions}>
                    <button
                      type="button"
                      onClick={handleCreateCardFromSelection}
                      disabled={isCreatingCard}
                      className={cardAdminStyles.actionButton}
                    >
                      {isCreatingCard ? 'Creating…' : 'Create card from selection'}
                    </button>
                    <button type="button" onClick={handleOpenBulkTags} className={cardAdminStyles.actionButton}>
                      Edit tags…
                    </button>
                    <button type="button" onClick={selectNone} className={cardAdminStyles.actionButton}>
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className={`${cardAdminStyles.actionButton} ${cardAdminStyles.deleteButton}`}
                    >
                      Delete Selected
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <>
            <h1>Media Management</h1>
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
            </div>

            <div className={styles.searchRow}>
              <div className={styles.filterGroup}>
                <label htmlFor="media-admin-search">Search (filename, caption, path, tag names)</label>
                <input
                  id="media-admin-search"
                  type="search"
                  placeholder="Requires Typesense when non-empty…"
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={styles.searchInputWide}
                />
              </div>
            </div>

            <div className={styles.filters}>
              <div className={styles.filterGroup}>
                <label>Source:</label>
                <select
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="local">Local</option>
                  <option value="paste">Paste</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Dimensions:</label>
                <select
                  value={filters.dimensions}
                  onChange={(e) => handleFilterChange('dimensions', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                  <option value="square">Square</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Caption:</label>
                <select
                  value={filters.hasCaption}
                  onChange={(e) => handleFilterChange('hasCaption', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="with">With Caption</option>
                  <option value="without">Without Caption</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>On cards:</label>
                <select
                  value={filters.assignment}
                  onChange={(e) => handleFilterChange('assignment', e.target.value)}
                  title="Uses referencedByCardIds on each media doc (maintained when cards save)"
                >
                  <option value="all">All</option>
                  <option value="unassigned">Unassigned (not on any card)</option>
                  <option value="assigned">Assigned (cover, gallery, or content)</option>
                </select>
              </div>
              {filters.assignment === 'unassigned' && (
                <div className={styles.filterGroup}>
                  <label>Duplicate triage:</label>
                  <select
                    value={duplicateTriageMode ? 'sourcePath' : 'none'}
                    onChange={(e) => setDuplicateTriageMode(e.target.value === 'sourcePath')}
                  >
                    <option value="none">Normal order</option>
                    <option value="sourcePath">Source-path first</option>
                  </select>
                </div>
              )}

              <button onClick={handleClearFilters} className={styles.clearButton}>
                Clear Filters
              </button>
            </div>
            <div className={styles.filters}>
              {(['who', 'what', 'when', 'where'] as DimensionKey[]).map((dimension) => {
                const state = dimensionFilters[dimension];
                const options = allTags.filter((t) => t.dimension === dimension && t.docId);
                return (
                  <div className={styles.filterGroup} key={dimension}>
                    <label>{dimension[0]!.toUpperCase() + dimension.slice(1)}:</label>
                    <select
                      value={state.mode}
                      onChange={(e) =>
                        updateDimensionFilter(dimension, { mode: e.target.value as DimensionFilterMode })
                      }
                    >
                      <option value="any">Any</option>
                      <option value="hasAny">Has any</option>
                      <option value="isEmpty">Is empty</option>
                      <option value="matches">Matches tag</option>
                    </select>
                    {state.mode === 'matches' && (
                      <select
                        value={state.tagId}
                        onChange={(e) => updateDimensionFilter(dimension, { tagId: e.target.value })}
                      >
                        <option value="">Select tag…</option>
                        {options.map((tag) => (
                          <option key={tag.docId} value={tag.docId}>
                            {tag.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            {!loading && !error && (
              <div className={styles.bulkActions}>
                <span>
                  {selectedMediaIds.length === 0
                    ? 'No media selected'
                    : `${selectedMediaIds.length} media selected`}
                </span>
                {selectedMediaIds.length > 0 ? (
                  <div className={styles.bulkActionGroup}>
                    <button
                      type="button"
                      onClick={handleCreateCardFromSelection}
                      disabled={isCreatingCard}
                      className={styles.bulkButton}
                    >
                      {isCreatingCard ? 'Creating…' : 'Create card from selection'}
                    </button>
                    <button type="button" onClick={handleOpenBulkTags} className={styles.bulkButton}>
                      Edit tags…
                    </button>
                    <button type="button" onClick={selectNone} className={styles.bulkButton}>
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className={`${styles.bulkButton} ${styles.deleteButton}`}
                    >
                      Delete Selected
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <EditModal
        isOpen={bulkTagModalOpen}
        onClose={() => setBulkTagModalOpen(false)}
        title="Tags for selected media"
      >
        <p className={styles.bulkTagHint}>
          Choose how to apply tags, select tags, then click <strong>Save</strong>.
        </p>
        <div className={styles.filterGroup}>
          <label>Bulk tag action:</label>
          <select
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
          selectedTags={allTags.filter(t => t.docId && pendingBulkTags.includes(t.docId))}
          allTags={allTags}
          onChange={setPendingBulkTags}
        />
      </EditModal>

      {embedded ? <div className={styles.embeddedMediaBody}>{mainBody}</div> : mainBody}
    </div>
  );
}
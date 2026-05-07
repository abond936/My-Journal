'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMediaErrorSeverity, useMedia, type MediaFilters } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import MediaAdminGrid from '@/components/admin/media-admin/MediaAdminGrid';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import cardAdminStyles from '@/app/admin/card-admin/card-admin.module.css';
import styles from './media-admin.module.css';
import {
  flattenDimensionalTagMapToTagIds,
  groupSelectedTagIdsByDimension,
} from '@/lib/utils/tagUtils';

export type MediaAdminContentProps = {
  /** When true (e.g. Admin Studio column), use compact scroll layout. */
  embedded?: boolean;
  /** When embedded in Studio, rows register as drag sources for cover/gallery. */
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
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    await deleteMultipleMedia(selectedMediaIds);
    setBulkDeleteModalOpen(false);
  };

  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [pendingBulkTags, setPendingBulkTags] = useState<string[]>([]);
  const [bulkTagApplying, setBulkTagApplying] = useState(false);
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [tagFilterModalOpen, setTagFilterModalOpen] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [duplicateTriageMode, setDuplicateTriageMode] = useState(false);
  const [dimensionFilters, setDimensionFilters] = useState<DimensionFilterState>(DEFAULT_DIMENSION_FILTERS);
  const [clientSort, setClientSort] = useState<'none' | 'filenameAsc' | 'filenameDesc'>('none');
  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (searchDraft === filters.search) return;
    const timeoutId = window.setTimeout(() => {
      setFilter('search', searchDraft);
      void fetchMedia(1, { search: searchDraft });
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [fetchMedia, filters.search, searchDraft, setFilter]);

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
        .filter((item) => item.mediaId);

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
      router.push(`/admin/studio?card=${encodeURIComponent(newCard.docId)}`);
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

  const handleClearFilters = () => {
    clearFilters();
    setDuplicateTriageMode(false);
    setDimensionFilters(DEFAULT_DIMENSION_FILTERS);
    setClientSort('none');
    setSearchDraft('');
  };

  const handleStudioDimensionalFilterChange = (newIds: string[]) => {
    const next = groupSelectedTagIdsByDimension(newIds, allTags);
    setDimensionalQueryOverlay(Object.keys(next).length === 0 ? {} : next);
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

  const mainBody = (
    <>
      {loading && <p>Loading media...</p>}
      {error && (
        <p className={errorSeverity === 'warning' ? styles.warning : styles.error}>{error.message}</p>
      )}

      {!loading && !error && (
        <MediaAdminGrid
          sourcePathFirst={duplicateTriageMode}
          dimensionFilters={dimensionFilters}
          studioSourceDraggable={embedded && studioSourceDraggable}
          clientSort={embedded ? clientSort : 'none'}
        />
      )}

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
                    - scans newest first; Clear filters returns to page 1
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
                placeholder="Typesense when non-empty..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
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
              Shape
              <select
                className={styles.studioFilterSelect}
                value={filters.dimensions}
                onChange={(e) => handleFilterChange('dimensions', e.target.value)}
              >
                <option value="all">All</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="square">Square</option>
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
                <option value="filenameAsc">File A-Z</option>
                <option value="filenameDesc">File Z-A</option>
              </select>
            </label>
            <button type="button" onClick={handleClearFilters} className={styles.studioClearButton}>
              Clear
            </button>
          </div>
          <div className={styles.studioMediaMacroBlock}>
            <CardDimensionalTagCommandBar
              className={styles.studioMediaMacroTagSelector}
              card={{ tags: studioSelectedFilterTags.map((tag) => tag.docId!).filter(Boolean) }}
              allTags={allTags}
              onUpdateTags={handleStudioDimensionalFilterChange}
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
                  <div className={styles.studioMediaRuleMatrix}>
                    {(['who', 'what', 'when', 'where'] as DimensionKey[]).map((dimension) => {
                      const state = dimensionFilters[dimension];
                      const options = allTags.filter((t) => t.dimension === dimension && t.docId);
                      return (
                        <div key={dimension} className={styles.studioMediaRuleColumn}>
                          <div className={styles.studioMediaRuleTitle}>
                            {dimension[0]!.toUpperCase() + dimension.slice(1)}
                          </div>
                          <select
                            className={styles.studioFilterSelectFull}
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
                              className={styles.studioFilterSelectFull}
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
                  {isCreatingCard ? 'Creating...' : 'Create card from selection'}
                </button>
                <button type="button" onClick={handleOpenBulkTags} className={cardAdminStyles.actionButton}>
                  Edit tags...
                </button>
                <button type="button" onClick={selectNone} className={cardAdminStyles.actionButton}>
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDeleteModalOpen(true)}
                  className={`${cardAdminStyles.actionButton} ${cardAdminStyles.deleteButton}`}
                >
                  Delete Selected
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <EditModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        title="Delete selected media"
      >
        <div className={styles.deleteDialogBody}>
          <p className={styles.deleteDialogLead}>
            Delete {selectedMediaIds.length} selected media item{selectedMediaIds.length === 1 ? '' : 's'}?
          </p>
          <p className={styles.deleteDialogText}>
            This will remove the selected media records and their files from the library.
          </p>
          <div className={styles.deleteDialogActions}>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              className={`${cardAdminStyles.actionButton} ${cardAdminStyles.deleteButton}`}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteModalOpen(false)}
              className={cardAdminStyles.actionButton}
            >
              Cancel
            </button>
          </div>
        </div>
      </EditModal>
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
          selectedTags={allTags.filter((t) => t.docId && pendingBulkTags.includes(t.docId))}
          allTags={allTags}
          onChange={setPendingBulkTags}
        />
      </EditModal>
      <EditModal
        isOpen={tagFilterModalOpen}
        onClose={() => setTagFilterModalOpen(false)}
        title="Media filters"
      >
        <MacroTagSelector
          startExpanded
          selectedTags={studioSelectedFilterTags}
          allTags={allTags}
          onChange={handleStudioDimensionalFilterChange}
          collapsedSummary="none"
        />
      </EditModal>

      <div className={styles.embeddedMediaBody}>{mainBody}</div>
    </div>
  );
}

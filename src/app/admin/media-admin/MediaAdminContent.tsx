'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterX, Pencil } from 'lucide-react';
import { getMediaErrorSeverity, useMedia, type MediaFilters } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import BulkEditMediaTagsModal from '@/components/admin/media-admin/BulkEditMediaTagsModal';
import MediaAdminGrid from '@/components/admin/media-admin/MediaAdminGrid';
import MediaLocalImportDialog from '@/components/admin/media-admin/MediaLocalImportDialog';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import DebouncedSearchInput from '@/components/admin/common/DebouncedSearchInput';
import cardAdminStyles from '@/app/admin/card-admin/card-admin.module.css';
import styles from './media-admin.module.css';
import {
  flattenDimensionalTagMapToTagIds,
  groupSelectedTagIdsByDimension,
} from '@/lib/utils/tagUtils';
import {
  DEFAULT_ADMIN_DIMENSION_FILTERS,
  readStoredMediaAdminLocalFilterPreferences,
  writeStoredMediaAdminLocalFilterPreferences,
  type AdminDimensionFilterMode,
  type AdminDimensionFilterState,
} from '@/lib/preferences/adminFilters';
import type { Media } from '@/lib/types/photo';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';

export type MediaAdminContentProps = {
  /** When true (e.g. Admin Studio column), use compact scroll layout. */
  embedded?: boolean;
  /** When embedded in Studio, rows register as drag sources for cover/gallery. */
  studioSourceDraggable?: boolean;
};

type DimensionKey = 'who' | 'what' | 'when' | 'where';
type ApiErrorResponse = {
  message?: string;
  code?: string;
  details?: string[];
};

function collectAssignedMediaIdsForCard(
  card:
    | {
        coverImageId?: string | null;
        galleryMedia?: Array<{ mediaId?: string | null }>;
        contentMedia?: string[];
      }
    | null
    | undefined
): string[] {
  if (!card) return [];
  const ids = new Set<string>();
  if (card.coverImageId) ids.add(card.coverImageId);
  (card.galleryMedia ?? []).forEach((item) => {
    if (item?.mediaId) ids.add(item.mediaId);
  });
  (card.contentMedia ?? []).forEach((mediaId) => {
    if (mediaId) ids.add(mediaId);
  });
  return Array.from(ids);
}

export default function MediaAdminContent(props: MediaAdminContentProps = {}) {
  const { embedded = false, studioSourceDraggable = false } = props;
  const initialLocalFilterPrefsRef = useRef(readStoredMediaAdminLocalFilterPreferences());
  const router = useRouter();
  const feedback = useAppFeedback();
  const studioShell = useStudioShellOptional();
  const {
    media,
    loading,
    loadingMore,
    error,
    loadMoreError,
    pagination,
    filters,
    setFilter,
    clearFilters,
    fetchMedia,
    loadMore,
    hasMore,
    selectedMediaIds,
    selectNone,
    deleteMultipleMedia,
    setSelectedMediaIds,
    dimensionalQueryOverlay,
    setDimensionalQueryOverlay,
    resolveMediaById,
  } = useMedia();

  const { tags: allTags } = useTag();
  const errorSeverity = getMediaErrorSeverity(error);
  const loadMoreErrorSeverity = getMediaErrorSeverity(loadMoreError);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    await deleteMultipleMedia(selectedMediaIds);
    setBulkDeleteModalOpen(false);
  };

  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [tagFilterModalOpen, setTagFilterModalOpen] = useState(false);
  const [duplicateTriageMode, setDuplicateTriageMode] = useState(
    initialLocalFilterPrefsRef.current.duplicateTriageMode
  );
  const [dimensionFilters, setDimensionFilters] = useState<AdminDimensionFilterState>(
    initialLocalFilterPrefsRef.current.dimensionFilters
  );
  const [clientSort, setClientSort] = useState<'none' | 'filenameAsc' | 'filenameDesc'>('none');
  const [highlightAssigned, setHighlightAssigned] = useState(true);
  const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);
  const [visibleAssignedCount, setVisibleAssignedCount] = useState(0);
  const [assignedOnlyMedia, setAssignedOnlyMedia] = useState<typeof media>([]);
  const [assignedOnlyLoading, setAssignedOnlyLoading] = useState(false);
  const [importPickerOpen, setImportPickerOpen] = useState(false);

  useEffect(() => {
    writeStoredMediaAdminLocalFilterPreferences({
      duplicateTriageMode,
      dimensionFilters,
    });
  }, [dimensionFilters, duplicateTriageMode]);

  const handleOpenBulkTags = () => {
    setBulkTagModalOpen(true);
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
        feedback.showError('No valid media selected.', 'Could not create card');
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
      feedback.showError(err instanceof Error ? err.message : 'Failed to create card.', 'Could not create card');
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

  const handleSearchCommit = (nextSearch: string) => {
    if (nextSearch === filters.search) return;
    setFilter('search', nextSearch);
    void fetchMedia(1, { search: nextSearch });
  };

  const handleClearFilters = () => {
    clearFilters();
    setDuplicateTriageMode(false);
    setDimensionFilters(DEFAULT_ADMIN_DIMENSION_FILTERS);
    setClientSort('none');
  };

  const handleImportedMedia = async (importedMedia: Media[]) => {
    if (importedMedia.length === 0) return;
    const importedIds = importedMedia.map((item) => item.docId).filter(Boolean);
    const nextSourceFilter = filters.source === 'paste' ? 'all' : filters.source;
    if (nextSourceFilter !== filters.source) {
      setFilter('source', nextSourceFilter);
    }
    await fetchMedia(1, nextSourceFilter !== filters.source ? { source: nextSourceFilter } : undefined);
    setSelectedMediaIds(importedIds);
    feedback.showSuccess(
      importedIds.length === 1
        ? 'Imported 1 image into the media bank.'
        : `Imported ${importedIds.length} images into the media bank.`,
      'Import complete'
    );
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

  const activeStudioCard = studioShell?.selectedDetail ?? studioShell?.selectedPreview ?? null;
  const activeStudioCardAssignedMediaIds = useMemo(
    () => collectAssignedMediaIdsForCard(activeStudioCard),
    [activeStudioCard]
  );
  const activeStudioCardAssignedMediaIdsKey = useMemo(
    () => activeStudioCardAssignedMediaIds.join('\u001e'),
    [activeStudioCardAssignedMediaIds]
  );
  const assignedOnlyResolvedMedia = (() => {
    if (activeStudioCardAssignedMediaIds.length === 0) return [];
    const fallbackById = new Map(
      assignedOnlyMedia.filter((item) => item?.docId).map((item) => [item.docId, item] as const)
    );
    return activeStudioCardAssignedMediaIds
      .map((mediaId) => resolveMediaById(mediaId) ?? fallbackById.get(mediaId) ?? null)
      .filter((item): item is (typeof media)[number] => Boolean(item?.docId));
  })();
  const hiddenAssignedCount = Math.max(
    0,
    activeStudioCardAssignedMediaIds.length - visibleAssignedCount
  );
  const showAssignedHighlightControls =
    embedded && Boolean(activeStudioCard?.docId) && activeStudioCardAssignedMediaIds.length > 0;
  const assignedOnlyCount = activeStudioCardAssignedMediaIds.length;

  useEffect(() => {
    if (!showAssignedHighlightControls && showOnlyAssigned) {
      setShowOnlyAssigned(false);
    }
  }, [showAssignedHighlightControls, showOnlyAssigned]);

  useEffect(() => {
    if (!showOnlyAssigned) return;
    if (activeStudioCardAssignedMediaIds.length === 0) {
      setAssignedOnlyMedia([]);
      setAssignedOnlyLoading(false);
      return;
    }
    let cancelled = false;
    const loadAssignedOnlyMedia = async () => {
      setAssignedOnlyLoading(true);
      try {
        const cachedById = new Map<string, (typeof media)[number]>();
        const missingIds: string[] = [];
        for (const mediaId of activeStudioCardAssignedMediaIds) {
          const cached = resolveMediaById(mediaId);
          if (cached) cachedById.set(mediaId, cached);
          else missingIds.push(mediaId);
        }

        const fetchedMissing = await Promise.all(
          missingIds.map(async (mediaId) => {
            try {
              const response = await fetch(`/api/images/${encodeURIComponent(mediaId)}`, {
                cache: 'no-store',
                credentials: 'same-origin',
              });
              if (!response.ok) return null;
              const payload = (await response.json().catch(() => ({}))) as { media?: (typeof media)[number] };
              return payload.media ?? null;
            } catch {
              return null;
            }
          })
        );
        fetchedMissing.forEach((item) => {
          if (item?.docId) cachedById.set(item.docId, item);
        });

        const loaded = activeStudioCardAssignedMediaIds
          .map((mediaId) => cachedById.get(mediaId) ?? null)
          .filter((item): item is (typeof media)[number] => Boolean(item?.docId));

        if (cancelled) return;
        setAssignedOnlyMedia(loaded);
      } finally {
        if (!cancelled) setAssignedOnlyLoading(false);
      }
    };
    void loadAssignedOnlyMedia();
    return () => {
      cancelled = true;
    };
  }, [activeStudioCardAssignedMediaIds, activeStudioCardAssignedMediaIdsKey, resolveMediaById, showOnlyAssigned]);

  const updateDimensionFilter = (
    dimension: DimensionKey,
    patch: Partial<{ mode: AdminDimensionFilterMode; tagId: string }>
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || importPickerOpen || loadMoreError) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loading || loadingMore) return;
        void loadMore();
      },
      { rootMargin: '280px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, importPickerOpen, loadMore, loadMoreError, loading, loadingMore]);

  const mainBody = (
    <>
      {loading && media.length === 0 && <p>Loading media...</p>}
      {showOnlyAssigned && assignedOnlyLoading ? <p>Loading assigned media...</p> : null}
      {error && (
        <p className={errorSeverity === 'warning' ? styles.warning : styles.error}>{error.message}</p>
      )}

      {!error && !showOnlyAssigned && (
        <MediaAdminGrid
          sourcePathFirst={duplicateTriageMode}
          dimensionFilters={dimensionFilters}
          studioSourceDraggable={embedded && studioSourceDraggable}
          inlineCaptionEditing={embedded}
          clientSort={embedded ? clientSort : 'none'}
          highlightedMediaIds={highlightAssigned ? activeStudioCardAssignedMediaIds : []}
          onVisibleHighlightedCountChange={setVisibleAssignedCount}
        />
      )}
      {!error && showOnlyAssigned && !assignedOnlyLoading ? (
        <MediaAdminGrid
          mediaOverride={assignedOnlyResolvedMedia}
          emptyMessage="No media are assigned to the current card."
          sourcePathFirst={false}
          dimensionFilters={DEFAULT_ADMIN_DIMENSION_FILTERS}
          studioSourceDraggable={embedded && studioSourceDraggable}
          inlineCaptionEditing={embedded}
          clientSort={clientSort}
          highlightedMediaIds={activeStudioCardAssignedMediaIds}
          onVisibleHighlightedCountChange={setVisibleAssignedCount}
        />
      ) : null}

      {!showOnlyAssigned && (pagination || hasMore || loadingMore) && (
          <div className={styles.pagination}>
            {hasMore ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loading || loadingMore}
                className={styles.pageButton}
              >
                {loadingMore ? 'Loading more...' : loadMoreError ? 'Retry loading more' : 'Load more'}
              </button>
            ) : null}
            <span className={styles.pageInfo}>
              {pagination?.seekMode ? (
                <>
                  Scrolling newest first
                  <span className={styles.paginationHint}>
                    {' '}
                    - filtered results continue as you scroll
                  </span>
                </>
              ) : (
                <>
                  {pagination.total != null ? `${pagination.total} total items` : 'Scrolling newest first'}
                </>
              )}
            </span>
            {!hasMore ? (
              <span className={styles.paginationHint}>End of loaded results</span>
            ) : null}
            {loadMoreError ? (
              <span className={loadMoreErrorSeverity === 'warning' ? styles.warning : styles.error}>
                {loadMoreError.message}
              </span>
            ) : null}
          </div>
        )}
      <div ref={loadMoreRef} aria-hidden="true" />
    </>
  );

  return (
    <div className={embedded ? `${styles.container} ${styles.containerEmbedded}` : styles.container}>
      {importPickerOpen ? (
        <MediaLocalImportDialog
          isOpen={importPickerOpen}
          onClose={() => setImportPickerOpen(false)}
          onImportComplete={(importedMedia) => {
            void handleImportedMedia(importedMedia);
          }}
          title="Import Media"
        />
      ) : null}
      <div className={styles.stickyTop} ref={stickyTopRef}>
        <div className={styles.studioMediaEmbeddedStack}>
          <div className={styles.studioHeaderRow}>
            <h2 className={styles.embeddedTitle}>Media</h2>
            <div className={styles.studioHeaderActions}>
              <button
                type="button"
                onClick={() => setImportPickerOpen(true)}
                className={styles.studioImportButton}
              >
                Import
              </button>
            </div>
          </div>
          <div className={styles.studioMediaRowOne}>
            <label
              className={`${styles.studioInlineLabel} ${styles.studioPaneSearchField}`}
              htmlFor="media-admin-search-studio"
              aria-label="Search media"
            >
              <DebouncedSearchInput
                id="media-admin-search-studio"
                placeholder="Search"
                value={filters.search}
                onCommit={handleSearchCommit}
                className={styles.studioMediaSearchInput}
                autoComplete="off"
                aria-label="Search media (filename, caption, path, tag names)"
              />
            </label>
            <label className={styles.studioInlineLabel} aria-label="Filter by source">
              <select
                className={styles.studioFilterSelect}
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                aria-label="Filter by source"
              >
                <option value="all">All Sources</option>
                <option value="local">Local</option>
                <option value="paste">Paste</option>
              </select>
            </label>
            <label className={styles.studioInlineLabel} aria-label="Filter by caption">
              <select
                className={styles.studioFilterSelect}
                value={filters.hasCaption}
                onChange={(e) => handleFilterChange('hasCaption', e.target.value)}
                aria-label="Filter by caption"
              >
                <option value="all">All Captions</option>
                <option value="with">With</option>
                <option value="without">Without</option>
              </select>
            </label>
            <label className={styles.studioInlineLabel} aria-label="Filter by shape">
              <select
                className={styles.studioFilterSelect}
                value={filters.dimensions}
                onChange={(e) => handleFilterChange('dimensions', e.target.value)}
                aria-label="Filter by shape"
              >
                <option value="all">All Shapes</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="square">Square</option>
              </select>
            </label>
            <label className={styles.studioInlineLabel} aria-label="Filter by assignment">
              <select
                className={styles.studioFilterSelect}
                value={filters.assignment}
                onChange={(e) => handleFilterChange('assignment', e.target.value)}
                title="Cover, gallery, or content references"
                aria-label="Filter by assignment"
              >
                <option value="all">All Assignments</option>
                <option value="unassigned">Unassigned</option>
                <option value="assigned">Assigned</option>
              </select>
            </label>
            {filters.assignment === 'unassigned' ? (
              <label className={styles.studioInlineLabel} aria-label="Duplicate triage mode">
                <select
                  className={styles.studioFilterSelect}
                  value={duplicateTriageMode ? 'sourcePath' : 'none'}
                  onChange={(e) => setDuplicateTriageMode(e.target.value === 'sourcePath')}
                  aria-label="Duplicate triage mode"
                >
                  <option value="none">No Dupe Check</option>
                  <option value="sourcePath">Source Path</option>
                </select>
              </label>
            ) : null}
            <label className={styles.studioInlineLabel} aria-label="Sort media">
              <select
                className={styles.studioFilterSelect}
                value={clientSort}
                onChange={(e) =>
                  setClientSort(e.target.value as 'none' | 'filenameAsc' | 'filenameDesc')
                }
                aria-label="Sort media"
              >
                <option value="none">Default Sort</option>
                <option value="filenameAsc">File A-Z</option>
                <option value="filenameDesc">File Z-A</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleClearFilters}
              className={styles.studioClearButton}
              aria-label="Clear media filters"
              title="Clear media filters"
            >
              <FilterX size={16} aria-hidden="true" />
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
                    aria-label="Edit media tag filters"
                    title="Edit media tag filters"
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                </div>
              }
              footerContent={
                <div className={styles.studioMediaRuleMatrix}>
                  {(['who', 'what', 'when', 'where'] as DimensionKey[]).map((dimension) => {
                    const state = dimensionFilters[dimension];
                    const options = allTags.filter((t) => t.dimension === dimension && t.docId);
                    return (
                      <div key={dimension} className={styles.studioMediaRuleColumn}>
                        <select
                          className={styles.studioFilterSelectFull}
                          value={state.mode}
                          onChange={(e) =>
                            updateDimensionFilter(dimension, {
                              mode: e.target.value as AdminDimensionFilterMode,
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
              }
            />
          </div>
          {showAssignedHighlightControls ? (
            <div className={styles.studioAssignedBridgeRow}>
              <label className={styles.studioAssignedToggle}>
                <input
                  type="checkbox"
                  checked={highlightAssigned}
                  onChange={(e) => setHighlightAssigned(e.target.checked)}
                />
                <span>Highlight assigned</span>
              </label>
              <label className={styles.studioAssignedToggle}>
                <input
                  type="checkbox"
                  checked={showOnlyAssigned}
                  onChange={(e) => setShowOnlyAssigned(e.target.checked)}
                />
                <span>Show only assigned</span>
              </label>
              {highlightAssigned || showOnlyAssigned ? (
                <span className={styles.studioAssignedNotice}>
                  {showOnlyAssigned
                    ? `Showing ${assignedOnlyCount} assigned image${assignedOnlyCount === 1 ? '' : 's'}`
                    : hiddenAssignedCount > 0
                    ? `${hiddenAssignedCount} assigned image${hiddenAssignedCount === 1 ? '' : 's'} hidden by current filters`
                    : 'All assigned images in current results'}
                </span>
              ) : null}
            </div>
          ) : null}
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
                  {isCreatingCard ? 'Creating...' : 'Create card'}
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
                  Delete
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
      <BulkEditMediaTagsModal
        mediaIds={selectedMediaIds}
        isOpen={bulkTagModalOpen}
        onClose={() => setBulkTagModalOpen(false)}
        onSave={async () => {
          setBulkTagModalOpen(false);
        }}
      />
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

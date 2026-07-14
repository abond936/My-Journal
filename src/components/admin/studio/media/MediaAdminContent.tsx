'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterX, Pencil } from 'lucide-react';
import { getMediaErrorSeverity, useMedia, type MediaFilters } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import BulkEditMediaTagsModal from '@/components/admin/studio/media/BulkEditMediaTagsModal';
import MediaAdminGrid from '@/components/admin/studio/media/MediaAdminGrid';
import MediaBrowseGroupedView from '@/components/admin/studio/media/MediaBrowseGroupedView';
import MediaLocalImportDialog from '@/components/admin/studio/media/MediaLocalImportDialog';
import MediaReviewPanel, { generateReviewClustersForImport } from '@/components/admin/studio/media/MediaReviewPanel';
import EditModal from '@/components/admin/studio/cards/EditModal';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import DebouncedSearchInput from '@/components/admin/common/DebouncedSearchInput';
import cardAdminStyles from '@/components/admin/studio/cards/studioCardsShell.module.css';
import styles from './mediaAdminShell.module.css';
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
import type { ProvisionalCluster } from '@/lib/types/provisionalCluster';
import {
  filterMediaByImportBatch,
  filterMediaByImportFolder,
  groupMediaForBrowse,
  importFolderLabelFromMedia,
} from '@/lib/utils/mediaBrowseUtils';
import { buildReconcileMediaFilter } from '@/lib/utils/tagReconciliationUtils';
import {
  resolveGalleryEntriesFromSelection,
  selectionEligibleForCreateStack,
} from '@/lib/utils/mediaStackDisplayUtils';
import { getTagPathDisplay } from '@/lib/utils/tagDimensionResolve';
import { useMediaStacks } from '@/components/admin/studio/media/useMediaStacks';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';

export type MediaAdminContentProps = {
  /** When true (e.g. Admin Studio column), use compact scroll layout. */
  embedded?: boolean;
  /** When embedded in Studio, rows register as drag sources for cover/gallery. */
  studioSourceDraggable?: boolean;
};

type DimensionKey = 'who' | 'what' | 'when' | 'where';
type MediaPaneMode = 'browse' | 'review';
type MediaPopulation = 'bank' | 'this_card';
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
  const initialFetchRequestedRef = useRef(false);
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
    clearError,
    setSelectedMediaIds,
    dimensionalQueryOverlay,
    setDimensionalQueryOverlay,
    setTransientDimensionalQueryOverlay,
    resolveMediaById,
  } = useMedia();

  const { tags: allTags } = useTag();
  const errorSeverity = getMediaErrorSeverity(error);
  const loadMoreErrorSeverity = getMediaErrorSeverity(loadMoreError);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    await deleteMultipleMedia(selectedMediaIds);
    if (studioShell?.selectedCardId) {
      void studioShell.loadSelectedCard(studioShell.selectedCardId, { quiet: true });
    }
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
  const [mediaPopulation, setMediaPopulation] = useState<MediaPopulation>('bank');
  const showOnlyAssigned = mediaPopulation === 'this_card';
  const [visibleAssignedCount, setVisibleAssignedCount] = useState(0);
  const [assignedOnlyMedia, setAssignedOnlyMedia] = useState<typeof media>([]);
  const [assignedOnlyLoading, setAssignedOnlyLoading] = useState(false);
  const assignedOnlyMediaRef = useRef<typeof media>([]);
  const [importPickerOpen, setImportPickerOpen] = useState(false);
  const [mediaPaneMode, setMediaPaneMode] = useState<MediaPaneMode>('browse');
  const [browseGroupBy, setBrowseGroupBy] = useState(initialLocalFilterPrefsRef.current.browseGroupBy);
  const [browseImportBatchFilter, setBrowseImportBatchFilter] = useState(
    initialLocalFilterPrefsRef.current.browseImportBatchFilter
  );
  const [browseImportFolderFilter, setBrowseImportFolderFilter] = useState(
    initialLocalFilterPrefsRef.current.browseImportFolderFilter
  );
  const [gridTileMinPx, setGridTileMinPx] = useState(initialLocalFilterPrefsRef.current.gridTileMinPx);
  const [lastImportBatchId, setLastImportBatchId] = useState(
    initialLocalFilterPrefsRef.current.lastImportBatchId
  );
  const [showAllStacks, setShowAllStacks] = useState(initialLocalFilterPrefsRef.current.showAllStacks);
  const [expandedStackIds, setExpandedStackIds] = useState<Set<string>>(() => new Set());
  const [suggestedClusters, setSuggestedClusters] = useState<ProvisionalCluster[]>([]);
  const { stackById, createStack, dissolveStack } = useMediaStacks(mediaPaneMode === 'browse');

  useEffect(() => {
    writeStoredMediaAdminLocalFilterPreferences({
      duplicateTriageMode,
      dimensionFilters,
      browseGroupBy,
      browseImportBatchFilter,
      browseImportFolderFilter,
      gridTileMinPx,
      lastImportBatchId,
      showAllStacks,
    });
  }, [
    browseGroupBy,
    browseImportBatchFilter,
    browseImportFolderFilter,
    dimensionFilters,
    duplicateTriageMode,
    gridTileMinPx,
    lastImportBatchId,
    showAllStacks,
  ]);

  const handleOpenBulkTags = () => {
    setBulkTagModalOpen(true);
  };

  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [isCreatingStack, setIsCreatingStack] = useState(false);
  const [isDissolvingStack, setIsDissolvingStack] = useState(false);

  const mediaById = useMemo(() => new Map(media.map((item) => [item.docId, item])), [media]);

  const handleToggleStackExpand = useCallback((stackId: string) => {
    setExpandedStackIds((prev) => {
      const next = new Set(prev);
      if (next.has(stackId)) next.delete(stackId);
      else next.add(stackId);
      return next;
    });
  }, []);

  const handleDissolveStack = useCallback(
    async (stackId: string) => {
      setIsDissolvingStack(true);
      try {
        await dissolveStack(stackId);
        setExpandedStackIds((prev) => {
          const next = new Set(prev);
          next.delete(stackId);
          return next;
        });
        await fetchMedia(1);
        feedback.showSuccess('Stack dissolved.');
      } catch (err) {
        feedback.showError(err instanceof Error ? err.message : 'Failed to unstack.', 'Unstack');
      } finally {
        setIsDissolvingStack(false);
      }
    },
    [dissolveStack, feedback, fetchMedia]
  );

  const handleCreateStackFromSelection = useCallback(async () => {
    const result = selectionEligibleForCreateStack(selectedMediaIds, mediaById);
    if (result.ok === false) {
      feedback.showError(result.reason, 'Create stack');
      return;
    }
    setIsCreatingStack(true);
    try {
      await createStack(result.mediaIds);
      await fetchMedia(1);
      setSelectedMediaIds([]);
      feedback.showSuccess('Stack created.');
    } catch (err) {
      feedback.showError(err instanceof Error ? err.message : 'Failed to create stack.', 'Create stack');
    } finally {
      setIsCreatingStack(false);
    }
  }, [createStack, feedback, fetchMedia, mediaById, selectedMediaIds, setSelectedMediaIds]);

  const handleBulkUnstack = useCallback(async () => {
    const stackIds = [
      ...new Set(
        selectedMediaIds
          .map((id) => mediaById.get(id)?.stackId)
          .filter((stackId): stackId is string => Boolean(stackId))
      ),
    ];
    if (stackIds.length === 0) {
      feedback.showError('No stacked media selected.', 'Unstack');
      return;
    }
    setIsDissolvingStack(true);
    try {
      for (const stackId of stackIds) {
        await dissolveStack(stackId);
      }
      setExpandedStackIds((prev) => {
        const next = new Set(prev);
        stackIds.forEach((id) => next.delete(id));
        return next;
      });
      await fetchMedia(1);
      setSelectedMediaIds([]);
      feedback.showSuccess(stackIds.length === 1 ? 'Stack dissolved.' : `${stackIds.length} stacks dissolved.`);
    } catch (err) {
      feedback.showError(err instanceof Error ? err.message : 'Failed to unstack.', 'Unstack');
    } finally {
      setIsDissolvingStack(false);
    }
  }, [dissolveStack, feedback, fetchMedia, mediaById, selectedMediaIds, setSelectedMediaIds]);

  const stackGridProps = useMemo(
    () => ({
      stackById,
      showAllStacks,
      expandedStackIds,
      onToggleStackExpand: handleToggleStackExpand,
      onDissolveStack: handleDissolveStack,
    }),
    [expandedStackIds, handleDissolveStack, handleToggleStackExpand, showAllStacks, stackById]
  );

  const createStackEligible = useMemo(
    () => selectionEligibleForCreateStack(selectedMediaIds, mediaById).ok,
    [mediaById, selectedMediaIds]
  );

  const selectionHasStackedMedia = useMemo(
    () => selectedMediaIds.some((id) => Boolean(mediaById.get(id)?.stackId)),
    [mediaById, selectedMediaIds]
  );

  const handleCreateCardFromSelection = async () => {
    if (selectedMediaIds.length === 0) return;
    setIsCreatingCard(true);
    try {
      const galleryMedia = resolveGalleryEntriesFromSelection(
        selectedMediaIds,
        mediaById,
        stackById
      ).map(({ mediaId, order, stackId }) => ({
        mediaId,
        order,
        ...(stackId ? { stackId } : {}),
      }));

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
    studioShell?.clearOrganizeReconcile();
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
    const batchId = importedMedia.find((item) => item.importBatchId)?.importBatchId;
    if (batchId) {
      setLastImportBatchId(batchId);
      setBrowseImportBatchFilter(batchId);
    }
    try {
      await generateReviewClustersForImport(importedIds);
    } catch (error) {
      console.error('Review cluster generation after import failed:', error);
    }
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

  useEffect(() => {
    if (mediaPaneMode !== 'browse' || browseGroupBy !== 'suggested') {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/admin/media/review?lens=suggested', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const payload = (await response.json().catch(() => ({}))) as { clusters?: ProvisionalCluster[] };
        if (!cancelled && response.ok) {
          setSuggestedClusters(payload.clusters ?? []);
        }
      } catch {
        if (!cancelled) setSuggestedClusters([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [browseGroupBy, mediaPaneMode, media.length]);

  const importFolderOptions = useMemo(() => {
    const folders = new Set<string>();
    for (const item of media) {
      folders.add(importFolderLabelFromMedia(item));
    }
    return Array.from(folders).sort((a, b) => a.localeCompare(b));
  }, [media]);

  const browseScopedMedia = useMemo(() => {
    let items = media;
    items = filterMediaByImportBatch(items, browseImportBatchFilter || null);
    items = filterMediaByImportFolder(items, browseImportFolderFilter);
    return items;
  }, [browseImportBatchFilter, browseImportFolderFilter, media]);

  const browseGroups = useMemo(
    () => groupMediaForBrowse(browseScopedMedia, browseGroupBy, suggestedClusters),
    [browseGroupBy, browseScopedMedia, suggestedClusters]
  );

  const activeStudioCard = studioShell?.selectedDetail ?? studioShell?.selectedPreview ?? null;
  const activeStudioCardId = activeStudioCard?.docId ?? null;
  const organizeReconcileSourceTagId = studioShell?.organizeReconcileSourceTagId ?? null;
  const reconcileSourceTag = useMemo(
    () =>
      organizeReconcileSourceTagId
        ? allTags.find((tag) => tag.docId === organizeReconcileSourceTagId) ?? null
        : null,
    [allTags, organizeReconcileSourceTagId]
  );
  const tagByIdForReconcile = useMemo(
    () => new Map(allTags.filter((tag) => tag.docId).map((tag) => [tag.docId!, tag])),
    [allTags]
  );
  const reconcileFilterActive = Boolean(embedded && organizeReconcileSourceTagId);
  const prevReconcileSourceTagIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!embedded) return;
    const previousSourceTagId = prevReconcileSourceTagIdRef.current;
    prevReconcileSourceTagIdRef.current = organizeReconcileSourceTagId;

    if (organizeReconcileSourceTagId) {
      const filter = buildReconcileMediaFilter(organizeReconcileSourceTagId, tagByIdForReconcile);
      if (!filter) return;
      setMediaPaneMode('browse');
      setMediaPopulation('bank');
      setTransientDimensionalQueryOverlay(filter);
      void fetchMedia(1);
      return;
    }

    if (previousSourceTagId !== null) {
      setTransientDimensionalQueryOverlay({});
      void fetchMedia(1);
    }
  }, [
    embedded,
    fetchMedia,
    organizeReconcileSourceTagId,
    setTransientDimensionalQueryOverlay,
    tagByIdForReconcile,
  ]);
  const activeStudioCardAssignedMediaIds = useMemo(
    () => collectAssignedMediaIdsForCard(activeStudioCard),
    [activeStudioCard]
  );
  const activeStudioCardAssignedMediaIdsKey = useMemo(
    () => activeStudioCardAssignedMediaIds.join('\u001e'),
    [activeStudioCardAssignedMediaIds]
  );

  useEffect(() => {
    assignedOnlyMediaRef.current = assignedOnlyMedia;
  }, [assignedOnlyMedia]);
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
    embedded &&
    Boolean(activeStudioCard?.docId) &&
    activeStudioCardAssignedMediaIds.length > 0 &&
    mediaPopulation === 'bank';
  const canViewThisCardPopulation =
    embedded && Boolean(activeStudioCard?.docId) && activeStudioCardAssignedMediaIds.length > 0;
  const assignedOnlyCount = activeStudioCardAssignedMediaIds.length;

  useEffect(() => {
    if (!canViewThisCardPopulation && mediaPopulation === 'this_card') {
      setMediaPopulation('bank');
    }
  }, [canViewThisCardPopulation, mediaPopulation]);

  useEffect(() => {
    if (initialFetchRequestedRef.current) return;
    if (loading || error || showOnlyAssigned) return;
    if (media.length > 0 || pagination) {
      initialFetchRequestedRef.current = true;
      return;
    }
    if (embedded && !activeStudioCardId) return;
    initialFetchRequestedRef.current = true;
    void fetchMedia(1);
  }, [activeStudioCardId, embedded, error, fetchMedia, loading, media.length, pagination, showOnlyAssigned]);

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
        const localAssignedById = new Map(
          assignedOnlyMediaRef.current
            .filter((item) => item?.docId)
            .map((item) => [item.docId, item] as const)
        );
        const missingIds: string[] = [];
        for (const mediaId of activeStudioCardAssignedMediaIds) {
          const cached = resolveMediaById(mediaId) ?? localAssignedById.get(mediaId);
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
        setAssignedOnlyMedia((current) => {
          if (
            current.length === loaded.length &&
            current.every((item, index) => item?.docId === loaded[index]?.docId)
          ) {
            return current;
          }
          return loaded;
        });
      } finally {
        if (!cancelled) setAssignedOnlyLoading(false);
      }
    };
    void loadAssignedOnlyMedia();
    return () => {
      cancelled = true;
    };
  }, [activeStudioCardAssignedMediaIdsKey, resolveMediaById, showOnlyAssigned]);

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
    if (embedded) return;
    const node = loadMoreRef.current;
    if (!node || !hasMore || importPickerOpen || loadMoreError || showOnlyAssigned) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loading || loadingMore) return;
        void loadMore();
      },
      { rootMargin: '480px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [embedded, hasMore, importPickerOpen, loadMore, loadMoreError, loading, loadingMore, showOnlyAssigned]);

  const mainBody = (
    <>
      {loading && media.length === 0 && <p>Loading media...</p>}
      {showOnlyAssigned && assignedOnlyLoading ? <p>Loading assigned media...</p> : null}
      {error ? (
        <div className={errorSeverity === 'warning' ? styles.warning : styles.error}>
          <div className={styles.errorBanner}>
            <span>{error.message}</span>
            <button
              type="button"
              onClick={clearError}
              className={styles.errorDismissButton}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {!showOnlyAssigned && (
        browseGroupBy !== 'none' ? (
          <MediaBrowseGroupedView
            groups={browseGroups}
            sourcePathFirst={duplicateTriageMode}
            dimensionFilters={dimensionFilters}
            tagFilterScope={filters.tagScope}
            studioSourceDraggable={embedded && studioSourceDraggable}
            inlineCaptionEditing={embedded}
            clientSort={embedded ? clientSort : 'none'}
            highlightedMediaIds={highlightAssigned ? activeStudioCardAssignedMediaIds : []}
            onVisibleHighlightedCountChange={setVisibleAssignedCount}
            gridTileMinPx={gridTileMinPx}
            resolveMediaById={resolveMediaById}
            allLoadedMedia={browseScopedMedia}
            {...stackGridProps}
          />
        ) : (
        <MediaAdminGrid
          sourcePathFirst={duplicateTriageMode}
          dimensionFilters={dimensionFilters}
          tagFilterScope={filters.tagScope}
          studioSourceDraggable={embedded && studioSourceDraggable}
          inlineCaptionEditing={embedded}
          clientSort={embedded ? clientSort : 'none'}
          highlightedMediaIds={highlightAssigned ? activeStudioCardAssignedMediaIds : []}
          onVisibleHighlightedCountChange={setVisibleAssignedCount}
          gridTileMinPx={gridTileMinPx}
          mediaOverride={browseScopedMedia.length !== media.length ? browseScopedMedia : undefined}
          {...stackGridProps}
        />
        )
      )}
      {showOnlyAssigned && !assignedOnlyLoading ? (
        <MediaAdminGrid
          mediaOverride={assignedOnlyResolvedMedia}
          emptyMessage="No media are assigned to the current card."
          sourcePathFirst={false}
          dimensionFilters={DEFAULT_ADMIN_DIMENSION_FILTERS}
          tagFilterScope={filters.tagScope}
          studioSourceDraggable={embedded && studioSourceDraggable}
          inlineCaptionEditing={embedded}
          clientSort={clientSort}
          highlightedMediaIds={activeStudioCardAssignedMediaIds}
          onVisibleHighlightedCountChange={setVisibleAssignedCount}
          {...stackGridProps}
        />
      ) : null}

      {!showOnlyAssigned && ((pagination || hasMore || loadingMore) || loadMoreError) && (
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
            {!embedded ? (
              <span className={styles.pageInfo}>
                {pagination?.seekMode ? (
                  <>Scrolling newest first</>
                ) : (
                  <>{pagination.total != null ? `${pagination.total} total items` : 'Scrolling newest first'}</>
                )}
              </span>
            ) : null}
            {!hasMore && !embedded ? (
              <span className={styles.paginationHint}>End of loaded results</span>
            ) : null}
            {loadMoreError ? (
              <span className={loadMoreErrorSeverity === 'warning' ? styles.warning : styles.error}>
                {loadMoreError.message}
              </span>
            ) : null}
          </div>
        )}
      {!showOnlyAssigned && !embedded ? <div ref={loadMoreRef} aria-hidden="true" /> : null}
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
              <div className={styles.mediaModeToggle} role="group" aria-label="Media pane mode">
                <button
                  type="button"
                  className={`${styles.mediaModeToggleButton} ${
                    mediaPaneMode === 'browse' ? styles.mediaModeToggleButtonActive : ''
                  }`}
                  onClick={() => setMediaPaneMode('browse')}
                  aria-pressed={mediaPaneMode === 'browse'}
                >
                  Browse
                </button>
                <button
                  type="button"
                  className={`${styles.mediaModeToggleButton} ${
                    mediaPaneMode === 'review' ? styles.mediaModeToggleButtonActive : ''
                  }`}
                  onClick={() => setMediaPaneMode('review')}
                  aria-pressed={mediaPaneMode === 'review'}
                >
                  Review
                </button>
              </div>
              <button
                type="button"
                onClick={() => setImportPickerOpen(true)}
                className={styles.studioImportButton}
              >
                Import
              </button>
            </div>
          </div>
          {reconcileFilterActive && reconcileSourceTag ? (
            <div className={styles.studioReconcileMediaBanner}>
              <span>
                Map preview — showing media tagged with{' '}
                <strong>{getTagPathDisplay(reconcileSourceTag, tagByIdForReconcile)}</strong>
              </span>
              <button
                type="button"
                className={styles.studioClearButton}
                onClick={() => studioShell?.clearOrganizeReconcile()}
              >
                Clear preview
              </button>
            </div>
          ) : null}
          {mediaPaneMode === 'browse' && embedded ? (
            <div className={styles.studioPopulationRow}>
              <span className={styles.studioPopulationLabel}>View</span>
              <div className={styles.mediaModeToggle} role="group" aria-label="Media population">
                <button
                  type="button"
                  className={`${styles.mediaModeToggleButton} ${
                    mediaPopulation === 'bank' ? styles.mediaModeToggleButtonActive : ''
                  }`}
                  onClick={() => setMediaPopulation('bank')}
                  aria-pressed={mediaPopulation === 'bank'}
                >
                  Whole library
                </button>
                <button
                  type="button"
                  className={`${styles.mediaModeToggleButton} ${
                    mediaPopulation === 'this_card' ? styles.mediaModeToggleButtonActive : ''
                  }`}
                  onClick={() => setMediaPopulation('this_card')}
                  aria-pressed={mediaPopulation === 'this_card'}
                  disabled={!canViewThisCardPopulation}
                  title={
                    canViewThisCardPopulation
                      ? 'Show only media on the selected card'
                      : 'Select a card with media first'
                  }
                >
                  This card
                </button>
              </div>
              {showAssignedHighlightControls ? (
                <label className={styles.studioPopulationHighlight}>
                  <input
                    type="checkbox"
                    checked={highlightAssigned}
                    onChange={(e) => setHighlightAssigned(e.target.checked)}
                  />
                  <span>Highlight on this card</span>
                </label>
              ) : null}
              {showAssignedHighlightControls && highlightAssigned && hiddenAssignedCount > 0 ? (
                <span className={styles.studioPopulationNotice}>
                  {hiddenAssignedCount} on this card hidden by current filters
                </span>
              ) : null}
              {mediaPopulation === 'this_card' ? (
                <span className={styles.studioPopulationNotice}>
                  {assignedOnlyCount} photo{assignedOnlyCount === 1 ? '' : 's'} on selected card
                </span>
              ) : null}
            </div>
          ) : null}
          {mediaPaneMode === 'browse' ? (
          <>
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
            {mediaPopulation === 'bank' ? (
            <label className={styles.studioInlineLabel} aria-label="Filter by bank assignment">
              <select
                className={styles.studioFilterSelect}
                value={filters.assignment}
                onChange={(e) => handleFilterChange('assignment', e.target.value)}
                title="On any card in the archive vs not yet on a card"
                aria-label="Filter by bank assignment"
              >
                <option value="all">Any card status</option>
                <option value="unassigned">Not on any card</option>
                <option value="assigned">On any card</option>
              </select>
            </label>
            ) : null}
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
          <div className={styles.studioMediaBrowseRow}>
            <label className={styles.studioInlineLabel} aria-label="Group media by">
              <select
                className={styles.studioFilterSelect}
                value={browseGroupBy}
                onChange={(e) =>
                  setBrowseGroupBy(
                    e.target.value as 'none' | 'folder' | 'day' | 'batch' | 'suggested'
                  )
                }
              >
                <option value="none">Group by: None</option>
                <option value="folder">Group by: Folder</option>
                <option value="day">Group by: Day</option>
                <option value="batch">Group by: Import batch</option>
                <option value="suggested">Group by: Suggested piles</option>
              </select>
            </label>
            <label className={styles.studioInlineLabel} aria-label="Import folder filter">
              <select
                className={styles.studioFilterSelect}
                value={browseImportFolderFilter}
                onChange={(e) => setBrowseImportFolderFilter(e.target.value)}
              >
                <option value="all">All folders</option>
                {importFolderOptions.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </label>
            {lastImportBatchId ? (
              <button
                type="button"
                className={styles.studioClearButton}
                onClick={() =>
                  setBrowseImportBatchFilter(
                    browseImportBatchFilter === lastImportBatchId ? '' : lastImportBatchId
                  )
                }
                aria-pressed={browseImportBatchFilter === lastImportBatchId}
              >
                {browseImportBatchFilter === lastImportBatchId ? 'Clear recent import' : 'Recent import'}
              </button>
            ) : null}
            <label className={styles.studioInlineLabel} aria-label="Tile size">
              <span className={styles.studioTagScopeLabel}>Tiles</span>
              <input
                type="range"
                min={140}
                max={320}
                step={10}
                value={gridTileMinPx}
                onChange={(e) => setGridTileMinPx(Number(e.target.value))}
              />
            </label>
            <label className={styles.studioAssignedToggle}>
              <input
                type="checkbox"
                checked={showAllStacks}
                onChange={(e) => setShowAllStacks(e.target.checked)}
              />
              <span>Show all stacks</span>
            </label>
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
                <>
                  <div className={styles.studioTagScopeRow}>
                    <span className={styles.studioTagScopeLabel}>Tag scope</span>
                    <select
                      className={styles.studioFilterSelectFull}
                      value={filters.tagScope}
                      onChange={(e) => handleFilterChange('tagScope', e.target.value as MediaFilters['tagScope'])}
                    >
                      <option value="all">All tags</option>
                      <option value="subject">Subject only</option>
                    </select>
                  </div>
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
                </>
              }
            />
          </div>
          </>
          ) : null}
        </div>
        {!loading && !error && selectedMediaIds.length > 0 && mediaPaneMode === 'browse' ? (
          <div className={cardAdminStyles.bulkActions}>
            <span>
              {selectedMediaIds.length} media selected
            </span>
            <div className={cardAdminStyles.actions}>
              <button
                type="button"
                onClick={handleCreateCardFromSelection}
                disabled={isCreatingCard}
                className={cardAdminStyles.actionButton}
              >
                {isCreatingCard ? 'Creating...' : 'Create card'}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateStackFromSelection()}
                disabled={isCreatingStack || !createStackEligible}
                className={cardAdminStyles.actionButton}
              >
                {isCreatingStack ? 'Stacking...' : 'Create stack'}
              </button>
              {selectionHasStackedMedia ? (
                <button
                  type="button"
                  onClick={() => void handleBulkUnstack()}
                  disabled={isDissolvingStack}
                  className={cardAdminStyles.actionButton}
                >
                  {isDissolvingStack ? 'Unstacking...' : 'Unstack'}
                </button>
              ) : null}
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
          </div>
        ) : null}
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

      <div className={styles.embeddedMediaBody}>
        {mediaPaneMode === 'review' ? <MediaReviewPanel embedded={embedded} /> : mainBody}
      </div>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterX } from 'lucide-react';
import { getMediaErrorSeverity, useMedia, type MediaFilters } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import BulkEditMediaTagsModal from '@/components/admin/studio/media/BulkEditMediaTagsModal';
import MediaAdminGrid from '@/components/admin/studio/media/MediaAdminGrid';
import MediaBrowseGroupedView from '@/components/admin/studio/media/MediaBrowseGroupedView';
import MediaLocalImportDialog from '@/components/admin/studio/media/MediaLocalImportDialog';
import {
  generateReviewClustersForImport,
  MEDIA_BANK_IMPORT_PATH_LABEL,
} from '@/lib/utils/reviewClusterImport';
import type { MediaBankImportSummary } from '@/components/admin/studio/media/MediaLocalImportDialog';
import MediaOrganizeStrip from '@/components/admin/studio/media/MediaOrganizeStrip';
import MediaStoryPilesOverlayView from '@/components/admin/studio/media/MediaStoryPilesOverlayView';
import MediaExactMatchesReview from '@/components/admin/studio/media/MediaExactMatchesReview';
import EditModal from '@/components/admin/studio/cards/EditModal';
import AdminDimensionalTagFilter from '@/components/admin/common/AdminDimensionalTagFilter';
import DebouncedSearchInput from '@/components/admin/common/DebouncedSearchInput';
import AdminTileSizeControl from '@/components/admin/common/AdminTileSizeControl';
import cardAdminStyles from '@/components/admin/studio/cards/studioCardsShell.module.css';
import styles from './mediaAdminShell.module.css';
import {
  flattenDimensionalTagMapToTagIds,
  groupSelectedTagIdsByDimension,
  mergeDimensionalTagMaps,
} from '@/lib/utils/tagUtils';
import {
  DEFAULT_ADMIN_DIMENSION_FILTERS,
  DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES,
  readStoredMediaAdminLocalFilterPreferences,
  writeStoredMediaAdminLocalFilterPreferences,
  type AdminDimensionFilterMode,
  type AdminDimensionFilterState,
} from '@/lib/preferences/adminFilters';
import type { Media } from '@/lib/types/photo';
import type { ProvisionalCluster } from '@/lib/types/provisionalCluster';
import {
  buildStoryPileOverlayGroups,
  collectImportBatchIdsFromMedia,
  formatImportBatchLabel,
  organizeSourceToReviewLens,
  type OrganizeSourceMode,
} from '@/lib/utils/mediaOrganizeUtils';
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
type MediaPopulation = 'bank' | 'this_card';
type MediaWorkspaceMode = 'browse' | 'exact';
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
    transientDimensionalQueryOverlay,
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
  const [duplicateTriageMode, setDuplicateTriageMode] = useState(
    initialLocalFilterPrefsRef.current.duplicateTriageMode
  );
  const [dimensionFilters, setDimensionFilters] = useState<AdminDimensionFilterState>(
    initialLocalFilterPrefsRef.current.dimensionFilters
  );
  const [clientSort, setClientSort] = useState<'none' | 'filenameAsc' | 'filenameDesc'>('none');
  const [highlightAssigned, setHighlightAssigned] = useState(true);
  const [mediaPopulation, setMediaPopulation] = useState<MediaPopulation>('bank');
  const [mediaWorkspaceMode, setMediaWorkspaceMode] = useState<MediaWorkspaceMode>('browse');
  const showOnlyAssigned = mediaPopulation === 'this_card';
  const [visibleAssignedCount, setVisibleAssignedCount] = useState(0);
  const [assignedOnlyMedia, setAssignedOnlyMedia] = useState<typeof media>([]);
  const [assignedOnlyLoading, setAssignedOnlyLoading] = useState(false);
  const assignedOnlyMediaRef = useRef<typeof media>([]);
  const [importPickerOpen, setImportPickerOpen] = useState(false);
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
  const [organizeSourceMode, setOrganizeSourceMode] = useState<OrganizeSourceMode>(
    initialLocalFilterPrefsRef.current.organizeSourceMode
  );
  const [storyPilesOverlay, setStoryPilesOverlay] = useState(
    initialLocalFilterPrefsRef.current.storyPilesOverlay
  );
  const [tagSuggestionsOnPiles, setTagSuggestionsOnPiles] = useState(
    initialLocalFilterPrefsRef.current.tagSuggestionsOnPiles
  );
  const [organizeStripExpanded, setOrganizeStripExpanded] = useState(
    initialLocalFilterPrefsRef.current.organizeStripExpanded
  );
  const [buildingOrganizePiles, setBuildingOrganizePiles] = useState(false);
  const [creatingOrganizePile, setCreatingOrganizePile] = useState(false);
  const [expandedStackIds, setExpandedStackIds] = useState<Set<string>>(() => new Set());
  const [pendingClusters, setPendingClusters] = useState<ProvisionalCluster[]>([]);
  const [pileSectionExpanded, setPileSectionExpanded] = useState<Record<string, boolean>>({});
  const { stackById, createStack, dissolveStack } = useMediaStacks(true);

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
      organizeImportScopeMode: 'none',
      organizeSingleBatchId: '',
      organizeManyBatchIds: [],
      organizeSourceMode,
      storyPilesOverlay,
      tagSuggestionsOnPiles,
      organizeStripExpanded,
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
    organizeSourceMode,
    storyPilesOverlay,
    tagSuggestionsOnPiles,
    organizeStripExpanded,
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

  const handleImportedMedia = async ({
    media: importedMedia,
    summary,
  }: {
    media: Media[];
    summary: MediaBankImportSummary;
  }) => {
    if (importedMedia.length === 0) return;
    const importedIds = importedMedia.map((item) => item.docId).filter(Boolean);
    const nextSourceFilter = filters.source === 'paste' ? 'all' : filters.source;
    if (nextSourceFilter !== filters.source) {
      setFilter('source', nextSourceFilter);
    }
    await fetchMedia(1, nextSourceFilter !== filters.source ? { source: nextSourceFilter } : undefined);
    setSelectedMediaIds(importedIds);
    const batchId = summary.importBatchId;
    if (batchId) {
      setLastImportBatchId(batchId);
      setBrowseImportBatchFilter(batchId);
    }
    setOrganizeStripExpanded(true);
    setStoryPilesOverlay(true);
    setTagSuggestionsOnPiles(true);

    let pilesCreated = 0;
    try {
      const pileResult = await generateReviewClustersForImport(importedIds);
      pilesCreated = pileResult.created;
      const clusterResponse = await fetch('/api/admin/media/review?allPending=true', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const clusterPayload = (await clusterResponse.json().catch(() => ({}))) as {
        clusters?: ProvisionalCluster[];
      };
      if (clusterResponse.ok) {
        setPendingClusters(clusterPayload.clusters ?? []);
      }
    } catch (error) {
      console.error('Review cluster generation after import failed:', error);
      feedback.showError(
        error instanceof Error ? error.message : 'Story pile suggestions could not be built.',
        'Import complete'
      );
    }

    const batchLabel = formatImportBatchLabel(batchId);
    const metadataNote = summary.readEmbeddedMetadata ? 'Metadata import on.' : 'Metadata import off.';
    feedback.showSuccess(
      `${summary.importedCount} photo${summary.importedCount === 1 ? '' : 's'} via ${MEDIA_BANK_IMPORT_PATH_LABEL} ` +
        `(folder: ${summary.sourceFolderLabel}; batch: ${batchLabel}). ` +
        `${metadataNote} ${pilesCreated} story pile${pilesCreated === 1 ? '' : 's'} suggested. ` +
        'Story piles overlay is on — review piles or use Build piles for more.',
      'Import complete'
    );
  };

  const handleStudioDimensionalFilterChange = useCallback(
    (newIds: string[]) => {
      const next = groupSelectedTagIdsByDimension(newIds, allTags);
      setDimensionalQueryOverlay(Object.keys(next).length === 0 ? {} : next);
      setTransientDimensionalQueryOverlay({});
      studioShell?.clearOrganizeReconcile();
      setDimensionFilters((prev) => {
        let changed = false;
        const updated = { ...prev };
        const idSet = new Set(newIds);
        for (const dimension of ['who', 'what', 'when', 'where'] as DimensionKey[]) {
          const state = updated[dimension];
          if (state.mode === 'matches' && state.tagId && !idSet.has(state.tagId)) {
            updated[dimension] = { mode: 'any', tagId: '' };
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
      void fetchMedia(1);
    },
    [allTags, fetchMedia, setDimensionalQueryOverlay, setTransientDimensionalQueryOverlay, studioShell]
  );

  const studioActiveTagFilterMap = useMemo(
    () => mergeDimensionalTagMaps(dimensionalQueryOverlay, transientDimensionalQueryOverlay),
    [dimensionalQueryOverlay, transientDimensionalQueryOverlay]
  );

  const studioSelectedFilterTagIds = useMemo(
    () => flattenDimensionalTagMapToTagIds(studioActiveTagFilterMap),
    [studioActiveTagFilterMap]
  );

  useEffect(() => {
    const overlayActive = storyPilesOverlay && mediaPopulation === 'bank';
    const needsSuggestedGroupBy = browseGroupBy === 'suggested' && !overlayActive;
    if (!overlayActive && !needsSuggestedGroupBy) {
      setPendingClusters([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const url = overlayActive
          ? '/api/admin/media/review?allPending=true'
          : '/api/admin/media/review?lens=suggested';
        const response = await fetch(url, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const payload = (await response.json().catch(() => ({}))) as { clusters?: ProvisionalCluster[] };
        if (!cancelled && response.ok) {
          setPendingClusters(payload.clusters ?? []);
        }
      } catch {
        if (!cancelled) setPendingClusters([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    browseGroupBy,
    media.length,
    mediaPopulation,
    storyPilesOverlay,
  ]);

  const organizeStripVisible = mediaPopulation === 'bank' && !showOnlyAssigned;

  const storyPilesOverlayActive = storyPilesOverlay && organizeStripVisible;

  const refreshPendingClusters = useCallback(async () => {
    const url = storyPilesOverlayActive
      ? '/api/admin/media/review?allPending=true'
      : '/api/admin/media/review?lens=suggested';
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const payload = (await response.json().catch(() => ({}))) as { clusters?: ProvisionalCluster[] };
    if (response.ok) {
      setPendingClusters(payload.clusters ?? []);
    }
  }, [storyPilesOverlayActive]);

  const organizeReviewLens = useMemo(
    () => organizeSourceToReviewLens(organizeSourceMode),
    [organizeSourceMode]
  );

  useEffect(() => {
    if (!embedded || !storyPilesOverlayActive) {
      studioShell?.registerStoryPileMembershipChanged?.(null);
      return;
    }
    studioShell?.registerStoryPileMembershipChanged?.(refreshPendingClusters);
    return () => studioShell?.registerStoryPileMembershipChanged?.(null);
  }, [embedded, refreshPendingClusters, storyPilesOverlayActive, studioShell]);

  const importBatchOptions = useMemo(
    () =>
      collectImportBatchIdsFromMedia(media).map((batchId) => ({
        id: batchId,
        label: formatImportBatchLabel(batchId),
      })),
    [media]
  );

  const organizeScopeHint = browseImportBatchFilter
    ? formatImportBatchLabel(browseImportBatchFilter)
    : 'All batches';

  const browseScopedMedia = useMemo(() => {
    let items = filterMediaByImportBatch(media, browseImportBatchFilter || null);
    items = filterMediaByImportFolder(items, browseImportFolderFilter);
    return items;
  }, [browseImportBatchFilter, browseImportFolderFilter, media]);

  const handleBuildOrganizePiles = useCallback(async () => {
    const mediaIds = browseScopedMedia.map((item) => item.docId).filter(Boolean);
    if (mediaIds.length === 0) {
      feedback.showError('No media in the current browse filters.', 'Build piles');
      return;
    }
    setBuildingOrganizePiles(true);
    try {
      const lens = organizeSourceToReviewLens(organizeSourceMode);
      const response = await fetch('/api/admin/media/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ lens, mediaIds }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse & {
        created?: number;
      };
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      const created = payload.created ?? 0;
      feedback.showSuccess(
        created === 1 ? 'Built 1 story pile.' : `Built ${created} story piles.`,
        'Build piles'
      );
      setStoryPilesOverlay(true);
      setTagSuggestionsOnPiles(true);
      await refreshPendingClusters();
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to build story piles.',
        'Build piles'
      );
    } finally {
      setBuildingOrganizePiles(false);
    }
  }, [
    browseScopedMedia,
    feedback,
    organizeSourceMode,
    refreshPendingClusters,
  ]);

  const handleCreateOrganizePile = useCallback(async () => {
    const title = window.prompt('Name for the new pile');
    if (!title?.trim()) return;
    setCreatingOrganizePile(true);
    try {
      const lens = organizeSourceToReviewLens(organizeSourceMode);
      const response = await fetch('/api/admin/media/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mode: 'create-empty', title: title.trim(), lens }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      feedback.showSuccess(`Created pile “${title.trim()}”.`, 'New pile');
      setStoryPilesOverlay(true);
      setTagSuggestionsOnPiles(true);
      await refreshPendingClusters();
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to create pile.',
        'New pile'
      );
    } finally {
      setCreatingOrganizePile(false);
    }
  }, [feedback, organizeSourceMode, refreshPendingClusters]);

  const handleStoryPilesOverlayChange = useCallback((enabled: boolean) => {
    setStoryPilesOverlay(enabled);
    if (enabled) {
      setTagSuggestionsOnPiles((current) => current || true);
    }
  }, []);

  const importFolderOptions = useMemo(() => {
    const folders = new Set<string>();
    for (const item of media) {
      folders.add(importFolderLabelFromMedia(item));
    }
    return Array.from(folders).sort((a, b) => a.localeCompare(b));
  }, [media]);

  const browseGroups = useMemo(
    () => groupMediaForBrowse(browseScopedMedia, browseGroupBy, pendingClusters),
    [browseGroupBy, browseScopedMedia, pendingClusters]
  );

  const storyPileOverlaySections = useMemo(
    () => buildStoryPileOverlayGroups(browseScopedMedia, pendingClusters),
    [browseScopedMedia, pendingClusters]
  );

  const handlePileSectionExpandedChange = useCallback((sectionId: string, expanded: boolean) => {
    setPileSectionExpanded((prev) => ({ ...prev, [sectionId]: expanded }));
  }, []);

  const handleCollapseAllPileSections = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const section of storyPileOverlaySections) {
      if (!section.isUnsorted) {
        next[section.id] = false;
      }
    }
    setPileSectionExpanded((prev) => ({ ...prev, ...next }));
  }, [storyPileOverlaySections]);

  const handleExpandAllPileSections = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const section of storyPileOverlaySections) {
      next[section.id] = true;
    }
    setPileSectionExpanded((prev) => ({ ...prev, ...next }));
  }, [storyPileOverlaySections]);

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
    setDimensionFilters((prev) => {
      const next = {
        ...prev,
        [dimension]: {
          ...prev[dimension],
          ...patch,
        },
      };
      const dimensionPresence = Object.fromEntries(
        (['who', 'what', 'when', 'where'] as const)
          .filter((key) => next[key].mode === 'hasAny' || next[key].mode === 'isEmpty')
          .map((key) => [key, next[key].mode])
      ) as NonNullable<MediaFilters['dimensionPresence']>;
      void fetchMedia(1, { dimensionPresence });
      return next;
    });
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
        storyPilesOverlayActive ? (
          <MediaStoryPilesOverlayView
            sections={storyPileOverlaySections}
            sectionExpanded={pileSectionExpanded}
            onSectionExpandedChange={handlePileSectionExpandedChange}
            showTagSuggestions={tagSuggestionsOnPiles}
            onClustersChanged={refreshPendingClusters}
            reviewLens={organizeReviewLens}
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
        ) : browseGroupBy !== 'none' ? (
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
          onImportComplete={(result) => {
            void handleImportedMedia(result);
          }}
          title="Import Media"
        />
      ) : null}
      <div className={styles.stickyTop} ref={stickyTopRef}>
        <div className={styles.studioMediaEmbeddedStack}>
          <div className={styles.studioHeaderRow}>
            <h2 className={styles.embeddedTitle}>Media</h2>
            <div className={styles.studioHeaderActions}>
              <div className={styles.mediaModeToggle} role="group" aria-label="Media workspace">
                <button
                  type="button"
                  className={`${styles.mediaModeToggleButton} ${
                    mediaWorkspaceMode === 'browse' ? styles.mediaModeToggleButtonActive : ''
                  }`}
                  onClick={() => setMediaWorkspaceMode('browse')}
                  aria-pressed={mediaWorkspaceMode === 'browse'}
                >
                  Browse
                </button>
                <button
                  type="button"
                  className={`${styles.mediaModeToggleButton} ${
                    mediaWorkspaceMode === 'exact' ? styles.mediaModeToggleButtonActive : ''
                  }`}
                  onClick={() => setMediaWorkspaceMode('exact')}
                  aria-pressed={mediaWorkspaceMode === 'exact'}
                >
                  Exact matches
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
          {mediaWorkspaceMode === 'browse' ? (
          <>
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
          {embedded ? (
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
          {organizeStripVisible ? (
            <MediaOrganizeStrip
              expanded={organizeStripExpanded}
              onExpandedChange={setOrganizeStripExpanded}
              sourceMode={organizeSourceMode}
              onSourceModeChange={setOrganizeSourceMode}
              storyPilesOverlay={storyPilesOverlay}
              onStoryPilesOverlayChange={handleStoryPilesOverlayChange}
              tagSuggestionsOnPiles={tagSuggestionsOnPiles}
              onTagSuggestionsOnPilesChange={setTagSuggestionsOnPiles}
              scopedMediaCount={browseScopedMedia.length}
              scopeHint={organizeScopeHint}
              onBuildPiles={handleBuildOrganizePiles}
              onNewPile={handleCreateOrganizePile}
              onCollapseAllPileSections={handleCollapseAllPileSections}
              onExpandAllPileSections={handleExpandAllPileSections}
              showPileSectionControls={storyPilesOverlay}
              buildingPiles={buildingOrganizePiles}
              creatingPile={creatingOrganizePile}
            />
          ) : null}
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
            <label className={styles.studioInlineLabel} aria-label="Import batch filter">
              <select
                className={styles.studioFilterSelect}
                value={browseImportBatchFilter}
                onChange={(e) => setBrowseImportBatchFilter(e.target.value)}
              >
                <option value="">All batches</option>
                {importBatchOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
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
            <AdminTileSizeControl
              value={gridTileMinPx}
              min={140}
              max={320}
              step={10}
              defaultValue={DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES.gridTileMinPx}
              onChange={setGridTileMinPx}
              surfaceLabel="Media"
            />
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
            <AdminDimensionalTagFilter
              className={styles.studioMediaMacroTagSelector}
              selectedTagIds={studioSelectedFilterTagIds}
              allTags={allTags}
              onSelectedTagIdsChange={handleStudioDimensionalFilterChange}
              tagScope={filters.tagScope}
              onTagScopeChange={(scope) => handleFilterChange('tagScope', scope)}
              dimensionFilters={dimensionFilters}
              onDimensionFilterChange={updateDimensionFilter}
              surfaceLabel="Media"
            />
          </div>
          </>
          </>
          ) : null}
        </div>
        {mediaWorkspaceMode === 'browse' && !loading && !error && selectedMediaIds.length > 0 ? (
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

      <div className={styles.embeddedMediaBody}>
        {mediaWorkspaceMode === 'exact' ? <MediaExactMatchesReview /> : mainBody}
      </div>
    </div>
  );
}

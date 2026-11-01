'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterX, X } from 'lucide-react';
import { getMediaErrorSeverity, useMedia, type MediaFilters } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import BulkEditMediaTagsModal from '@/components/admin/studio/media/BulkEditMediaTagsModal';
import MediaAdminGrid from '@/components/admin/studio/media/MediaAdminGrid';
import MediaBrowseGroupedView from '@/components/admin/studio/media/MediaBrowseGroupedView';
import MediaLocalImportDialog from '@/components/admin/studio/media/MediaLocalImportDialog';
import { MEDIA_BANK_IMPORT_PATH_LABEL } from '@/lib/utils/reviewClusterImport';
import type { MediaBankImportSummary } from '@/components/admin/studio/media/MediaLocalImportDialog';
import EditModal from '@/components/admin/studio/cards/EditModal';
import AdminDimensionalTagFilter from '@/components/admin/common/AdminDimensionalTagFilter';
import DebouncedSearchInput from '@/components/admin/common/DebouncedSearchInput';
import AdminTileSizeControl from '@/components/admin/common/AdminTileSizeControl';
import cardAdminStyles from '@/components/admin/studio/cards/studioCardsShell.module.css';
import styles from './mediaAdminShell.module.css';
import {
  flattenDimensionalTagMapToTagIds,
  groupSelectedTagIdsByDimension,
} from '@/lib/utils/tagUtils';
import {
  DEFAULT_ADMIN_DIMENSION_FILTERS,
  DEFAULT_MEDIA_ADMIN_STORED_FILTERS,
  DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES,
  readStoredMediaAdminLocalFilterPreferences,
  writeStoredMediaAdminLocalFilterPreferences,
  type AdminDimensionFilterMode,
  type AdminDimensionReviewFilter,
  type AdminDimensionFilterState,
} from '@/lib/preferences/adminFilters';
import type { Media } from '@/lib/types/photo';
import type { Card } from '@/lib/types/card';
import type { TemporalFilter } from '@/lib/types/temporal';
import {
  collectImportBatchIdsFromMedia,
  formatImportBatchLabel,
} from '@/lib/utils/mediaOrganizeUtils';
import { groupMediaForBrowse, importFolderLabelFromMedia } from '@/lib/utils/mediaBrowseUtils';
import { resolveGalleryEntriesFromSelection } from '@/lib/utils/mediaStackDisplayUtils';
import { useMediaStacks } from '@/components/admin/studio/media/useMediaStacks';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';
import { useMediaBulkActions } from './useMediaBulkActions';
import { useMediaStackActions } from './useMediaStackActions';
import { mediaMatchesDimensions, mediaMatchesSearch } from '@/lib/utils/mediaAssignmentSeek';
import { matchesTemporalValueFilter } from '@/lib/utils/temporalValue';
import { hasDimensionAssignment } from '@/lib/utils/dimensionAssignment';
import { matchesDimensionReviewFilter } from '@/lib/utils/dimensionReview';

export type MediaAdminContentProps = {
  /** When true (e.g. Admin Studio column), use compact scroll layout. */
  embedded?: boolean;
  /** When embedded in Studio, rows register as drag sources for cover/gallery. */
  studioSourceDraggable?: boolean;
  /** Opens the existing Tags and Subjects review for one exact Media record. */
  initialReviewMediaId?: string | null;
};

type DimensionKey = 'who' | 'what' | 'when' | 'where';
type MediaPopulation = 'bank' | 'this_card';
type MediaFilterContextSnapshot = {
  filters: MediaFilters;
  dimensionFilters: AdminDimensionFilterState;
  dimensionalQueryOverlay: ReturnType<typeof groupSelectedTagIdsByDimension>;
  clientSort: 'none' | 'filenameAsc' | 'filenameDesc';
};
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

export function filterSelectedCardMedia(
  items: Media[],
  filters: MediaFilters,
  dimensionalQueryOverlay: ReturnType<typeof groupSelectedTagIdsByDimension>,
  tagNameLookup: Map<string, string>
): Media[] {
  const digestCounts = new Map<string, number>();
  items.forEach((item) => {
    const digest = item.contentIdentity?.digest;
    if (digest) digestCounts.set(digest, (digestCounts.get(digest) ?? 0) + 1);
  });
  const selectedDimensions = ['who', 'what', 'when', 'where'] as const;
  return items.filter((item) => {
    if (filters.source !== 'all' && item.source !== filters.source) return false;
    if (!mediaMatchesDimensions(item, filters.dimensions)) return false;
    const hasCaption = Boolean(item.caption?.trim());
    if (filters.hasCaption === 'with' && !hasCaption) return false;
    if (filters.hasCaption === 'without' && hasCaption) return false;
    if (!mediaMatchesSearch(item, filters.search, tagNameLookup)) return false;
    if (filters.matchStatus !== 'all') {
      const isMatch = Boolean(
        item.contentIdentity?.digest &&
        (digestCounts.get(item.contentIdentity.digest) ?? 0) > 1
      );
      if (filters.matchStatus === 'matches' && !isMatch) return false;
      if (filters.matchStatus === 'no_matches' && isMatch) return false;
    }
    const complete = Boolean(item.hasWho && item.hasWhat && item.hasWhen && item.hasWhere);
    if (filters.codification === 'complete' && !complete) return false;
    if (filters.codification === 'incomplete' && complete) return false;
    if (
      filters.unresolvedDimension !== 'all' &&
      item[
        {
          who: 'hasWho',
          what: 'hasWhat',
          when: 'hasWhen',
          where: 'hasWhere',
        }[filters.unresolvedDimension] as 'hasWho' | 'hasWhat' | 'hasWhen' | 'hasWhere'
      ]
    ) {
      return false;
    }
    if (filters.importBatchId && item.importBatchId !== filters.importBatchId) return false;
    if (
      filters.importFolder !== 'all' &&
      importFolderLabelFromMedia(item) !== filters.importFolder
    ) {
      return false;
    }
    if (
      filters.metadataOutcome !== 'all' &&
      (item.metadataImport?.outcome ?? 'unknown') !== filters.metadataOutcome
    ) {
      return false;
    }
    if (!matchesTemporalValueFilter(item.temporal, filters.temporalFilter)) return false;
    const subjectDimensions = new Set(filters.subjectDimensions ?? []);
    for (const dimension of selectedDimensions) {
      if (
        !matchesDimensionReviewFilter(
          item.dimensionReview,
          dimension,
          filters.dimensionReviewStates?.[dimension]
        )
      ) {
        return false;
      }
      const presence = filters.dimensionPresence?.[dimension];
      if (presence) {
        const hasValue = filters.tagScope === 'subject' || subjectDimensions.has(dimension)
          ? (dimension === 'when' && item.temporalSubject === true) ||
            Boolean((item[dimension] ?? []).some((tagId) => item.subjectFilterTags?.[tagId]))
          : hasDimensionAssignment(item, dimension);
        if (presence === 'hasAny' && !hasValue) return false;
        if (presence === 'isEmpty' && hasValue) return false;
      }
      const selectedTagIds = dimensionalQueryOverlay[dimension] ?? [];
      if (selectedTagIds.length === 0) continue;
      const assignedIds = item[dimension] ?? [];
      const matches = selectedTagIds.some((tagId) =>
        filters.tagScope === 'subject' || subjectDimensions.has(dimension)
          ? Boolean(item.subjectFilterTags?.[tagId])
          : assignedIds.includes(tagId) || Boolean(item.filterTags?.[tagId])
      );
      if (!matches) return false;
    }
    return true;
  });
}

export default function MediaAdminContent(props: MediaAdminContentProps = {}) {
  const { embedded = false, studioSourceDraggable = false, initialReviewMediaId = null } = props;
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
    resolveMediaById,
  } = useMedia();

  const { tags: allTags } = useTag();
  const errorSeverity = getMediaErrorSeverity(error);
  const loadMoreErrorSeverity = getMediaErrorSeverity(loadMoreError);
  const {
    bulkDeleteModalOpen,
    setBulkDeleteModalOpen,
    bulkDeleteChecking,
    bulkDeleteConsequences,
    openBulkDelete: handleOpenBulkDelete,
    confirmBulkDelete: handleBulkDelete,
    bulkTagModalOpen,
    setBulkTagModalOpen,
  } = useMediaBulkActions({
    selectedMediaIds,
    deleteMultipleMedia,
    selectedCardId: studioShell?.selectedCardId,
    reloadSelectedCard: (cardId) => void studioShell?.loadSelectedCard(cardId, { quiet: true }),
    feedback,
  });
  const [dimensionFilters, setDimensionFilters] = useState<AdminDimensionFilterState>(
    initialLocalFilterPrefsRef.current.dimensionFilters
  );
  const [clientSort, setClientSort] = useState<'none' | 'filenameAsc' | 'filenameDesc'>('none');
  const [highlightAssigned, setHighlightAssigned] = useState(true);
  const [mediaPopulation, setMediaPopulation] = useState<MediaPopulation>('bank');
  const libraryFilterContextRef = useRef<MediaFilterContextSnapshot | null>(null);
  const selectedCardFilterCardIdRef = useRef<string | null>(null);
  const showOnlyAssigned = mediaPopulation === 'this_card';
  const [visibleAssignedCount, setVisibleAssignedCount] = useState(0);
  const [assignedOnlyMedia, setAssignedOnlyMedia] = useState<typeof media>([]);
  const [assignedOnlyLoading, setAssignedOnlyLoading] = useState(false);
  const assignedOnlyMediaRef = useRef<typeof media>([]);
  const [importPickerOpen, setImportPickerOpen] = useState(false);
  const [tagEditorMediaIds, setTagEditorMediaIds] = useState<string[]>([]);
  const [browseGroupBy, setBrowseGroupBy] = useState(initialLocalFilterPrefsRef.current.browseGroupBy);
  const [galleryCardsForGrouping, setGalleryCardsForGrouping] = useState<Card[]>([]);
  const [galleryCardsLoading, setGalleryCardsLoading] = useState(false);
  const [galleryCardsError, setGalleryCardsError] = useState<string | null>(null);
  const [gridTileMinPx, setGridTileMinPx] = useState(initialLocalFilterPrefsRef.current.gridTileMinPx);
  const [lastImportBatchId, setLastImportBatchId] = useState(
    initialLocalFilterPrefsRef.current.lastImportBatchId
  );
  const [showAllStacks, setShowAllStacks] = useState(initialLocalFilterPrefsRef.current.showAllStacks);
  const [libraryFilterOptions, setLibraryFilterOptions] = useState<{
    batchIds: string[];
    folders: string[];
  }>({ batchIds: [], folders: [] });
  const { stackById, createStack, dissolveStack } = useMediaStacks(true);

  const applyFilterContext = useCallback(
    (snapshot: MediaFilterContextSnapshot, shouldFetch: boolean) => {
      Object.entries(snapshot.filters).forEach(([key, value]) => {
        setFilter(key as keyof MediaFilters, value as MediaFilters[keyof MediaFilters]);
      });
      setDimensionFilters(snapshot.dimensionFilters);
      setDimensionalQueryOverlay(snapshot.dimensionalQueryOverlay);
      setClientSort(snapshot.clientSort);
      if (shouldFetch) {
        void fetchMedia(1, snapshot.filters, snapshot.dimensionalQueryOverlay);
      }
    },
    [fetchMedia, setDimensionalQueryOverlay, setFilter]
  );

  const resetSelectedCardFilterContext = useCallback(
    (cardId: string | null) => {
      selectedCardFilterCardIdRef.current = cardId;
      applyFilterContext(
        {
          filters: {
            ...DEFAULT_MEDIA_ADMIN_STORED_FILTERS,
            subjectDimensions: [],
            dimensionPresence: {},
          },
          dimensionFilters: DEFAULT_ADMIN_DIMENSION_FILTERS,
          dimensionalQueryOverlay: {},
          clientSort: 'none',
        },
        false
      );
    },
    [applyFilterContext]
  );

  useEffect(() => {
    writeStoredMediaAdminLocalFilterPreferences({
      duplicateTriageMode: false,
      dimensionFilters,
      browseGroupBy,
      browseImportBatchFilter: '',
      browseImportFolderFilter: 'all',
      gridTileMinPx,
      lastImportBatchId,
      showAllStacks,
      organizeImportScopeMode: 'none',
      organizeSingleBatchId: '',
      organizeManyBatchIds: [],
      organizeSourceMode: 'foldered',
      storyPilesOverlay: false,
      tagSuggestionsOnPiles: false,
      organizeStripExpanded: false,
    });
  }, [
    browseGroupBy,
    dimensionFilters,
    gridTileMinPx,
    lastImportBatchId,
    showAllStacks,
  ]);

  const handleOpenBulkTags = () => {
    setTagEditorMediaIds(selectedMediaIds);
    setBulkTagModalOpen(true);
  };

  const handleOpenMediaTags = useCallback((mediaId: string) => {
    setSelectedMediaIds([mediaId]);
    setTagEditorMediaIds([mediaId]);
    setBulkTagModalOpen(true);
  }, [setBulkTagModalOpen, setSelectedMediaIds]);
  const initialReviewMediaIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialReviewMediaId || initialReviewMediaIdRef.current === initialReviewMediaId) return;
    initialReviewMediaIdRef.current = initialReviewMediaId;
    handleOpenMediaTags(initialReviewMediaId);
  }, [handleOpenMediaTags, initialReviewMediaId]);

  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const {
    mediaById,
    isCreatingStack,
    isDissolvingStack,
    createStackEligible,
    selectionHasStackedMedia,
    stackGridProps,
    createFromSelection: handleCreateStackFromSelection,
    unstackSelection: handleBulkUnstack,
  } = useMediaStackActions({
    media,
    selectedMediaIds,
    setSelectedMediaIds,
    stackById,
    showAllStacks,
    createStack,
    dissolveStack,
    refreshMedia: () => fetchMedia(1),
    feedback,
  });

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
    if (key === 'codification' && value !== 'incomplete') {
      const clearedIncompleteFilters = {
        codification: value as MediaFilters['codification'],
        unresolvedDimension: 'all' as const,
        importBatchId: '',
        importFolder: 'all',
        metadataOutcome: 'all' as const,
      };
      Object.entries(clearedIncompleteFilters).forEach(([filterKey, filterValue]) => {
        setFilter(filterKey as keyof MediaFilters, filterValue);
      });
      if (!showOnlyAssigned) void fetchMedia(1, clearedIncompleteFilters);
      return;
    }
    setFilter(key, value);
    if (!showOnlyAssigned) void fetchMedia(1, { [key]: value });
  };

  const handleSearchCommit = (nextSearch: string) => {
    if (nextSearch === filters.search) return;
    setFilter('search', nextSearch);
    if (!showOnlyAssigned) void fetchMedia(1, { search: nextSearch });
  };

  const handleClearFilters = () => {
    if (showOnlyAssigned) {
      resetSelectedCardFilterContext(activeStudioCardId);
      return;
    }
    clearFilters();
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
    const batchId = summary.importBatchId;
    const postImportFilters: Partial<MediaFilters> = {
      source: nextSourceFilter,
      codification: 'incomplete',
      unresolvedDimension: 'all',
      importBatchId: batchId || '',
      importFolder: 'all',
      metadataOutcome: 'all',
    };
    Object.entries(postImportFilters).forEach(([key, value]) => {
      setFilter(key as keyof MediaFilters, value as string);
    });
    await fetchMedia(1, postImportFilters);
    setSelectedMediaIds(importedIds);
    if (batchId) {
      setLastImportBatchId(batchId);
    }
    const batchLabel = formatImportBatchLabel(batchId);
    const metadataNote = summary.readEmbeddedMetadata ? 'Metadata import on.' : 'Metadata import off.';
    feedback.showSuccess(
      `${summary.importedCount} photo${summary.importedCount === 1 ? '' : 's'} via ${MEDIA_BANK_IMPORT_PATH_LABEL} ` +
        `(folder: ${summary.sourceFolderLabel}; batch: ${batchLabel}). ` +
        `${metadataNote} Imported media are selected and ready to codify or caption.`,
      'Import complete'
    );
  };

  const handleStudioDimensionalFilterChange = useCallback(
    (newIds: string[]) => {
      const next = groupSelectedTagIdsByDimension(newIds, allTags);
      setDimensionalQueryOverlay(Object.keys(next).length === 0 ? {} : next);
      setDimensionFilters((prev) => {
        let changed = false;
        const updated = { ...prev };
        const idSet = new Set(newIds);
        for (const dimension of ['who', 'what', 'when', 'where'] as DimensionKey[]) {
          const state = updated[dimension];
          if (state.mode === 'matches' && state.tagId && !idSet.has(state.tagId)) {
            updated[dimension] = {
              mode: 'any',
              tagId: '',
              subjectOnly: state.subjectOnly,
            };
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
      if (!showOnlyAssigned) void fetchMedia(1);
    },
    [allTags, fetchMedia, setDimensionalQueryOverlay, showOnlyAssigned]
  );

  const studioSelectedFilterTagIds = useMemo(
    () => flattenDimensionalTagMapToTagIds(dimensionalQueryOverlay),
    [dimensionalQueryOverlay]
  );

  const applyUnifiedTagFilters = useCallback(
    ({
      selectedTagIds,
      dimensionFilters: nextDimensionFilters,
      temporalFilter,
    }: {
      selectedTagIds: string[];
      dimensionFilters: AdminDimensionFilterState;
      temporalFilter?: TemporalFilter | null;
    }) => {
      const nextDimensionalMap = groupSelectedTagIdsByDimension(selectedTagIds, allTags);
      const normalizedMap = Object.keys(nextDimensionalMap).length === 0 ? {} : nextDimensionalMap;
      const dimensionPresence = Object.fromEntries(
        (['who', 'what', 'when', 'where'] as const)
          .filter(
            (key) =>
              nextDimensionFilters[key].mode === 'isEmpty'
          )
          .map((key) => [key, nextDimensionFilters[key].mode])
      ) as NonNullable<MediaFilters['dimensionPresence']>;
      const subjectDimensions = (['who', 'what', 'when', 'where'] as const).filter(
        (dimension) => nextDimensionFilters[dimension].subjectOnly
      );
      const dimensionReviewStates = Object.fromEntries(
        (['who', 'what', 'when', 'where'] as const)
          .filter((dimension) => nextDimensionFilters[dimension].reviewState)
          .map((dimension) => [
            dimension,
            nextDimensionFilters[dimension].reviewState as AdminDimensionReviewFilter,
          ])
      );

      setDimensionalQueryOverlay(normalizedMap);
      setDimensionFilters(nextDimensionFilters);
      Object.entries({
        tagScope: 'all' as const,
        subjectDimensions,
        dimensionPresence,
        dimensionReviewStates,
        temporalFilter,
      }).forEach(([key, value]) => {
        setFilter(key as keyof MediaFilters, value as MediaFilters[keyof MediaFilters]);
      });
      if (!showOnlyAssigned) {
        void fetchMedia(
          1,
          {
            tagScope: 'all',
            subjectDimensions,
            dimensionPresence,
            dimensionReviewStates,
            temporalFilter,
          },
          normalizedMap
        );
      }
    },
    [
      allTags,
      fetchMedia,
      setDimensionalQueryOverlay,
      setFilter,
      showOnlyAssigned,
    ]
  );

  useEffect(() => {
    if (filters.codification !== 'incomplete') return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/media/options', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as { batchIds?: string[]; folders?: string[] };
        if (!cancelled) {
          setLibraryFilterOptions({
            batchIds: payload.batchIds ?? [],
            folders: payload.folders ?? [],
          });
        }
      } catch {
        // Current-page options below remain a safe fallback if the catalog request fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.codification]);

  const importBatchOptions = useMemo(
    () =>
      (libraryFilterOptions.batchIds.length > 0
        ? libraryFilterOptions.batchIds
        : collectImportBatchIdsFromMedia(media)
      ).map((batchId) => ({
        id: batchId,
        label: formatImportBatchLabel(batchId),
      })),
    [libraryFilterOptions.batchIds, media]
  );

  const browseScopedMedia = media;
  useEffect(() => {
    if (browseGroupBy !== 'card' || hasMore) {
      setGalleryCardsForGrouping([]);
      setGalleryCardsLoading(false);
      setGalleryCardsError(null);
      return;
    }

    const controller = new AbortController();
    setGalleryCardsLoading(true);
    setGalleryCardsError(null);
    void (async () => {
      try {
        const response = await fetch('/api/cards/gallery-media-index', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Could not load Card groups.');
        const cards = (await response.json().catch(() => [])) as Card[];
        if (!controller.signal.aborted) setGalleryCardsForGrouping(cards);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setGalleryCardsForGrouping([]);
          setGalleryCardsError(
            fetchError instanceof Error ? fetchError.message : 'Could not load Card groups.'
          );
        }
      } finally {
        if (!controller.signal.aborted) setGalleryCardsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [browseGroupBy, hasMore]);

  const importFolderOptions = useMemo(() => {
    if (libraryFilterOptions.folders.length > 0) return libraryFilterOptions.folders;
    const folders = new Set<string>();
    for (const item of media) {
      folders.add(importFolderLabelFromMedia(item));
    }
    return Array.from(folders).sort((a, b) => a.localeCompare(b));
  }, [libraryFilterOptions.folders, media]);

  const browseGroups = useMemo(
    () => groupMediaForBrowse(browseScopedMedia, browseGroupBy, galleryCardsForGrouping),
    [browseGroupBy, browseScopedMedia, galleryCardsForGrouping]
  );

  const groupingNeedsMoreMedia =
    !showOnlyAssigned && browseGroupBy !== 'none' && Boolean(hasMore);

  useEffect(() => {
    if (!groupingNeedsMoreMedia || loading || loadingMore || loadMoreError) return;
    void loadMore();
  }, [groupingNeedsMoreMedia, loadMore, loadMoreError, loading, loadingMore]);

  const activeStudioCard = studioShell?.selectedDetail ?? studioShell?.selectedPreview ?? null;
  const activeStudioCardId = activeStudioCard?.docId ?? null;
  const cardCompleteDefaultRef = useRef<string | null>(null);
  const cardOrientedLibrary = embedded && mediaPopulation === 'bank' && Boolean(activeStudioCardId);

  const showLibraryPopulation = useCallback(() => {
    setMediaPopulation('bank');
    selectedCardFilterCardIdRef.current = null;
    cardCompleteDefaultRef.current = activeStudioCardId;
    const libraryContext = libraryFilterContextRef.current;
    if (libraryContext) {
      applyFilterContext(libraryContext, true);
      libraryFilterContextRef.current = null;
    }
  }, [activeStudioCardId, applyFilterContext]);

  const showSelectedCardPopulation = useCallback(() => {
    if (!activeStudioCardId) return;
    libraryFilterContextRef.current = {
      filters: {
        ...filters,
        subjectDimensions: [...(filters.subjectDimensions ?? [])],
        dimensionPresence: { ...(filters.dimensionPresence ?? {}) },
        dimensionReviewStates: { ...(filters.dimensionReviewStates ?? {}) },
      },
      dimensionFilters: {
        who: { ...dimensionFilters.who },
        what: { ...dimensionFilters.what },
        when: { ...dimensionFilters.when },
        where: { ...dimensionFilters.where },
      },
      dimensionalQueryOverlay: Object.fromEntries(
        Object.entries(dimensionalQueryOverlay).map(([key, ids]) => [key, [...(ids ?? [])]])
      ),
      clientSort,
    };
    resetSelectedCardFilterContext(activeStudioCardId);
    setMediaPopulation('this_card');
  }, [
    activeStudioCardId,
    clientSort,
    dimensionFilters,
    dimensionalQueryOverlay,
    filters,
    resetSelectedCardFilterContext,
  ]);

  useEffect(() => {
    if (!cardOrientedLibrary || !activeStudioCardId) {
      cardCompleteDefaultRef.current = null;
      return;
    }
    if (cardCompleteDefaultRef.current === activeStudioCardId) return;
    cardCompleteDefaultRef.current = activeStudioCardId;
    if (filters.codification === 'complete') return;
    const next = {
      codification: 'complete' as const,
      unresolvedDimension: 'all' as const,
      importBatchId: '',
      importFolder: 'all',
      metadataOutcome: 'all' as const,
    };
    Object.entries(next).forEach(([key, value]) => setFilter(key as keyof MediaFilters, value));
    void fetchMedia(1, next);
  }, [activeStudioCardId, cardOrientedLibrary, fetchMedia, filters.codification, setFilter]);

  const hasActiveMediaStructuralFilters =
    filters.source !== 'all' ||
    filters.hasCaption !== 'all' ||
    filters.dimensions !== 'all' ||
    filters.assignment !== 'all' ||
    Object.values(dimensionFilters).some(state => state.subjectOnly) ||
    studioSelectedFilterTagIds.length > 0 ||
    Object.values(dimensionFilters).some(state => state.mode !== 'any') ||
    filters.codification !== 'all' ||
    filters.unresolvedDimension !== 'all' ||
    filters.importBatchId !== '' ||
    filters.importFolder !== 'all' ||
    filters.metadataOutcome !== 'all' ||
    filters.temporalFilter !== undefined ||
    Object.keys(filters.dimensionReviewStates ?? {}).length > 0 ||
    mediaPopulation === 'this_card';
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
  const selectedCardTagNameLookup = useMemo(
    () =>
      new Map(
        allTags
          .filter((tag): tag is typeof tag & { docId: string } => Boolean(tag.docId))
          .map((tag) => [tag.docId, tag.name])
      ),
    [allTags]
  );
  const selectedCardFilteredMedia = filterSelectedCardMedia(
    assignedOnlyResolvedMedia,
    filters,
    dimensionalQueryOverlay,
    selectedCardTagNameLookup
  );
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
      showLibraryPopulation();
    }
  }, [canViewThisCardPopulation, mediaPopulation, showLibraryPopulation]);

  useEffect(() => {
    if (mediaPopulation !== 'this_card' || !activeStudioCardId) return;
    if (selectedCardFilterCardIdRef.current === activeStudioCardId) return;
    resetSelectedCardFilterContext(activeStudioCardId);
  }, [activeStudioCardId, mediaPopulation, resetSelectedCardFilterContext]);

  useEffect(() => {
    if (initialFetchRequestedRef.current) return;
    if (loading || error || showOnlyAssigned) return;
    if (embedded && !activeStudioCardId) return;
    initialFetchRequestedRef.current = true;
    void fetchMedia(1);
  }, [activeStudioCardId, embedded, error, fetchMedia, loading, showOnlyAssigned]);

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
  }, [activeStudioCardAssignedMediaIds, activeStudioCardAssignedMediaIdsKey, resolveMediaById, showOnlyAssigned]);

  const updateDimensionFilter = (
    dimension: DimensionKey,
    patch: Partial<{
      mode: AdminDimensionFilterMode;
      tagId: string;
      subjectOnly: boolean;
      reviewState: AdminDimensionReviewFilter | undefined;
    }>
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
          .filter((key) => next[key].mode === 'isEmpty')
          .map((key) => [key, next[key].mode])
      ) as NonNullable<MediaFilters['dimensionPresence']>;
      const subjectDimensions = (['who', 'what', 'when', 'where'] as const).filter(
        (key) => next[key].subjectOnly
      );
      const dimensionReviewStates = Object.fromEntries(
        (['who', 'what', 'when', 'where'] as const)
          .filter((key) => next[key].reviewState)
          .map((key) => [key, next[key].reviewState as AdminDimensionReviewFilter])
      );
      setFilter('tagScope', 'all');
      setFilter('subjectDimensions', subjectDimensions);
      setFilter('dimensionPresence', dimensionPresence);
      setFilter('dimensionReviewStates', dimensionReviewStates);
      if (!showOnlyAssigned) {
        void fetchMedia(1, {
          tagScope: 'all',
          subjectDimensions,
          dimensionPresence,
          dimensionReviewStates,
        });
      }
      return next;
    });
  };

  const handleClearSearch = () => handleSearchCommit('');

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

      {!showOnlyAssigned && !(loading && media.length === 0) && (
        groupingNeedsMoreMedia || (browseGroupBy === 'card' && galleryCardsLoading) ? (
          <p className={styles.studioPopulationNotice}>Loading all filtered media for grouping…</p>
        ) : browseGroupBy === 'card' && galleryCardsError ? (
          <div className={styles.error}>{galleryCardsError}</div>
        ) : browseGroupBy !== 'none' ? (
          <MediaBrowseGroupedView
            groups={browseGroups}
            sourcePathFirst={false}
            dimensionFilters={dimensionFilters}
            tagFilterScope="all"
            studioSourceDraggable={embedded && studioSourceDraggable}
            inlineCaptionEditing={embedded}
            clientSort={embedded ? clientSort : 'none'}
            highlightedMediaIds={highlightAssigned ? activeStudioCardAssignedMediaIds : []}
            onVisibleHighlightedCountChange={setVisibleAssignedCount}
            gridTileMinPx={gridTileMinPx}
            resolveMediaById={resolveMediaById}
            allLoadedMedia={browseScopedMedia}
            onEditTags={handleOpenMediaTags}
            {...stackGridProps}
          />
        ) : (
        <MediaAdminGrid
          sourcePathFirst={false}
          dimensionFilters={dimensionFilters}
          tagFilterScope="all"
          studioSourceDraggable={embedded && studioSourceDraggable}
          inlineCaptionEditing={embedded}
          clientSort={embedded ? clientSort : 'none'}
          highlightedMediaIds={highlightAssigned ? activeStudioCardAssignedMediaIds : []}
          onVisibleHighlightedCountChange={setVisibleAssignedCount}
          gridTileMinPx={gridTileMinPx}
          mediaOverride={browseScopedMedia.length !== media.length ? browseScopedMedia : undefined}
          onEditTags={handleOpenMediaTags}
          emptyState={
            filters.search.trim() ? (
              <div className={styles.studioEmptyRecovery}>
                <p>No media match &ldquo;{filters.search.trim()}&rdquo;.</p>
                <button type="button" onClick={handleClearSearch}>Clear search</button>
              </div>
            ) : hasActiveMediaStructuralFilters ? (
              <div className={styles.studioEmptyRecovery}>
                <p>No media match the current filters.</p>
                <button type="button" onClick={handleClearFilters}>Clear filters</button>
              </div>
            ) : undefined
          }
          {...stackGridProps}
        />
        )
      )}
      {showOnlyAssigned && !assignedOnlyLoading ? (
        <MediaAdminGrid
          mediaOverride={selectedCardFilteredMedia}
          emptyMessage={
            assignedOnlyCount > 0
              ? 'No media on the selected card match its current filters.'
              : 'No media are assigned to the current card.'
          }
          sourcePathFirst={false}
          dimensionFilters={dimensionFilters}
          tagFilterScope="all"
          studioSourceDraggable={embedded && studioSourceDraggable}
          inlineCaptionEditing={embedded}
          clientSort={clientSort}
          highlightedMediaIds={activeStudioCardAssignedMediaIds}
          onVisibleHighlightedCountChange={setVisibleAssignedCount}
          onEditTags={handleOpenMediaTags}
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
              <AdminTileSizeControl
                value={gridTileMinPx}
                min={140}
                max={320}
                step={10}
                defaultValue={DEFAULT_MEDIA_ADMIN_LOCAL_FILTER_PREFERENCES.gridTileMinPx}
                onChange={setGridTileMinPx}
                surfaceLabel="Media"
              />
              <button
                type="button"
                onClick={() => setImportPickerOpen(true)}
                className={styles.studioImportButton}
              >
                Import
              </button>
            </div>
          </div>
          {embedded ? (
            <div className={styles.studioPopulationRow}>
              <div className={styles.mediaModeToggle} role="group" aria-label="Media population">
                <button
                  type="button"
                  className={`${styles.mediaModeToggleButton} ${
                    mediaPopulation === 'bank' ? styles.mediaModeToggleButtonActive : ''
                  }`}
                  onClick={showLibraryPopulation}
                  aria-pressed={mediaPopulation === 'bank'}
                >
                  Library
                </button>
                <button
                  type="button"
                  className={`${styles.mediaModeToggleButton} ${
                    mediaPopulation === 'this_card' ? styles.mediaModeToggleButtonActive : ''
                  }`}
                  onClick={showSelectedCardPopulation}
                  aria-pressed={mediaPopulation === 'this_card'}
                  disabled={!canViewThisCardPopulation}
                  title={
                    canViewThisCardPopulation
                      ? 'Show only media on the selected card'
                      : 'Select a card with media first'
                  }
                >
                  Selected Card
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
                  {selectedCardFilteredMedia.length === assignedOnlyCount
                    ? `${assignedOnlyCount} photo${assignedOnlyCount === 1 ? '' : 's'} on selected card`
                    : `${selectedCardFilteredMedia.length} of ${assignedOnlyCount} photos shown`}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className={styles.studioMediaRowOne}>
            <label
              className={`${styles.studioInlineLabel} ${styles.studioPaneSearchField}`}
              htmlFor="media-admin-search-studio"
              aria-label="Search media"
            >
              <span className={styles.studioMediaSearchControl} data-active={filters.search.trim() ? 'true' : 'false'}>
                <DebouncedSearchInput
                  id="media-admin-search-studio"
                  placeholder="Search media"
                  value={filters.search}
                  onCommit={handleSearchCommit}
                  className={styles.studioMediaSearchInput}
                  autoComplete="off"
                  aria-label="Search media (filename, caption, path, tag names)"
                />
                {filters.search.trim() ? (
                  <button
                    type="button"
                    className={styles.studioMediaSearchClear}
                    onClick={handleClearSearch}
                    aria-label="Clear media search"
                    title="Clear media search"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </span>
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
                <option value="all">All Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </label>
            ) : null}
            <label className={styles.studioInlineLabel} aria-label="Filter by exact matches">
              <select
                className={styles.studioFilterSelect}
                value={filters.matchStatus}
                onChange={(e) => handleFilterChange('matchStatus', e.target.value)}
                aria-label="Filter by exact matches"
              >
                <option value="all">All Matches</option>
                <option value="matches">Matches</option>
                <option value="no_matches">No Matches</option>
              </select>
            </label>
            <label className={styles.studioInlineLabel} aria-label="Filter by codification">
              <select
                className={styles.studioFilterSelect}
                value={filters.codification}
                onChange={(e) => handleFilterChange('codification', e.target.value)}
                aria-label="Filter by codification"
              >
                <option value="all">All Codification</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </label>
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
            <label className={`${styles.studioAssignedToggle} ${styles.studioFilterToggle}`}>
              <input
                type="checkbox"
                checked={showAllStacks}
                onChange={(e) => setShowAllStacks(e.target.checked)}
              />
              <span>Show Stacks</span>
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
            <AdminDimensionalTagFilter
              className={styles.studioMediaMacroTagSelector}
              selectedTagIds={studioSelectedFilterTagIds}
              allTags={allTags}
              onSelectedTagIdsChange={handleStudioDimensionalFilterChange}
              dimensionFilters={dimensionFilters}
              onDimensionFilterChange={updateDimensionFilter}
              surfaceLabel="Media"
              onApply={applyUnifiedTagFilters}
              temporalFilter={filters.temporalFilter}
            />
          </div>
          <div className={styles.studioMediaBrowseRow}>
            <label className={styles.studioInlineLabel} aria-label="Group media by">
              <select
                className={styles.studioFilterSelect}
                value={browseGroupBy}
                onChange={(e) =>
                  setBrowseGroupBy(
                    e.target.value as 'none' | 'folder' | 'day' | 'batch' | 'metadata' | 'card'
                  )
                }
              >
                <option value="none">Group by: None</option>
                <option value="folder">Group by: Folder</option>
                <option value="batch">Group by: Import batch</option>
                <option value="metadata">Group by: Metadata</option>
                <option value="day">Group by: Day</option>
                <option value="card">Group by: Card</option>
              </select>
            </label>
            {filters.codification === 'incomplete' ? (
            <>
            <label className={styles.studioInlineLabel} aria-label="Unresolved dimension filter">
              <select
                className={styles.studioFilterSelect}
                value={filters.unresolvedDimension}
                onChange={(e) => handleFilterChange('unresolvedDimension', e.target.value)}
              >
                <option value="all">All Unresolved</option>
                <option value="who">Who Unresolved</option>
                <option value="what">What Unresolved</option>
                <option value="when">When Unresolved</option>
                <option value="where">Where Unresolved</option>
              </select>
            </label>
            <label className={styles.studioInlineLabel} aria-label="Import batch filter">
              <select
                className={styles.studioFilterSelect}
                value={filters.importBatchId}
                onChange={(e) => handleFilterChange('importBatchId', e.target.value)}
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
                value={filters.importFolder}
                onChange={(e) => handleFilterChange('importFolder', e.target.value)}
              >
                <option value="all">All folders</option>
                {importFolderOptions.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.studioInlineLabel} aria-label="Metadata result filter">
              <select
                className={styles.studioFilterSelect}
                value={filters.metadataOutcome}
                onChange={(e) => handleFilterChange('metadataOutcome', e.target.value)}
              >
                <option value="all">All metadata results</option>
                <option value="found">Metadata found</option>
                <option value="none">No metadata found</option>
                <option value="error">Metadata read error</option>
                <option value="not_requested">Metadata not requested</option>
                <option value="unknown">Legacy / unknown</option>
              </select>
            </label>
            </>
            ) : null}
          </div>
        </div>
        {!loading && !error && selectedMediaIds.length > 0 ? (
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
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => void handleOpenBulkDelete()}
                disabled={bulkDeleteChecking}
                className={`${cardAdminStyles.actionButton} ${cardAdminStyles.deleteButton}`}
              >
                {bulkDeleteChecking ? 'Checking…' : 'Delete'}
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
            Delete {bulkDeleteConsequences.selectedCount} selected media item{bulkDeleteConsequences.selectedCount === 1 ? '' : 's'}?
          </p>
          <p className={styles.deleteDialogText}>
            {bulkDeleteConsequences.linkedCardCount > 0
              ? `${bulkDeleteConsequences.linkedMediaCount} selected media item${bulkDeleteConsequences.linkedMediaCount === 1 ? '' : 's'} ${bulkDeleteConsequences.linkedMediaCount === 1 ? 'is' : 'are'} used by ${bulkDeleteConsequences.linkedCardCount} card${bulkDeleteConsequences.linkedCardCount === 1 ? '' : 's'}. Deletion removes ${bulkDeleteConsequences.linkedMediaCount === 1 ? 'it' : 'them'} from Cover, Gallery, and body placements on those cards before deleting the library records and files.`
              : 'None of the selected media are used by cards. Deletion removes the library records and files.'}
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
        mediaIds={tagEditorMediaIds}
        isOpen={bulkTagModalOpen}
        onClose={() => {
          setBulkTagModalOpen(false);
          setTagEditorMediaIds([]);
        }}
        onSave={async () => {
          setBulkTagModalOpen(false);
          setTagEditorMediaIds([]);
        }}
      />

      <div className={styles.embeddedMediaBody}>
        {mainBody}
      </div>
    </div>
  );
}

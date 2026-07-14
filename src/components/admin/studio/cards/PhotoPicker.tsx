'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import JournalImage from '@/components/common/JournalImage';
import { Media } from '@/lib/types/photo';
import { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useTag } from '@/components/providers/TagProvider';
import {
  appendDimensionalTagQueryParams,
  groupSelectedTagIdsByDimension,
  mergeDimensionalTagMaps,
} from '@/lib/utils/tagUtils';
import type { Tag } from '@/lib/types/tag';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import styles from './PhotoPicker.module.css';

const LIBRARY_PAGE_LIMIT = 40;

interface PhotoPickerProps {
  isOpen: boolean;
  onSelect?: (media: Media) => void;
  onMultiSelect?: (media: HydratedGalleryMediaItem[]) => void;
  onClose: () => void;
  initialMode?: 'single' | 'multi';
  /** When set, Library can narrow results to media matching these card tags (dimensional AND). */
  filterTagIds?: string[];
}

interface MediaListApiResponse {
  media: Media[];
  pagination: {
    limit: number;
    hasNext: boolean;
    nextCursor?: string | null;
    nextListPage?: number | null;
    engine?: 'typesense' | 'firestore';
  };
}

export default function PhotoPicker({
  isOpen,
  onSelect,
  onMultiSelect,
  onClose,
  initialMode = 'single',
  filterTagIds,
}: PhotoPickerProps) {
  const { tags: allTags } = useTag();
  const [mode] = useState<'single' | 'multi'>(initialMode);

  const [libraryItems, setLibraryItems] = useState<Media[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryLoadingMore, setLibraryLoadingMore] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryNextCursor, setLibraryNextCursor] = useState<string | null>(null);
  const [libraryNextListPage, setLibraryNextListPage] = useState<number | null>(null);
  const [libraryHasNext, setLibraryHasNext] = useState(false);
  const [librarySearchDraft, setLibrarySearchDraft] = useState('');
  const [librarySearchApplied, setLibrarySearchApplied] = useState('');
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [selectedLibraryMedia, setSelectedLibraryMedia] = useState<Media[]>([]);
  const librarySearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const libraryLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const libraryScrollRef = useRef<HTMLDivElement | null>(null);

  const [libSource, setLibSource] = useState('all');
  const [libDimensions, setLibDimensions] = useState('all');
  const [libHasCaption, setLibHasCaption] = useState('all');
  const [libAssignment, setLibAssignment] = useState('all');
  const [matchCardTags, setMatchCardTags] = useState(false);
  const [libraryPickerTagIds, setLibraryPickerTagIds] = useState<string[]>([]);

  const cardDimensionalMapForLibrary = useMemo(() => {
    if (!matchCardTags || !filterTagIds?.length) {
      return groupSelectedTagIdsByDimension([], allTags);
    }
    return groupSelectedTagIdsByDimension(filterTagIds, allTags);
  }, [matchCardTags, filterTagIds, allTags]);

  const pickerDimensionalMapForLibrary = useMemo(
    () => groupSelectedTagIdsByDimension(libraryPickerTagIds, allTags),
    [libraryPickerTagIds, allTags]
  );

  const dimensionalMapForLibrary = useMemo(
    () => mergeDimensionalTagMaps(cardDimensionalMapForLibrary, pickerDimensionalMapForLibrary),
    [cardDimensionalMapForLibrary, pickerDimensionalMapForLibrary]
  );

  const libraryPickerTags = useMemo((): Tag[] => {
    return libraryPickerTagIds
      .map((id) => allTags.find((t) => t.docId === id))
      .filter((t): t is Tag => Boolean(t));
  }, [libraryPickerTagIds, allTags]);

  const completeLibrarySelection = useCallback(() => {
    if (selectedLibraryMedia.length === 0 || !onMultiSelect) return;
    const hydrated: HydratedGalleryMediaItem[] = selectedLibraryMedia.map((media, order) => ({
      mediaId: media.docId!,
      order,
      media,
    }));
    onMultiSelect(hydrated);
    onClose();
  }, [selectedLibraryMedia, onMultiSelect, onClose]);

  const handleLibraryMediaClick = useCallback(
    (media: Media) => {
      if (mode === 'single') {
        onSelect?.(media);
        onClose();
        return;
      }
      setSelectedLibraryMedia((prev) => {
        const exists = prev.some((m) => m.docId === media.docId);
        if (exists) {
          return prev.filter((m) => m.docId !== media.docId);
        }
        return [...prev, media];
      });
    },
    [mode, onSelect, onClose]
  );

  const flushLibrarySearch = useCallback(() => {
    if (librarySearchTimerRef.current) {
      clearTimeout(librarySearchTimerRef.current);
      librarySearchTimerRef.current = null;
    }
    setLibrarySearchApplied(librarySearchDraft.trim());
  }, [librarySearchDraft]);

  const handleLibrarySearchInputChange = useCallback((value: string) => {
    setLibrarySearchDraft(value);
    if (librarySearchTimerRef.current) clearTimeout(librarySearchTimerRef.current);
    librarySearchTimerRef.current = setTimeout(() => {
      setLibrarySearchApplied(value.trim());
      librarySearchTimerRef.current = null;
    }, 300);
  }, []);

  const buildLibraryParams = useCallback(
    (opts?: { cursor?: string | null; listPage?: number | null }) => {
      const params = new URLSearchParams();
      params.set('limit', String(LIBRARY_PAGE_LIMIT));
      if (librarySearchApplied) params.set('search', librarySearchApplied);
      const listPage = opts?.listPage;
      if (listPage != null && listPage > 1) params.set('listPage', String(listPage));
      const cursor = opts?.cursor;
      if (cursor) params.set('cursor', cursor);
      if (libSource !== 'all') params.set('source', libSource);
      if (libDimensions !== 'all') params.set('dimensions', libDimensions);
      if (libHasCaption !== 'all') params.set('hasCaption', libHasCaption);
      if (libAssignment !== 'all') params.set('assignment', libAssignment);
      appendDimensionalTagQueryParams(dimensionalMapForLibrary, params);
      return params;
    },
    [
      librarySearchApplied,
      libSource,
      libDimensions,
      libHasCaption,
      libAssignment,
      dimensionalMapForLibrary,
    ]
  );

  const loadMoreLibrary = useCallback(async () => {
    if ((!libraryNextCursor && libraryNextListPage == null) || !libraryHasNext || libraryLoadingMore) return;
    setLibraryLoadingMore(true);
    setLibraryError(null);
    try {
      const params =
        libraryNextListPage != null
          ? buildLibraryParams({ listPage: libraryNextListPage })
          : buildLibraryParams({ cursor: libraryNextCursor });
      const res = await fetch(`/api/media?${params}`);
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
        if (res.status === 503 && errJson.code === 'SEARCH_UNAVAILABLE') {
          throw new Error(
            typeof errJson.message === 'string'
              ? errJson.message
              : 'Library search requires Typesense.'
          );
        }
        throw new Error(`Failed to load media (${res.status})`);
      }
      const data = (await res.json()) as MediaListApiResponse;
      setLibraryItems((prev) => [...prev, ...data.media]);
      setLibraryNextCursor(data.pagination.nextCursor ?? null);
      setLibraryNextListPage(data.pagination.nextListPage ?? null);
      setLibraryHasNext(data.pagination.hasNext);
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLibraryLoadingMore(false);
    }
  }, [
    libraryNextCursor,
    libraryNextListPage,
    libraryHasNext,
    libraryLoadingMore,
    buildLibraryParams,
  ]);

  const clearLibraryFilters = useCallback(() => {
    if (librarySearchTimerRef.current) {
      clearTimeout(librarySearchTimerRef.current);
      librarySearchTimerRef.current = null;
    }
    setLibrarySearchDraft('');
    setLibrarySearchApplied('');
    setLibSource('all');
    setLibDimensions('all');
    setLibHasCaption('all');
    setLibAssignment('all');
    setMatchCardTags(false);
    setLibraryPickerTagIds([]);
    setLibraryNextListPage(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (librarySearchTimerRef.current) {
      clearTimeout(librarySearchTimerRef.current);
      librarySearchTimerRef.current = null;
    }
    setSelectedLibraryMedia([]);
    setLibraryItems([]);
    setLibraryNextCursor(null);
    setLibraryNextListPage(null);
    setLibraryHasNext(false);
    setLibrarySearchDraft('');
    setLibrarySearchApplied('');
    setLibSource('all');
    setLibDimensions('all');
    setLibHasCaption('all');
    setLibAssignment('all');
    setMatchCardTags(false);
    setLibraryPickerTagIds([]);
    setLibraryRefreshKey(0);
    setLibraryError(null);
  }, [isOpen, filterTagIds]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const run = async () => {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const params = buildLibraryParams();
        const res = await fetch(`/api/media?${params}`);
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You need admin access to browse the media library.');
          }
          const errJson = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
          if (res.status === 503 && errJson.code === 'SEARCH_UNAVAILABLE') {
            throw new Error(
              typeof errJson.message === 'string'
                ? errJson.message
                : 'Library search requires Typesense.'
            );
          }
          throw new Error(`Failed to load media (${res.status})`);
        }
        const data = (await res.json()) as MediaListApiResponse;
        if (!cancelled) {
          setLibraryItems(data.media);
          setLibraryNextCursor(data.pagination.nextCursor ?? null);
          setLibraryNextListPage(data.pagination.nextListPage ?? null);
          setLibraryHasNext(data.pagination.hasNext);
        }
      } catch (e) {
        if (!cancelled) {
          setLibraryError(e instanceof Error ? e.message : 'Failed to load library');
          setLibraryItems([]);
          setLibraryNextCursor(null);
          setLibraryHasNext(false);
        }
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    buildLibraryParams,
    libraryRefreshKey,
    librarySearchApplied,
    libSource,
    libDimensions,
    libHasCaption,
    libAssignment,
    dimensionalMapForLibrary,
  ]);

  useEffect(() => {
    if (!isOpen || !libraryHasNext) return;
    const sentinel = libraryLoadMoreRef.current;
    const scrollRoot = libraryScrollRef.current;
    if (!sentinel || !scrollRoot) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || libraryLoading || libraryLoadingMore) return;
        void loadMoreLibrary();
      },
      {
        root: scrollRoot,
        rootMargin: '240px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, libraryHasNext, libraryLoading, libraryLoadingMore, loadMoreLibrary]);

  if (!isOpen) return null;

  const showLibraryFooter = mode === 'multi';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Media library</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <p className={styles.sourceHint}>
          Pick from the media bank. Import new files from Studio Media → Import.
        </p>

        <div className={styles.libraryPanel}>
          <div className={styles.libraryControls}>
            <div className={styles.libraryTagSection}>
              <p className={styles.libraryTagSectionLabel}>Filter library by tags</p>
              <p className={styles.libraryTagSectionHint}>
                Choices here apply only in this dialog (not the left sidebar). Within each dimension, any
                selected tag matches (OR); across dimensions, all apply (AND). With &quot;Match card tags&quot;
                on, this card&apos;s tags are combined with your selections below.
              </p>
              <MacroTagSelector
                className={styles.libraryMacroTagSelector}
                selectedTags={libraryPickerTags}
                allTags={allTags}
                onChange={setLibraryPickerTagIds}
                expanded
                collapsedSummary="none"
              />
              {filterTagIds && filterTagIds.length > 0 && (
                <label
                  className={`${styles.libraryMatchTags} ${styles.libraryTagSectionMatchRow}`}
                >
                  <input
                    type="checkbox"
                    checked={matchCardTags}
                    onChange={(e) => setMatchCardTags(e.target.checked)}
                  />
                  Also match card tags
                </label>
              )}
            </div>
            <div className={styles.libraryFilters}>
              <div className={styles.libraryFilterGroup}>
                <label htmlFor="lib-filter-source">Source</label>
                <select
                  id="lib-filter-source"
                  value={libSource}
                  onChange={(e) => setLibSource(e.target.value)}
                  className={styles.libraryFilterSelect}
                >
                  <option value="all">All</option>
                  <option value="local">Local</option>
                  <option value="paste">Paste</option>
                </select>
              </div>
              <div className={styles.libraryFilterGroup}>
                <label htmlFor="lib-filter-dim">Shape</label>
                <select
                  id="lib-filter-dim"
                  value={libDimensions}
                  onChange={(e) => setLibDimensions(e.target.value)}
                  className={styles.libraryFilterSelect}
                >
                  <option value="all">All</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <div className={styles.libraryFilterGroup}>
                <label htmlFor="lib-filter-cap">Caption</label>
                <select
                  id="lib-filter-cap"
                  value={libHasCaption}
                  onChange={(e) => setLibHasCaption(e.target.value)}
                  className={styles.libraryFilterSelect}
                >
                  <option value="all">All</option>
                  <option value="with">With caption</option>
                  <option value="without">Without caption</option>
                </select>
              </div>
              <div className={styles.libraryFilterGroup}>
                <label htmlFor="lib-filter-assign">On cards</label>
                <select
                  id="lib-filter-assign"
                  value={libAssignment}
                  onChange={(e) => setLibAssignment(e.target.value)}
                  className={styles.libraryFilterSelect}
                  title="Uses referencedByCardIds on each media doc"
                >
                  <option value="all">All</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="assigned">Assigned</option>
                </select>
              </div>
              <button type="button" className={styles.libraryClearFilters} onClick={clearLibraryFilters}>
                Clear filters
              </button>
            </div>
            <div className={styles.libraryToolbar}>
              <input
                type="search"
                className={styles.librarySearchInput}
                placeholder="Search filename, caption, tags, path..."
                value={librarySearchDraft}
                onChange={(e) => handleLibrarySearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    flushLibrarySearch();
                  }
                }}
                aria-label="Search library"
              />
              <button type="button" className={styles.librarySearchButton} onClick={flushLibrarySearch}>
                Search now
              </button>
            </div>
            <p className={styles.libraryHint}>
              Search updates as you type (short delay). Text search matches filename, caption, tags, and path.
              Dimensional tag filter and optional &quot;Match card tags&quot; are in the section above.
            </p>
          </div>

          {libraryLoading ? (
            <div className={styles.loading}>
              <LoadingSpinner />
              <p>Loading library…</p>
            </div>
          ) : libraryItems.length === 0 ? (
            <div className={styles.noContent}>No media matches the current filters.</div>
          ) : (
            <div className={styles.libraryResults}>
              <div ref={libraryScrollRef} className={styles.libraryScroll}>
                <div className={styles.libraryGrid}>
                  {libraryItems.map((media) => {
                    const isSelected = selectedLibraryMedia.some((m) => m.docId === media.docId);
                    return (
                      <div
                        key={media.docId}
                        className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''}`}
                        onClick={() => handleLibraryMediaClick(media)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleLibraryMediaClick(media);
                          }
                        }}
                      >
                        <JournalImage
                          src={getStudioDisplayUrl(media)}
                          alt={media.filename || media.docId}
                          className={styles.photoImage}
                          width={150}
                          height={150}
                          sizes="150px"
                          priority={false}
                        />
                        {mode === 'multi' && isSelected && (
                          <div className={styles.checkmark} aria-hidden="true">
                            ✓
                          </div>
                        )}
                        <div className={styles.libraryCaption} title={media.filename}>
                          {media.filename}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {libraryHasNext ? (
                  <div ref={libraryLoadMoreRef} className={styles.libraryAutoLoadSentinel} aria-hidden="true" />
                ) : null}
              </div>
              {libraryHasNext && (
                <div className={styles.libraryLoadMoreWrap}>
                  <button
                    type="button"
                    className={styles.libraryLoadMore}
                    onClick={() => void loadMoreLibrary()}
                    disabled={libraryLoadingMore}
                  >
                    {libraryLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showLibraryFooter && (
          <div className={styles.footer}>
            <div className={styles.footerRow}>
              <button
                type="button"
                onClick={completeLibrarySelection}
                className={styles.doneButton}
                disabled={selectedLibraryMedia.length === 0}
              >
                {`Use ${selectedLibraryMedia.length} photo${selectedLibraryMedia.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {libraryError && (
          <div className={styles.error} role="alert">
            {libraryError}
            <button
              type="button"
              onClick={() => {
                setLibraryError(null);
                setLibraryRefreshKey((k) => k + 1);
              }}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JournalImage from '@/components/common/JournalImage';
import { useMedia, type MediaFilters } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import { DirectDimensionChipsRow } from '@/components/admin/common/DirectDimensionChips';
import { getCoreTagsByDimension } from '@/lib/utils/tagDisplay';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { isMediaAssigned } from '@/lib/utils/mediaAssignmentSeek';
import styles from './MediaTriageWorkspace.module.css';

export default function MediaTriageWorkspace() {
  const router = useRouter();
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const {
    loading,
    error,
    media,
    pagination,
    filters,
    setFilter,
    clearFilters,
    fetchMedia,
    currentPage,
    selectedMediaIds,
    setSelectedMediaIds,
    selectNone,
    deleteMultipleMedia,
    updateMedia,
    bulkApplyTags,
  } = useMedia();

  const { tags: allTags } = useTag();

  const [focusId, setFocusId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [pendingBulkTags, setPendingBulkTags] = useState<string[]>([]);
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [bulkTagApplying, setBulkTagApplying] = useState(false);
  const [pendingSingleTags, setPendingSingleTags] = useState<string[]>([]);
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  const tagNameMap = useMemo(
    () => new Map(allTags.filter((t) => t.docId).map((t) => [t.docId as string, t.name])),
    [allTags]
  );

  const focusMedia = useMemo(
    () => media.find((m) => m.docId === focusId) ?? null,
    [media, focusId]
  );

  const core = useMemo(
    () => (focusMedia ? getCoreTagsByDimension(focusMedia) : null),
    [focusMedia]
  );

  useEffect(() => {
    if (!media.length) {
      setFocusId(null);
      return;
    }
    if (!focusId || !media.some((m) => m.docId === focusId)) {
      const first = media[0]!.docId!;
      setFocusId(first);
      setSelectedMediaIds([first]);
    }
  }, [media, focusId, setSelectedMediaIds]);

  useEffect(() => {
    setCaptionDraft(focusMedia?.caption ?? '');
  }, [focusMedia?.docId, focusMedia?.caption]);

  useLayoutEffect(() => {
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      const stickyEl = stickyRef.current;
      if (!tabsEl || !stickyEl) return;
      const tabsH = tabsEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsH}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof MediaFilters, value: string) => {
      setFilter(key, value);
      void fetchMedia(1, { [key]: value });
    },
    [setFilter, fetchMedia]
  );

  const handleSearch = useCallback(
    (search: string) => {
      setFilter('search', search);
      void fetchMedia(1, { search });
    },
    [setFilter, fetchMedia]
  );

  const selectFocus = useCallback(
    (id: string) => {
      setFocusId(id);
      setSelectedMediaIds([id]);
    },
    [setSelectedMediaIds]
  );

  const handleSaveCaption = async () => {
    if (!focusMedia) return;
    setSavingCaption(true);
    try {
      if (captionDraft !== (focusMedia.caption ?? '')) {
        await updateMedia(focusMedia.docId, { caption: captionDraft });
      }
    } finally {
      setSavingCaption(false);
    }
  };

  const openSingleTagModal = () => {
    if (!focusMedia) return;
    setPendingSingleTags([...(focusMedia.tags ?? [])]);
    setTagModalOpen(true);
  };

  const handleSaveSingleTags = async (newIds: string[]) => {
    if (!focusMedia) return;
    await updateMedia(focusMedia.docId, { tags: newIds });
    setTagModalOpen(false);
  };

  const handleOpenBulkTags = () => {
    if (selectedMediaIds.length === 0) return;
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

  const handleCreateCardFromSelection = async () => {
    if (selectedMediaIds.length === 0) return;
    setIsCreatingCard(true);
    try {
      const galleryMedia = selectedMediaIds
        .map((mediaId, order) => ({ mediaId, order }))
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
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.details?.[0] || `HTTP ${response.status}`);
      }

      const newCard = await response.json();
      selectNone();
      router.push(`/admin/card-admin/${newCard.docId}/edit`);
    } catch (err) {
      console.error('Create card from selection failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to create card.');
    } finally {
      setIsCreatingCard(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    if (!confirm(`Delete ${selectedMediaIds.length} media item(s)?`)) return;
    await deleteMultipleMedia(selectedMediaIds);
    setFocusId(null);
  };

  const singleSelectedTagObjects = useMemo(
    () => allTags.filter((t) => t.docId && pendingSingleTags.includes(t.docId)),
    [allTags, pendingSingleTags]
  );

  return (
    <div className={styles.page}>
      <p className={styles.intro}>
        Ingest-focused view: pick an item, edit caption and <strong>media</strong> tags, then create a draft card or
        continue in the{' '}
        <Link href="/admin/media-admin">classic media table</Link>. Uses the same list filters and APIs as Media
        admin.
      </p>

      <header className={styles.stickyHeader} ref={stickyRef}>
        <div className={styles.titleRow}>
          <h1>Media triage</h1>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="triage-search">Search</label>
            <input
              id="triage-search"
              type="search"
              placeholder="Filename, caption, path, tag names…"
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="triage-source">Source</label>
            <select
              id="triage-source"
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
            >
              <option value="all">All</option>
              <option value="local">Local</option>
              <option value="paste">Paste</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="triage-assignment">On cards</label>
            <select
              id="triage-assignment"
              value={filters.assignment}
              onChange={(e) => handleFilterChange('assignment', e.target.value)}
              title="referencedByCardIds"
            >
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="triage-caption">Caption</label>
            <select
              id="triage-caption"
              value={filters.hasCaption}
              onChange={(e) => handleFilterChange('hasCaption', e.target.value)}
            >
              <option value="all">All</option>
              <option value="with">With caption</option>
              <option value="without">Without</option>
            </select>
          </div>
          <button type="button" className={styles.clearButton} onClick={() => void clearFilters()}>
            Clear filters
          </button>
        </div>

        <div className={styles.toolbar}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text2-color)' }}>
            {selectedMediaIds.length} selected
          </span>
          <button
            type="button"
            disabled={selectedMediaIds.length === 0 || isCreatingCard}
            onClick={() => void handleCreateCardFromSelection()}
          >
            {isCreatingCard ? 'Creating…' : 'Create draft gallery card'}
          </button>
          <button type="button" className={styles.secondary} disabled={selectedMediaIds.length === 0} onClick={handleOpenBulkTags}>
            Bulk tag selection…
          </button>
          <button type="button" className={styles.secondary} disabled={selectedMediaIds.length === 0} onClick={selectNone}>
            Clear selection
          </button>
          <button type="button" className={styles.secondary} disabled={selectedMediaIds.length === 0} onClick={() => void handleBulkDelete()}>
            Delete selected
          </button>
        </div>
      </header>

      {loading && <p>Loading media…</p>}
      {error && <p className={styles.error}>{error.message}</p>}

      {!loading && !error && (
        <div className={styles.panes}>
          <aside className={styles.leftPane} aria-label="Media queue">
            <h2 className={styles.paneTitle}>Queue ({media.length})</h2>
            <div className={styles.mediaList}>
              {media.map((m) => {
                const active = m.docId === focusId;
                const assigned = isMediaAssigned(m);
                return (
                  <button
                    key={m.docId}
                    type="button"
                    className={`${styles.mediaListButton} ${active ? styles.mediaListButtonActive : ''}`}
                    onClick={() => selectFocus(m.docId!)}
                  >
                    <JournalImage
                      src={getDisplayUrl(m)}
                      alt=""
                      width={96}
                      height={96}
                      className={styles.thumb}
                    />
                    <div className={styles.mediaListMeta}>
                      <span className={styles.mediaListName}>{m.filename}</span>
                      <span className={styles.mediaListSub}>{assigned ? 'On card(s)' : 'Unassigned'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.centerPane} aria-label="Preview and caption">
            <h2 className={styles.paneTitle}>Asset</h2>
            {!focusMedia ? (
              <div className={styles.emptyCenter}>No media in this page.</div>
            ) : (
              <div className={styles.centerBody}>
                <div className={styles.preview}>
                  <JournalImage
                    src={getDisplayUrl(focusMedia)}
                    alt={focusMedia.filename}
                    width={Math.min(focusMedia.width, 1200)}
                    height={Math.min(focusMedia.height, 1200)}
                    sizes="(max-width: 1100px) 90vw, 55vw"
                  />
                </div>
                <div className={styles.metaBlock}>
                  <strong>Source path</strong> {focusMedia.sourcePath || '—'}
                </div>
                <div className={styles.metaBlock}>
                  <strong>Dimensions</strong> {focusMedia.width}×{focusMedia.height} · {focusMedia.contentType}
                </div>
                {core ? (
                  <div className={styles.chipRowWrap}>
                    <DirectDimensionChipsRow core={core} tagNameMap={tagNameMap} />
                  </div>
                ) : null}
                <div className={styles.captionRow}>
                  <label htmlFor="triage-caption-input">Caption</label>
                  <textarea
                    id="triage-caption-input"
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    disabled={savingCaption}
                  />
                  <div className={styles.captionActions}>
                    <button type="button" disabled={savingCaption} onClick={() => void handleSaveCaption()}>
                      {savingCaption ? 'Saving…' : 'Save caption'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className={styles.rightPane} aria-label="Tags and actions">
            <h2 className={styles.paneTitle}>Media tags</h2>
            <div className={styles.rightBody}>
              <p className={styles.rightHint}>
                Tags here apply to the <strong>media document</strong> (Who / What / When / Where on the file), not
                the story card until you create or attach a card.
              </p>
              <div className={styles.tagActions}>
                <button type="button" disabled={!focusMedia} onClick={openSingleTagModal}>
                  Edit tags (focused item)
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {pagination &&
        (pagination.seekMode ? pagination.hasNext || currentPage > 1 : (pagination.totalPages ?? 1) > 1) && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => void fetchMedia(currentPage - 1)}
              disabled={!pagination.hasPrev}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>
              {pagination.seekMode ? (
                <>
                  Page {currentPage}
                  {pagination.hasNext ? ' · more on Next' : ''}
                </>
              ) : (
                <>
                  Page {pagination.page ?? currentPage} of {pagination.totalPages ?? 1}
                  {pagination.total != null ? ` (${pagination.total} total)` : ''}
                </>
              )}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => void fetchMedia(currentPage + 1)}
              disabled={!pagination.hasNext}
            >
              Next
            </button>
          </div>
        )}

      <EditModal
        isOpen={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        title={focusMedia ? `Tags: ${focusMedia.filename}` : 'Tags'}
        size="wide"
      >
        <MacroTagSelector
          startExpanded
          onRequestClose={() => setTagModalOpen(false)}
          selectedTags={singleSelectedTagObjects}
          allTags={allTags}
          onChange={setPendingSingleTags}
          onSaveSelection={(ids) => void handleSaveSingleTags(ids)}
        />
      </EditModal>

      <EditModal
        isOpen={bulkTagModalOpen}
        onClose={() => setBulkTagModalOpen(false)}
        title="Tags for selected media"
        size="wide"
      >
        <p className={styles.bulkTagHint}>
          Applies to {selectedMediaIds.length} item(s). Choose mode, pick tags, then Save.
        </p>
        <div className={styles.modeRow}>
          <label htmlFor="triage-bulk-mode">Bulk tag action</label>
          <select
            id="triage-bulk-mode"
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
          onSaveSelection={(ids) => void handleSaveBulkTagSelection(ids)}
          onRequestClose={() => setBulkTagModalOpen(false)}
          selectedTags={allTags.filter((t) => t.docId && pendingBulkTags.includes(t.docId))}
          allTags={allTags}
          onChange={setPendingBulkTags}
        />
      </EditModal>
    </div>
  );
}

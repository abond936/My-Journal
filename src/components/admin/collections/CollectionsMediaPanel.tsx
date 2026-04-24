'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getMediaErrorSeverity, useMedia } from '@/components/providers/MediaProvider';
import MediaAdminList from '@/components/admin/media-admin/MediaAdminList';
import styles from '@/app/admin/collections/page.module.css';

/**
 * Compact media table for Collections / Studio: loads media on mount, assignment filter + pagination.
 */
type CollectionsMediaPanelProps = {
  /** When true (Admin Studio embedded column), rows register as `source:*` for cover/gallery drops. */
  studioSourceDraggable?: boolean;
};

export default function CollectionsMediaPanel({ studioSourceDraggable = false }: CollectionsMediaPanelProps) {
  const {
    fetchMedia,
    loading,
    error,
    pagination,
    currentPage,
    filters,
    selectedMediaIds,
    selectNone,
    deleteMultipleMedia,
  } = useMedia();

  useEffect(() => {
    void fetchMedia(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when panel mounts (Collections / Studio)
  }, []);

  const onAssignmentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      void fetchMedia(1, { assignment: e.target.value });
    },
    [fetchMedia]
  );

  const onPrev = useCallback(() => {
    void fetchMedia(currentPage - 1);
  }, [fetchMedia, currentPage]);

  const onNext = useCallback(() => {
    void fetchMedia(currentPage + 1);
  }, [fetchMedia, currentPage]);

  const onBulkDelete = useCallback(async () => {
    if (selectedMediaIds.length === 0) return;
    if (!confirm(`Delete ${selectedMediaIds.length} media item(s)?`)) return;
    await deleteMultipleMedia(selectedMediaIds);
  }, [selectedMediaIds, deleteMultipleMedia]);

  const pag = pagination;
  const showPaginationControls =
    !!pag &&
    (pag.seekMode ? pag.hasNext || currentPage > 1 : (pag.totalPages ?? 1) > 1);
  const errorSeverity = getMediaErrorSeverity(error);

  return (
    <section className={`${styles.panel} ${styles.mediaPanel}`}>
      <h2>Media</h2>
      <p className={styles.hint}>
        Compact columns for this layout.{' '}
        <Link href="/admin/studio">Open Studio</Link> for search, grid view, and bulk tags.
      </p>
      <div className={styles.mediaPanelToolbar}>
        <label className={styles.mediaToolbarLabel}>
          On cards
          <select
            value={filters.assignment}
            onChange={onAssignmentChange}
            className={styles.statusSelect}
            aria-label="Filter media by card assignment"
          >
            <option value="all">All</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
          </select>
        </label>
        {selectedMediaIds.length > 0 ? (
          <div className={styles.mediaToolbarBulk}>
            <span>{selectedMediaIds.length} selected</span>
            <button type="button" className={styles.smallButton} onClick={selectNone}>
              Clear selection
            </button>
            <button type="button" className={`${styles.smallButton} ${styles.mediaDeleteButton}`} onClick={() => void onBulkDelete()}>
              Delete selected
            </button>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className={errorSeverity === 'warning' ? styles.warning : styles.error}>{error.message}</p>
      ) : null}
      {loading ? <p className={styles.mediaLoading}>Loading media…</p> : null}
      <div className={`${styles.panelScroll} ${styles.mediaPanelScroll}`}>
        <MediaAdminList variant="compact" studioSourceDraggable={studioSourceDraggable} />
      </div>
      {showPaginationControls && pag ? (
        <div className={styles.mediaPagination}>
          <button type="button" onClick={onPrev} disabled={!pag.hasPrev} className={styles.smallButton}>
            Previous
          </button>
          <span className={styles.mediaPageInfo}>
            Page {pag.seekMode ? currentPage : (pag.page ?? currentPage)}
            {pag.total != null ? ` · ${pag.total} items` : null}
          </span>
          <button type="button" onClick={onNext} disabled={!pag.hasNext} className={styles.smallButton}>
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}

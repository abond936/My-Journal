'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMedia } from '@/components/providers/MediaProvider';
import MediaAdminList from '@/components/admin/media-admin/MediaAdminList';
import MediaAdminGrid from '@/components/admin/media-admin/MediaAdminGrid';
import styles from './media-admin.module.css';

const MEDIA_VIEW_MODE_KEY = 'media-admin-view-mode';
type ViewMode = 'grid' | 'table';

export default function MediaAdminContent() {
  const router = useRouter();
  const { 
    media, 
    loading, 
    error, 
    pagination,
    filters,
    setFilter,
    clearFilters,
    fetchMedia,
    currentPage,
    selectedMediaIds,
    selectAll,
    selectNone,
    deleteMultipleMedia,
    setSelectedMediaIds
  } = useMedia();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = localStorage.getItem(MEDIA_VIEW_MODE_KEY);
    return (saved === 'table' ? 'table' : 'grid') as ViewMode;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MEDIA_VIEW_MODE_KEY, viewMode);
    }
  }, [viewMode]);

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedMediaIds.length} media item(s)?`)) {
      await deleteMultipleMedia(selectedMediaIds);
    }
  };

  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const handleCreateCardFromSelection = async () => {
    if (selectedMediaIds.length === 0) return;
    setIsCreatingCard(true);
    try {
      const mediaMap = new Map(media.map(m => [m.docId, m]));
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
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.details?.[0] || `HTTP ${response.status}`);
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

  const handleFilterChange = (key: string, value: string) => {
    setFilter(key as any, value);
    fetchMedia(1, { [key]: value });
  };

  const handleSearch = (search: string) => {
    setFilter('search', search);
    fetchMedia(1, { search });
  };

  return (
    <div className={styles.container}>
      <h1>Media Management</h1>
      <p>Manage media assets with filtering, search, and bulk operations.</p>

      {/* View toggle - prominent, always visible */}
      <div className={styles.viewToggleBar}>
        <span className={styles.viewToggleLabel}>View:</span>
        <span className={styles.viewToggleButtonGroup}>
          <button
            type="button"
            className={`${styles.viewToggleButton} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
          >
            Grid
          </button>
          <button
            type="button"
            className={`${styles.viewToggleButton} ${viewMode === 'table' ? styles.active : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
          >
            Table
          </button>
        </span>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Status:</label>
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All</option>
            <option value="temporary">Temporary</option>
            <option value="active">Active</option>
          </select>
        </div>

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

        <div className={styles.filterGroup}>
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search filename, caption, or path..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <button onClick={clearFilters} className={styles.clearButton}>
          Clear Filters
        </button>
      </div>

      {/* Bulk actions bar */}
      {!loading && !error && (
        <div className={styles.toolbar}>
          <div className={styles.bulkActions}>
            {selectedMediaIds.length > 0 ? (
              <>
                <span>{selectedMediaIds.length} item(s) selected</span>
                <button
                  onClick={handleCreateCardFromSelection}
                  disabled={isCreatingCard}
                  className={`${styles.bulkButton} ${styles.createCardButton}`}
                >
                  {isCreatingCard ? 'Creating…' : 'Create card from selection'}
                </button>
                <button onClick={selectNone} className={styles.bulkButton}>
                  Clear Selection
                </button>
                <button onClick={handleBulkDelete} className={`${styles.bulkButton} ${styles.deleteButton}`}>
                  Delete Selected
                </button>
              </>
            ) : (
              <span>No items selected</span>
            )}
          </div>
        </div>
      )}

      {/* Loading and Error States */}
      {loading && <p>Loading media...</p>}
      {error && <p className={styles.error}>{error.toString()}</p>}

      {/* Media list or grid */}
      {!loading && !error && (viewMode === 'grid' ? <MediaAdminGrid /> : <MediaAdminList />)}

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
    </div>
  );
} 
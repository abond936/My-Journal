'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMedia } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import MediaAdminList from '@/components/admin/media-admin/MediaAdminList';
import MediaAdminGrid from '@/components/admin/media-admin/MediaAdminGrid';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
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
    setSelectedMediaIds,
    bulkApplyTags,
  } = useMedia();

  const { tags: allTags } = useTag();

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

  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [pendingBulkTags, setPendingBulkTags] = useState<string[]>([]);
  const [bulkTagApplying, setBulkTagApplying] = useState(false);
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'replace' | 'remove'>('add');

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

  const handleTagFilterChange = (tagDimension: string, tagMode: string, tagValue: string) => {
    setFilter('tagDimension', tagDimension);
    setFilter('tagMode', tagMode);
    setFilter('tagValue', tagValue);
    void fetchMedia(1, { tagDimension, tagMode, tagValue });
  };

  const tagDimension = filters.tagDimension || 'any';
  const tagMode = filters.tagMode || 'all';
  const tagValue = filters.tagValue || '';

  const dimensionFilteredTags = allTags.filter(tag => {
    if (!tag.docId) return false;
    if (tagDimension === 'any') return true;
    return (tag.dimension || '').toLowerCase() === tagDimension;
  });

  const stickyTopRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      const stickyEl = stickyTopRef.current;
      if (!tabsEl || !stickyEl) return;

      const tabsHeight = tabsEl.getBoundingClientRect().height;
      const stickyHeight = stickyEl.getBoundingClientRect().height;

      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsHeight}px`);
      document.documentElement.style.setProperty('--media-admin-sticky-top-height', `${stickyHeight}px`);
      document.documentElement.style.setProperty(
        '--media-admin-table-header-top',
        `${tabsHeight + stickyHeight}px`
      );
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [selectedMediaIds.length, loading, error, filters.tagDimension, filters.tagMode, filters.tagValue, viewMode]);

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop} ref={stickyTopRef}>
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

          <div className={styles.filterGroup}>
            <label>Tag dimension:</label>
            <select
              value={tagDimension}
              onChange={(e) => handleTagFilterChange(e.target.value, tagMode, '')}
            >
              <option value="any">Any</option>
              <option value="who">Who</option>
              <option value="what">What</option>
              <option value="when">When</option>
              <option value="where">Where</option>
              <option value="reflection">Reflection</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Tag filter:</label>
            <select
              value={tagMode}
              onChange={(e) =>
                handleTagFilterChange(
                  tagDimension,
                  e.target.value,
                  e.target.value === 'match' ? tagValue : ''
                )
              }
            >
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              <option value="match">Matches tag</option>
            </select>
          </div>

          {tagMode === 'match' && (
            <div className={styles.filterGroup}>
              <label>Tag value:</label>
              <select
                value={tagValue}
                onChange={(e) => handleTagFilterChange(tagDimension, tagMode, e.target.value)}
              >
                <option value="">Select tag…</option>
                {dimensionFilteredTags.map(tag => (
                  <option key={tag.docId} value={tag.docId}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                  <button type="button" onClick={handleOpenBulkTags} className={styles.bulkButton}>
                    Edit tags…
                  </button>
                  <button onClick={selectNone} className={styles.bulkButton}>
                    Clear Selection
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className={`${styles.bulkButton} ${styles.deleteButton}`}
                  >
                    Delete Selected
                  </button>
                </>
              ) : (
                <span>No items selected</span>
              )}
            </div>
          </div>
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
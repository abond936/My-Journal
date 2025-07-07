'use client';

import React from 'react';
import { useMedia } from '@/components/providers/MediaProvider';
import MediaAdminList from '@/components/admin/media-admin/MediaAdminList';
import styles from './media-admin.module.css';

export default function MediaAdminContent() {
  const { 
    media, 
    loading, 
    error, 
    pagination,
    filters,
    setFilter,
    clearFilters,
    fetchMedia
  } = useMedia();

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

      {/* Loading and Error States */}
      {loading && <p>Loading media...</p>}
      {error && <p className={styles.error}>{error.toString()}</p>}

      {/* Media List */}
      {!loading && !error && <MediaAdminList />}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            onClick={() => fetchMedia(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className={styles.pageButton}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {pagination.page} of {pagination.totalPages} 
            ({pagination.total} total items)
          </span>
          <button 
            onClick={() => fetchMedia(pagination.page + 1)}
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
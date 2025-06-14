'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useTag } from '@/components/providers/TagProvider';
import { useContentContext } from '@/components/providers/ContentProvider';
import { Album } from '@/lib/types/album';
import { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/album-admin/album-admin.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface AlbumWithStats extends Album {
  tagNames: { id: string; name: string }[];
}

const dimensions: Tag['dimension'][] = ['who', 'what', 'when', 'where', 'reflection'];

const renderTagOption = (tag: any, level: number = 0) => {
  const padding = level * 10;
  return (
    <React.Fragment key={tag.id}>
      <option value={tag.id} style={{ paddingLeft: `${padding}px` }}>
        {'—'.repeat(level)} {tag.name}
      </option>
      {tag.children.map((child: any) => renderTagOption(child, level + 1))}
    </React.Fragment>
  );
};

export default function AdminAlbumsPage() {
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());

  const {
    content,
    isLoading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    mutate,
    contentType,
    setContentType,
    searchTerm,
    setSearchTerm,
    status,
    setStatus,
  } = useContentContext();

  const { tags, tagsByDimension } = useTag();

  useEffect(() => {
    if (contentType !== 'albums') {
      setContentType('albums');
    }
  }, [contentType, setContentType]);

  const albums = useMemo(() => content.filter(item => item.type === 'album'), [content]) as Album[];

  const albumsWithTagNames = useMemo((): AlbumWithStats[] => {
    const tagMap = new Map(tags.map(t => [t.id, t.name]));
    return albums.map(album => ({
      ...album,
      tagNames: (album.tags || []).map(tagId => ({ id: tagId, name: tagMap.get(tagId) || 'Unknown' })),
    }));
  }, [albums, tags]);

  const handleFieldUpdate = async (albumId: string, field: keyof Album, value: any) => {
    try {
      await fetch(`/api/albums/${albumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      mutate();
    } catch (err) {
      console.error(`Error updating album field ${field}:`, err);
      mutate();
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAlbums(new Set(albums.map(album => album.id)));
    } else {
      setSelectedAlbums(new Set());
    }
  };

  const handleSelectAlbum = (albumId: string, checked: boolean) => {
    const newSelected = new Set(selectedAlbums);
    if (checked) newSelected.add(albumId);
    else newSelected.delete(albumId);
    setSelectedAlbums(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedAlbums.size} albums?`)) return;
    try {
      await Promise.all(Array.from(selectedAlbums).map(id => fetch(`/api/albums/${id}`, { method: 'DELETE' })));
      mutate();
      setSelectedAlbums(new Set());
    } catch (err) {
      console.error('Error deleting albums:', err);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: 'draft' | 'published') => {
    if (!newStatus || !confirm(`Update ${selectedAlbums.size} albums to ${newStatus}?`)) return;
    try {
      await Promise.all(Array.from(selectedAlbums).map(id => handleFieldUpdate(id, 'status', newStatus)));
      mutate();
    } catch (err) {
      console.error('Error updating bulk status:', err);
    }
  };

  const handleBulkTagUpdate = async (dimension: Tag['dimension'], tagId: string | null) => {
    if (!tagId || !confirm(`Update tags for ${selectedAlbums.size} albums?`)) return;
    try {
      await Promise.all(Array.from(selectedAlbums).map(albumId => {
        const album = albums.find(a => a.id === albumId);
        if (!album) return Promise.resolve();
        const otherDimensionTags = (album.tags || []).filter(tId => {
          const tag = tags.find(t => t.id === tId);
          return tag && tag.dimension !== dimension;
        });
        const newTags = [...otherDimensionTags, tagId];
        return handleFieldUpdate(albumId, 'tags', newTags);
      }));
      mutate();
    } catch (err) {
      console.error('Error updating bulk tags:', err);
    }
  };

  const stats = useMemo(() => ({
    total: albums.length, // This will only reflect the current page total
    published: albums.filter(a => a.status === 'published').length,
    drafts: albums.filter(a => a.status === 'draft').length,
    totalMedia: albums.reduce((sum, album) => sum + (album.mediaCount || 0), 0),
  }), [albums]);

  if (isLoading && albums.length === 0) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>{error.message}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Albums Management</h1>
          <div className={styles.stats}>
             <div className={styles.statItem}>Total: <span className={styles.statValue}>{stats.total}</span></div>
             <div className={styles.statItem}>Published: <span className={styles.statValue}>{stats.published}</span></div>
             <div className={styles.statItem}>Drafts: <span className={styles.statValue}>{stats.drafts}</span></div>
             <div className={styles.statItem}>Media: <span className={styles.statValue}>{stats.totalMedia}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.topFilters}>
          <input
            type="text"
            placeholder="Search albums..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchBox}
          />
          <div className={styles.filterControls}>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as typeof status)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>

      {selectedAlbums.size > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedAlbums.size} albums selected</span>
          <div className={styles.actions}>
            <select
              onChange={e => handleBulkStatusUpdate(e.target.value as 'draft' | 'published')}
              className={styles.filterSelect}
            >
              <option value="">Update Status</option>
              <option value="draft">Set to Draft</option>
              <option value="published">Set to Published</option>
            </select>
            <button onClick={handleBulkDelete} className={styles.deleteButton}>
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {selectedAlbums.size > 0 && (
        <div className={styles.bulkTagActions}>
          <div className={styles.dimensionFilters}>
            {dimensions.map(dimension => {
              const tagsForDimension = tagsByDimension[dimension] || [];
              const buildTree = (tags: Tag[]) => {
                  const tagMap = new Map();
                  const roots: any[] = [];
                  tags.forEach(tag => tagMap.set(tag.id, { ...tag, children: [] }));
                  tags.forEach(tag => {
                      if (tag.parentId) tagMap.get(tag.parentId)?.children.push(tagMap.get(tag.id));
                      else roots.push(tagMap.get(tag.id));
                  });
                  return roots;
              };
              return (
              <select
                key={dimension}
                onChange={e => handleBulkTagUpdate(dimension, e.target.value || null)}
                className={styles.dimensionSelect}
              >
                <option value="">Update {dimension}</option>
                {buildTree(tagsForDimension).map(tag => renderTagOption(tag))}
              </select>
            )})}
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.albumsTable}>
          <thead>
            <tr>
              <th><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} /></th>
              <th>Cover</th>
              <th>Title</th>
              <th>Description</th>
              <th>Caption</th>
              <th>Media</th>
              <th>Status</th>
              <th>Tags</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {albumsWithTagNames.map(album => (
              <tr key={album.id}>
                <td><input type="checkbox" checked={selectedAlbums.has(album.id)} onChange={e => handleSelectAlbum(album.id, e.target.checked)} /></td>
                <td>{album.coverImage && <img src={album.coverImage} alt={album.title} className={styles.coverImage}/>}</td>
                <td><input type="text" value={album.title || ''} onBlur={e => handleFieldUpdate(album.id, 'title', e.target.value)} onChange={e => {}} className={styles.inlineInput}/></td>
                <td><input type="text" value={album.description || ''} onBlur={e => handleFieldUpdate(album.id, 'description', e.target.value)} onChange={e => {}} className={styles.inlineInput}/></td>
                <td><input type="text" value={album.caption || ''} onBlur={e => handleFieldUpdate(album.id, 'caption', e.target.value)} onChange={e => {}} className={styles.inlineInput}/></td>
                <td>{album.mediaCount}</td>
                <td>{album.status}</td>
                <td>{album.tagNames.map(tag => <span key={tag.id} className={styles.tag}>{tag.name}</span>)}</td>
                <td>{album.createdAt ? new Date(album.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td className={styles.actions}>
                  <Link href={`/admin/album-admin/${album.id}/edit`} className={styles.actionButton}>Edit</Link>
                  <Link href={`/view/album-view/${album.id}`} className={styles.actionButton}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       {hasMore && (
        <div className={styles.loadMoreContainer}>
            <button onClick={loadMore} disabled={loadingMore} className={styles.loadMoreButton}>
                {loadingMore ? 'Loading...' : 'Load More Albums'}
            </button>
        </div>
      )}
    </div>
  );
} 
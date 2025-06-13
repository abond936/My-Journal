'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getTags } from '@/lib/services/tagService';
import { getAlbums } from '@/lib/services/albumService';
import { Album } from '@/lib/types/album';
import { PhotoMetadata } from '@/lib/types/photo';
import { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/album-admin/album-admin.module.css';
import PhotoPicker from '@/components/common/PhotoPicker';
import Link from 'next/link';
import AlbumForm from '@/components/admin/album-admin/AlbumForm';
import Modal from '@/components/common/Modal';

interface AlbumWithStats extends Album {
  tagNames: { id: string; name: string }[];
}

const dimensions: Tag['dimension'][] = ['who', 'what', 'when', 'where', 'reflection'];

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

const buildTagTree = (tags: Tag[]): TagWithChildren[] => {
  const tagMap = new Map<string, TagWithChildren>();
  const rootTags: TagWithChildren[] = [];

  tags.forEach(tag => {
    tagMap.set(tag.id, { ...tag, children: [] });
  });

  tags.forEach(tag => {
    const tagWithChildren = tagMap.get(tag.id)!;
    if (tag.parentId) {
      const parent = tagMap.get(tag.parentId);
      if (parent) {
        parent.children.push(tagWithChildren);
      }
    } else {
      rootTags.push(tagWithChildren);
    }
  });

  return rootTags;
};

const renderTagOption = (tag: TagWithChildren, level: number = 0) => {
  const padding = level * 10;
  return (
    <>
      <option 
        value={tag.id}
        style={{ paddingLeft: `${padding}px` }}
      >
        {'—'.repeat(level)} {tag.name}
      </option>
      {tag.children.map(child => renderTagOption(child, level + 1))}
    </>
  );
};

export default function AdminAlbumsPage() {
  const [albums, setAlbums] = useState<AlbumWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'published'>('all');

  const tagTrees = useMemo(() => {
    const trees: Record<Tag['dimension'], TagWithChildren[]> = {
      who: [],
      what: [],
      when: [],
      where: [],
      reflection: []
    };

    dimensions.forEach(dimension => {
      const dimensionTags = tags.filter(tag => tag.dimension === dimension);
      trees[dimension] = buildTagTree(dimensionTags);
    });

    return trees;
  }, [tags]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [albumsResponse, allTags] = await Promise.all([
        getAlbums(),
        getTags()
      ]);

      if (!albumsResponse || !albumsResponse.items) {
        throw new Error('Failed to fetch albums or albums response is malformed.');
      }
      
      const allAlbums = albumsResponse.items;

      const albumsWithStats = allAlbums.map(album => ({
        ...album,
        tagNames: (album.tags || [])
          .map(tagId => {
            const tag = allTags.find(t => t.id === tagId);
            if (!tag) {
              console.warn(`Tag with ID ${tagId} not found for album ${album.id}`);
              return null;
            }
            return {
              id: tag.id,
              name: tag.name
            };
          })
          .filter((tag): tag is { id: string; name: string } => tag !== null)
      }));

      setAlbums(albumsWithStats);
      setTags(allTags);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFieldUpdate = async (albumId: string, field: keyof Album, value: any) => {
    // Optimistic UI Update
    setAlbums(prevAlbums => 
      prevAlbums.map(a => 
        a.id === albumId 
          ? { ...a, [field]: value }
          : a
      )
    );

    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update album');
      }
      // Data is saved, no need to do anything else on success
    } catch (error) {
      console.error(`Error updating album field ${field}:`, error);
      // Revert optimistic update on error by reloading all data
      loadData(); 
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAlbums(new Set(filteredAlbums.map(album => album.id)));
    } else {
      setSelectedAlbums(new Set());
    }
  };

  const handleSelectAlbum = (albumId: string, checked: boolean) => {
    const newSelected = new Set(selectedAlbums);
    if (checked) {
      newSelected.add(albumId);
    } else {
      newSelected.delete(albumId);
    }
    setSelectedAlbums(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedAlbums.size} albums? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const deletePromises = Array.from(selectedAlbums).map(albumId =>
        fetch(`/api/albums/${albumId}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      await loadData();
      setSelectedAlbums(new Set());
    } catch (error) {
      console.error('Error deleting albums:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete albums');
    } finally {
      setLoading(false);
    }
  };

  const filteredAlbums = albums.filter(album => {
    const matchesStatus = status === 'all' || album.status === status;

    const searchLower = searchTerm.toLowerCase();
    let matchesSearch = searchTerm === ''; // If search is empty, it's a match
    if (!matchesSearch) {
        matchesSearch = (album.title && album.title.toLowerCase().includes(searchLower)) ||
                        (album.description && album.description.toLowerCase().includes(searchLower)) || false;
    }
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: albums.length,
    published: albums.filter(a => a.status === 'published').length,
    drafts: albums.filter(a => a.status === 'draft').length,
    totalMedia: albums.reduce((sum, album) => sum + (album.mediaCount || 0), 0)
  };

  const handleBulkStatusUpdate = async (newStatus: 'draft' | 'published') => {
    if (!confirm(`Are you sure you want to update ${selectedAlbums.size} albums to ${newStatus}?`)) {
      return;
    }

    try {
      const updatePromises = Array.from(selectedAlbums).map(albumId =>
        handleFieldUpdate(albumId, 'status', newStatus)
      );
      await Promise.all(updatePromises);
      await loadData();
    } catch (error) {
      console.error('Error updating bulk status:', error);
    }
  };

  const handleBulkTagUpdate = async (dimension: Tag['dimension'], tagId: string | null) => {
    if (!tagId) return;

    if (!confirm(`Are you sure you want to update tags for ${selectedAlbums.size} albums?`)) {
      return;
    }

    try {
      const updatePromises = Array.from(selectedAlbums).map(albumId => {
        const album = albums.find(a => a.id === albumId);
        if (!album) return Promise.resolve();
        
        const otherDimensionTags = album.tags.filter(tId => {
          const tag = tags.find(t => t.id === tId);
          return tag && tag.dimension !== dimension;
        });
        
        const newTags = [...otherDimensionTags, tagId];
        return handleFieldUpdate(albumId, 'tags', newTags);
      });
      await Promise.all(updatePromises);
      await loadData();
    } catch (error) {
      console.error('Error updating bulk tags:', error);
    }
  };

  const handleDeleteAlbum = async (albumId: string, albumTitle: string) => {
    if (!confirm(`Are you sure you want to delete the album "${albumTitle}"? This cannot be undone.`)) {
      return;
    }
    try {
      await fetch(`/api/albums/${albumId}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error(`Error deleting album ${albumId}:`, error);
    }
  };

  if (loading) return <div className={styles.loading}>Loading albums...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Albums Management</h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total:</span>
              <span className={styles.statValue}>{stats.total}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Published:</span>
              <span className={styles.statValue}>{stats.published}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Drafts:</span>
              <span className={styles.statValue}>{stats.drafts}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Media:</span>
              <span className={styles.statValue}>{stats.totalMedia}</span>
            </div>
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
            <button
              onClick={handleBulkDelete}
              className={styles.deleteButton}
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {selectedAlbums.size > 0 && (
        <div className={styles.bulkTagActions}>
          <div className={styles.dimensionFilters}>
            {dimensions.map(dimension => (
              <select
                key={dimension}
                onChange={e => handleBulkTagUpdate(dimension, e.target.value || null)}
                className={styles.dimensionSelect}
              >
                <option value="">Update {dimension}</option>
                {tagTrees[dimension].map(tag => renderTagOption(tag))}
              </select>
            ))}
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.albumsTable}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedAlbums.size === filteredAlbums.length}
                  onChange={e => handleSelectAll(e.target.checked)}
                />
              </th>
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
            {filteredAlbums.map(album => (
              <tr key={album.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedAlbums.has(album.id)}
                    onChange={(e) => handleSelectAlbum(album.id, e.target.checked)}
                  />
                </td>
                <td>
                  {album.coverImage && (
                    <img
                      src={album.coverImage}
                      alt={album.title}
                      className={styles.coverImage}
                    />
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    value={album.title || ''}
                    onBlur={(e) => handleFieldUpdate(album.id, 'title', e.target.value)}
                    onChange={(e) => setAlbums(albums.map(a => a.id === album.id ? { ...a, title: e.target.value } : a))}
                    className={styles.inlineInput}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={album.description || ''}
                    onBlur={(e) => handleFieldUpdate(album.id, 'description', e.target.value)}
                    onChange={(e) => setAlbums(albums.map(a => a.id === album.id ? { ...a, description: e.target.value } : a))}
                    className={styles.inlineInput}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={album.caption || ''}
                    onBlur={(e) => handleFieldUpdate(album.id, 'caption', e.target.value)}
                    onChange={(e) => setAlbums(albums.map(a => a.id === album.id ? { ...a, caption: e.target.value } : a))}
                    className={styles.inlineInput}
                  />
                </td>
                <td>{album.mediaCount}</td>
                <td>{album.status}</td>
                <td>
                  {album.tagNames.map(tag => (
                    <span key={tag.id} className={styles.tag}>{tag.name}</span>
                  ))}
                </td>
                <td>{album.createdAt ? new Date(album.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td className={styles.actions}>
                  <Link href={`/admin/album-admin/${album.id}/edit`} className={styles.actionButton}>Edit</Link>
                  <Link href={`/albums/${album.id}`} className={styles.actionButton}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
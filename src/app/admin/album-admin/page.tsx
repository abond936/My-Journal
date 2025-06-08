'use client';

import { useState, useEffect, useMemo } from 'react';
// import { getAllAlbums, deleteAlbum, updateAlbum } from '@/lib/services/albumService';
// import { getTags } from '@/lib/services/tagService';
import { Album } from '@/lib/types/album';
import { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/album-admin/album-admin.module.css';

interface AlbumWithStats extends Album {
  tagNames: { id: string; name: string }[];
}

interface EditingField {
  id: string;
  field: 'title' | 'status';
}

const dimensions: Tag['dimension'][] = ['who', 'what', 'when', 'where', 'reflection'];

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

const buildTagTree = (tags: Tag[]): TagWithChildren[] => {
  const tagMap = new Map<string, TagWithChildren>();
  const rootTags: TagWithChildren[] = [];

  // First pass: create all tag objects with empty children arrays
  tags.forEach(tag => {
    tagMap.set(tag.id, { ...tag, children: [] });
  });

  // Second pass: build the tree structure
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
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editValue, setEditValue] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allAlbums, allTags] = await Promise.all([
        Promise.resolve([]),  // TODO: Replace with actual data
        Promise.resolve([])  // TODO: Replace with actual data
      ]);

      // Add tag names to albums
      const albumsWithStats = allAlbums.map(album => ({
        ...album,
        tagNames: album.tags
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
      await Promise.all(
        Array.from(selectedAlbums).map(albumId => deleteAlbum(albumId))
      );
      await loadData();
      setSelectedAlbums(new Set());
    } catch (error) {
      console.error('Error deleting albums:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete albums');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (albumId: string, field: EditingField['field'], value: string) => {
    setEditingField({ id: albumId, field });
    setEditValue(value);
  };

  const handleEditSave = async () => {
    if (!editingField) return;

    try {
      const album = albums.find(a => a.id === editingField.id);
      if (!album) return;

      const updates: Partial<Album> = {};
      if (editingField.field === 'title') {
        updates.title = editValue;
      } else if (editingField.field === 'status') {
        updates.status = editValue as 'draft' | 'published';
      }

      await updateAlbum(editingField.id, updates);
      
      // Update local state instead of reloading
      setAlbums(prevAlbums => 
        prevAlbums.map(a => 
          a.id === editingField.id 
            ? { ...a, ...updates }
            : a
        )
      );

      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating album:', error);
      setError(error instanceof Error ? error.message : 'Failed to update album');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEditSave();
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const filteredAlbums = albums.filter(album => {
    const matchesSearch = album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         album.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = status === 'all' || album.status === status;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: albums.length,
    published: albums.filter(a => a.status === 'published').length,
    drafts: albums.filter(a => a.status === 'draft').length,
    totalMedia: albums.reduce((sum, album) => sum + album.mediaCount, 0)
  };

  const handleBulkStatusUpdate = async (newStatus: 'draft' | 'published') => {
    if (!confirm(`Are you sure you want to update ${selectedAlbums.size} albums to ${newStatus}?`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedAlbums).map(albumId => 
          updateAlbum(albumId, { status: newStatus })
        )
      );
      await loadData();
    } catch (error) {
      console.error('Error updating albums:', error);
      setError(error instanceof Error ? error.message : 'Failed to update albums');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTagUpdate = async (dimension: Tag['dimension'], tagId: string | null) => {
    if (!confirm(`Are you sure you want to update tags for ${selectedAlbums.size} albums?`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedAlbums).map(async albumId => {
          const album = albums.find(a => a.id === albumId);
          if (!album) return;

          // Remove any existing tags from this dimension
          const existingTags = album.tags.filter(tagId => {
            const tag = tags.find(t => t.id === tagId);
            return tag?.dimension !== dimension;
          });

          // Add the new tag if one is selected
          const newTags = tagId ? [...existingTags, tagId] : existingTags;

          await updateAlbum(albumId, { tags: newTags });
        })
      );
      await loadData();
    } catch (error) {
      console.error('Error updating tags:', error);
      setError(error instanceof Error ? error.message : 'Failed to update tags');
    } finally {
      setLoading(false);
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
              <th>Media</th>
              <th>Status</th>
              <th>Tags</th>
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
                    onChange={e => handleSelectAlbum(album.id, e.target.checked)}
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
                  {editingField?.id === album.id && editingField.field === 'title' ? (
                    <form onSubmit={handleEditSubmit} className={styles.editingField}>
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.editButtons}>
                        <button type="submit" className={styles.saveButton}>Save</button>
                        <button type="button" onClick={handleEditCancel} className={styles.cancelButton}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div 
                      className={styles.editableField}
                      onClick={() => startEditing(album.id, 'title', album.title)}
                    >
                      {album.title}
                    </div>
                  )}
                </td>
                <td>{album.mediaCount}</td>
                <td>
                  {editingField?.id === album.id && editingField.field === 'status' ? (
                    <form onSubmit={handleEditSubmit} className={styles.editingField}>
                      <select
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                      <div className={styles.editButtons}>
                        <button type="submit" className={styles.saveButton}>Save</button>
                        <button type="button" onClick={handleEditCancel} className={styles.cancelButton}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div 
                      className={styles.editableField}
                      onClick={() => startEditing(album.id, 'status', album.status)}
                    >
                      {album.status}
                    </div>
                  )}
                </td>
                <td>
                  <div className={styles.tags}>
                    {album.tagNames.map((tag, index) => (
                      <span 
                        key={`${album.id}-${tag.id}-${index}`} 
                        className={styles.tag}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editButton}>Edit</button>
                    <button className={styles.deleteButton}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
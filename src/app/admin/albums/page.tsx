'use client';

import { useState, useEffect } from 'react';
import { getAllAlbums, deleteAlbum, updateAlbum } from '@/lib/services/albumService';
import { getTags } from '@/lib/services/tagService';
import { Album } from '@/lib/types/album';
import { Tag } from '@/lib/types/tag';
import styles from '@/styles/pages/admin/albums.module.css';

interface AlbumWithStats extends Album {
  tagNames: string[];
}

interface EditingField {
  id: string;
  field: 'title' | 'status';
}

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allAlbums, allTags] = await Promise.all([
        getAllAlbums(),
        getTags()
      ]);

      // Add tag names to albums
      const albumsWithStats = allAlbums.map(album => ({
        ...album,
        tagNames: album.tags.map(tagId => 
          allTags.find(tag => tag.id === tagId)?.name || 'Unknown Tag'
        )
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

  if (loading) return <div className={styles.loading}>Loading albums...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.albumsPage}>
      <div className={styles.header}>
        <h1>Albums Management</h1>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Albums</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Published</span>
            <span className={styles.statValue}>{stats.published}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Drafts</span>
            <span className={styles.statValue}>{stats.drafts}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Media</span>
            <span className={styles.statValue}>{stats.totalMedia}</span>
          </div>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search albums..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
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

      {selectedAlbums.size > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedAlbums.size} albums selected</span>
          <button
            onClick={handleBulkDelete}
            className={styles.deleteButton}
          >
            Delete Selected
          </button>
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
                  <div className={styles.coverImage}>
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} />
                    ) : (
                      <div className={styles.placeholderImage}>No Image</div>
                    )}
                  </div>
                </td>
                <td>
                  {editingField?.id === album.id && editingField.field === 'title' ? (
                    <form onSubmit={handleEditSubmit} className={styles.editField}>
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className={styles.editInput}
                        autoFocus
                      />
                      <div className={styles.editActions}>
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
                    <form onSubmit={handleEditSubmit} className={styles.editField}>
                      <select
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className={styles.editSelect}
                        autoFocus
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                      <div className={styles.editActions}>
                        <button type="submit" className={styles.saveButton}>Save</button>
                        <button type="button" onClick={handleEditCancel} className={styles.cancelButton}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div 
                      className={`${styles.editableField} ${styles[album.status]}`}
                      onClick={() => startEditing(album.id, 'status', album.status)}
                    >
                      {album.status}
                    </div>
                  )}
                </td>
                <td>
                  <div className={styles.tags}>
                    {album.tagNames.map((tagName, index) => (
                      <span key={index} className={styles.tag}>
                        {tagName}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className={styles.actions}>
                    <a
                      href={`/albums/${album.id}/edit`}
                      className={styles.editButton}
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${album.title}"?`)) {
                          deleteAlbum(album.id).then(loadData);
                        }
                      }}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
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
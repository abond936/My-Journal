'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAllEntries, deleteEntry, updateEntry, getEntries } from '@/lib/services/entryService';
import { getTags } from '@/lib/services/tagService';
import { Entry } from '@/lib/types/entry';
import { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/entry-admin/entry-admin.module.css';
import React from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface EntryWithStats extends Entry {
  tagNames: string[];
}

interface EditingField {
  id: string;
  field: 'title' | 'type' | 'status' | 'date';
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
  const padding = level * 10; // Reduced from 20px to 10px per level
  return (
    <React.Fragment key={tag.id}>
      <option 
        value={tag.id}
        style={{ paddingLeft: `${padding}px` }}
      >
        {'—'.repeat(level)} {tag.name}
      </option>
      {tag.children.map(child => renderTagOption(child, level + 1))}
    </React.Fragment>
  );
};

export default function AdminEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<'all' | 'story' | 'reflection'>('all');
  const [status, setStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [lastDocId, setLastDocId] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTagByDimension, setSelectedTagByDimension] = useState<Record<Tag['dimension'], string | null>>({
    who: null,
    what: null,
    when: null,
    where: null,
    reflection: null
  });

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
  }, [entryType, status, selectedTag]);

  const loadData = async (loadMore: boolean = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      console.log('Starting to load entries...');
      const [entriesResult, allTags] = await Promise.all([
        getEntries({
          limit: 10,
          lastDocId: loadMore ? lastDocId : undefined,
          type: entryType === 'all' ? undefined : entryType,
          status: status === 'all' ? undefined : status,
          tags: selectedTag ? [selectedTag] : undefined
        }),
        getTags()
      ]);
      
      console.log('Entries result:', {
        itemsCount: entriesResult.items.length,
        hasMore: entriesResult.hasMore,
        lastDocId: entriesResult.lastDocId || 'null'
      });
      
      if (entriesResult.items.length > 0) {
        // Map entries to include tag names
        const entriesWithStats = entriesResult.items.map(entry => ({
          ...entry,
          tagNames: (entry.tags || []).map(tagId => 
            allTags.find(tag => tag.id === tagId)?.name || `Unknown Tag (${tagId})`
          )
        }));
        
        console.log('Setting new entries:', entriesWithStats.map(e => ({ id: e.id, title: e.title })));
        setEntries(prev => {
            if (!loadMore) {
                return entriesWithStats; // If not loading more, just replace the list
            }
            // If loading more, filter out any duplicates before appending
            const existingIds = new Set(prev.map(e => e.id));
            const newUniqueEntries = entriesWithStats.filter(e => !existingIds.has(e.id));
            return [...prev, ...newUniqueEntries];
        });
        setTags(allTags);
        setLastDocId(entriesResult.lastDocId);
        setHasMore(entriesResult.hasMore);
      } else {
        console.log('No entries found');
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      setError('Failed to load entries');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(true);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(new Set(entries.map(entry => entry.id)));
    } else {
      setSelectedEntries(new Set());
    }
  };

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    const newSelected = new Set(selectedEntries);
    if (checked) {
      newSelected.add(entryId);
    } else {
      newSelected.delete(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedEntries.size} entries? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedEntries).map(entryId => deleteEntry(entryId))
      );
      await loadData();
      setSelectedEntries(new Set());
    } catch (error) {
      console.error('Error deleting entries:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete entries');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: 'draft' | 'published') => {
    if (!confirm(`Are you sure you want to update ${selectedEntries.size} entries to ${newStatus}?`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedEntries).map(entryId => 
          updateEntry(entryId, { status: newStatus })
        )
      );
      await loadData();
    } catch (error) {
      console.error('Error updating entries:', error);
      setError(error instanceof Error ? error.message : 'Failed to update entries');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTypeUpdate = async (newType: 'story' | 'reflection') => {
    if (!confirm(`Are you sure you want to update ${selectedEntries.size} entries to ${newType}?`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedEntries).map(entryId => 
          updateEntry(entryId, { type: newType })
        )
      );
      await loadData();
    } catch (error) {
      console.error('Error updating entries:', error);
      setError(error instanceof Error ? error.message : 'Failed to update entries');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDateUpdate = async (newDate: string) => {
    if (!confirm(`Are you sure you want to update ${selectedEntries.size} entries to this date?`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedEntries).map(entryId => 
          updateEntry(entryId, { date: new Date(newDate) })
        )
      );
      await loadData();
    } catch (error) {
      console.error('Error updating entries:', error);
      setError(error instanceof Error ? error.message : 'Failed to update entries');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTagUpdate = async (dimension: Tag['dimension'], tagId: string | null) => {
    if (!confirm(`Are you sure you want to update tags for ${selectedEntries.size} entries?`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedEntries).map(async entryId => {
          const entry = entries.find(e => e.id === entryId);
          if (!entry) return;

          // Remove any existing tags from this dimension
          const existingTags = entry.tags.filter(tagId => {
            const tag = tags.find(t => t.id === tagId);
            return tag?.dimension !== dimension;
          });

          // Add the new tag if one is selected
          const newTags = tagId ? [...existingTags, tagId] : existingTags;

          await updateEntry(entryId, { tags: newTags });
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEditSave();
  };

  const handleEditSave = async () => {
    if (!editingField) return;

    try {
      const entry = entries.find(e => e.id === editingField.id);
      if (!entry) return;

      const updates: Partial<Entry> = {};
      if (editingField.field === 'title') {
        updates.title = editValue;
      } else if (editingField.field === 'type') {
        updates.type = editValue as 'story' | 'reflection';
      } else if (editingField.field === 'status') {
        updates.status = editValue as 'draft' | 'published';
      } else if (editingField.field === 'date') {
        updates.date = new Date(editValue);
      }

      await updateEntry(editingField.id, updates);
      
      // Update local state instead of reloading
      setEntries(prevEntries => 
        prevEntries.map(e => 
          e.id === editingField.id 
            ? { ...e, ...updates }
            : e
        )
      );

      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to update entry');
    }
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const startEditing = (entryId: string, field: EditingField['field'], value: string | Date) => {
    setEditingField({ id: entryId, field });
    setEditValue(value instanceof Date ? value.toISOString().split('T')[0] : value);
  };

  const handleEdit = (entryId: string) => {
    router.push(`/admin/entry-admin/${entryId}/edit`);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await deleteEntry(entryId);
      await loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete entry');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = entryType === 'all' || entry.type === entryType;
    const matchesStatus = status === 'all' || entry.status === status;
    
    // Check if entry has all selected tags from each dimension
    const matchesTags = Object.entries(selectedTagByDimension).every(([dimension, tagId]) => {
      if (!tagId) return true; // No tag selected for this dimension
      return entry.tags.includes(tagId);
    });

    return matchesSearch && matchesType && matchesStatus && matchesTags;
  });

  const stats = {
    total: entries.length,
    stories: entries.filter(e => e.type === 'story').length,
    reflections: entries.filter(e => e.type === 'reflection').length,
    drafts: entries.filter(e => e.status === 'draft').length,
    published: entries.filter(e => e.status === 'published').length
  };

  if (loading) return <div className={styles.loading}>Loading entries...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Entries Management</h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total:</span>
              <span className={styles.statValue}>{stats.total}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Stories:</span>
              <span className={styles.statValue}>{stats.stories}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Reflections:</span>
              <span className={styles.statValue}>{stats.reflections}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Drafts:</span>
              <span className={styles.statValue}>{stats.drafts}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Published:</span>
              <span className={styles.statValue}>{stats.published}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.topFilters}>
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchBox}
          />
          <div className={styles.filterControls}>
            <select
              value={entryType}
              onChange={e => setEntryType(e.target.value as typeof entryType)}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="story">Stories</option>
              <option value="reflection">Reflections</option>
            </select>

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

        <div className={styles.dimensionFilters}>
          {dimensions.map(dimension => (
            <select
              key={dimension}
              value={selectedTagByDimension[dimension] || ''}
              onChange={e => setSelectedTagByDimension(prev => ({
                ...prev,
                [dimension]: e.target.value || null
              }))}
              className={styles.dimensionSelect}
            >
              <option value="">All {dimension}</option>
              {tagTrees[dimension].map(tag => renderTagOption(tag))}
            </select>
          ))}
        </div>
      </div>

      {selectedEntries.size > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedEntries.size} entries selected</span>
          <div className={styles.actions}>
            <input
              type="date"
              onChange={e => handleBulkDateUpdate(e.target.value)}
              className={styles.filterSelect}
            />
            <select
              onChange={e => handleBulkTypeUpdate(e.target.value as 'story' | 'reflection')}
              className={styles.filterSelect}
            >
              <option value="">Update Type</option>
              <option value="story">Set to Story</option>
              <option value="reflection">Set to Reflection</option>
            </select>
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

      {selectedEntries.size > 0 && (
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
        <table className={styles.entriesTable}>
          <thead>
            <tr>
              <th><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} /></th>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map(entry => (
              <tr key={entry.id}>
                <td><input type="checkbox" checked={selectedEntries.has(entry.id)} onChange={e => handleSelectEntry(entry.id, e.target.checked)} /></td>
                <td className={styles.tableCellTitle}>
                  {editingField?.id === entry.id && editingField.field === 'title' ? (
                    <form onSubmit={handleEditSubmit} className={styles.editForm}>
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus onBlur={handleEditSave} />
                    </form>
                  ) : (
                    <span onClick={() => startEditing(entry.id, 'title', entry.title)}>{entry.title}</span>
                  )}
                </td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'type' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleEditSave} autoFocus>
                      <option value="story">Story</option>
                      <option value="reflection">Reflection</option>
                    </select>
                  ) : (
                    <span onClick={() => startEditing(entry.id, 'type', entry.type)}>{entry.type}</span>
                  )}
                </td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'status' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleEditSave} autoFocus>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  ) : (
                    <span onClick={() => startEditing(entry.id, 'status', entry.status)}>{entry.status}</span>
                  )}
                </td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'date' ? (
                    <input type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleEditSave} autoFocus />
                  ) : (
                    <span onClick={() => startEditing(entry.id, 'date', entry.date || new Date())}>
                      {entry.date ? new Date(entry.date).toLocaleDateString() : 'No date'}
                    </span>
                  )}
                </td>
                <td>
                  <div className={styles.tagContainer}>
                    {entry.tagNames.map((tagName, index) => (
                      <span key={index} className={styles.tag}>{tagName}</span>
                    ))}
                  </div>
                </td>
                <td className={styles.actions}>
                  <Link href={`/admin/entry-admin/${entry.id}/edit`} className={styles.actionButton}>Edit</Link>
                  <button onClick={() => handleDelete(entry.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>Delete</button>
                  <Link href={`/entries/${entry.id}`} className={styles.actionButton}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loadingMore && <div className={styles.loading}>Loading more entries...</div>}
      {!loading && hasMore && (
        <div className={styles.loadMoreContainer}>
          <button onClick={handleLoadMore} className={styles.loadMoreButton}>Load More</button>
        </div>
      )}
    </div>
  );
} 
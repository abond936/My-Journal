'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAllEntries, deleteEntry, updateEntry } from '@/lib/services/entryService';
import { getTags } from '@/lib/services/tagService';
import { Entry } from '@/lib/types/entry';
import { Tag } from '@/lib/types/tag';
import styles from '@/styles/pages/admin/entries.module.css';

interface EntryWithStats extends Entry {
  tagNames: string[];
}

interface EditingField {
  id: string;
  field: 'title' | 'type' | 'status';
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
  const padding = level * 20; // 20px per level
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

export default function AdminEntriesPage() {
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
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allEntries, allTags] = await Promise.all([
        getAllEntries(),
        getTags()
      ]);

      // Add tag names to entries
      const entriesWithStats = allEntries.map(entry => ({
        ...entry,
        tagNames: entry.tags.map(tagId => 
          allTags.find(tag => tag.id === tagId)?.name || 'Unknown Tag'
        )
      }));

      setEntries(entriesWithStats);
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
      setSelectedEntries(new Set(filteredEntries.map(entry => entry.id)));
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

  const startEditing = (entryId: string, field: EditingField['field'], value: string) => {
    setEditingField({ id: entryId, field });
    setEditValue(value);
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
    <div className={styles.entriesPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Entries Management</h1>
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

      <div className={styles.filters}>
        <div className={`${styles.filterRow} ${styles.top}`}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.typeStatusGroup}>
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

        <div className={`${styles.filterRow} ${styles.bottom}`}>
          <div className={styles.tagFilters}>
            {dimensions.map(dimension => (
              <div key={dimension} className={styles.tagFilter}>
                <select
                  value={selectedTagByDimension[dimension] || ''}
                  onChange={e => setSelectedTagByDimension(prev => ({
                    ...prev,
                    [dimension]: e.target.value || null
                  }))}
                >
                  <option value="">All {dimension}</option>
                  {tagTrees[dimension].map(tag => renderTagOption(tag))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedEntries.size > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedEntries.size} entries selected</span>
          <div className={styles.bulkButtons}>
            <select
              onChange={e => handleBulkStatusUpdate(e.target.value as 'draft' | 'published')}
              className={styles.bulkSelect}
            >
              <option value="">Update Status</option>
              <option value="draft">Set to Draft</option>
              <option value="published">Set to Published</option>
            </select>
            <select
              onChange={e => handleBulkTypeUpdate(e.target.value as 'story' | 'reflection')}
              className={styles.bulkSelect}
            >
              <option value="">Update Type</option>
              <option value="story">Set to Story</option>
              <option value="reflection">Set to Reflection</option>
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

      <div className={styles.tableContainer}>
        <table className={styles.entriesTable}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedEntries.size === filteredEntries.length}
                  onChange={e => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>Title</th>
              <th>Date</th>
              <th>Type</th>
              <th>Status</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map(entry => (
              <tr key={entry.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedEntries.has(entry.id)}
                    onChange={e => handleSelectEntry(entry.id, e.target.checked)}
                  />
                </td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'title' ? (
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
                      onClick={() => startEditing(entry.id, 'title', entry.title)}
                    >
                      {entry.title}
                    </div>
                  )}
                </td>
                <td>{new Date(entry.date).toLocaleDateString()}</td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'type' ? (
                    <form onSubmit={handleEditSubmit} className={styles.editField}>
                      <select
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className={styles.editSelect}
                        autoFocus
                      >
                        <option value="story">Story</option>
                        <option value="reflection">Reflection</option>
                      </select>
                      <div className={styles.editActions}>
                        <button type="submit" className={styles.saveButton}>Save</button>
                        <button type="button" onClick={handleEditCancel} className={styles.cancelButton}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div 
                      className={styles.editableField}
                      onClick={() => startEditing(entry.id, 'type', entry.type)}
                    >
                      {entry.type}
                    </div>
                  )}
                </td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'status' ? (
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
                      className={`${styles.editableField} ${styles[entry.status]}`}
                      onClick={() => startEditing(entry.id, 'status', entry.status)}
                    >
                      {entry.status}
                    </div>
                  )}
                </td>
                <td>
                  <div className={styles.tags}>
                    {entry.tagNames.map((tagName, index) => (
                      <span key={index} className={styles.tag}>
                        {tagName}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className={styles.actions}>
                    <a
                      href={`/entries/${entry.id}/edit`}
                      className={styles.editButton}
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${entry.title}"?`)) {
                          deleteEntry(entry.id).then(loadData);
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
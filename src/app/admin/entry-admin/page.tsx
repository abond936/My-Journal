'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTag } from '@/components/providers/TagProvider';
import { Entry, FilterableEntryType } from '@/lib/types/entry';
import { PaginatedResult } from '@/lib/types/services';
import { Tag } from '@/lib/types/tag';
import { updateEntry } from '@/lib/services/entryService';
import styles from './entry-admin.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import useSWR from 'swr';

interface EntryWithStats extends Entry {
  tagNames: string[];
  hasUnknownTags: boolean;
}

interface EditingField {
  id: string;
  field: 'title' | 'type' | 'status' | 'date';
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

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminEntriesPage() {
  const router = useRouter();

  // --- Start: New Self-Contained Logic ---
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localEntryType, setLocalEntryType] = useState<FilterableEntryType>('all');
  const [localStatus, setLocalStatus] = useState<Entry['status'] | 'all'>('all');

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', '50'); // Admin pages can show more items
    if (localSearchTerm) params.set('q', localSearchTerm);
    if (localEntryType !== 'all') params.set('type', localEntryType);
    if (localStatus !== 'all') params.set('status', localStatus);
    return `/api/entries?${params.toString()}`;
  }, [localSearchTerm, localEntryType, localStatus]);

  const { data: swrData, error: swrError, isLoading: swrIsLoading, mutate } = useSWR<PaginatedResult<Entry>>(buildUrl(), fetcher);
  // --- End: New Self-Contained Logic ---

  const { tags, tagsByDimension } = useTag();

  // Local UI state
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const entries = useMemo(() => swrData?.items || [], [swrData]);

  const entriesWithTagNames = useMemo((): EntryWithStats[] => {
    const tagMap = new Map(tags.map(t => [t.id, t.name]));
    return entries.map(entry => {
      let hasUnknown = false;
      const tagNames = (entry.tags || []).map(tagId => {
        const name = tagMap.get(tagId);
        if (!name) {
          hasUnknown = true;
          return `Unknown Tag`;
        }
        return name;
      });
      return {
        ...entry,
        tagNames: tagNames,
        hasUnknownTags: hasUnknown,
      }
    });
  }, [entries, tags]);
  
  // --- Event Handlers ---

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(new Set(entries.map(entry => entry.id)));
    } else {
      setSelectedEntries(new Set());
    }
  };

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    const newSelected = new Set(selectedEntries);
    if (checked) newSelected.add(entryId);
    else newSelected.delete(entryId);
    setSelectedEntries(newSelected);
  };
  
  // --- Bulk Actions ---

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedEntries.size} entries?`)) return;
    try {
      await Promise.all(Array.from(selectedEntries).map(id => fetch(`/api/entries/${id}`, { method: 'DELETE' })));
      mutate();
      setSelectedEntries(new Set());
    } catch (err) {
      console.error('Error deleting entries:', err);
    }
  };

  const handleBulkUpdate = async (field: keyof Entry, value: any, confirmMessage: string) => {
    if (!confirm(confirmMessage)) return;
    try {
      await Promise.all(
        Array.from(selectedEntries).map(id => updateEntry(id, { [field]: value }))
      );
      mutate();
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
    }
  };
  
  const handleBulkTagUpdate = async (dimension: Tag['dimension'], tagId: string | null) => {
    if (!tagId || !confirm(`Update tags for ${selectedEntries.size} entries?`)) return;
    try {
      await Promise.all(Array.from(selectedEntries).map(async entryId => {
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;
        const otherDimensionTags = (entry.tags || []).filter(tId => {
          const tag = tags.find(t => t.id === tId);
          return tag?.dimension !== dimension;
        });
        const newTags = [...otherDimensionTags, tagId];
        await updateEntry(entryId, { tags: newTags });
      }));
      mutate();
    } catch (err) {
      console.error('Error updating bulk tags:', err);
    }
  };

  // --- Inline Editing ---

  const startEditing = (entryId: string, field: EditingField['field'], value: string | Date) => {
    setEditingField({ id: entryId, field });
    setEditValue(value instanceof Date ? value.toISOString().split('T')[0] : value);
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };
  
  const handleEditSave = async () => {
    if (!editingField) return;
    try {
      await updateEntry(editingField.id, { [editingField.field]: editValue });
      mutate();
      handleEditCancel();
    } catch (err) {
      console.error('Error updating entry:', err);
    }
  };
  
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEditSave();
  };

  const stats = useMemo(() => ({
    total: entries.length,
    stories: entries.filter(e => e.type === 'story').length,
    reflections: entries.filter(e => e.type === 'reflection').length,
    drafts: entries.filter(e => e.status === 'draft').length,
    published: entries.filter(e => e.status === 'published').length
  }), [entries]);

  if (swrIsLoading) return <LoadingSpinner />;
  if (swrError) return <div className={styles.error}>{swrError.message || 'Failed to load entries.'}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Entries Management</h1>
          <div className={styles.stats}>
             <div className={styles.statItem}>Total: <span className={styles.statValue}>{stats.total}</span></div>
             <div className={styles.statItem}>Stories: <span className={styles.statValue}>{stats.stories}</span></div>
             <div className={styles.statItem}>Reflections: <span className={styles.statValue}>{stats.reflections}</span></div>
             <div className={styles.statItem}>Drafts: <span className={styles.statValue}>{stats.drafts}</span></div>
             <div className={styles.statItem}>Published: <span className={styles.statValue}>{stats.published}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.topFilters}>
          <input
            type="text"
            placeholder="Search entries..."
            value={localSearchTerm}
            onChange={e => setLocalSearchTerm(e.target.value)}
            className={styles.searchBox}
          />
          <div className={styles.filterControls}>
             <select
              value={localEntryType}
              onChange={e => setLocalEntryType(e.target.value as FilterableEntryType)}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="story">Story</option>
              <option value="reflection">Reflection</option>
              <option value="qa">Q&A</option>
              <option value="quote">Quote</option>
              <option value="callout">Callout</option>
            </select>
            <select
              value={localStatus}
              onChange={e => setLocalStatus(e.target.value as typeof localStatus)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>

      {selectedEntries.size > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedEntries.size} entries selected</span>
          <div className={styles.actions}>
            <input type="date" onChange={e => handleBulkUpdate('date', e.target.value, `Update date for ${selectedEntries.size} entries?`)} className={styles.filterSelect} />
            <select onChange={e => handleBulkUpdate('type', e.target.value, `Update type for ${selectedEntries.size} entries?`)} className={styles.filterSelect}>
              <option value="">Update Type</option>
              <option value="story">Set to Story</option>
              <option value="reflection">Set to Reflection</option>
            </select>
            <select onChange={e => handleBulkUpdate('status', e.target.value, `Update status for ${selectedEntries.size} entries?`)} className={styles.filterSelect}>
              <option value="">Update Status</option>
              <option value="draft">Set to Draft</option>
              <option value="published">Set to Published</option>
            </select>
            <button onClick={handleBulkDelete} className={styles.deleteButton}>Delete Selected</button>
          </div>
        </div>
      )}

      {selectedEntries.size > 0 && (
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
              <select key={dimension} onChange={e => handleBulkTagUpdate(dimension, e.target.value || null)} className={styles.dimensionSelect}>
                <option value="">Update {dimension}</option>
                {buildTree(tagsForDimension).map(tag => renderTagOption(tag))}
              </select>
            )})}
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.entriesTable}>
          <thead>
            <tr>
              <th><input type="checkbox" checked={selectedEntries.size > 0 && selectedEntries.size === entries.length} onChange={e => handleSelectAll(e.target.checked)} /></th>
              <th>Title</th>
              <th>Date</th>
              <th>Type</th>
              <th>Status</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entriesWithTagNames.map(entry => (
              <tr key={entry.id}>
                <td><input type="checkbox" checked={selectedEntries.has(entry.id)} onChange={e => handleSelectEntry(entry.id, e.target.checked)} /></td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'title' ? (
                    <form onSubmit={handleEditSubmit} className={styles.editingField}>
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onBlur={handleEditSave}/>
                    </form>
                  ) : (
                    <div className={styles.editableField} onClick={() => startEditing(entry.id, 'title', entry.title)}>
                      {entry.hasUnknownTags && <span className={styles.errorDot} title="Contains unknown tags">•</span>}
                      {entry.title}
                    </div>
                  )}
                </td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'date' ? (
                     <form onSubmit={handleEditSubmit} className={styles.editingField}>
                      <input type="date" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onBlur={handleEditSave}/>
                    </form>
                  ) : (
                    <div className={styles.editableField} onClick={() => startEditing(entry.id, 'date', entry.date)}>{new Date(entry.date).toLocaleDateString()}</div>
                  )}
                </td>
                <td>
                   {editingField?.id === entry.id && editingField.field === 'type' ? (
                    <form onSubmit={handleEditSubmit} className={styles.editingField}>
                      <select value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onBlur={handleEditSave}>
                        <option value="story">Story</option>
                        <option value="reflection">Reflection</option>
                      </select>
                    </form>
                  ) : (
                    <div className={styles.editableField} onClick={() => startEditing(entry.id, 'type', entry.type)}>{entry.type}</div>
                  )}
                </td>
                <td>
                  {editingField?.id === entry.id && editingField.field === 'status' ? (
                     <form onSubmit={handleEditSubmit} className={styles.editingField}>
                      <select value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onBlur={handleEditSave}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </form>
                  ) : (
                    <div className={styles.editableField} onClick={() => startEditing(entry.id, 'status', entry.status)}>{entry.status}</div>
                  )}
                </td>
                <td><div className={styles.tags}>{entry.tagNames.map((tagName, index) => (<span key={`${entry.id}-${tagName}-${index}`} className={styles.tag}>{tagName}</span>))}</div></td>
                <td><div className={styles.actions}><Link href={`/admin/entry-admin/${entry.id}/edit`} className={styles.editButton}>Edit</Link></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEntry, updateEntry } from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';
import styles from '@/app/admin/entry-admin/entry-admin.module.css';
import React from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useContentContext } from '@/components/providers/ContentProvider';
import { useTag } from '@/components/providers/TagProvider';
import ContentTypeFilter from '@/components/view/ContentTypeFilter';

interface EntryWithStats extends Entry {
  tagNames: string[];
}

interface EditingField {
  id: string;
  field: 'title' | 'type' | 'status' | 'date';
}

const SCROLL_POSITION_KEY = 'admin_entries_scroll_position';

// Custom hook for scroll restoration
function useScrollRestoration(key: string) {
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(key);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }
  }, [key]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem(key, window.scrollY.toString());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sessionStorage.setItem(key, window.scrollY.toString());
    };
  }, [key]);
}

// IntersectionObserver Hook
function useIntersectionObserver(callback: () => void, options?: IntersectionObserverInit) {
  const observer = useRef<IntersectionObserver | null>(null);
  const ref = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback();
    }, options);
    if (node) observer.current.observe(node);
  }, [callback, options]);
  return ref;
}

export default function AdminEntriesPage() {
  const router = useRouter();
  const {
    content: entries,
    isLoading: loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    mutate,
    contentType,
    setContentType
  } = useContentContext();

  const { tags: allTags } = useTag();
  const tagMap = useMemo(() => new Map(allTags.map(tag => [tag.id, tag.name])), [allTags]);

  const entriesWithTagNames = useMemo((): EntryWithStats[] => {
    return entries.map(entry => ({
      ...entry,
      tagNames: (entry.tags || []).map(tagId => tagMap.get(tagId) || `Unknown Tag`)
    }));
  }, [entries, tagMap]);
  
  // Local UI state
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editValue, setEditValue] = useState('');

  useScrollRestoration(SCROLL_POSITION_KEY);

  // Ensure we are always looking at entries
  useEffect(() => {
    if (contentType !== 'entries') {
      setContentType('entries');
    }
  }, [contentType, setContentType]);

  const loadMoreRef = useIntersectionObserver(() => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  }, { rootMargin: '400px' });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(new Set(entriesWithTagNames.map(entry => entry.id)));
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
      await Promise.all(
        Array.from(selectedEntries).map(entryId => deleteEntry(entryId))
      );
      mutate();
      setSelectedEntries(new Set());
    } catch (err) {
      console.error('Error deleting entries:', err);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: 'draft' | 'published') => {
    if (!confirm(`Are you sure you want to update ${selectedEntries.size} entries to ${newStatus}?`)) {
      return;
    }
    try {
      await Promise.all(
        Array.from(selectedEntries).map(entryId =>
          updateEntry(entryId, { status: newStatus })
        )
      );
      mutate();
    } catch (err) {
      console.error('Error updating entries:', err);
    }
  };

  const handleEdit = (entryId: string) => {
    router.push(`/admin/entry-admin/${entryId}/edit`);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }
    try {
      await deleteEntry(entryId);
      mutate();
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };
  
  if (error) return <div>Error loading entries. See console for details.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Entries Management ({entries.length})</h1>
        <div className={styles.headerActions}>
            <Link href="/admin/entry-admin/new" className={styles.newEntryButton}>
                New Entry
            </Link>
        </div>
      </div>
      
      <div className={styles.controls}>
        <ContentTypeFilter />
        {selectedEntries.size > 0 && (
          <div className={styles.bulkActions}>
            <span>{selectedEntries.size} selected:</span>
            <button onClick={handleBulkDelete} className={`${styles.actionButton} ${styles.deleteButton}`}>
              Delete Selected
            </button>
            <button onClick={() => handleBulkStatusUpdate('published')} className={styles.actionButton}>
              Set to Published
            </button>
            <button onClick={() => handleBulkStatusUpdate('draft')} className={styles.actionButton}>
              Set to Draft
            </button>
          </div>
        )}
      </div>

      <div className={styles.tableContainer}>
        {loading && entries.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <table className={styles.entriesTable}>
            <thead>
              <tr>
                <th><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedEntries.size > 0 && selectedEntries.size === entriesWithTagNames.length} /></th>
                <th>Title</th>
                <th>Type</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entriesWithTagNames.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedEntries.has(entry.id)}
                      onChange={e => handleSelectEntry(entry.id, e.target.checked)}
                    />
                  </td>
                  <td className={styles.tableCellTitle}>{entry.title}</td>
                  <td>{entry.type}</td>
                  <td>{(entry.tagNames || []).join(', ')}</td>
                  <td>{entry.status}</td>
                  <td>{new Date(entry.date || entry.createdAt).toLocaleDateString()}</td>
                   <td className={styles.actions}>
                     <button onClick={() => handleEdit(entry.id)} className={styles.actionButton}>Edit</button>
                     <button onClick={() => handleDelete(entry.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>Delete</button>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div ref={loadMoreRef} style={{ height: '50px' }}>
        {loadingMore && <LoadingSpinner />}
      </div>
      {!hasMore && entries.length > 0 && <div className={styles.endOfResults}>End of results</div>}
    </div>
  );
}

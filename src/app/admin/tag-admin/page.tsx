'use client';

import React, { useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTag, TagProvider, TagWithChildren } from '@/components/providers/TagProvider';
import { Tag } from '@/lib/types/tag';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import styles from './tag-admin.module.css';
import { buildTagTree } from '@/lib/utils/tagUtils';

// --- Core UI Logic Hook ---
function useTagManagement() {
  const { tags: swrTags, createTag, updateTag, deleteTag, loading, error: swrError, mutate } = useTag();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The single source of truth for rendering is the confirmed SWR data.
  const tagsToUse = swrTags;

  const dimensionalTree = useMemo(() => {
    if (!tagsToUse || tagsToUse.length === 0) return [];

    const masterTagTree = buildTagTree(tagsToUse);
    
    const dimensions: Record<string, TagWithChildren> = {
      who: { docId: 'dim-who', name: 'Who', children: [] },
      what: { docId: 'dim-what', name: 'What', children: [] },
      when: { docId: 'dim-when', name: 'When', children: [] },
      where: { docId: 'dim-where', name: 'Where', children: [] },
    };
    const uncategorized: TagWithChildren = { docId: 'dim-uncategorized', name: 'Uncategorized', children: [] };

    masterTagTree.forEach(rootNode => {
      if (rootNode.dimension && dimensions[rootNode.dimension]) {
        dimensions[rootNode.dimension].children.push(rootNode);
      } else {
        uncategorized.children.push(rootNode);
      }
    });

    const result = Object.values(dimensions);
    if (uncategorized.children.length > 0) {
      result.push(uncategorized);
    }
    
    return result;
  }, [tagsToUse]);

  const handleReorder = useCallback(async (activeId: string, overId: string, placement: 'before' | 'after') => {
    if (activeId === overId) return;
    setIsSaving(true);
    setError(null);

    const currentTags = swrTags || [];
    
    // Find both tags
    const activeTag = currentTags.find(t => t.docId === activeId);
    const overTag = currentTags.find(t => t.docId === overId);
    
    if (!activeTag || !overTag) {
      console.error('Tags not found:', { activeId, overId });
      return;
    }

    if (activeTag.parentId !== overTag.parentId) {
      console.log('Cannot reorder: tags have different parents');
      return;
    }

    if (!activeTag.parentId && (activeTag.dimension || '') !== (overTag.dimension || '')) {
      console.log('Cannot reorder: root tags are in different dimensions');
      return;
    }

    // Get ALL siblings for this parent (roots are scoped by dimension, not all parentId-less tags)
    const allSiblings = currentTags
      .filter(t => {
        if ((t.parentId || '') !== (activeTag.parentId || '')) return false;
        if (!activeTag.parentId) {
          return (t.dimension || '') === (activeTag.dimension || '');
        }
        return true;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Remove active tag from the array
    const withoutActive = allSiblings.filter(t => t.docId !== activeId);
    
    // Find where to insert the active tag
    const targetIndex = withoutActive.findIndex(t => t.docId === overId);
    const insertAt = placement === 'before' ? targetIndex : targetIndex + 1;

    // Create the new order
    const reordered = [
      ...withoutActive.slice(0, insertAt),
      activeTag,
      ...withoutActive.slice(insertAt)
    ];

    // Assign new orders
    const updates = reordered.map((tag, idx) => ({
      id: tag.docId,
      order: idx * 10
    }));

    try {
      // Update all siblings to maintain consistent spacing
      await Promise.all(updates.map(update => 
        updateTag(update.id, { order: update.order })
      ));
      await mutate();
    } catch (err) {
      console.error('Failed to reorder tags:', err);
      setError('Failed to reorder tags. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [swrTags, updateTag, mutate]);

  const handleReparent = useCallback(async (activeId: string, overId:string) => {
    if (activeId === overId) return;
    setIsSaving(true);
    setError(null);

    try {
        // This is a complex operation that must be handled by a dedicated API route.
        const response = await fetch(`/api/tags/${activeId}/reparent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newParentId: overId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to reparent tag.');
        }
        
        // On success, re-fetch all tag data to ensure the UI is consistent.
        await mutate();

    } catch (err) {
        console.error('Failed to reparent tag:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsSaving(false);
    }
  }, [mutate]);

  return {
    tagTree: dimensionalTree,
    flatTags: tagsToUse,
    loading,
    error: error || swrError,
    isSaving,
    handleCreateTag: createTag,
    handleUpdateTag: updateTag,
    handleDeleteTag: deleteTag,
    handleReorder,
    handleReparent,
  };
}

function AdminTagsPageContent() {
  const {
    tagTree,
    flatTags,
    loading,
    error,
    isSaving,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
    handleReorder,
    handleReparent,
  } = useTagManagement();

  const stickyTopRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      const stickyEl = stickyTopRef.current;
      if (!tabsEl || !stickyEl) return;
      const tabsHeight = tabsEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsHeight}px`);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop} ref={stickyTopRef}>
        <h1 className={styles.pageHeading}>Tag Management</h1>
        <p className={styles.intro}>
          Drag tags by the handle to <strong>reorder</strong> within the same parent. Hold{' '}
          <strong>Shift</strong> while dragging to <strong>reparent</strong> (drop onto the new parent). Use
          the <code>+</code> button to add a child tag.
        </p>
      </div>

      {loading && <p>Loading tags...</p>}
      {error && <p className={styles.error}>{error.toString()}</p>}
      {isSaving && <p>Saving changes...</p>}

      {!loading && !error && (
        <TagAdminList
          tagTree={tagTree}
          onReorder={handleReorder}
          onReparent={handleReparent}
          onCreateTag={handleCreateTag}
          onUpdateTag={handleUpdateTag}
          onDeleteTag={handleDeleteTag}
        />
      )}
    </div>
  );
}

export default function AdminTagsPage() {
  return (
    <TagProvider>
      <AdminTagsPageContent />
    </TagProvider>
  );
}

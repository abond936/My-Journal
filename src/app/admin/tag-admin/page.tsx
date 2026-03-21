'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
      reflection: { docId: 'dim-reflection', name: 'Reflection', children: [] },
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

    // Get ALL siblings for this parent
    const allSiblings = currentTags
      .filter(t => t.parentId === activeTag.parentId)
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

  return (
    <div className={styles.container}>
      <h1>Tag Management</h1>
      <p>Drag and drop to reorder or reparent tags. Use the `+` button to add a child tag.</p>

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

'use client';

import React, { useState, useCallback } from 'react';
import { useTag, TagProvider } from '@/components/providers/TagProvider';
import { Tag } from '@/lib/types/tag';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import styles from './tag-admin.module.css';

// Helper to find a tag and its parent in the tree
const findTagAndParent = (nodes: Tag[], tagId: string, parent: Tag[] | null = null): { tag: Tag; parent: Tag[] | null } | null => {
  for (const node of nodes) {
    if (node.id === tagId) return { tag: node, parent };
    if (node.children) {
      const found = findTagAndParent(node.children, tagId, nodes);
      if (found) return found;
    }
  }
  return null;
};

function useTagManagement() {
  const { dimensionalTree, createTag, updateTag, deleteTag, loading, error, mutate } = useTag();

  const handleReorder = useCallback(async (activeId: string, overId: string | null, placement: 'before' | 'after' | null) => {
    if (!overId || !placement || activeId === overId) return;

    const treeClone = JSON.parse(JSON.stringify(dimensionalTree));

    const activeResult = findTagAndParent(treeClone, activeId);
    const overResult = findTagAndParent(treeClone, overId);
    
    const activeParentId = activeResult?.tag?.parentId ?? null;
    const overParentId = overResult?.tag?.parentId ?? null;

    if (!activeResult || !overResult || activeParentId !== overParentId) {
      console.log("Reorder invalid. Items must share the same parent.");
      return;
    }

    const siblings = overResult.parent ?? treeClone;
    const overIndex = siblings.findIndex(t => t.id === overId);

    let newOrder;

    if (placement === 'before') {
      const prevTag = siblings[overIndex - 1];
      const nextTag = siblings[overIndex];
      const orderPrev = prevTag ? prevTag.order ?? 0 : 0;
      const orderNext = nextTag.order ?? (orderPrev + 2);
      newOrder = (orderPrev + orderNext) / 2;
    } else { // 'after'
      const prevTag = siblings[overIndex];
      const nextTag = siblings[overIndex + 1];
      const orderPrev = prevTag.order ?? 0;
      const orderNext = nextTag ? nextTag.order ?? (orderPrev + 2) : (orderPrev + 2);
      newOrder = (orderPrev + orderNext) / 2;
    }

    // --- Optimistic Update ---
    const optimisticData = JSON.parse(JSON.stringify(dimensionalTree));
    const optimisticTag = findTagAndParent(optimisticData, activeId)?.tag;
    if (optimisticTag) {
      optimisticTag.order = newOrder;
      // You might need a more sophisticated way to re-sort the local tree if visual order is critical
    }
    mutate(optimisticData, false); // Update local state immediately, but don't re-fetch

    console.log(`Reordering ${activeId} to new order: ${newOrder}`);
    await updateTag(activeId, { order: newOrder });

  }, [dimensionalTree, updateTag, mutate]);

  const handleReparent = useCallback(async (activeId: string, overId: string | null) => {
    if (!overId) {
      console.log("Cannot reparent to a null target.");
      return;
    }
    console.log(`Reparenting ${activeId} to be a child of ${overId}`);
    await updateTag(activeId, { parentId: overId });
  }, [updateTag]);

  return {
    tagTree: dimensionalTree,
    loading,
    error,
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
    loading,
    error,
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
      {error && <p style={{ color: 'red' }}>{error.message}</p>}

      {!loading && !error && (
        <TagAdminList
          tags={tagTree}
          onUpdateTag={handleUpdateTag}
          onDeleteTag={handleDeleteTag}
          onCreateTag={handleCreateTag}
          onReorder={handleReorder}
          onReparent={handleReparent}
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
  )
} 
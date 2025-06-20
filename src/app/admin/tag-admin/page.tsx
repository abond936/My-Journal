'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useTag, TagProvider, TagWithChildren } from '@/components/providers/TagProvider';
import { Tag } from '@/lib/types/tag';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import styles from './tag-admin.module.css';
import { buildTagTree } from '@/lib/utils/tagUtils';
import TagTreeView from '@/components/admin/tag-admin/TagTreeView';

// This function can remain as it is, it's a pure utility for converting a flat list to a tree
const buildTagTree = (tags: Tag[]): TagWithChildren[] => {
  const tagMap = new Map<string, TagWithChildren>();
  const rootTags: TagWithChildren[] = [];

  if (!tags) return [];

  // It's critical to create a deep copy to avoid mutating the source array (from SWR or state)
  const tagsCopy = JSON.parse(JSON.stringify(tags));

  tagsCopy.forEach((tag: Tag) => {
    tagMap.set(tag.id, { ...tag, children: [] });
  });

  tagsCopy.forEach((tag: Tag) => {
    const tagNode = tagMap.get(tag.id);
    if (tagNode) {
      if (tag.parentId && tagMap.has(tag.parentId)) {
        const parentNode = tagMap.get(tag.parentId);
        parentNode?.children.push(tagNode);
      } else {
        rootTags.push(tagNode);
      }
    }
  });

  const sortTags = (tagNodes: TagWithChildren[]) => {
    tagNodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    tagNodes.forEach(t => sortTags(t.children));
  };

  sortTags(rootTags);
  return rootTags;
};

// --- Core UI Logic Hook ---
function useTagManagement() {
  const { tags: swrTags, createTag, updateTag, deleteTag, loading, error: swrError, mutate } = useTag();
  const [temporaryTags, setTemporaryTags] = useState<Tag[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The single source of truth for rendering: use the temporary override if it exists, otherwise use the confirmed SWR data.
  const tagsToUse = temporaryTags || swrTags;

  const dimensionalTree = useMemo(() => {
    if (!tagsToUse || tagsToUse.length === 0) return [];

    const masterTagTree = buildTagTree(tagsToUse);
    
    const dimensions: Record<string, TagWithChildren> = {
      who: { id: 'dim-who', name: 'Who', children: [] },
      what: { id: 'dim-what', name: 'What', children: [] },
      when: { id: 'dim-when', name: 'When', children: [] },
      where: { id: 'dim-where', name: 'Where', children: [] },
      reflection: { id: 'dim-reflection', name: 'Reflection', children: [] },
    };
    const uncategorized: TagWithChildren = { id: 'dim-uncategorized', name: 'Uncategorized', children: [] };

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

    const currentTags = temporaryTags || swrTags || [];
    const activeIndex = currentTags.findIndex(t => t.id === activeId);
    const overIndex = currentTags.findIndex(t => t.id === overId);
    if (activeIndex === -1 || overIndex === -1) return;

    const activeTag = { ...currentTags[activeIndex] };
    const overTag = { ...currentTags[overIndex] };
    if (activeTag.parentId !== overTag.parentId) {
      return;
    }

    let siblings = currentTags
      .filter(t => t.parentId === activeTag.parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    // Remove the activeTag from siblings
    siblings = siblings.filter(t => t.id !== activeId);
    // Find the index to insert
    let insertIndex = siblings.findIndex(t => t.id === overId);
    if (insertIndex === -1) {
      return;
    }
    if (placement === 'after') {
      insertIndex += 1;
    }
    // Insert the activeTag at the new position
    siblings.splice(insertIndex, 0, activeTag);
    // Calculate new order for the moved tag
    let prevOrder = insertIndex > 0 ? siblings[insertIndex - 1].order ?? 0 : 0;
    let nextOrder = insertIndex < siblings.length - 1 ? siblings[insertIndex + 1].order ?? prevOrder + 2 : prevOrder + 2;
    let newOrder = (prevOrder + nextOrder) / 2;
    const newFlatTags = currentTags.map(t => t.id === activeId ? { ...t, order: newOrder } : t);
    setTemporaryTags(newFlatTags);

    try {
      await updateTag(activeId, { order: newOrder });
      await mutate();
    } catch (err) {
      setError('Failed to reorder tag. Please try again.');
    } finally {
      setTemporaryTags(null);
      setIsSaving(false);
    }
  }, [temporaryTags, swrTags, updateTag, mutate]);

  const handleReparent = useCallback(async (activeId: string, overId:string) => {
    if (activeId === overId) return;
    setIsSaving(true);
    setError(null);

    const currentTags = temporaryTags || swrTags || [];
    
    const newSiblings = currentTags.filter(t => t.parentId === overId);
    const maxOrder = newSiblings.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
    const newOrder = maxOrder + 10;

    const newFlatTags = currentTags.map(t => t.id === activeId ? { ...t, parentId: overId, order: newOrder } : t);
    
    setTemporaryTags(newFlatTags);

    try {
      await updateTag(activeId, { parentId: overId, order: newOrder });
      await mutate();
    } catch (err) {
      setError('Failed to reparent tag. Please try again.');
    } finally {
      setTemporaryTags(null);
      setIsSaving(false);
    }
  }, [temporaryTags, swrTags, updateTag, mutate]);

  return {
    tagTree: dimensionalTree,
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
      {isSaving && <p style={{ color: 'blue' }}>Saving changes...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <TagTreeView />
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

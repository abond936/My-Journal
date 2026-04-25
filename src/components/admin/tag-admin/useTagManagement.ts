'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTag, type TagWithChildren } from '@/components/providers/TagProvider';
import { buildTagTree } from '@/lib/utils/tagUtils';

/**
 * Shared tag CRUD + tree ordering for `/admin/tag-admin` and `TagAdminStudioPane`.
 * Preserve stable behavior for the full Tag Management page (fallback); extend Studio-only needs via new optional hook/list props with safe defaults—do not regress the standalone route.
 */
export function useTagManagement() {
  const { tags: swrTags, createTag, updateTag, deleteTag, loading, error: swrError, mutate } = useTag();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    masterTagTree.forEach((rootNode) => {
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

  const handleReorder = useCallback(
    async (activeId: string, overId: string, placement: 'before' | 'after') => {
      if (activeId === overId) return;
      setIsSaving(true);
      setError(null);

      const currentTags = swrTags || [];

      const activeTag = currentTags.find((t) => t.docId === activeId);
      const overTag = currentTags.find((t) => t.docId === overId);

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

      const allSiblings = currentTags
        .filter((t) => {
          if ((t.parentId || '') !== (activeTag.parentId || '')) return false;
          if (!activeTag.parentId) {
            return (t.dimension || '') === (activeTag.dimension || '');
          }
          return true;
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const withoutActive = allSiblings.filter((t) => t.docId !== activeId);

      const targetIndex = withoutActive.findIndex((t) => t.docId === overId);
      const insertAt = placement === 'before' ? targetIndex : targetIndex + 1;

      const reordered = [...withoutActive.slice(0, insertAt), activeTag, ...withoutActive.slice(insertAt)];

      const updates = reordered.map((tag, idx) => ({
        id: tag.docId,
        order: idx * 10,
      }));

      try {
        const optimisticOrderById = new Map(updates.map((update) => [update.id, update.order]));
        const optimisticTags = currentTags.map((tag) =>
          tag.docId && optimisticOrderById.has(tag.docId)
            ? { ...tag, order: optimisticOrderById.get(tag.docId) }
            : tag
        );
        await mutate(optimisticTags, { revalidate: false });
        await Promise.all(updates.map((update) => updateTag(update.id!, { order: update.order })));
        await mutate();
      } catch (err) {
        await mutate(currentTags, { revalidate: false });
        console.error('Failed to reorder tags:', err);
        setError('Failed to reorder tags. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [swrTags, updateTag, mutate]
  );

  const handleReparent = useCallback(
    async (activeId: string, overId: string) => {
      if (activeId === overId) return;
      setIsSaving(true);
      setError(null);

      const currentTags = swrTags || [];
      const activeTag = currentTags.find((t) => t.docId === activeId);
      const overTag = currentTags.find((t) => t.docId === overId);
      if (!activeTag || !overTag) {
        setIsSaving(false);
        return;
      }

      const optimisticTags = currentTags.map((tag) =>
        tag.docId === activeId
          ? {
              ...tag,
              parentId: overId,
              path: [...(overTag.path || []), overId],
              dimension: activeTag.parentId ? tag.dimension : undefined,
            }
          : tag
      );

      try {
        await mutate(optimisticTags, { revalidate: false });
        const response = await fetch(`/api/tags/${activeId}/reparent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newParentId: overId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to reparent tag.');
        }

        await mutate();
      } catch (err) {
        await mutate(currentTags, { revalidate: false });
        console.error('Failed to reparent tag:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsSaving(false);
      }
    },
    [mutate, swrTags]
  );

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

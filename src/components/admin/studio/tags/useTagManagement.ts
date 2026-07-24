'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTag, type TagWithChildren } from '@/components/providers/TagProvider';
import { buildTagTree } from '@/lib/utils/tagUtils';
import { buildReparentedTagPaths } from '@/lib/utils/tagHierarchy';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import type { TagMergeImpact, TagRemovalImpact } from '@/lib/services/tagMutationImpactService';

/**
 * Shared tag CRUD + tree ordering for `/admin/tag-admin` and `TagAdminStudioPane`.
 * Preserve stable behavior for the full Tag Management page (fallback); extend Studio-only needs via new optional hook/list props with safe defaults—do not regress the standalone route.
 */
export function useTagManagement() {
  const { tags: swrTags, createTag, updateTag, loading, error: swrError, mutate } = useTag();
  const feedback = useAppFeedback();
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
        setIsSaving(false);
        return;
      }

      const targetParentId = overTag.parentId || undefined;
      const changesParent = (activeTag.parentId || undefined) !== targetParentId;
      let prospectivePaths: Map<string, string[]> | null = null;
      if (activeTag.dimension !== overTag.dimension) {
        setError('Tags can only be moved within the same dimension.');
        setIsSaving(false);
        return;
      }
      if (changesParent) {
        try {
          prospectivePaths = buildReparentedTagPaths(currentTags, activeId, targetParentId);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'That move would create an invalid tag hierarchy.');
          setIsSaving(false);
          return;
        }
      }

      const allSiblings = currentTags
        .filter((t) => {
          if ((t.parentId || '') !== (targetParentId || '')) return false;
          if (!targetParentId) {
            return (t.dimension || '') === (overTag.dimension || '');
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
        const optimisticTags = currentTags.map((tag) => {
          if (!tag.docId) return tag;
          const nextPath = prospectivePaths?.get(tag.docId);
          const nextOrder = optimisticOrderById.get(tag.docId);
          if (tag.docId === activeId) {
            return {
              ...tag,
              parentId: targetParentId,
              path: nextPath ?? tag.path,
              dimension: overTag.dimension,
              order: nextOrder ?? tag.order,
            };
          }
          if (nextPath) return { ...tag, path: nextPath };
          return nextOrder !== undefined ? { ...tag, order: nextOrder } : tag;
        });
        await mutate(optimisticTags, { revalidate: false });
        if (changesParent) {
          const reparentResponse = await fetch(`/api/tags/${activeId}/reparent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newParentId: targetParentId }),
          });
          const reparentBody = await reparentResponse.json().catch(() => null);
          throwIfJsonApiFailed(reparentResponse, reparentBody, 'Failed to move tag.');
        }
        const response = await fetch('/api/tags/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeId, overId, placement }),
        });
        const responseBody = await response.json().catch(() => null);
        throwIfJsonApiFailed(response, responseBody, 'Failed to reorder tags.');
      } catch (err) {
        if (changesParent) await mutate();
        else await mutate(currentTags, { revalidate: false });
        console.error('Failed to reorder tags:', err);
        setError('Failed to reorder tags. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [swrTags, mutate]
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

      let prospectivePaths: Map<string, string[]>;
      try {
        if (activeTag.dimension !== overTag.dimension) {
          throw new Error('Tags can only be nested within the same dimension.');
        }
        prospectivePaths = buildReparentedTagPaths(currentTags, activeId, overId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That move would create an invalid tag hierarchy.');
        setIsSaving(false);
        return;
      }

      const optimisticTags = currentTags.map((tag) => {
        if (!tag.docId || !prospectivePaths.has(tag.docId)) return tag;
        const path = prospectivePaths.get(tag.docId)!;
        return tag.docId === activeId
          ? { ...tag, parentId: overId, path, dimension: overTag.dimension }
          : { ...tag, path };
      });

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
        await mutate();
        console.error('Failed to reparent tag:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsSaving(false);
      }
    },
    [mutate, swrTags]
  );

  const handleDeleteTag = useCallback(async (tagId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const impactResponse = await fetch(`/api/tags/${tagId}/impact`);
      const impactBody = await impactResponse.json().catch(() => null);
      throwIfJsonApiFailed(impactResponse, impactBody, 'Unable to assess tag removal.');
      const impact = impactBody as TagRemovalImpact;
      const impactParts = [
        `${impact.cardsChanged} Card${impact.cardsChanged === 1 ? '' : 's'}`,
        `${impact.mediaChanged} Media item${impact.mediaChanged === 1 ? '' : 's'}`,
        `${impact.questionsChanged} Question${impact.questionsChanged === 1 ? '' : 's'}`,
      ];
      const incompleteParts = [
        impact.cardsNewlyIncomplete ? `${impact.cardsNewlyIncomplete} Card${impact.cardsNewlyIncomplete === 1 ? '' : 's'}` : '',
        impact.mediaNewlyIncomplete ? `${impact.mediaNewlyIncomplete} Media item${impact.mediaNewlyIncomplete === 1 ? '' : 's'}` : '',
      ].filter(Boolean);
      const confirmed = await feedback.confirm({
        title: `Remove ${impact.tagName}?`,
        message: [
          `This removes the tag everywhere and affects ${impactParts.join(', ')}.`,
          impact.directChildrenPromoted
            ? `${impact.directChildrenPromoted} direct child tag${impact.directChildrenPromoted === 1 ? '' : 's'} will be promoted to this tag's parent.`
            : 'This tag has no direct children.',
          incompleteParts.length
            ? `${incompleteParts.join(' and ')} will become Incomplete.`
            : 'No currently Complete Cards or Media will become Incomplete.',
          'This cannot be undone.',
        ].join(' '),
        confirmLabel: 'Remove everywhere',
        cancelLabel: 'Cancel',
        tone: 'danger',
      });
      if (!confirmed) return;
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'remove-everywhere', promoteChildren: true }),
      });
      const responseBody = await response.json().catch(() => null);
      throwIfJsonApiFailed(response, responseBody, 'Unable to remove tag.');
      await mutate();
      feedback.showSuccess(`Removed ${impact.tagName}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to remove tag.';
      setError(message);
      feedback.showError(message);
    } finally {
      setIsSaving(false);
    }
  }, [feedback, mutate]);

  const handleMergeTag = useCallback(async (tagId: string, targetTagId: string): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      const impactResponse = await fetch(`/api/tags/${tagId}/impact?mode=merge&targetTagId=${encodeURIComponent(targetTagId)}`);
      const impactBody = await impactResponse.json().catch(() => null);
      throwIfJsonApiFailed(impactResponse, impactBody, 'Unable to assess tag merge.');
      const impact = impactBody as TagMergeImpact;
      const confirmed = await feedback.confirm({
        title: `Merge ${impact.tagName} into ${impact.targetTagName}?`,
        message: [
          `Assignments and subjects will use ${impact.targetTagName} instead of ${impact.tagName}.`,
          `This affects ${impact.cardsChanged} Card${impact.cardsChanged === 1 ? '' : 's'}, ${impact.mediaChanged} Media item${impact.mediaChanged === 1 ? '' : 's'}, and ${impact.questionsChanged} Question${impact.questionsChanged === 1 ? '' : 's'}.`,
          impact.directChildrenPromoted
            ? `${impact.directChildrenPromoted} direct child tag${impact.directChildrenPromoted === 1 ? '' : 's'} will move beneath ${impact.targetTagName}.`
            : `${impact.tagName} has no direct children.`,
          'The source tag will then be deleted. This cannot be undone.',
        ].join(' '),
        confirmLabel: 'Merge tags',
        cancelLabel: 'Cancel',
        tone: 'danger',
      });
      if (!confirmed) return false;
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'merge', targetTagId }),
      });
      const responseBody = await response.json().catch(() => null);
      throwIfJsonApiFailed(response, responseBody, 'Unable to merge tags.');
      await mutate();
      feedback.showSuccess(`Merged ${impact.tagName} into ${impact.targetTagName}.`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to merge tags.';
      setError(message);
      feedback.showError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [feedback, mutate]);

  return {
    tagTree: dimensionalTree,
    loading,
    error: error || swrError,
    isSaving,
    handleCreateTag: createTag,
    handleUpdateTag: updateTag,
    handleDeleteTag,
    handleMergeTag,
    handleReorder,
    handleReparent,
  };
}

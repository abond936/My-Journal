'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Media } from '@/lib/types/photo';
import type { MediaStack } from '@/lib/types/mediaStack';
import { selectionEligibleForCreateStack } from '@/lib/utils/mediaStackDisplayUtils';

type Feedback = {
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
};

export function useMediaStackActions({
  media,
  selectedMediaIds,
  setSelectedMediaIds,
  stackById,
  showAllStacks,
  createStack,
  dissolveStack,
  refreshMedia,
  feedback,
}: {
  media: Media[];
  selectedMediaIds: string[];
  setSelectedMediaIds: (ids: string[]) => void;
  stackById: Map<string, MediaStack>;
  showAllStacks: boolean;
  createStack: (mediaIds: string[]) => Promise<unknown>;
  dissolveStack: (stackId: string) => Promise<unknown>;
  refreshMedia: () => Promise<unknown>;
  feedback: Feedback;
}) {
  const [expandedStackIds, setExpandedStackIds] = useState<Set<string>>(() => new Set());
  const [isCreatingStack, setIsCreatingStack] = useState(false);
  const [isDissolvingStack, setIsDissolvingStack] = useState(false);
  const mediaById = useMemo(() => new Map(media.map((item) => [item.docId, item])), [media]);

  const toggleStackExpand = useCallback((stackId: string) => {
    setExpandedStackIds((previous) => {
      const next = new Set(previous);
      if (next.has(stackId)) next.delete(stackId);
      else next.add(stackId);
      return next;
    });
  }, []);

  const dissolveOneStack = useCallback(async (stackId: string) => {
    setIsDissolvingStack(true);
    try {
      await dissolveStack(stackId);
      setExpandedStackIds((previous) => {
        const next = new Set(previous);
        next.delete(stackId);
        return next;
      });
      await refreshMedia();
      feedback.showSuccess('Stack dissolved.');
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to unstack.', 'Unstack');
    } finally {
      setIsDissolvingStack(false);
    }
  }, [dissolveStack, feedback, refreshMedia]);

  const createFromSelection = useCallback(async () => {
    const result = selectionEligibleForCreateStack(selectedMediaIds, mediaById);
    if (result.ok === false) {
      feedback.showError(result.reason, 'Create stack');
      return;
    }
    setIsCreatingStack(true);
    try {
      await createStack(result.mediaIds);
      await refreshMedia();
      setSelectedMediaIds([]);
      feedback.showSuccess('Stack created.');
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to create stack.', 'Create stack');
    } finally {
      setIsCreatingStack(false);
    }
  }, [createStack, feedback, mediaById, refreshMedia, selectedMediaIds, setSelectedMediaIds]);

  const unstackSelection = useCallback(async () => {
    const stackIds = [...new Set(selectedMediaIds
      .map((id) => mediaById.get(id)?.stackId)
      .filter((stackId): stackId is string => Boolean(stackId)))];
    if (stackIds.length === 0) {
      feedback.showError('No stacked media selected.', 'Unstack');
      return;
    }
    setIsDissolvingStack(true);
    try {
      for (const stackId of stackIds) await dissolveStack(stackId);
      setExpandedStackIds((previous) => {
        const next = new Set(previous);
        stackIds.forEach((id) => next.delete(id));
        return next;
      });
      await refreshMedia();
      setSelectedMediaIds([]);
      feedback.showSuccess(stackIds.length === 1 ? 'Stack dissolved.' : `${stackIds.length} stacks dissolved.`);
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to unstack.', 'Unstack');
    } finally {
      setIsDissolvingStack(false);
    }
  }, [dissolveStack, feedback, mediaById, refreshMedia, selectedMediaIds, setSelectedMediaIds]);

  const createStackEligible = useMemo(
    () => selectionEligibleForCreateStack(selectedMediaIds, mediaById).ok,
    [mediaById, selectedMediaIds]
  );
  const selectionHasStackedMedia = useMemo(
    () => selectedMediaIds.some((id) => Boolean(mediaById.get(id)?.stackId)),
    [mediaById, selectedMediaIds]
  );
  const stackGridProps = useMemo(() => ({
    stackById,
    showAllStacks,
    expandedStackIds,
    onToggleStackExpand: toggleStackExpand,
    onDissolveStack: dissolveOneStack,
  }), [dissolveOneStack, expandedStackIds, showAllStacks, stackById, toggleStackExpand]);

  return {
    mediaById,
    expandedStackIds,
    isCreatingStack,
    isDissolvingStack,
    createStackEligible,
    selectionHasStackedMedia,
    stackGridProps,
    createFromSelection,
    unstackSelection,
  };
}

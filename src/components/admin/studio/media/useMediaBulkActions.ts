'use client';

import { useCallback, useState } from 'react';
import { fetchAuthoritativeMediaReferenceSummaries } from '@/lib/utils/mediaReferenceSummaryClient';

type Feedback = {
  showError: (message: string, title?: string) => void;
};

export function useMediaBulkActions({
  selectedMediaIds,
  deleteMultipleMedia,
  selectedCardId,
  reloadSelectedCard,
  feedback,
}: {
  selectedMediaIds: string[];
  deleteMultipleMedia: (ids: string[]) => Promise<unknown>;
  selectedCardId: string | null | undefined;
  reloadSelectedCard: (cardId: string) => void;
  feedback: Feedback;
}) {
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteChecking, setBulkDeleteChecking] = useState(false);
  const [bulkDeleteConsequences, setBulkDeleteConsequences] = useState({
    selectedCount: 0,
    linkedMediaCount: 0,
    linkedCardCount: 0,
  });
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);

  const openBulkDelete = useCallback(async () => {
    if (selectedMediaIds.length === 0 || bulkDeleteChecking) return;
    setBulkDeleteChecking(true);
    try {
      const summaries = await fetchAuthoritativeMediaReferenceSummaries(selectedMediaIds);
      const linkedCardIds = new Set(Object.values(summaries).flat());
      setBulkDeleteConsequences({
        selectedCount: selectedMediaIds.length,
        linkedMediaCount: Object.values(summaries).filter((ids) => ids.length > 0).length,
        linkedCardCount: linkedCardIds.size,
      });
      setBulkDeleteModalOpen(true);
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Could not verify linked-card consequences.',
        'Delete blocked'
      );
    } finally {
      setBulkDeleteChecking(false);
    }
  }, [bulkDeleteChecking, feedback, selectedMediaIds]);

  const confirmBulkDelete = useCallback(async () => {
    if (selectedMediaIds.length === 0) return;
    await deleteMultipleMedia(selectedMediaIds);
    if (selectedCardId) reloadSelectedCard(selectedCardId);
    setBulkDeleteModalOpen(false);
  }, [deleteMultipleMedia, reloadSelectedCard, selectedCardId, selectedMediaIds]);

  return {
    bulkDeleteModalOpen,
    setBulkDeleteModalOpen,
    bulkDeleteChecking,
    bulkDeleteConsequences,
    openBulkDelete,
    confirmBulkDelete,
    bulkTagModalOpen,
    setBulkTagModalOpen,
  };
}

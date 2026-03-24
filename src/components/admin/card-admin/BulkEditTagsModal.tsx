'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/lib/types/card';
import { useTag } from '@/components/providers/TagProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './BulkEditTagsModal.module.css';
import { createUITreeFromDimensions } from '@/lib/utils/tagUtils';
import TagPickerDimensionColumn from '@/components/admin/card-admin/TagPickerDimensionColumn';

/** Union of all tags on the selected cards — initial check state for bulk replace. */
const getUnionTagIds = (cards: Card[]): string[] => {
  if (!cards || cards.length === 0) return [];
  const u = new Set<string>();
  for (const c of cards) {
    for (const t of c.tags || []) {
      u.add(t);
    }
  }
  return Array.from(u);
};

// --- Main Component ---
interface BulkEditTagsModalProps {
  cardIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export default function BulkEditTagsModal({ cardIds, isOpen, onClose, onSave }: BulkEditTagsModalProps) {
  const { tags: allTags, loading: tagsLoading } = useTag();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentSelection, setCurrentSelection] = useState<Set<string>>(new Set());

  /** Stable key so we do not refetch / reset when the parent passes a new `cardIds` array each render. */
  const cardIdsKey = useMemo(
    () => [...new Set(cardIds)].sort().join('\u001e'),
    [cardIds.join('\u001e')]
  );

  // Fetch full card data when the modal opens or the selected id set changes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setCards([]);
      setCurrentSelection(new Set());
      return;
    }
    const ids = cardIdsKey ? cardIdsKey.split('\u001e') : [];
    if (ids.length === 0) return;

    const fetchCards = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        ids.forEach(id => params.append('id', id));
        const response = await fetch(`/api/cards/by-ids?${params.toString()}`);

        if (!response.ok) throw new Error('Failed to fetch selected cards.');
        const fetchedCards: Card[] = await response.json();
        setCards(fetchedCards);
        setCurrentSelection(new Set(getUnionTagIds(fetchedCards)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchCards();
  }, [isOpen, cardIdsKey]);

  const dimensionalTree = useMemo(() => {
    if (!allTags) return [];
    return createUITreeFromDimensions(allTags);
  }, [allTags]);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cards/bulk-update-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds, tags: Array.from(currentSelection) }),
      });
      if (!response.ok) throw new Error('Failed to save tags.');
      await onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagChange = (tagId: string, isSelected: boolean) => {
    setCurrentSelection(prev => {
      const newSelection = new Set(prev);
      if (isSelected) {
        newSelection.add(tagId);
      } else {
        newSelection.delete(tagId);
      }
      return newSelection;
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        <h2 className={styles.modalHeader}>Edit Tags for {cardIds.length} Cards</h2>
        <p className={styles.helpText}>
          All tags that appear on any selected card start checked. Saving sets <strong>every</strong> selected card to
          this exact tag list—uncheck to remove from all, check to add to all.
        </p>

        {isLoading || tagsLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.interactiveColumns}>
            {dimensionalTree.map(dimension => (
              <TagPickerDimensionColumn
                key={dimension.docId}
                dimension={dimension}
                selection={currentSelection}
                onSelectionChange={handleTagChange}
                checkboxIdPrefix="bulk-tag"
              />
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelButton} disabled={isLoading}>Cancel</button>
          <button onClick={handleSaveChanges} className={styles.saveButton} disabled={isLoading || tagsLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

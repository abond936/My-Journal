'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/lib/types/card';
import { useTag } from '@/components/providers/TagProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './BulkEditTagsModal.module.css';
import { createUITreeFromDimensions, filterTreesBySearch } from '@/lib/utils/tagUtils';
import { TagWithChildren } from '@/components/providers/TagProvider';
import TagPickerDimensionColumn from '@/components/admin/card-admin/TagPickerDimensionColumn';

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
  const [tagDecisions, setTagDecisions] = useState<Map<string, boolean>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

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
      setTagDecisions(new Map());
      setSearchTerm('');
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
        setTagDecisions(new Map());
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

  const filteredDimensionalTree = useMemo(() => {
    const search = searchTerm.trim();
    if (!search) return dimensionalTree;
    return dimensionalTree.map(dim => ({
      ...dim,
      children: filterTreesBySearch(dim.children, search),
    }));
  }, [dimensionalTree, searchTerm]);

  const tagPresenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      for (const tagId of card.tags || []) {
        counts.set(tagId, (counts.get(tagId) || 0) + 1);
      }
    }
    return counts;
  }, [cards]);

  const getSelectionState = (tagId: string): 'checked' | 'unchecked' | 'mixed' => {
    const explicit = tagDecisions.get(tagId);
    if (explicit !== undefined) return explicit ? 'checked' : 'unchecked';
    const count = tagPresenceCounts.get(tagId) || 0;
    if (count === 0) return 'unchecked';
    if (count === cards.length) return 'checked';
    return 'mixed';
  };

  const checkedSelection = useMemo(() => {
    const selected = new Set<string>();
    for (const tag of allTags || []) {
      if (getSelectionState(tag.docId) === 'checked') selected.add(tag.docId);
    }
    return selected;
  }, [allTags, tagDecisions, tagPresenceCounts, cards.length]);

  const expandedNodeIds = useMemo(() => {
    const expanded = new Set<string>();
    const walk = (node: TagWithChildren): boolean => {
      const state = getSelectionState(node.docId);
      const selfSelected = state === 'checked' || state === 'mixed';
      let childSelected = false;
      for (const child of node.children || []) {
        if (walk(child)) childSelected = true;
      }
      if (childSelected) expanded.add(node.docId);
      return selfSelected || childSelected;
    };
    for (const dimension of dimensionalTree) {
      for (const child of dimension.children || []) {
        walk(child);
      }
    }
    return expanded;
  }, [dimensionalTree, allTags, tagDecisions, tagPresenceCounts, cards.length]);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const addTagIds = Array.from(tagDecisions.entries())
        .filter(([, value]) => value)
        .map(([tagId]) => tagId);
      const removeTagIds = Array.from(tagDecisions.entries())
        .filter(([, value]) => !value)
        .map(([tagId]) => tagId);

      const response = await fetch('/api/cards/bulk-update-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds, addTagIds, removeTagIds }),
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
    setTagDecisions((prev) => {
      const next = new Map(prev);
      next.set(tagId, isSelected);
      return next;
    });
  };

  const handleToggleTag = (tagId: string, currentState: 'checked' | 'unchecked' | 'mixed') => {
    setTagDecisions((prev) => {
      const next = new Map(prev);
      if (currentState === 'checked') {
        next.set(tagId, false);
      } else {
        next.set(tagId, true);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        <h2 className={styles.modalHeader}>Edit Tags for {cardIds.length} Cards</h2>
        <p className={styles.helpText}>
          Tag states reflect the selected cards: <strong>checked = all</strong>, <strong>dash = some</strong>, <strong>empty = none</strong>.
          Click once to set for all, click again to remove from all.
        </p>
        <div className={styles.stateLegend} aria-hidden>
          <span>✓ all</span>
          <span>— some</span>
          <span>☐ none</span>
        </div>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search tags…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={styles.searchClear}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {isLoading || tagsLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.interactiveColumns}>
            {filteredDimensionalTree.map(dimension => (
              <TagPickerDimensionColumn
                key={dimension.docId}
                dimension={dimension}
                selection={checkedSelection}
                onSelectionChange={handleTagChange}
                getSelectionState={getSelectionState}
                onToggleTag={handleToggleTag}
                expandedNodeIds={expandedNodeIds}
                checkboxIdPrefix="bulk-tag"
                forceExpandAll={!!searchTerm.trim()}
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

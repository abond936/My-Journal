'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/lib/types/card';
import { Tag, TagWithChildren } from '@/lib/types/tag';
import { useTag } from '@/components/providers/TagProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './BulkEditTagsModal.module.css';
import { buildSparseTagTree, createUITreeFromDimensions } from '@/lib/utils/tagUtils';
import clsx from 'clsx';

// --- Helper Functions ---
const getCommonTagIds = (cards: Card[]): string[] => {
  if (!cards || cards.length === 0) return [];
  const allTags = cards.map(c => c.tags || []);
  return allTags.reduce((a, b) => a.filter(c => b.includes(c)));
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

  // Fetch full card data when the modal opens
  useEffect(() => {
    if (isOpen && cardIds.length > 0) {
      const fetchCards = async () => {
        setIsLoading(true);
        try {
          const params = new URLSearchParams();
          cardIds.forEach(id => params.append('id', id));
          const response = await fetch(`/api/cards/by-ids?${params.toString()}`);

          if (!response.ok) throw new Error('Failed to fetch selected cards.');
          const fetchedCards: Card[] = await response.json();
          setCards(fetchedCards);
          setCurrentSelection(new Set(getCommonTagIds(fetchedCards)));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchCards();
    }
  }, [isOpen, cardIds]);

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
        
        {isLoading || tagsLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.interactiveColumns}>
            {dimensionalTree.map(dimension => (
              <div key={dimension.id} className={styles.dimensionColumn}>
                <h4>{dimension.name}</h4>
                <div className={styles.interactiveTree}>
                  {dimension.children.map(root => (
                    <InteractiveTagNode
                      key={root.id}
                      node={root}
                      selection={currentSelection}
                      onChange={handleTagChange}
                    />
                  ))}
                </div>
              </div>
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

// --- Recursive Interactive Node Component ---
interface InteractiveTagNodeProps {
  node: TagWithChildren;
  selection: Set<string>;
  onChange: (tagId: string, selected: boolean) => void;
}

function InteractiveTagNode({ node, selection, onChange }: InteractiveTagNodeProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const isSelected = selection.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(node.id, e.target.checked);
  };

  return (
    <div className={styles.interactiveNode}>
      <div className={styles.nodeControl}>
        {hasChildren && (
          <button type="button" onClick={() => setIsCollapsed(!isCollapsed)} className={styles.collapseButton}>
            {isCollapsed ? '►' : '▼'}
          </button>
        )}
        <input
          type="checkbox"
          id={`bulk-tag-${node.id}`}
          checked={isSelected}
          onChange={handleCheckboxChange}
        />
        <label htmlFor={`bulk-tag-${node.id}`}>{node.name}</label>
      </div>
      {!isCollapsed && hasChildren && (
        <div className={styles.tagChildren}>
          {node.children.map(child => (
            <InteractiveTagNode
              key={child.id}
              node={child}
              selection={selection}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
} 
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './CardForm.module.css';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { organizeCardTags, OrganizedTags } from '@/lib/utils/cardTagUtils';
import TagSelector from '@/components/common/TagSelector';
import { useTag } from '@/components/providers/TagProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface BulkTagEditorModalProps {
  cardIds: string[];
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to find common elements in arrays
const getCommonElements = (arrays: string[][]): string[] => {
  if (!arrays || arrays.length === 0) {
    return [];
  }
  return arrays.reduce((a, b) => a.filter(c => b.includes(c)));
};

export default function BulkTagEditorModal({ cardIds, isOpen, onClose }: BulkTagEditorModalProps) {
  const { tags: allTags, loading: tagsLoading } = useTag();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [organizedTags, setOrganizedTags] = useState<OrganizedTags>({ who: [], what: [], when: [], where: [], reflection: [] });

  useEffect(() => {
    if (isOpen && cardIds.length > 0) {
      const fetchCards = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch('/api/cards/by-ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: cardIds }),
          });

          if (!response.ok) {
            throw new Error('Failed to fetch selected cards.');
          }

          const cards: Card[] = await response.json();
          setSelectedCards(cards);

          // Find common tags
          const commonTagIds = getCommonElements(cards.map(c => c.tags || []));
          const organized = await organizeCardTags(commonTagIds, allTags);
          setOrganizedTags(organized);

        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
          setIsLoading(false);
        }
      };

      if (!tagsLoading) {
        fetchCards();
      }
    }
  }, [isOpen, cardIds, tagsLoading, allTags]);

  const handleTagsChange = (dimension: keyof OrganizedTags, tags: string[]) => {
    setOrganizedTags(prev => ({ ...prev, [dimension]: tags }));
  };
  
  const handleSaveChanges = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allTags = Object.values(organizedTags).flat();
      const uniqueTags = [...new Set(allTags)];
      
      const response = await fetch('/api/cards/bulk-update-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds, tags: uniqueTags }),
      });

      if (!response.ok) {
        throw new Error('Failed to save tags.');
      }
      
      onClose(); // Close the modal on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const tagDimensions: (keyof OrganizedTags)[] = ['who', 'what', 'when', 'where', 'reflection'];

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Edit Tags for {cardIds.length} Cards</h2>
        
        {isLoading || tagsLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.tagSections}>
            {tagDimensions.map(dim => (
              <div key={dim} className={styles.tagSection}>
                <h3 className={styles.tagDimensionTitle}>{dim.charAt(0).toUpperCase() + dim.slice(1)}</h3>
                <TagSelector
                  dimension={dim}
                  selectedTags={organizedTags[dim] || []}
                  onTagsChange={(tags) => handleTagsChange(dim, tags)}
                />
              </div>
            ))}
          </div>
        )}
        
        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
          <button onClick={handleSaveChanges} className={styles.saveButton} disabled={isLoading || tagsLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
} 
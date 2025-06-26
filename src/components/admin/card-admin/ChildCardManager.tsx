'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card } from '@/lib/types/card';
import styles from './ChildCardManager.module.css';
import formStyles from './CardForm.module.css';
import { SortableItem } from './SortableItem';
import { useChildCards } from '@/lib/hooks/useChildCards';
import { useCardForm } from '@/components/providers/CardFormProvider';
import clsx from 'clsx';

interface ChildCardManagerProps {
  className?: string;
}

export default function ChildCardManager({ className }: ChildCardManagerProps) {
  const {
    formState: { cardData, errors },
    updateChildIds,
  } = useCardForm();

  const childIds = cardData.childrenIds || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { 
    childCards, 
    isLoading: areChildrenLoading, 
    error: childrenError 
  } = useChildCards(childIds);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ q: searchQuery, limit: '10' });
      const response = await fetch(`/api/cards/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results.');
      }
      const results = await response.json();
      setSearchResults(results.items || []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = (cardId: string) => {
    if (childIds.includes(cardId)) {
      setSearchError('This card is already a child.');
      return;
    }
    
    // Check if we're trying to add the current card as its own child
    if (cardData.id === cardId) {
      setSearchError('A card cannot be its own child.');
      return;
    }
    
    updateChildIds([...childIds, cardId]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemove = (cardId: string) => {
    updateChildIds(childIds.filter(id => id !== cardId));
  };

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = childIds.indexOf(active.id as string);
      const newIndex = childIds.indexOf(over.id as string);
      const newOrder = arrayMove(childIds, oldIndex, newIndex);
      updateChildIds(newOrder);
    }
  };

  return (
    <div className={clsx(styles.container, className)}>
      <h4>Child Cards</h4>
      
      <div className={styles.searchSection}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for cards to add..."
          className={styles.searchInput}
        />
        <button 
          type="button" 
          onClick={handleSearch} 
          disabled={isSearching} 
          className={formStyles.secondaryButton}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchError && <p className={styles.error}>{searchError}</p>}
      {errors.childrenIds && <p className={styles.error}>{errors.childrenIds}</p>}
      
      {searchResults.length > 0 && (
        <div className={styles.searchResults}>
          <h5>Search Results</h5>
          <ul>
            {searchResults.map(card => (
              <li key={card.id} className={styles.resultItem}>
                <span>{card.title} ({card.type})</span>
                <button
                  type="button"
                  onClick={() => handleAdd(card.id)}
                  className={styles.addButton}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className={styles.childList}>
        <h5>Current Children</h5>
        {areChildrenLoading && <p>Loading child cards...</p>}
        {childrenError && <p className={styles.error}>{childrenError}</p>}
        {!areChildrenLoading && !childrenError && childCards.length === 0 && (
          <p>No child cards have been added.</p>
        )}
        {!areChildrenLoading && !childrenError && childCards.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
              <ul>
                {childCards.map((child) => (
                  <SortableItem key={child.id} id={child.id}>
                    <div className={styles.childItem}>
                      <span>
                        {child.title} 
                        <span className={styles.childInfo}>
                          ({child.type} - {child.id})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(child.id)}
                        className={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  </SortableItem>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
} 
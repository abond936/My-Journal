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
import clsx from 'clsx';

interface ChildCardManagerProps {
  cardId: string | undefined;
  childrenIds: string[];
  onUpdate: (newChildIds: string[]) => void;
  error?: string;
  className?: string;
}

export default function ChildCardManager({ 
  cardId, 
  childrenIds, 
  onUpdate, 
  error, 
  className 
}: ChildCardManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { 
    childCards, 
    isLoading: areChildrenLoading, 
    error: childrenError 
  } = useChildCards(childrenIds);

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

  const handleAdd = (newCardId: string) => {
    if (childrenIds.includes(newCardId)) {
      setSearchError('This card is already a child.');
      return;
    }
    
    // Check if we're trying to add the current card as its own child
    if (cardId === newCardId) {
      setSearchError('A card cannot be its own child.');
      return;
    }
    
    onUpdate([...childrenIds, newCardId]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemove = (idToRemove: string) => {
    onUpdate(childrenIds.filter(id => id !== idToRemove));
  };

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = childrenIds.indexOf(active.id as string);
      const newIndex = childrenIds.indexOf(over.id as string);
      const newOrder = arrayMove(childrenIds, oldIndex, newIndex);
      onUpdate(newOrder);
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
      {error && <p className={styles.error}>{error}</p>}
      
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
            <SortableContext items={childrenIds} strategy={verticalListSortingStrategy}>
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
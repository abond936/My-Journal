'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import styles from './CardFeed.module.css';
import V2ContentCard from './V2ContentCard';

interface CardFeedProps {
  cards: Card[];
  loading: boolean;
  loadMoreRef: (node?: Element | null | undefined) => void;
  onSaveScrollPosition: () => void;
}

// Rename the component to CardFeedV2
export default function CardFeedV2({ cards, loading, loadMoreRef, onSaveScrollPosition }: CardFeedProps) {
  if (loading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}><h1>My Stories</h1></header>
        <main>Loading...</main>
      </div>
    );
  }

  return (
    <main className={styles.grid}>
      {cards.map(card => (
        <V2ContentCard 
          key={card.id} 
          card={card}
          // All cards will be 'medium' for now.
          size="medium" 
          onClick={onSaveScrollPosition} 
        />
      ))}
      
      {/* This element is critical for infinite scrolling and must be preserved. */}
      <div ref={loadMoreRef} />
    </main>
  );
} 
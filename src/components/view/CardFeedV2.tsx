'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import styles from './CardFeedV2.module.css';
import V2ContentCard from './V2ContentCard';

interface CardFeedProps {
  cards: Card[];
  loading: boolean;
  loadMoreRef: (node?: Element | null | undefined) => void;
  onSaveScrollPosition: () => void;
}

export default function CardFeedV2({ cards, loading, loadMoreRef, onSaveScrollPosition }: CardFeedProps) {
  if (loading) {
    return (
      <div className={styles.page}>
        <main>Loading...</main>
      </div>
    );
  }

  return (
    <main className={styles.grid}>
      {cards.map(card => (
        <V2ContentCard
          key={card.docId}
          card={card}
          size="medium"
          onClick={onSaveScrollPosition}
        />
      ))}

      <div ref={loadMoreRef} />
    </main>
  );
}

'use client';

import React, { useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/lib/types/card';
import styles from './CardList.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';

interface CardFeedProps {
  cards: Card[];
  loading: boolean;
  loadMoreRef: (node?: Element | null | undefined) => void;
  onSaveScrollPosition: () => void;
}

export default function CardFeed({ cards, loading, loadMoreRef, onSaveScrollPosition }: CardFeedProps) {
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
        <Link 
          key={card.id} 
          href={`/view/${card.id}`} 
          className={styles.cardLink}
          onClick={onSaveScrollPosition}
        >
          <div className={styles.card}>
            {card.coverImage && (
              <img
                src={getDisplayUrl(card.coverImage)} 
                alt={card.title}
                className={styles.cardImage}
              />
            )}
            <div className={styles.cardOverlay}>
              <h2 className={styles.cardTitle}>{card.title}</h2>
              {card.subtitle && <p className={styles.cardSubtitle}>{card.subtitle}</p>}
            </div>
          </div>
        </Link>
      ))}
    </main>
  );
} 
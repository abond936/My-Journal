'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Card } from '@/lib/types/card';
import styles from './CardFeed.module.css';
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

  const handleScroll = (cardId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`gallery-${cardId}`);
    if (container) {
      const scrollAmount = 300;
      const newScrollLeft = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

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
            {card.type === 'gallery' && card.galleryMedia && card.galleryMedia.length > 0 ? (
              <div className={styles.horizontalScroll} id={`gallery-${card.id}`}>
                <button 
                  className={`${styles.galleryNav} ${styles.prevButton}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleScroll(card.id, 'left'); }}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                {card.galleryMedia.map((item, i) => (
                  item.media && (
                    <img
                      key={i}
                      src={getDisplayUrl(item.media)} 
                      alt={item.caption || card.title}
                      className={styles.scrollImage}
                    />
                  )
                ))}
                <button 
                  className={`${styles.galleryNav} ${styles.nextButton}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleScroll(card.id, 'right'); }}
                  aria-label="Next image"
                >
                  ›
                </button>
              </div>
            ) : card.coverImage && (
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
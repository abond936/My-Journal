'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/lib/types/card';
import styles from './CardFeed.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { getObjectPositionForAspectRatio } from '@/lib/utils/objectPositionUtils';

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
          key={card.docId} 
          href={`/view/${card.docId}`} 
          className={styles.cardLink}
          onClick={onSaveScrollPosition}
        >
          <div className={styles.card}>
            {card.type === 'gallery' && card.galleryMedia && card.galleryMedia.length > 0 ? (
              <div className={styles.horizontalScroll} id={`gallery-${card.docId}`}>
                <button 
                  className={`${styles.galleryNav} ${styles.prevButton}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleScroll(card.docId, 'left'); }}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                {card.galleryMedia.map((item, i) => (
                  item.media && (
                    <Image
                      key={i}
                      src={getDisplayUrl(item.media)} 
                      alt={item.caption || card.title}
                      className={styles.scrollImage}
                      width={300}
                      height={200}
                      sizes="300px"
                      priority={false}
                    />
                  )
                ))}
                <button 
                  className={`${styles.galleryNav} ${styles.nextButton}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleScroll(card.docId, 'right'); }}
                  aria-label="Next image"
                >
                  ›
                </button>
              </div>
            ) : card.coverImage && (
              <Image
                src={getDisplayUrl(card.coverImage)} 
                alt={card.title}
                className={styles.cardImage}
                width={400}
                height={300}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ 
                  objectPosition: card.coverImageFocalPoint && card.coverImage ? 
                    getObjectPositionForAspectRatio(
                      card.coverImageFocalPoint,
                      { width: card.coverImage.width, height: card.coverImage.height },
                      '4/3',
                      400
                    ) : 'center'
                }}
                priority={false}
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
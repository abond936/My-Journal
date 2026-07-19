'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { Card } from '@/lib/types/card';
import V2ContentCard from '@/components/view/V2ContentCard';
import styles from './ChildCardsRail.module.css';
import type { ReaderRouteMode } from '@/lib/utils/readerMode';

export interface ChildCardsRailProps {
  cards: Card[];
  /** Section heading (default matches story-parent context). */
  title?: string;
  /** `returnTo` for admin edit Back link from detail-page child tiles. */
  adminEditReturnTo?: string;
  readerMode?: ReaderRouteMode;
}

export default function ChildCardsRail({
  cards,
  title = 'More...',
  adminEditReturnTo = '/view',
  readerMode,
}: ChildCardsRailProps) {
  const [showNavButtons, setShowNavButtons] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollByPage = useCallback((direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    const delta = direction === 'left' ? -scrollAmount : scrollAmount;
    container.scrollTo({ left: container.scrollLeft + delta, behavior: 'smooth' });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollByPage('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollByPage('right');
      }
    },
    [scrollByPage]
  );

  const items = cards.filter((c): c is Card & { docId: string } => Boolean(c.docId));
  if (items.length === 0) return null;

  return (
    <section className={styles.section} aria-label={title}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>
          {items.length} {items.length === 1 ? 'card' : 'cards'}
        </span>
      </div>

      <div
        className={styles.railWrap}
        onMouseEnter={() => setShowNavButtons(true)}
        onMouseLeave={() => setShowNavButtons(false)}
        onFocus={() => setShowNavButtons(true)}
        onBlur={() => setShowNavButtons(false)}
      >
        {items.length > 1 ? (
          <>
            <button
              type="button"
              className={`${styles.navButton} ${styles.prevButton} ${showNavButtons ? styles.visible : ''}`}
              onClick={() => scrollByPage('left')}
              aria-label="Scroll to previous cards"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${styles.nextButton} ${showNavButtons ? styles.visible : ''}`}
              onClick={() => scrollByPage('right')}
              aria-label="Scroll to next cards"
            >
              ›
            </button>
          </>
        ) : null}

        <div
          ref={scrollContainerRef}
          className={styles.scroll}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="list"
          aria-label="Open a card in this story"
        >
          {items.map((child) => (
            <div key={child.docId} className={styles.slide} role="listitem">
              <V2ContentCard
                card={child}
                size="medium"
                fullWidth
                destinationTile
                destinationReaderMode={readerMode}
                adminEditReturnTo={adminEditReturnTo}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

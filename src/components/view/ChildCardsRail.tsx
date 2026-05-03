'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import JournalImage from '@/components/common/JournalImage';
import type { Card } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import {
  getAspectRatioBucket,
  getAspectRatioValue,
  getObjectPositionForAspectRatio,
} from '@/lib/utils/objectPositionUtils';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './ChildCardsRail.module.css';

export interface ChildCardsRailProps {
  cards: Card[];
  /** Section heading (default matches story-parent context). */
  title?: string;
}

export default function ChildCardsRail({ cards, title = 'More...' }: ChildCardsRailProps) {
  const { readerMode } = useCardContext();
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
          role="region"
          aria-label="Open a card in this story"
        >
          {items.map((child) => {
            const cover = child.coverImage;
            const bucket = getAspectRatioBucket(cover);
            const ratio = getAspectRatioValue(bucket);
            const frameClass =
              bucket === 'landscape'
                ? styles.thumbLandscape
                : bucket === 'square'
                  ? styles.thumbSquare
                  : styles.thumbPortrait;
            const objectPosition =
              cover &&
              child.coverImageFocalPoint &&
              cover.width &&
              cover.height
                ? getObjectPositionForAspectRatio(
                    {
                      x: child.coverImageFocalPoint.x ?? 0,
                      y: child.coverImageFocalPoint.y ?? 0,
                    },
                    { width: cover.width, height: cover.height },
                    ratio,
                    320
                  )
                : 'center';

            return (
              <div key={child.docId} className={styles.slide}>
                <Link
                  href={`/view/${child.docId}?mode=${readerMode}`}
                  className={styles.slideLink}
                  data-card-id={child.docId}
                >
                  <div className={`${styles.thumb} ${frameClass}`}>
                    {cover ? (
                      <JournalImage
                        src={getDisplayUrl(cover)}
                        alt={child.title?.trim() || 'Cover'}
                        className={styles.thumbImage}
                        width={320}
                        height={400}
                        sizes="(max-width: 768px) 72vw, 280px"
                        style={{ objectFit: 'cover', objectPosition }}
                      />
                    ) : (
                      <div className={styles.noCover}>No cover</div>
                    )}
                  </div>
                  <p className={styles.slideTitle}>{child.title?.trim() || 'Untitled'}</p>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

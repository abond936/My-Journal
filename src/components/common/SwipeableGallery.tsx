'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './SwipeableGallery.module.css';

interface SwipeableGalleryProps {
  media: HydratedGalleryMediaItem[];
  initialIndex?: number;
}

export default function SwipeableGallery({ media, initialIndex = 0 }: SwipeableGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const goToNext = useCallback(() => {
    setCurrentIndex(current => 
      current < media.length - 1 ? current + 1 : current
    );
  }, [media.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(current => 
      current > 0 ? current - 1 : current
    );
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  // Handle touch events
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const currentItem = media[currentIndex];
  if (!currentItem) return null;

  return (
    <div className={styles.galleryContainer}>
      <div 
        className={styles.imageContainer}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button 
          className={`${styles.navButton} ${styles.prevButton}`}
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          ‹
        </button>
        
        <img
          src={getDisplayUrl(currentItem.media)}
          alt={currentItem.caption || ''}
          className={styles.galleryImage}
        />
        
        <button 
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={goToNext}
          disabled={currentIndex === media.length - 1}
        >
          ›
        </button>
      </div>

      {currentItem.caption && (
        <div className={styles.caption}>
          <p>{currentItem.caption}</p>
        </div>
      )}

      <div className={styles.pagination}>
        {media.map((_, index) => (
          <button
            key={index}
            className={`${styles.paginationDot} ${index === currentIndex ? styles.active : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
} 
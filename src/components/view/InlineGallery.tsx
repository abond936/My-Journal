'use client';

import React, { useState, useRef, useCallback } from 'react';
import JournalImage from '@/components/common/JournalImage';
import { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import {
  getEffectiveGalleryCaption,
  getEffectiveGalleryObjectPosition,
} from '@/lib/utils/galleryObjectPosition';
import styles from './InlineGallery.module.css';

interface InlineGalleryProps {
  media: HydratedGalleryMediaItem[];
  title?: string;
}

export default function InlineGallery({ media, title = "Gallery" }: InlineGalleryProps) {
  const [showNavButtons, setShowNavButtons] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const validMedia = media.filter(item => item.media);
  
  if (validMedia.length === 0) return null;

  const scrollToImage = useCallback((direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of container width
    const newScrollLeft = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollToImage('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollToImage('right');
    }
  }, [scrollToImage]);

  return (
    <section className={styles.gallerySection}>
      <div className={styles.galleryHeader}>
        <h2 className={styles.galleryTitle}>{title}</h2>
        <span className={styles.imageCount}>
          {validMedia.length} {validMedia.length === 1 ? 'image' : 'images'}
        </span>
      </div>
      
      <div 
        className={styles.galleryContainer}
        onMouseEnter={() => setShowNavButtons(true)}
        onMouseLeave={() => setShowNavButtons(false)}
        onFocus={() => setShowNavButtons(true)}
        onBlur={() => setShowNavButtons(false)}
      >
        {/* Navigation buttons - visible on desktop/tablet */}
        {validMedia.length > 1 && (
          <>
            <button
              className={`${styles.navButton} ${styles.prevButton} ${showNavButtons ? styles.visible : ''}`}
              onClick={() => scrollToImage('left')}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              className={`${styles.navButton} ${styles.nextButton} ${showNavButtons ? styles.visible : ''}`}
              onClick={() => scrollToImage('right')}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
        
        {/* Horizontal scrolling container */}
        <div 
          ref={scrollContainerRef}
          className={styles.scrollContainer}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Image gallery"
        >
          {validMedia.map((item, index) => {
            const displayCaption = getEffectiveGalleryCaption(item, item.media);
            return (
              <div key={item.mediaId} className={styles.imageItem}>
                <div className={styles.imageWrapper}>
                  <JournalImage
                    src={getDisplayUrl(item.media)}
                    alt={displayCaption.trim() ? displayCaption : `Image ${index + 1}`}
                    className={styles.galleryImage}
                    width={300}
                    height={200}
                    sizes="(max-width: 768px) 200px, 300px"
                    style={{
                      objectFit: 'cover',
                      objectPosition: getEffectiveGalleryObjectPosition(item, item.media),
                    }}
                    priority={index < 2} // Prioritize first 2 images
                  />
                </div>
                {displayCaption.trim() ? (
                  <p className={styles.imageCaption}>{displayCaption}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
} 
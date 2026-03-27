'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import JournalImage from '@/components/common/JournalImage';
import { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import {
  getEffectiveGalleryCaption,
} from '@/lib/utils/galleryObjectPosition';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Zoom, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/zoom';
import styles from './InlineGallery.module.css';

interface InlineGalleryProps {
  media: HydratedGalleryMediaItem[];
  title?: string;
}

export default function InlineGallery({ media, title = "Gallery" }: InlineGalleryProps) {
  const [showNavButtons, setShowNavButtons] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
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

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', onWindowKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onWindowKeyDown);
    };
  }, [lightboxOpen]);

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const handleLightboxKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLightbox();
    }
  }, [closeLightbox]);

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
            const isPortrait =
              Boolean(item.media) &&
              typeof item.media.width === 'number' &&
              typeof item.media.height === 'number' &&
              item.media.height > item.media.width;
            return (
              <div key={item.mediaId} className={styles.imageItem}>
                <button
                  type="button"
                  className={styles.imageWrapperButton}
                  onClick={() => openLightbox(index)}
                  aria-label={`Open image ${index + 1} fullscreen`}
                >
                  <div className={styles.imageWrapper}>
                    <JournalImage
                      src={getDisplayUrl(item.media)}
                      alt={displayCaption.trim() ? displayCaption : `Image ${index + 1}`}
                      className={styles.galleryImage}
                      width={300}
                      height={200}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 96vw, 94vw"
                      style={{
                        objectFit: isPortrait ? 'contain' : 'cover',
                        objectPosition: 'center',
                      }}
                      priority={index < 2} // Prioritize first 2 images
                    />
                  </div>
                </button>
                {displayCaption.trim() ? (
                  <p className={styles.imageCaption}>{displayCaption}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {lightboxOpen ? (
        <div
          className={styles.lightboxOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={closeLightbox}
          onKeyDown={handleLightboxKeyDown}
          tabIndex={-1}
        >
          <div className={styles.lightboxCounter}>
            {activeIndex + 1} / {validMedia.length}
          </div>
          <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={closeLightbox}
              aria-label="Close image viewer"
            >
              Close
            </button>
            <Swiper
              modules={[Navigation, Zoom, Keyboard]}
              initialSlide={activeIndex}
              navigation
              zoom={{ maxRatio: 4, minRatio: 1 }}
              keyboard={{ enabled: true }}
              spaceBetween={0}
              onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
              className={styles.lightboxSwiper}
            >
              {validMedia.map((item, index) => {
                const displayCaption = getEffectiveGalleryCaption(item, item.media);
                return (
                  <SwiperSlide key={`lightbox-${item.mediaId}-${index}`}>
                    <div className="swiper-zoom-container">
                      <JournalImage
                        src={getDisplayUrl(item.media)}
                        alt={displayCaption.trim() ? displayCaption : `Image ${index + 1}`}
                        className={styles.lightboxImage}
                        width={1600}
                        height={1200}
                        sizes="100vw"
                        style={{ objectFit: 'contain', objectPosition: 'center' }}
                        priority={index === activeIndex}
                      />
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
            {validMedia[activeIndex] ? (
              <p className={styles.lightboxCaption}>
                {getEffectiveGalleryCaption(validMedia[activeIndex], validMedia[activeIndex].media).trim()}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
} 
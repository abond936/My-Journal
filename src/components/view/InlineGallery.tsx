'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import JournalImage from '@/components/common/JournalImage';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { Card, HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl, getReaderDisplayUrl } from '@/lib/utils/photoUtils';
import {
  getEffectiveGalleryCaption,
  getEffectiveGalleryObjectPosition,
} from '@/lib/utils/galleryObjectPosition';
import { patchReaderGalleryCaption } from '@/lib/utils/readerCardPatchReconcile';
import { getAspectRatioBucket } from '@/lib/utils/objectPositionUtils';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Zoom, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/zoom';
import styles from './InlineGallery.module.css';

interface InlineGalleryProps {
  media: HydratedGalleryMediaItem[];
  title?: string | null;
  variant?: 'default' | 'galleryDetail';
  editableCaptions?: boolean;
  cardId?: string;
  onGallerySaved?: (savedCard: Card) => void;
}

export default function InlineGallery({
  media,
  title = 'Gallery',
  variant = 'default',
  editableCaptions = false,
  cardId,
  onGallerySaved,
}: InlineGalleryProps) {
  const feedback = useAppFeedback();
  const [showNavButtons, setShowNavButtons] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [captionDraft, setCaptionDraft] = useState('');
  const [captionSaving, setCaptionSaving] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const validMedia = useMemo(() => media.filter((item) => item.media), [media]);
  const canEditCaptions = editableCaptions && Boolean(cardId) && Boolean(onGallerySaved);
  const activeItem = validMedia[activeIndex];

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

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
    const item = validMedia[index];
    setCaptionDraft(item ? getEffectiveGalleryCaption(item, item.media) : '');
    setLightboxOpen(true);
  }, [validMedia]);

  const saveCaptionForItem = useCallback(
    async (item: HydratedGalleryMediaItem, draft: string): Promise<boolean> => {
      if (!canEditCaptions || !cardId || !onGallerySaved) return true;
      const trimmedDraft = draft.trim();
      const currentEffective = getEffectiveGalleryCaption(item, item.media).trim();
      if (trimmedDraft === currentEffective) return true;

      setCaptionSaving(true);
      try {
        const saved = await patchReaderGalleryCaption(cardId, media, item.mediaId, trimmedDraft);
        if (saved) {
          onGallerySaved(saved);
        }
        return true;
      } catch (err) {
        feedback.showError(
          err instanceof Error ? err.message : 'This caption could not be saved. Your changes are still here. Try again.',
          'Caption not saved'
        );
        return false;
      } finally {
        setCaptionSaving(false);
      }
    },
    [canEditCaptions, cardId, feedback, media, onGallerySaved]
  );

  const closeLightbox = useCallback(async () => {
    if (captionSaving) return;
    if (canEditCaptions && activeItem) {
      const saved = await saveCaptionForItem(activeItem, captionDraft);
      if (!saved) return;
    }
    setLightboxOpen(false);
  }, [activeItem, canEditCaptions, captionDraft, captionSaving, saveCaptionForItem]);

  useEffect(() => {
    if (!lightboxOpen || !activeItem) return;
    setCaptionDraft(getEffectiveGalleryCaption(activeItem, activeItem.media));
  }, [activeItem, lightboxOpen]);

  const handleCaptionSave = useCallback(async () => {
    if (!activeItem) return;
    await saveCaptionForItem(activeItem, captionDraft);
  }, [activeItem, captionDraft, saveCaptionForItem]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void closeLightbox();
      }
    };
    window.addEventListener('keydown', onWindowKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onWindowKeyDown);
    };
  }, [closeLightbox, lightboxOpen]);

  const handleLightboxKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      void closeLightbox();
    }
  }, [closeLightbox]);

  if (validMedia.length === 0) return null;

  return (
    <section
      className={`${styles.gallerySection} ${variant === 'galleryDetail' ? styles.galleryDetailSection : ''}`.trim()}
    >
      {title ? (
        <div className={styles.galleryHeader}>
          <h2 className={styles.galleryTitle}>{title}</h2>
          <span className={styles.imageCount}>
            {validMedia.length} {validMedia.length === 1 ? 'image' : 'images'}
          </span>
        </div>
      ) : null}
      
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
            const ratioBucket = getAspectRatioBucket(item.media);
            const wrapperClass =
              ratioBucket === 'landscape'
                ? styles.imageLandscape
                : ratioBucket === 'square'
                  ? styles.imageSquare
                  : styles.imagePortrait;
            return (
              <div key={item.mediaId} className={styles.imageItem}>
                <button
                  type="button"
                  className={styles.imageWrapperButton}
                  onClick={() => openLightbox(index)}
                  aria-label={`Open image ${index + 1} fullscreen`}
                >
                  <div className={`${styles.imageWrapper} ${wrapperClass}`}>
                    {variant === 'galleryDetail' ? (
                      <span className={styles.imageSequencePill}>
                        {index + 1}/{validMedia.length}
                      </span>
                    ) : null}
                    <JournalImage
                      src={getReaderDisplayUrl(item.media)}
                      alt={displayCaption.trim() ? displayCaption : `Image ${index + 1}`}
                      className={styles.galleryImage}
                      width={300}
                      height={200}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 96vw, 94vw"
                      style={{
                        objectFit: 'cover',
                        objectPosition: getEffectiveGalleryObjectPosition(item, item.media),
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
              disabled={captionSaving}
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
              onSlideChange={(swiper) => {
                if (canEditCaptions && activeItem) {
                  const previousIndex = activeIndex;
                  const nextIndex = swiper.activeIndex;
                  void saveCaptionForItem(activeItem, captionDraft).then((saved) => {
                    if (saved) {
                      setActiveIndex(nextIndex);
                    } else {
                      swiper.slideTo(previousIndex);
                    }
                  });
                  return;
                }
                setActiveIndex(swiper.activeIndex);
              }}
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
            {activeItem ? (
              canEditCaptions ? (
                <textarea
                  className={styles.lightboxCaptionInput}
                  rows={2}
                  value={captionDraft}
                  placeholder="Add caption"
                  onChange={(event) => setCaptionDraft(event.target.value)}
                  onBlur={() => void handleCaptionSave()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleCaptionSave();
                      event.currentTarget.blur();
                    }
                  }}
                  disabled={captionSaving}
                  aria-label="Gallery image caption"
                />
              ) : (
                <p className={styles.lightboxCaption}>
                  {getEffectiveGalleryCaption(activeItem, activeItem.media).trim()}
                </p>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
} 

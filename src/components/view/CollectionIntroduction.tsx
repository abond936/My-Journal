'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import JournalImage from '@/components/common/JournalImage';
import TipTapStaticContent from '@/components/common/TipTapStaticContent';
import InlineGallery from '@/components/view/InlineGallery';
import type { Card, HydratedGalleryMediaItem } from '@/lib/types/card';
import { getReaderDisplayUrl } from '@/lib/utils/photoUtils';
import { getObjectPositionFromFocalPoint } from '@/lib/utils/objectPositionUtils';
import styles from './CollectionIntroduction.module.css';

function hasMeaningfulRichContent(content: string | null | undefined): boolean {
  const value = content?.trim();
  if (!value) return false;
  if (/<(?:img|figure|video|audio)\b|data-media-id=/i.test(value)) return true;
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim().length > 0;
}

export function hasCollectionIntroduction(card: Card | null | undefined): boolean {
  if (!card) return false;
  return Boolean(
    card.subtitle?.trim() ||
      card.coverImage ||
      hasMeaningfulRichContent(card.content) ||
      card.galleryMedia?.some((item) => item.media)
  );
}

export default function CollectionIntroduction({ card }: { card: Card }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const isExpanded = expandedCardId === card.docId;

  const hydratedGallery = useMemo(
    () => (card.galleryMedia ?? []).filter(
      (item): item is HydratedGalleryMediaItem => Boolean(item.media)
    ),
    [card.galleryMedia]
  );
  const coverMediaId = card.coverImageId ?? card.coverImage?.docId ?? null;
  const galleryWithoutCover = useMemo(
    () => hydratedGallery.filter((item) => item.mediaId !== coverMediaId),
    [coverMediaId, hydratedGallery]
  );
  const coverObjectFit = card.coverImageMode === 'fit' ? 'contain' : 'cover';
  const coverObjectPosition =
    coverObjectFit === 'cover' &&
    card.coverImageFocalPoint &&
    card.coverImage?.width &&
    card.coverImage?.height
      ? getObjectPositionFromFocalPoint(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height }
        )
      : 'center';

  useLayoutEffect(() => {
    setExpandedCardId(null);
    setNeedsExpansion(false);
  }, [card.docId]);

  useLayoutEffect(() => {
    if (isExpanded) return;
    const element = contentRef.current;
    if (!element) return;

    const measure = () => {
      setNeedsExpansion(element.scrollHeight > element.clientHeight + 1);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [card.content, card.coverImage, card.galleryMedia, card.subtitle, isExpanded]);

  if (!hasCollectionIntroduction(card)) return null;

  const contentId = `collection-introduction-${card.docId}`;

  return (
    <section className={styles.introduction} aria-label={`${card.title || 'Collection'} introduction`}>
      <div
        id={contentId}
        ref={contentRef}
        className={`${styles.introductionContent} ${isExpanded ? styles.introductionContentExpanded : styles.introductionContentCollapsed}`}
      >
        {card.subtitle?.trim() ? <p className={styles.subtitle}>{card.subtitle.trim()}</p> : null}
        {card.coverImage ? (
          <div className={styles.coverFrame}>
            <JournalImage
              src={getReaderDisplayUrl(card.coverImage)}
              alt={card.title || card.subtitle || 'Collection introduction'}
              className={styles.coverImage}
              width={1000}
              height={700}
              sizes="(max-width: 768px) 100vw, 900px"
              style={{ objectFit: coverObjectFit, objectPosition: coverObjectPosition }}
            />
          </div>
        ) : null}
        {hasMeaningfulRichContent(card.content) ? (
          <div className={styles.prose}>
            <TipTapStaticContent content={card.content} headingVariant="storyDetail" />
          </div>
        ) : null}
        {galleryWithoutCover.length > 0 ? (
          <InlineGallery
            media={galleryWithoutCover}
            sequenceMedia={hydratedGallery}
            title={card.type === 'gallery' ? null : 'Gallery'}
            ariaLabel={`${card.title || 'Collection'} introduction gallery`}
          />
        ) : null}
        {!isExpanded && needsExpansion ? <div className={styles.fade} aria-hidden="true" /> : null}
      </div>
      {needsExpansion || isExpanded ? (
        <button
          type="button"
          className={styles.expansionButton}
          aria-controls={contentId}
          aria-expanded={isExpanded}
          onClick={() => setExpandedCardId(isExpanded ? null : card.docId)}
        >
          {isExpanded ? 'Show less' : 'Continue reading'}
        </button>
      ) : null}
    </section>
  );
}

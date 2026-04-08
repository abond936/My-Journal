'use client';

import React from 'react';
import Link from 'next/link';
import JournalImage from '@/components/common/JournalImage';
import { Card } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils'; // Corrected import path
import { getObjectPositionForAspectRatio } from '@/lib/utils/objectPositionUtils';
import { getEffectiveGalleryObjectPosition } from '@/lib/utils/galleryObjectPosition';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import styles from './V2ContentCard.module.css';

// Simple horizontal slider
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

// --- Card Type Renderers ---

const StoryCardContent: React.FC<{ card: Card; displayMode: string }> = ({ card, displayMode }) => {
  const objectPosition =
    card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
      ? getObjectPositionForAspectRatio(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height },
          '1/1',
          400
        )
      : 'center';

  return (
    <>
      {card.coverImage && (
        <div className={styles.imageContainer}>
          <JournalImage 
            src={getDisplayUrl(card.coverImage)} 
            alt={card.title} 
            className={styles.image}
            width={400}
            height={300}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectPosition }}
            priority={false}
          />
        </div>
      )}
      <div className={styles.content}>
        <h3 className={styles.title}>{card.title}</h3>
        {card.excerpt && <p className={styles.description}>{card.excerpt}</p>}
        {/* Add inline content for inline display mode */}
        {displayMode === 'inline' && card.content && (
          <div className={styles.inlineContent}>
            <TipTapRenderer content={card.content} />
          </div>
        )}
      </div>
    </>
  );
};

// NEW: A dedicated renderer for gallery card previews.
// Uses cover image for feed thumbnail when set; otherwise first gallery image.
const GalleryCardContent: React.FC<{ card: Card; displayMode: string }> = ({ card, displayMode }) => {
  const hasGallery = card.galleryMedia && card.galleryMedia.length > 0;
  const objectPosition =
    card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
      ? getObjectPositionForAspectRatio(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height },
          '1/1',
          400
        )
      : 'center';

  return (
    <>
      {card.coverImage ? (
        <div className={styles.imageContainer}>
          <JournalImage 
            src={getDisplayUrl(card.coverImage)} 
            alt={card.title} 
            className={styles.image}
            width={400}
            height={300}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectPosition }}
            priority={false}
          />
        </div>
      ) : hasGallery ? (
        <div className={styles.imageContainer}>
          <Swiper spaceBetween={0} slidesPerView={1} className={styles.swiperContainer}>
            {card.galleryMedia?.map(item =>
              item.media ? (
                <SwiperSlide key={item.mediaId}>
                  <JournalImage 
                    src={getDisplayUrl(item.media)} 
                    alt={item.media.filename || ''} 
                    className={styles.image}
                    width={400}
                    height={300}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    style={{ objectPosition: getEffectiveGalleryObjectPosition(item, item.media) }}
                    priority={false}
                  />
                </SwiperSlide>
              ) : null
            )}
          </Swiper>
        </div>
      ) : null}
      <div className={styles.content}>
        <h3 className={styles.title}>{card.title}</h3>
      </div>
    </>
  );
};

const QuoteCardContent: React.FC<{ card: Card; displayMode: string }> = ({ card, displayMode }) => (
  <div className={styles.content}>
    <blockquote className={styles.quoteText}>{card.content}</blockquote>
    {card.title && <cite className={styles.quoteCite}>— {card.title}</cite>}
  </div>
);

const QACardContent: React.FC<{ card: Card; displayMode: string }> = ({ card, displayMode }) => (
  <div className={styles.content}>
    <p className={styles.qaQuestion}>Q: {card.title}</p>
    <p className={styles.qaAnswer}>A: {card.content}</p>
  </div>
);

const CalloutCardContent: React.FC<{ card: Card; displayMode: string }> = ({ card, displayMode }) => (
  <div className={styles.content}>
    <h3 className={styles.calloutText}>{card.title}</h3>
  </div>
);

// --- Main V2 Component ---

interface V2ContentCardProps {
  card: Card;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const V2ContentCard: React.FC<V2ContentCardProps> = ({ card, size = 'medium', onClick }) => {
  const displayMode = card.displayMode || 'navigate';
  
  // Determine if card should be interactive based on display mode
  const isInteractive = displayMode === 'navigate' && 
    (card.type === 'story' || card.type === 'gallery');
  
  const cardTypeClass = styles[card.type] || styles.story;
  const sizeClass = styles[size] || styles.medium;
  const displayModeClass = styles[displayMode] || '';
  const className = `${styles.card} ${cardTypeClass} ${sizeClass} ${displayModeClass}`;

  const renderContent = () => {
    switch (card.type) {
      case 'gallery':
        return <GalleryCardContent card={card} displayMode={displayMode} />;
      case 'quote':
        return <QuoteCardContent card={card} displayMode={displayMode} />;
      case 'qa':
        return <QACardContent card={card} displayMode={displayMode} />;
      case 'callout':
        return <CalloutCardContent card={card} displayMode={displayMode} />;
      case 'story':
      default:
        return <StoryCardContent card={card} displayMode={displayMode} />;
    }
  };

  if (isInteractive) {
    return (
      <Link href={`/view/${card.docId}`} className={className} onClick={onClick}>
        {renderContent()}
      </Link>
    );
  }

  return <div className={className}>{renderContent()}</div>;
};

export default V2ContentCard; 
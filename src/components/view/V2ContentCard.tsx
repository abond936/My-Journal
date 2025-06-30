'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils'; // Corrected import path
import styles from './V2ContentCard.module.css';

// Simple horizontal slider
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

// --- Card Type Renderers ---

const StoryCardContent: React.FC<{ card: Card }> = ({ card }) => {
  return (
    <>
      {card.coverImage && (
        <div className={styles.imageContainer}>
          <img src={getDisplayUrl(card.coverImage)} alt={card.title} className={styles.image} />
        </div>
      )}
      <div className={styles.content}>
        <h3 className={styles.title}>{card.title}</h3>
        {card.excerpt && <p className={styles.description}>{card.excerpt}</p>}
      </div>
    </>
  );
};

// NEW: A dedicated renderer for gallery card previews.
const GalleryCardContent: React.FC<{ card: Card }> = ({ card }) => {
  const hasGallery = card.galleryMedia && card.galleryMedia.length > 0;

  return (
    <>
      {hasGallery ? (
        <div className={styles.imageContainer}>
          <Swiper spaceBetween={0} slidesPerView={1} className={styles.swiperContainer}>
            {card.galleryMedia?.map(item =>
              item.media ? (
                <SwiperSlide key={item.mediaId}>
                  <img src={getDisplayUrl(item.media)} alt={item.media.filename || ''} className={styles.image} />
                </SwiperSlide>
              ) : null
            )}
          </Swiper>
        </div>
      ) : card.coverImage ? (
        <div className={styles.imageContainer}>
          <img src={getDisplayUrl(card.coverImage)} alt={card.title} className={styles.image} />
        </div>
      ) : null}
      <div className={styles.content}>
        <h3 className={styles.title}>{card.title}</h3>
      </div>
    </>
  );
};

const QuoteCardContent: React.FC<{ card: Card }> = ({ card }) => (
  <div className={styles.content}>
    <blockquote className={styles.quoteText}>{card.content}</blockquote>
    {card.title && <cite className={styles.quoteCite}>— {card.title}</cite>}
  </div>
);

const QACardContent: React.FC<{ card: Card }> = ({ card }) => (
  <div className={styles.content}>
    <p className={styles.qaQuestion}>Q: {card.title}</p>
    <p className={styles.qaAnswer}>A: {card.content}</p>
  </div>
);

const CalloutCardContent: React.FC<{ card: Card }> = ({ card }) => (
  <div className={styles.content}>
    <h3 className={styles.calloutText}>{card.title}</h3>
  </div>
);

const CollectionCardContent: React.FC<{ card: Card }> = ({ card }) => (
  <div className={styles.content}>
    <h3 className={styles.title}>{card.title}</h3>
    {card.childrenIds && card.childrenIds.length > 0 && (
      <div className={styles.collectionCount}>{card.childrenIds.length} items</div>
    )}
  </div>
);


// --- Main V2 Component ---

interface V2ContentCardProps {
  card: Card;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const V2ContentCard: React.FC<V2ContentCardProps> = ({ card, size = 'medium', onClick }) => {
  const isInteractive = card.type === 'story' || card.type === 'collection' || card.type === 'gallery';
  const Wrapper = isInteractive ? Link : 'div';
  const wrapperProps = isInteractive ? { href: `/view/${card.id}`, onClick } : {};

  const cardTypeClass = styles[card.type] || styles.story;
  const sizeClass = styles[size] || styles.medium;

  const renderContent = () => {
    switch (card.type) {
      case 'collection':
      case 'gallery':
        return <GalleryCardContent card={card} />;
      case 'quote':
        return <QuoteCardContent card={card} />;
      case 'qa':
        return <QACardContent card={card} />;
      case 'callout':
        return <CalloutCardContent card={card} />;
      case 'story':
      default:
        return <StoryCardContent card={card} />;
    }
  };

  return (
    <Wrapper {...wrapperProps} className={`${styles.card} ${cardTypeClass} ${sizeClass}`}>
      {renderContent()}
    </Wrapper>
  );
};

export default V2ContentCard; 
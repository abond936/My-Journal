'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import JournalImage from '@/components/common/JournalImage';
import { Card, HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import {
  getAspectRatioBucket,
  getAspectRatioValue,
  getObjectPositionForAspectRatio,
} from '@/lib/utils/objectPositionUtils';
import styles from './CardDetail.module.css';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import InlineGallery from '@/components/view/InlineGallery';
import ChildCardsRail from '@/components/view/ChildCardsRail';
import DiscoverySection from '@/components/view/DiscoverySection';
import { formatQuoteAttribution } from '@/lib/utils/cardUtils';
import ReaderCardEditModal from '@/components/view/ReaderCardEditModal';

interface CardDetailPageProps {
  card: Card;
  childrenCards: Card[];
}

const CardDetailPage: React.FC<CardDetailPageProps> = ({ card, childrenCards }) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const detailReturnTo = card.docId ? `/view/${card.docId}` : null;
  const isQa = card.type === 'qa';
  const isQuote = card.type === 'quote';
  const quoteAttribution = isQuote ? formatQuoteAttribution(card.subtitle, card.excerpt) : '';
  const coverBucket = getAspectRatioBucket(card.coverImage);
  const coverRatio = getAspectRatioValue(coverBucket);
  const coverFrameClass =
    coverBucket === 'landscape'
      ? styles.coverLandscape
      : coverBucket === 'square'
        ? styles.coverSquare
        : styles.coverPortrait;
  const hydratedGalleryItems = (card.galleryMedia ?? []).filter(
    (item): item is HydratedGalleryMediaItem => Boolean(item.media)
  );

  return (
    <article className={styles.container}>
      {isAdmin && detailReturnTo && card.docId ? (
        <p className={styles.adminEditBar}>
          <ReaderCardEditModal cardId={card.docId} returnTo={detailReturnTo} className={styles.adminEditTrigger}>
            Edit card
          </ReaderCardEditModal>
        </p>
      ) : null}
      <header
        className={`${styles.header} ${!card.subtitle || isQuote ? styles.noSubtitle : ''}`}
      >
        {card.coverImage && (
          <div className={`${styles.coverImageContainer} ${coverFrameClass}`}>
            <JournalImage
              src={getDisplayUrl(card.coverImage)}
              alt={card.title}
              className={styles.coverImage}
              width={800}
              height={600}
              sizes="(max-width: 768px) 100vw, 800px"
              style={{ 
                objectPosition: card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
                  ? getObjectPositionForAspectRatio(
                      {
                        x: card.coverImageFocalPoint.x ?? 0,
                        y: card.coverImageFocalPoint.y ?? 0,
                      },
                      { width: card.coverImage.width, height: card.coverImage.height },
                      coverRatio,
                      800
                    )
                  : 'center'
              }}
              priority={true}
            />
          </div>
        )}
        <h1
          className={`${styles.title} ${card.subtitle && !isQuote ? styles.titleWithSubtitle : ''}`}
        >
          {card.title}
        </h1>
        {card.subtitle && !isQuote ? <p className={styles.subtitle}>{card.subtitle}</p> : null}
      </header>

      {card.content && (
        <section className={styles.content} aria-label={isQa ? 'Answer' : undefined}>
          {isQuote ? (
            <blockquote className={styles.quoteDetailQuote}>
              <TipTapRenderer content={card.content} />
            </blockquote>
          ) : (
            <TipTapRenderer content={card.content} />
          )}
        </section>
      )}

      {isQuote && quoteAttribution ? (
        <footer className={styles.quoteDetailFooter}>
          <cite className={styles.quoteDetailCite}>{quoteAttribution}</cite>
        </footer>
      ) : null}

      {card.type === 'story' && childrenCards.length > 0 ? (
        <ChildCardsRail cards={childrenCards} />
      ) : null}

      {/* Inline Gallery */}
      {hydratedGalleryItems.length > 0 && (
        <InlineGallery 
          media={hydratedGalleryItems}
          title="Gallery"
        />
      )}

      {/* Discovery Section */}
      <DiscoverySection
        currentCard={card}
        childrenCards={childrenCards}
        suppressChildCardsGroup={card.type === 'story' && childrenCards.length > 0}
      />
    </article>
  );
};

export default CardDetailPage; 

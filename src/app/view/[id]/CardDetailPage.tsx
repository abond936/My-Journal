'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import JournalImage from '@/components/common/JournalImage';
import { Card } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import {
  getAspectRatioBucket,
  getAspectRatioValue,
  getObjectPositionForAspectRatio,
} from '@/lib/utils/objectPositionUtils';
import styles from './CardDetail.module.css';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import InlineGallery from '@/components/view/InlineGallery';
import DiscoverySection from '@/components/view/DiscoverySection';
import { formatQuoteAttribution } from '@/lib/utils/cardUtils';

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

  return (
    <article className={styles.container}>
      {isAdmin && detailReturnTo && card.docId ? (
        <p className={styles.adminEditBar}>
          <Link
            href={`/admin/card-admin/${card.docId}/edit?returnTo=${encodeURIComponent(detailReturnTo)}`}
          >
            Edit card
          </Link>
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

      {/* Inline Gallery */}
      {card.galleryMedia && card.galleryMedia.length > 0 && (
        <InlineGallery 
          media={card.galleryMedia.filter(item => item.media) as any} 
          title="Gallery"
        />
      )}

      {/* Discovery Section */}
      <DiscoverySection 
        currentCard={card} 
        childrenCards={childrenCards} 
      />
    </article>
  );
};

export default CardDetailPage; 
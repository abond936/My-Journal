'use client';

import React, { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
import ReaderCardContextMeta from '@/components/view/ReaderCardContextMeta';
import { formatQuoteAttribution } from '@/lib/utils/cardUtils';
import { buildReaderCardPresentation } from '@/lib/utils/readerCardContext';
import ReaderCardEditModal from '@/components/view/ReaderCardEditModal';
import { useCardContext } from '@/components/providers/CardProvider';
import { useTag } from '@/components/providers/TagProvider';

interface CardDetailPageProps {
  card: Card;
  childrenCards: Card[];
  suppressDiscovery?: boolean;
  previewFullWidth?: boolean;
}

const CardDetailPage: React.FC<CardDetailPageProps> = ({
  card,
  childrenCards,
  suppressDiscovery = false,
  previewFullWidth = false,
}) => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { readerMode } = useCardContext();
  const { tags: allTags } = useTag();
  const isAdmin = session?.user?.role === 'admin';
  const explicitMode = searchParams.get('mode');
  const effectiveReaderMode =
    explicitMode === 'guided' || explicitMode === 'freeform' ? explicitMode : readerMode;
  const shouldSuppressDiscovery = suppressDiscovery || effectiveReaderMode === 'guided';
  const detailReturnTo = card.docId ? `/view/${card.docId}` : null;
  const isQa = card.type === 'qa';
  const isQuote = card.type === 'quote';
  const detailHeadingVariant =
    card.type === 'story'
      ? 'storyDetail'
      : card.type === 'gallery'
        ? 'galleryDetail'
        : 'detail';
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
  const readerCardPresentation = useMemo(
    () => buildReaderCardPresentation(card, allTags),
    [card, allTags]
  );
  const showReaderCardMeta =
    card.type !== 'callout' &&
    (Boolean(readerCardPresentation.badgeLabel) || readerCardPresentation.chips.length > 0);

  return (
    <article
      className={`${styles.container} ${previewFullWidth ? styles.previewFullWidth : ''}`}
      data-card-type={card.type}
    >
      {isAdmin && detailReturnTo && card.docId ? (
        <div className={styles.adminEditBar}>
          <ReaderCardEditModal cardId={card.docId} returnTo={detailReturnTo} className={styles.adminEditTrigger}>
            Edit card
          </ReaderCardEditModal>
        </div>
      ) : null}
      <header
        className={`${styles.header} ${!card.subtitle || isQuote ? styles.noSubtitle : ''}`}
      >
        {card.coverImage && card.type !== 'gallery' && (
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
        {showReaderCardMeta ? (
          <ReaderCardContextMeta
            badgeLabel={readerCardPresentation.badgeLabel}
            chips={readerCardPresentation.chips}
            variant="detail"
          />
        ) : null}
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
              <TipTapRenderer content={card.content} headingVariant={detailHeadingVariant} />
            </blockquote>
          ) : (
            <TipTapRenderer content={card.content} headingVariant={detailHeadingVariant} />
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
      {!shouldSuppressDiscovery ? (
        <DiscoverySection
          currentCard={card}
          childrenCards={childrenCards}
          suppressChildCardsGroup={card.type === 'story' && childrenCards.length > 0}
        />
      ) : null}
    </article>
  );
};

export default CardDetailPage; 

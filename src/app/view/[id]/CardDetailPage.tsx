'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import JournalImage from '@/components/common/JournalImage';
import { Card, HydratedGalleryMediaItem } from '@/lib/types/card';
import { getReaderDisplayUrl } from '@/lib/utils/photoUtils';
import {
  getAspectRatioBucket,
  getAspectRatioValue,
  getObjectPositionFromFocalPoint,
} from '@/lib/utils/objectPositionUtils';
import styles from './CardDetail.module.css';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import InlineGallery from '@/components/view/InlineGallery';
import ChildCardsRail from '@/components/view/ChildCardsRail';
import DiscoverySection from '@/components/view/DiscoverySection';
import ReaderCardContextMeta from '@/components/view/ReaderCardContextMeta';
import { formatQuoteAttribution } from '@/lib/utils/cardUtils';
import { buildReaderCardPresentation } from '@/lib/utils/readerCardContext';
import ReaderCardEditEntry from '@/components/view/ReaderCardEditEntry';
import { useCardContext } from '@/components/providers/CardProvider';
import { useTag } from '@/components/providers/TagProvider';

interface CardDetailPageProps {
  card: Card;
  childrenCards: Card[];
  suppressDiscovery?: boolean;
  previewFullWidth?: boolean;
}

const CardDetailPage: React.FC<CardDetailPageProps> = ({
  card: initialCard,
  childrenCards,
  suppressDiscovery = false,
  previewFullWidth = false,
}) => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { readerMode, patchVisibleCard } = useCardContext();
  const { tags: allTags } = useTag();
  const [displayCard, setDisplayCard] = useState(initialCard);
  const isAdmin = session?.user?.role === 'admin';
  const explicitMode = searchParams.get('mode');
  const effectiveReaderMode =
    explicitMode === 'guided' || explicitMode === 'freeform' ? explicitMode : readerMode;
  const shouldSuppressDiscovery = suppressDiscovery || effectiveReaderMode === 'guided';
  const detailReturnTo = displayCard.docId ? `/view/${displayCard.docId}` : null;
  const isQa = displayCard.type === 'qa';
  const isQuote = displayCard.type === 'quote';
  const detailHeadingVariant =
    displayCard.type === 'story'
      ? 'storyDetail'
      : displayCard.type === 'gallery'
        ? 'galleryDetail'
        : 'detail';
  const quoteAttribution = isQuote ? formatQuoteAttribution(displayCard.subtitle, displayCard.excerpt) : '';
  const coverBucket = getAspectRatioBucket(displayCard.coverImage);
  const coverRatio = getAspectRatioValue(coverBucket);
  const coverObjectFit = displayCard.coverImageMode === 'fit' ? 'contain' : 'cover';
  const coverFrameClass =
    coverBucket === 'landscape'
      ? styles.coverLandscape
      : coverBucket === 'square'
        ? styles.coverSquare
        : styles.coverPortrait;
  const hydratedGalleryItems = (displayCard.galleryMedia ?? []).filter(
    (item): item is HydratedGalleryMediaItem => Boolean(item.media)
  );
  const readerCardPresentation = useMemo(
    () => buildReaderCardPresentation(displayCard, allTags),
    [displayCard, allTags]
  );
  const showReaderCardMeta =
    displayCard.type !== 'callout' &&
    (Boolean(readerCardPresentation.badgeLabel) || readerCardPresentation.chips.length > 0);
  useEffect(() => {
    setDisplayCard(initialCard);
  }, [initialCard]);

  const handleCardSaved = useCallback(
    (savedCard: Card) => {
      setDisplayCard(savedCard);
      patchVisibleCard(savedCard);
    },
    [patchVisibleCard]
  );

  const quickEditMetadata = useMemo(
    () => ({
      title: displayCard.title ?? '',
      subtitle: displayCard.subtitle ?? '',
      excerpt: displayCard.excerpt ?? '',
      excerptAuto: displayCard.excerptAuto,
      content: displayCard.content ?? '',
    }),
    [
      displayCard.content,
      displayCard.excerpt,
      displayCard.excerptAuto,
      displayCard.subtitle,
      displayCard.title,
    ]
  );

  const detailMeta = showReaderCardMeta ? (
    <ReaderCardContextMeta
      badgeLabel={readerCardPresentation.badgeLabel}
      chips={readerCardPresentation.chips}
      variant="detail"
    />
  ) : null;
  const headerIntro = (
    <>
      {detailMeta}
      <h1
        className={`${styles.title} ${displayCard.subtitle && !isQuote ? styles.titleWithSubtitle : ''}`}
      >
        {displayCard.title}
      </h1>
      {displayCard.subtitle && !isQuote ? <p className={styles.subtitle}>{displayCard.subtitle}</p> : null}
    </>
  );

  const questionHeaderIntro = (
    <div className={styles.questionHeaderPanel}>
      <div className={styles.questionHeaderText}>
        <h1
          className={`${styles.title} ${displayCard.subtitle && !isQuote ? styles.titleWithSubtitle : ''}`}
        >
          {displayCard.title}
        </h1>
        {displayCard.subtitle && !isQuote ? <p className={styles.subtitle}>{displayCard.subtitle}</p> : null}
      </div>
    </div>
  );

  return (
    <article
      className={`${styles.container} ${previewFullWidth ? styles.previewFullWidth : ''}`}
      data-card-type={displayCard.type}
    >
      {isAdmin && detailReturnTo && displayCard.docId ? (
        <div className={styles.adminEditBar}>
          <ReaderCardEditEntry
            cardId={displayCard.docId}
            returnTo={detailReturnTo}
            className={styles.adminEditTriggerButton}
            metadata={quickEditMetadata}
            onCardSaved={handleCardSaved}
          >
            Edit card
          </ReaderCardEditEntry>
        </div>
      ) : null}
      <header
        className={`${styles.header} ${!displayCard.subtitle || isQuote ? styles.noSubtitle : ''}`}
      >
        {displayCard.coverImage && displayCard.type !== 'gallery' && (
          <div className={`${styles.coverImageContainer} ${coverFrameClass}`}>
            <JournalImage
              src={getReaderDisplayUrl(displayCard.coverImage)}
              alt={displayCard.title}
              className={styles.coverImage}
              width={800}
              height={600}
              sizes="(max-width: 768px) 100vw, 800px"
              style={{ 
                objectFit: coverObjectFit,
                objectPosition: coverObjectFit === 'cover' && displayCard.coverImageFocalPoint && displayCard.coverImage?.width && displayCard.coverImage?.height
                  ? getObjectPositionFromFocalPoint(
                      {
                        x: displayCard.coverImageFocalPoint.x ?? 0,
                        y: displayCard.coverImageFocalPoint.y ?? 0,
                      },
                      { width: displayCard.coverImage.width, height: displayCard.coverImage.height }
                    )
                  : 'center'
              }}
              priority={true}
            />
          </div>
        )}
        {isQa ? (
          <>
            {questionHeaderIntro}
            {detailMeta ? <div className={styles.questionDetailMeta}>{detailMeta}</div> : null}
          </>
        ) : (
          headerIntro
        )}
      </header>

      {displayCard.content && (
        <section className={styles.content} aria-label={isQa ? 'Answer' : undefined}>
          {isQuote ? (
            <blockquote className={styles.quoteDetailQuote}>
              <TipTapRenderer content={displayCard.content} headingVariant={detailHeadingVariant} />
            </blockquote>
          ) : (
            <TipTapRenderer content={displayCard.content} headingVariant={detailHeadingVariant} />
          )}
        </section>
      )}

      {isQuote && quoteAttribution ? (
        <footer className={styles.quoteDetailFooter}>
          <cite className={styles.quoteDetailCite}>{quoteAttribution}</cite>
        </footer>
      ) : null}

      {displayCard.type === 'story' && childrenCards.length > 0 ? (
        <ChildCardsRail cards={childrenCards} />
      ) : null}

      {/* Inline Gallery */}
      {hydratedGalleryItems.length > 0 && (
        <InlineGallery 
          media={hydratedGalleryItems}
          title={displayCard.type === 'gallery' ? null : 'Gallery'}
          variant={displayCard.type === 'gallery' ? 'galleryDetail' : 'default'}
          editableCaptions={isAdmin}
          cardId={displayCard.docId}
          onGallerySaved={handleCardSaved}
        />
      )}

      {/* Discovery Section */}
      {!shouldSuppressDiscovery ? (
        <DiscoverySection
          currentCard={displayCard}
          childrenCards={childrenCards}
          suppressChildCardsGroup={displayCard.type === 'story' && childrenCards.length > 0}
        />
      ) : null}
    </article>
  );
};

export default CardDetailPage; 

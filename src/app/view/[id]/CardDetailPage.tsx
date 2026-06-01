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
  const coverObjectFit = card.coverImageMode === 'fit' ? 'contain' : 'cover';
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
        className={`${styles.title} ${card.subtitle && !isQuote ? styles.titleWithSubtitle : ''}`}
      >
        {card.title}
      </h1>
      {card.subtitle && !isQuote ? <p className={styles.subtitle}>{card.subtitle}</p> : null}
    </>
  );

  const questionHeaderIntro = (
    <div className={styles.questionHeaderPanel}>
      <div className={styles.questionHeaderText}>
        <h1
          className={`${styles.title} ${card.subtitle && !isQuote ? styles.titleWithSubtitle : ''}`}
        >
          {card.title}
        </h1>
        {card.subtitle && !isQuote ? <p className={styles.subtitle}>{card.subtitle}</p> : null}
      </div>
    </div>
  );

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
                objectFit: coverObjectFit,
                objectPosition: coverObjectFit === 'cover' && card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
                  ? getObjectPositionFromFocalPoint(
                      {
                        x: card.coverImageFocalPoint.x ?? 0,
                        y: card.coverImageFocalPoint.y ?? 0,
                      },
                      { width: card.coverImage.width, height: card.coverImage.height }
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
          title={card.type === 'gallery' ? null : 'Gallery'}
          variant={card.type === 'gallery' ? 'galleryDetail' : 'default'}
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

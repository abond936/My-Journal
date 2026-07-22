'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import JournalImage from '@/components/common/JournalImage';
import { Card, HydratedGalleryMediaItem } from '@/lib/types/card';
import { getReaderDisplayUrl } from '@/lib/utils/photoUtils';
import {
  getAspectRatioBucket,
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
import { resolveReaderRouteMode } from '@/lib/utils/readerMode';
import { Pencil } from 'lucide-react';
import { getQuestionPromptLength } from '@/lib/utils/questionPromptPresentation';

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
  const effectiveReaderMode = resolveReaderRouteMode('/view/detail', explicitMode, readerMode);
  const shouldSuppressDiscovery = suppressDiscovery || effectiveReaderMode === 'guided';
  const detailReturnTo = displayCard.docId ? `/view/${displayCard.docId}` : null;
  const isQa = displayCard.type === 'qa';
  const isQuote = displayCard.type === 'quote';
  const isCallout = displayCard.type === 'callout';
  const detailHeadingVariant =
    displayCard.type === 'story'
      ? 'storyDetail'
      : displayCard.type === 'gallery'
        ? 'galleryDetail'
        : 'detail';
  const quoteAttribution = isQuote ? formatQuoteAttribution(displayCard.subtitle, displayCard.excerpt) : '';
  const coverBucket = getAspectRatioBucket(displayCard.coverImage);
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
  const coverMediaId = displayCard.coverImageId ?? displayCard.coverImage?.docId ?? null;
  const coverGalleryItem = coverMediaId
    ? hydratedGalleryItems.find((item) => item.mediaId === coverMediaId) ?? null
    : null;
  const galleryHasExternalCover =
    displayCard.type === 'gallery' && Boolean(displayCard.coverImage && coverMediaId && !coverGalleryItem);
  const galleryHeroItem = displayCard.type === 'gallery' && !galleryHasExternalCover
    ? coverGalleryItem ?? hydratedGalleryItems[0] ?? null
    : null;
  const heroMediaId = displayCard.type === 'gallery'
    ? galleryHeroItem?.mediaId ?? coverMediaId
    : coverMediaId;
  const remainingGalleryItems = hydratedGalleryItems.filter((item) => item.mediaId !== heroMediaId);
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
  const detailType = readerCardPresentation.badgeLabel ? (
    <ReaderCardContextMeta badgeLabel={readerCardPresentation.badgeLabel} chips={[]} variant="detail" />
  ) : null;
  const detailTags = readerCardPresentation.chips.length > 0 ? (
    <ReaderCardContextMeta chips={readerCardPresentation.chips} variant="detail" />
  ) : null;
  const storyGalleryIdentity = (
    <>
      {readerCardPresentation.badgeLabel ? (
        <p className={styles.detailKicker}>{readerCardPresentation.badgeLabel}</p>
      ) : null}
      <h1 className={`${styles.title} ${displayCard.subtitle ? styles.titleWithSubtitle : ''}`}>
        {displayCard.title}
      </h1>
      {displayCard.subtitle ? <p className={styles.subtitle}>{displayCard.subtitle}</p> : null}
      {detailTags ? <div className={styles.detailTags}>{detailTags}</div> : null}
    </>
  );
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
    <div
      className={styles.questionHeaderPanel}
      data-question-prompt-length={getQuestionPromptLength(displayCard.title)}
    >
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
  const coveredQuestionIdentity = (
    <div className={styles.questionCoveredIdentity}>
      {detailType}
      <h1 className={`${styles.title} ${displayCard.subtitle ? styles.titleWithSubtitle : ''}`}>
        {displayCard.title}
      </h1>
      {displayCard.subtitle ? <p className={styles.subtitle}>{displayCard.subtitle}</p> : null}
      {detailTags ? <div className={styles.detailTags}>{detailTags}</div> : null}
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
            ariaLabel="Edit open card"
            metadata={quickEditMetadata}
            onCardSaved={handleCardSaved}
          >
            <Pencil size={14} aria-hidden="true" />
            <span className={styles.srOnly}>Edit</span>
          </ReaderCardEditEntry>
        </div>
      ) : null}
      <div className={isCallout ? styles.calloutDetailPanel : undefined}>
      {isCallout ? (
        <JournalImage
          src="/images/pushpin.svg"
          alt=""
          width={458}
          height={443}
          className={styles.calloutDetailWatermark}
          aria-hidden="true"
        />
      ) : null}
      {displayCard.type !== 'gallery' ? (
        <header
          className={`${styles.header} ${!displayCard.subtitle || isQuote ? styles.noSubtitle : ''}`}
        >
        {displayCard.coverImage && (
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
          displayCard.coverImage ? coveredQuestionIdentity : (
            <>
              {questionHeaderIntro}
              {detailType ? <div className={styles.questionDetailMeta}>{detailType}</div> : null}
              {detailTags ? <div className={styles.questionDetailTags}>{detailTags}</div> : null}
            </>
          )
        ) : displayCard.type === 'story' ? (
          storyGalleryIdentity
        ) : (
          headerIntro
        )}
        </header>
      ) : null}

      {displayCard.type === 'gallery' && galleryHeroItem ? (
        <InlineGallery
          media={[galleryHeroItem]}
          sequenceMedia={hydratedGalleryItems}
          title={null}
          ariaLabel={displayCard.title}
          variant="galleryDetail"
          editableCaptions={isAdmin}
          cardId={displayCard.docId}
          onGallerySaved={handleCardSaved}
        />
      ) : displayCard.type === 'gallery' && displayCard.coverImage ? (
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
              objectPosition:
                coverObjectFit === 'cover' &&
                displayCard.coverImageFocalPoint &&
                displayCard.coverImage.width &&
                displayCard.coverImage.height
                  ? getObjectPositionFromFocalPoint(
                      {
                        x: displayCard.coverImageFocalPoint.x ?? 0,
                        y: displayCard.coverImageFocalPoint.y ?? 0,
                      },
                      { width: displayCard.coverImage.width, height: displayCard.coverImage.height }
                    )
                  : 'center',
            }}
            priority
          />
        </div>
      ) : null}

      {displayCard.type === 'gallery' ? (
        <header className={`${styles.header} ${styles.galleryIdentityHeader}`}>
          {storyGalleryIdentity}
        </header>
      ) : null}

      {displayCard.content && (
        <section className={styles.content} aria-label={isQa ? 'Answer' : undefined}>
          {isQuote ? (
            <blockquote className={styles.quoteDetailQuote}>
              <TipTapRenderer content={displayCard.content} headingVariant={detailHeadingVariant} />
            </blockquote>
          ) : (
            <TipTapRenderer
              content={displayCard.content}
              headingVariant={detailHeadingVariant}
              surface={isCallout ? 'transparent' : 'default'}
            />
          )}
        </section>
      )}

      {isQuote && quoteAttribution ? (
        <footer className={styles.quoteDetailFooter}>
          <cite className={styles.quoteDetailCite}>{quoteAttribution}</cite>
        </footer>
      ) : null}
      </div>

      {/* Inline Gallery */}
      {remainingGalleryItems.length > 0 && (
        <InlineGallery 
          media={remainingGalleryItems}
          sequenceMedia={hydratedGalleryItems}
          title={displayCard.type === 'gallery' ? null : 'Gallery'}
          ariaLabel={displayCard.type === 'gallery' ? `${displayCard.title} — remaining images` : 'Gallery'}
          variant={displayCard.type === 'gallery' ? 'galleryDetail' : 'default'}
          editableCaptions={isAdmin}
          cardId={displayCard.docId}
          onGallerySaved={handleCardSaved}
        />
      )}

      {displayCard.type === 'story' && childrenCards.length > 0 ? (
        <ChildCardsRail
          cards={childrenCards}
          readerMode={effectiveReaderMode}
          adminEditReturnTo={detailReturnTo ?? '/view'}
        />
      ) : null}

      {/* Discovery Section */}
      {!shouldSuppressDiscovery ? (
        <DiscoverySection
          currentCard={displayCard}
          childrenCards={childrenCards}
          suppressChildCardsGroup={displayCard.type === 'story' && childrenCards.length > 0}
          readerMode={effectiveReaderMode}
        />
      ) : null}
    </article>
  );
};

export default CardDetailPage; 

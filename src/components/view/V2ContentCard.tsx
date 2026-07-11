'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import JournalImage from '@/components/common/JournalImage';
import { Card } from '@/lib/types/card';
import { getReaderDisplayUrl } from '@/lib/utils/photoUtils'; // Corrected import path
import {
  getAspectRatioBucket,
  getAspectRatioValue,
  getObjectPositionForAspectRatio,
} from '@/lib/utils/objectPositionUtils';
import { getEffectiveGalleryCaption, getEffectiveGalleryObjectPosition } from '@/lib/utils/galleryObjectPosition';
import TipTapStaticContent from '@/components/common/TipTapStaticContent';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import { SQUARE_FEED_TILE_ASPECT, SQUARE_FEED_TILE_COVER_BAND_ASPECT, getFeedTileVariant, showFeedTileChipStrip, usesSquareFeedTile } from '@/lib/reader/readerFeedPresentation';
import FeedTileMetaBand from '@/components/view/FeedTileMetaBand';
import FeedTileChipStrip from '@/components/view/FeedTileChipStrip';
import styles from './V2ContentCard.module.css';
import { useCardContext } from '@/components/providers/CardProvider';

const ReaderCardEditEntry = dynamic(() => import('@/components/view/ReaderCardEditEntry'), {
  ssr: false,
});

// Simple horizontal slider
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

const CLOSED_FEED_MEDIA_ASPECT_RATIO = '6/5';

function getFeedCoverFrame(media?: Card['coverImage'] | null) {
  const bucket = getAspectRatioBucket(media);
  return getAspectRatioValue(bucket);
}

function getClosedFeedFrame(card: Card): 'landscape' | 'portrait' {
  if (card.type === 'quote' || card.type === 'callout') {
    return 'portrait';
  }

  const primaryMedia =
    card.coverImage ??
    (card.type === 'gallery'
      ? (card.galleryMedia ?? []).find((item) => item.media)?.media ?? null
      : null);
  return getAspectRatioBucket(primaryMedia) === 'portrait' ? 'portrait' : 'landscape';
}

function getCoverObjectFitMode(card: Pick<Card, 'coverImageMode'>): 'cover' | 'contain' {
  return card.coverImageMode === 'fit' ? 'contain' : 'cover';
}

/** Canonical media id for the card cover (for deduping gallery slides). */
function getCoverMediaId(card: Card): string | undefined {
  if (card.coverImageId) return card.coverImageId;
  const c = card.coverImage;
  if (c && typeof c === 'object' && 'docId' in c && typeof (c as { docId?: string }).docId === 'string') {
    return (c as { docId: string }).docId;
  }
  return undefined;
}

function getClosedFeedTypeBadgeLabel(cardType: Card['type']): 'Story' | 'Gallery' | null {
  return cardType === 'story' ? 'Story' : cardType === 'gallery' ? 'Gallery' : null;
}

// --- Card Type Renderers ---

const StoryCardContent: React.FC<{
  card: Card;
  displayMode: string;
  squareFeedTile: boolean;
  showChipStrip: boolean;
  previewCoverObjectPosition?: string;
}> = ({ card, displayMode, squareFeedTile, showChipStrip, previewCoverObjectPosition }) => {
  const coverBucket = getAspectRatioBucket(card.coverImage);
  const coverRatio = squareFeedTile
    ? SQUARE_FEED_TILE_ASPECT
    : displayMode !== 'inline' && (!card.coverImage || coverBucket === 'portrait')
      ? '3/2'
      : getAspectRatioValue(coverBucket);
  const focalCoverAspect = squareFeedTile ? SQUARE_FEED_TILE_COVER_BAND_ASPECT : coverRatio;
  const coverObjectFit = getCoverObjectFitMode(card);
  const objectPosition =
    previewCoverObjectPosition ??
    (coverObjectFit === 'cover' && card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
      ? getObjectPositionForAspectRatio(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height },
          focalCoverAspect,
          400
        )
      : 'center');

  const typeBadgeLabel = getClosedFeedTypeBadgeLabel(card.type);
  const useStoryPlaceholder = !card.coverImage && displayMode !== 'inline';
  const showVisualFrame = Boolean(card.coverImage) || useStoryPlaceholder;
  const imageContainerStyle = squareFeedTile ? undefined : { aspectRatio: coverRatio };

  return (
    <>
      {showVisualFrame && (
        <div className={styles.imageContainer} style={imageContainerStyle}>
          {card.coverImage ? (
            <JournalImage 
              src={getReaderDisplayUrl(card.coverImage)} 
              alt={card.title} 
              className={styles.image}
              width={400}
              height={300}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: coverObjectFit, objectPosition }}
              priority={false}
            />
          ) : (
            <div className={styles.storyPlaceholder} aria-hidden="true" />
          )}
          {typeBadgeLabel ? <span className={styles.cardTypeBadgeOverlay}>{typeBadgeLabel}</span> : null}
        </div>
      )}
      {squareFeedTile ? (
        <>
          <FeedTileMetaBand
            card={card}
            titleClassName={styles.title}
            typeBadgeInline={
              !showVisualFrame && typeBadgeLabel ? (
                <span className={styles.cardTypeBadgeInline}>{typeBadgeLabel}</span>
              ) : null
            }
          />
          {showChipStrip ? <FeedTileChipStrip card={card} /> : null}
        </>
      ) : (
        <div className={styles.content}>
          {!showVisualFrame && typeBadgeLabel ? (
            <span className={styles.cardTypeBadgeInline}>{typeBadgeLabel}</span>
          ) : null}
          <h3 className={styles.title}>{card.title}</h3>
          {displayMode === 'inline' && card.content && (
            <div className={styles.inlineContent}>
              <TipTapStaticContent content={card.content} headingVariant="story" />
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Gallery feed: Swiper with cover as first slide when set; gallery items omit any row whose mediaId matches cover (dedupe).
const GalleryCardContent: React.FC<{
  card: Card;
  squareFeedTile: boolean;
  showChipStrip: boolean;
  previewCoverObjectPosition?: string;
}> = ({ card, squareFeedTile, showChipStrip, previewCoverObjectPosition }) => {
  const coverId = useMemo(() => getCoverMediaId(card), [card]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const coverObjectFit = getCoverObjectFitMode(card);
  const typeBadgeLabel = getClosedFeedTypeBadgeLabel(card.type);

  const gallerySlides = useMemo(() => {
    const items = (card.galleryMedia ?? []).filter((item) => item.media);
    if (!coverId) return items;
    return items.filter((item) => item.mediaId !== coverId);
  }, [card.galleryMedia, coverId]);

  const coverObjectPosition =
    previewCoverObjectPosition ??
    (coverObjectFit === 'cover' && card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
      ? getObjectPositionForAspectRatio(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height },
          squareFeedTile ? SQUARE_FEED_TILE_COVER_BAND_ASPECT : getFeedCoverFrame(card.coverImage),
          400
        )
      : 'center');
  const galleryFrameRatio = squareFeedTile
    ? SQUARE_FEED_TILE_ASPECT
    : card.coverImage
      ? getFeedCoverFrame(card.coverImage)
      : gallerySlides[0]?.media
        ? getFeedCoverFrame(gallerySlides[0].media)
        : CLOSED_FEED_MEDIA_ASPECT_RATIO;
  const imageContainerStyle = squareFeedTile ? undefined : { aspectRatio: galleryFrameRatio };

  const hasCoverSlide = Boolean(card.coverImage);
  const showSwiper = hasCoverSlide || gallerySlides.length > 0;
  const totalSlides = (hasCoverSlide ? 1 : 0) + gallerySlides.length;
  const activeGalleryItem =
    hasCoverSlide && activeSlideIndex === 0 ? null : gallerySlides[(hasCoverSlide ? activeSlideIndex - 1 : activeSlideIndex) ?? 0] ?? null;
  const activeCaption = activeGalleryItem?.media
    ? getEffectiveGalleryCaption(activeGalleryItem, activeGalleryItem.media).trim()
    : '';

  return (
    <>
      {showSwiper ? (
        <div className={styles.imageContainer} style={imageContainerStyle}>
          <Swiper
            spaceBetween={8}
            slidesPerView={totalSlides > 1 ? 1.08 : 1}
            className={styles.swiperContainer}
            onSlideChange={(swiper) => setActiveSlideIndex(swiper.activeIndex)}
          >
            {hasCoverSlide && card.coverImage ? (
              <SwiperSlide key={`cover-${card.docId}`}>
                <JournalImage
                  src={getReaderDisplayUrl(card.coverImage)}
                  alt={card.title}
                  className={styles.image}
                  width={400}
                  height={300}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: coverObjectFit, objectPosition: coverObjectPosition }}
                  priority={false}
                />
              </SwiperSlide>
            ) : null}
            {gallerySlides.map((item) => (
              <SwiperSlide key={item.mediaId}>
                <JournalImage
                  src={getReaderDisplayUrl(item.media!)}
                  alt={item.media!.filename || card.title}
                  className={styles.image}
                  width={400}
                  height={300}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectPosition: getEffectiveGalleryObjectPosition(item, item.media!) }}
                  priority={false}
                />
              </SwiperSlide>
            ))}
          </Swiper>
          {typeBadgeLabel ? <span className={styles.cardTypeBadgeOverlay}>{typeBadgeLabel}</span> : null}
          {totalSlides > 1 ? (
            <div className={styles.galleryAffordance} aria-hidden="true">
              <span className={styles.galleryAffordanceCount}>
                {Math.min(activeSlideIndex + 1, totalSlides)}/{totalSlides}
              </span>
            </div>
          ) : null}
          {activeCaption ? (
            <div className={styles.galleryCaptionOverlay}>
              <p>{activeCaption}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {squareFeedTile ? (
        <>
          <FeedTileMetaBand
            card={card}
            titleClassName={styles.title}
            typeBadgeInline={
              !showSwiper && typeBadgeLabel ? (
                <span className={styles.cardTypeBadgeInline}>{typeBadgeLabel}</span>
              ) : null
            }
          />
          {showChipStrip ? <FeedTileChipStrip card={card} /> : null}
        </>
      ) : (
        <div className={styles.content}>
          {!showSwiper && typeBadgeLabel ? (
            <span className={styles.cardTypeBadgeInline}>{typeBadgeLabel}</span>
          ) : null}
          <h3 className={styles.title}>{card.title}</h3>
        </div>
      )}
    </>
  );
};

/**
 * Quote feed tile: closed reader quote cards follow the same title-driven utility-tile contract as Question cards.
 * Detail/open quote rendering still owns the rich-text body plus attribution path.
 */
const QuoteCardContent: React.FC<{
  card: Card;
  squareFeedTile: boolean;
  showChipStrip: boolean;
}> = ({ card, squareFeedTile, showChipStrip }) => {
  const titleText = card.title?.trim() ?? '';

  if (squareFeedTile) {
    return (
      <>
        <div className={styles.utilityTileHeroFullCenter}>
          <div className={styles.content}>
            {titleText ? (
              <div className={`${styles.qaTextBlock} ${styles.quoteTextBlock}`}>
                <h3 className={`${styles.qaQuestion} ${styles.quoteHeadline}`}>{titleText}</h3>
              </div>
            ) : null}
          </div>
        </div>
        {showChipStrip ? <FeedTileChipStrip card={card} /> : null}
      </>
    );
  }

  return (
    <div className={styles.content}>
      {titleText ? (
        <div className={`${styles.qaTextBlock} ${styles.quoteTextBlock}`}>
          <h3 className={`${styles.qaQuestion} ${styles.quoteHeadline}`}>{titleText}</h3>
        </div>
      ) : null}
    </div>
  );
};

const QACardContent: React.FC<{
  card: Card;
  displayMode: string;
  squareFeedTile: boolean;
  showChipStrip: boolean;
  previewCoverObjectPosition?: string;
}> = ({ card, displayMode, squareFeedTile, showChipStrip, previewCoverObjectPosition }) => {
  const coverRatio = squareFeedTile ? SQUARE_FEED_TILE_ASPECT : getFeedCoverFrame(card.coverImage);
  const focalCoverAspect = squareFeedTile ? SQUARE_FEED_TILE_COVER_BAND_ASPECT : coverRatio;
  const coverObjectFit = getCoverObjectFitMode(card);
  const objectPosition =
    previewCoverObjectPosition ??
    (coverObjectFit === 'cover' && card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
      ? getObjectPositionForAspectRatio(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height },
          focalCoverAspect,
          400
        )
      : 'center');

  const questionText = (
    <div className={styles.qaTextBlock}>
      <h3 className={styles.qaQuestion}>{card.title}</h3>
    </div>
  );

  if (displayMode === 'inline') {
    return (
      <>
        {card.coverImage && (
          <div className={styles.imageContainer} style={{ aspectRatio: coverRatio }}>
            <JournalImage
              src={getReaderDisplayUrl(card.coverImage)}
              alt={card.title}
              className={styles.image}
              width={400}
              height={300}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: coverObjectFit, objectPosition }}
            priority={false}
          />
        </div>
      )}
      <div className={styles.content}>
        {questionText}
        {card.content && (
            <div className={styles.inlineContent}>
            <TipTapStaticContent content={card.content} surface="transparent" headingVariant="question" />
          </div>
        )}
      </div>
    </>
  );
  }

  if (displayMode === 'static') {
    if (squareFeedTile) {
      return (
        <>
          <div className={styles.utilityTileHeroFullCenter}>
            <div className={styles.content}>{questionText}</div>
          </div>
          {showChipStrip ? <FeedTileChipStrip card={card} /> : null}
        </>
      );
    }

    return (
      <div className={styles.content}>
        {questionText}
      </div>
    );
  }

  // navigate — question-first card; optional cover hero like story
  if (squareFeedTile) {
    return (
      <>
        {card.coverImage ? (
          <div className={styles.imageContainer}>
            <JournalImage
              src={getReaderDisplayUrl(card.coverImage)}
              alt={card.title}
              className={styles.image}
              width={400}
              height={300}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: coverObjectFit, objectPosition }}
              priority={false}
            />
          </div>
        ) : (
          <div className={styles.utilityTileHeroFullCenter}>
            <div className={styles.content}>{questionText}</div>
          </div>
        )}
        {card.coverImage ? <div className={styles.content}>{questionText}</div> : null}
        {showChipStrip ? <FeedTileChipStrip card={card} /> : null}
      </>
    );
  }

  return (
    <>
      {card.coverImage && (
        <div className={styles.imageContainer} style={{ aspectRatio: coverRatio }}>
          <JournalImage
            src={getReaderDisplayUrl(card.coverImage)}
            alt={card.title}
            className={styles.image}
            width={400}
            height={300}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: coverObjectFit, objectPosition }}
            priority={false}
          />
        </div>
      )}
      <div className={styles.content}>
        {questionText}
      </div>
    </>
  );
};

const CalloutCardContent: React.FC<{ card: Card }> = ({ card }) => {
  /** Callouts are static-only in product rules; feed still shows TipTap like quote tiles. */
  const showBody = Boolean(card.content?.trim());
  const titleText = card.title?.trim() ?? '';

  return (
    <div className={styles.content}>
      {titleText ? <h3 className={styles.calloutTitle}>{titleText}</h3> : null}
      {showBody ? (
        <div className={`${styles.inlineContent} ${styles.calloutBody}`}>
          <TipTapRenderer content={card.content} surface="transparent" headingVariant="callout" />
        </div>
      ) : null}
    </div>
  );
};

// --- Main V2 Component ---

interface V2ContentCardProps {
  card: Card;
  size?: 'small' | 'medium' | 'large';
  /** When true, card stretches to parent width (use with fixed-width rail cells). */
  fullWidth?: boolean;
  /** Save feed scroll before navigating to card detail (Content → detail). */
  onClick?: () => void;
  /** Save feed scroll before opening admin edit from Content feed (optional). */
  onBeforeNavigateToAdminEdit?: () => void;
  /** `returnTo` query for edit page Back link (e.g. `/view` from feed, `/view/[id]` from detail rails). */
  adminEditReturnTo?: string;
  /** Non-interactive closed feed tile preview (Compose). */
  previewOnly?: boolean;
  /** Live Compose override for closed-feed cover crop. */
  previewCoverObjectPosition?: string;
}

const V2ContentCard: React.FC<V2ContentCardProps> = ({
  card,
  size = 'medium',
  fullWidth = false,
  onClick,
  onBeforeNavigateToAdminEdit,
  adminEditReturnTo = '/view',
  previewOnly = false,
  previewCoverObjectPosition,
}) => {
  const { data: session } = useSession();
  const { readerMode, patchVisibleCard } = useCardContext();
  const isAdmin = session?.user?.role === 'admin';
  const displayMode = normalizeDisplayModeForType(card.type, card.displayMode);
  
  // Determine if card should be interactive based on display mode
  const isInteractive =
    !previewOnly &&
    displayMode === 'navigate' &&
    (card.type === 'story' || card.type === 'gallery' || card.type === 'qa');

  const cardTypeClass = styles[card.type] || styles.story;
  const sizeClass = styles[size] || styles.medium;
  const displayModeClass = styles[displayMode] || '';
  const qaWithCoverClass =
    card.type === 'qa' &&
    card.coverImage &&
    (displayMode === 'navigate' || displayMode === 'inline')
      ? styles.qaWithCover
      : '';
  const squareFeedTile = usesSquareFeedTile(card.type, displayMode);
  const chipStrip = showFeedTileChipStrip(squareFeedTile, size);
  const feedTileVariant = getFeedTileVariant(squareFeedTile, size);
  const closedFeedFrameClass =
    squareFeedTile || displayMode === 'inline'
      ? ''
      : getClosedFeedFrame(card) === 'portrait'
        ? styles.closedFeedPortrait
        : styles.closedFeedLandscape;
  const className = `${styles.card} ${cardTypeClass} ${sizeClass} ${displayModeClass} ${qaWithCoverClass} ${closedFeedFrameClass} ${squareFeedTile ? styles.squareFeedTile : ''} ${fullWidth ? styles.fullWidth : ''}`.trim();

  const addFocusCardToReturnTo = (returnTo: string, focusCardId: string): string => {
    const [pathAndQuery, hashFragment] = returnTo.split('#');
    const [pathOnly, queryString = ''] = pathAndQuery.split('?');
    const params = new URLSearchParams(queryString);
    params.set('focusCardId', focusCardId);
    const next = `${pathOnly}?${params.toString()}`;
    return hashFragment ? `${next}#${hashFragment}` : next;
  };

  const returnToWithFocus =
    card.docId != null
      ? addFocusCardToReturnTo(adminEditReturnTo, card.docId)
      : adminEditReturnTo;

  const canEdit = !previewOnly && Boolean(card.docId && isAdmin);
  const detailHref = card.docId ? `/view/${card.docId}?mode=${readerMode}` : '#';
  const quickEditMetadata = useMemo(
    () => ({
      title: card.title ?? '',
      subtitle: card.subtitle ?? '',
      excerpt: card.excerpt ?? '',
      excerptAuto: card.excerptAuto,
      content: card.content ?? '',
    }),
    [card.content, card.excerpt, card.excerptAuto, card.subtitle, card.title]
  );

  const handleCardSaved = useCallback(
    (savedCard: Card) => {
      patchVisibleCard(savedCard);
    },
    [patchVisibleCard]
  );

  const renderContent = () => {
    switch (card.type) {
      case 'gallery':
        return (
          <GalleryCardContent
            card={card}
            squareFeedTile={squareFeedTile}
            showChipStrip={chipStrip}
            previewCoverObjectPosition={previewCoverObjectPosition}
          />
        );
      case 'quote':
        return <QuoteCardContent card={card} squareFeedTile={squareFeedTile} showChipStrip={chipStrip} />;
      case 'qa':
        return (
          <QACardContent
            card={card}
            displayMode={displayMode}
            squareFeedTile={squareFeedTile}
            showChipStrip={chipStrip}
            previewCoverObjectPosition={previewCoverObjectPosition}
          />
        );
      case 'callout':
        return (
          <>
            <CalloutCardContent card={card} />
            <div className={styles.calloutPinOverlay} aria-hidden>
              <JournalImage
                src="/images/pushpin.svg"
                alt=""
                width={458}
                height={443}
                className={styles.calloutPinWatermark}
                priority={false}
              />
            </div>
          </>
        );
      case 'story':
      default:
        return (
          <StoryCardContent
            card={card}
            displayMode={displayMode}
            squareFeedTile={squareFeedTile}
            showChipStrip={chipStrip}
            previewCoverObjectPosition={previewCoverObjectPosition}
          />
        );
    }
  };

  const body =
    isInteractive && card.docId ? (
      <Link
        href={detailHref}
        className={className}
        onClick={onClick}
        data-card-id={card.docId}
        data-feed-tile-variant={feedTileVariant}
      >
        {renderContent()}
      </Link>
    ) : (
      <div className={className} data-card-id={card.docId} data-feed-tile-variant={feedTileVariant}>
        {renderContent()}
      </div>
    );

  if (!canEdit) {
    return body;
  }

  return (
    <div className={styles.cardShell}>
      {body}
      <ReaderCardEditEntry
        cardId={card.docId!}
        returnTo={returnToWithFocus}
        className={styles.adminEditLink}
        metadata={quickEditMetadata}
        onBeforeOpen={onBeforeNavigateToAdminEdit}
        onCardSaved={handleCardSaved}
      >
        Edit
      </ReaderCardEditEntry>
    </div>
  );
};

export default V2ContentCard; 

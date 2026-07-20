'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { usePathname, useSearchParams } from 'next/navigation';
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
import type { ReaderRouteMode } from '@/lib/utils/readerMode';
import { getQuestionPromptLength } from '@/lib/utils/questionPromptPresentation';
import { getSafeReaderReturnTo } from '@/lib/utils/readerReturnTo';

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

function getUtilityFeedTypeBadgeLabel(cardType: Card['type']): 'Question' | 'Quote' | 'Callout' | null {
  return cardType === 'qa' ? 'Question' : cardType === 'quote' ? 'Quote' : cardType === 'callout' ? 'Callout' : null;
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
            <div
              className={styles.galleryCaptionOverlay}
              aria-label={`Image caption: ${activeCaption}`}
              title={activeCaption}
            >
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
  onRevealFitChange?: (fits: boolean) => void;
}> = ({ card, displayMode, squareFeedTile, showChipStrip, previewCoverObjectPosition, onRevealFitChange }) => {
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const answerFaceRef = useRef<HTMLDivElement>(null);
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
    <div
      className={styles.qaTextBlock}
      data-question-prompt-length={getQuestionPromptLength(card.title)}
    >
      <h3 className={styles.qaQuestion}>{card.title}</h3>
    </div>
  );

  useEffect(() => {
    if (displayMode !== 'inline' || !onRevealFitChange) return;
    const answerFace = answerFaceRef.current;
    if (!answerFace) return;

    const measure = () => {
      const fits =
        answerFace.scrollHeight <= answerFace.clientHeight + 1 &&
        answerFace.scrollWidth <= answerFace.clientWidth + 1;
      onRevealFitChange(fits);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(answerFace);
    const renderedContent = answerFace.querySelector<HTMLElement>('.ProseMirror');
    if (renderedContent) observer.observe(renderedContent);
    return () => observer.disconnect();
  }, [card.content, displayMode, onRevealFitChange]);

  if (displayMode === 'inline') {
    const toggleReveal = () => setAnswerRevealed((revealed) => !revealed);
    const isEmbeddedInteractiveTarget = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('a, button, [data-type="cardMention"]'));

    return (
      <div
        className={styles.qaRevealShell}
        role="button"
        tabIndex={0}
        aria-pressed={answerRevealed}
        aria-label={answerRevealed ? 'Show question' : 'Reveal answer'}
        onClick={(event) => {
          if (!isEmbeddedInteractiveTarget(event.target)) toggleReveal();
        }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !isEmbeddedInteractiveTarget(event.target)) {
            event.preventDefault();
            toggleReveal();
          }
        }}
      >
        <div className={`${styles.qaRevealFace} ${styles.qaQuestionFace} ${answerRevealed ? styles.qaRevealFaceHidden : ''}`} aria-hidden={answerRevealed}>
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
              <span className={styles.qaCoverBadge} aria-hidden="true">?</span>
            </div>
          ) : null}
          <div className={styles.utilityTileHeroFullCenter}>
            <div className={styles.content}>{questionText}</div>
          </div>
          {showChipStrip ? <FeedTileChipStrip card={card} /> : null}
        </div>
        <div
          ref={answerFaceRef}
          className={`${styles.qaRevealFace} ${styles.qaAnswerFace} ${answerRevealed ? '' : styles.qaRevealFaceHidden}`}
          aria-hidden={!answerRevealed}
        >
          <div className={`${styles.inlineContent} ${styles.qaRevealAnswerContent}`}>
            <TipTapStaticContent content={card.content} surface="transparent" headingVariant="question" />
          </div>
        </div>
      </div>
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
        {card.coverImage ? <FeedTileMetaBand card={card} titleClassName={styles.title} /> : null}
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
          <span className={styles.qaCoverBadge} aria-hidden="true">?</span>
        </div>
      )}
      <div className={styles.content}>
        {questionText}
      </div>
    </>
  );
};

const CalloutCardContent: React.FC<{
  card: Card;
  destinationTile?: boolean;
  showChipStrip?: boolean;
}> = ({ card, destinationTile = false, showChipStrip = false }) => {
  /** Callouts are static-only in product rules; feed still shows TipTap like quote tiles. */
  const showBody = Boolean(card.content?.trim());
  const titleText = card.title?.trim() ?? '';

  if (destinationTile) {
    return (
      <>
        <div className={styles.utilityTileHeroFullCenter}>
          <div className={styles.content}>
            {titleText ? <h3 className={styles.calloutTitle}>{titleText}</h3> : null}
          </div>
        </div>
        {showChipStrip ? <FeedTileChipStrip card={card} compact /> : null}
      </>
    );
  }

  return (
    <>
      <div className={styles.content}>
        {titleText ? <h3 className={styles.calloutTitle}>{titleText}</h3> : null}
        {showBody ? (
          <div className={`${styles.inlineContent} ${styles.calloutBody}`}>
            <TipTapRenderer content={card.content} surface="transparent" headingVariant="callout" />
          </div>
        ) : null}
      </div>
      {showChipStrip ? <FeedTileChipStrip card={card} /> : null}
    </>
  );
};

// --- Main V2 Component ---

interface V2ContentCardProps {
  card: Card;
  size?: 'small' | 'medium' | 'large';
  /** When true, card stretches to parent width (use with fixed-width rail cells). */
  fullWidth?: boolean;
  /**
   * Structural child rails: always use the main-feed closed square shell even when the card
   * is authored as inline (inline would otherwise grow with portrait cover bands).
   */
  forceSquareFeedTile?: boolean;
  /** Save feed scroll before navigating to card detail (Content → detail). */
  onClick?: () => void;
  /** Save feed scroll before opening admin edit from Content feed (optional). */
  onBeforeNavigateToAdminEdit?: () => void;
  /** `returnTo` query for edit page Back link (e.g. `/view` from feed, `/view/[id]` from detail rails). */
  adminEditReturnTo?: string;
  /** Non-interactive closed feed tile preview (Compose). */
  previewOnly?: boolean;
  /** Compact discovery representation that always opens detail, regardless of feed presentation. */
  destinationTile?: boolean;
  /** Detail mode owned by the current route; falls back to the persisted feed preference. */
  destinationReaderMode?: ReaderRouteMode;
  /** Live Compose override for closed-feed cover crop. */
  previewCoverObjectPosition?: string;
  /** Compose-only measurement callback for the bounded Question Reveal answer face. */
  onQuestionRevealFitChange?: (fits: boolean) => void;
  /** Compose-only measurement callback for the bounded Callout tile. */
  onCalloutFitChange?: (fits: boolean) => void;
}

const V2ContentCard: React.FC<V2ContentCardProps> = ({
  card,
  size = 'medium',
  fullWidth = false,
  forceSquareFeedTile = false,
  onClick,
  onBeforeNavigateToAdminEdit,
  adminEditReturnTo = '/view',
  previewOnly = false,
  destinationTile = false,
  destinationReaderMode,
  previewCoverObjectPosition,
  onQuestionRevealFitChange,
  onCalloutFitChange,
}) => {
  const calloutFitRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { readerMode, patchVisibleCard } = useCardContext();
  const isAdmin = session?.user?.role === 'admin';
  const displayMode = normalizeDisplayModeForType(card.type, card.displayMode);
  const tileDisplayMode = destinationTile
    ? 'navigate'
    : forceSquareFeedTile && displayMode === 'inline'
      ? 'navigate'
      : displayMode;

  // Determine if card should be interactive based on display mode
  const isInteractive =
    !previewOnly &&
    tileDisplayMode === 'navigate' &&
    (destinationTile || card.type === 'story' || card.type === 'gallery' || card.type === 'qa');

  const cardTypeClass = styles[card.type] || styles.story;
  const sizeClass = styles[size] || styles.medium;
  const displayModeClass = styles[tileDisplayMode] || '';
  const qaWithCoverClass =
    card.type === 'qa' &&
    card.coverImage &&
    (tileDisplayMode === 'navigate' || tileDisplayMode === 'inline')
      ? styles.qaWithCover
      : '';
  const squareFeedTile = destinationTile
    ? true
    : forceSquareFeedTile
    ? usesSquareFeedTile(card.type, tileDisplayMode)
    : usesSquareFeedTile(card.type, displayMode);
  const chipStrip =
    destinationTile ||
    showFeedTileChipStrip(squareFeedTile, size) ||
    (card.type === 'qa' && tileDisplayMode === 'inline') ||
    (card.type === 'callout' && tileDisplayMode === 'static');
  const feedTileVariant = getFeedTileVariant(squareFeedTile, size);
  const closedFeedFrameClass =
    squareFeedTile || tileDisplayMode === 'inline'
      ? ''
      : getClosedFeedFrame(card) === 'portrait'
        ? styles.closedFeedPortrait
        : styles.closedFeedLandscape;
  const className = `${styles.card} ${cardTypeClass} ${sizeClass} ${displayModeClass} ${qaWithCoverClass} ${closedFeedFrameClass} ${squareFeedTile ? styles.squareFeedTile : ''} ${fullWidth ? styles.fullWidth : ''}`.trim();

  useEffect(() => {
    if (card.type !== 'callout' || !onCalloutFitChange) return;
    const tile = calloutFitRef.current;
    if (!tile) return;
    const measure = () => onCalloutFitChange(
      tile.scrollHeight <= tile.clientHeight + 1 && tile.scrollWidth <= tile.clientWidth + 1
    );
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(tile);
    const renderedContent = tile.querySelector<HTMLElement>('.ProseMirror');
    if (renderedContent) observer.observe(renderedContent);
    return () => observer.disconnect();
  }, [card.content, card.tags, card.title, card.type, onCalloutFitChange]);

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
  const detailReturnTo = useMemo(() => {
    const inheritedReturnTo = getSafeReaderReturnTo(searchParams.get('returnTo'));
    if (destinationTile && pathname?.startsWith('/view/') && inheritedReturnTo) {
      return inheritedReturnTo;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('returnTo');
    if (pathname === '/view' && card.docId) params.set('focusCardId', card.docId);
    const query = params.toString();
    return `${pathname || '/view'}${query ? `?${query}` : ''}`;
  }, [card.docId, destinationTile, pathname, searchParams]);
  const detailHref = card.docId
    ? `/view/${card.docId}?mode=${destinationReaderMode ?? readerMode}&returnTo=${encodeURIComponent(detailReturnTo)}`
    : '#';
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
            displayMode={tileDisplayMode}
            squareFeedTile={squareFeedTile}
            showChipStrip={chipStrip}
            previewCoverObjectPosition={previewCoverObjectPosition}
            onRevealFitChange={onQuestionRevealFitChange}
          />
        );
      case 'callout':
        return (
          <>
            <CalloutCardContent card={card} destinationTile={destinationTile} showChipStrip={chipStrip} />
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
            displayMode={tileDisplayMode}
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
        {squareFeedTile && getUtilityFeedTypeBadgeLabel(card.type) ? (
          <span className={styles.utilityTypeBadgeOverlay}>{getUtilityFeedTypeBadgeLabel(card.type)}</span>
        ) : null}
      </Link>
    ) : (
      <div ref={card.type === 'callout' ? calloutFitRef : undefined} className={className} data-card-id={card.docId} data-feed-tile-variant={feedTileVariant}>
        {renderContent()}
        {squareFeedTile && getUtilityFeedTypeBadgeLabel(card.type) ? (
          <span className={styles.utilityTypeBadgeOverlay}>{getUtilityFeedTypeBadgeLabel(card.type)}</span>
        ) : null}
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
        <Pencil size={14} aria-hidden="true" />
        <span className={styles.srOnly}>Edit</span>
      </ReaderCardEditEntry>
    </div>
  );
};

export default V2ContentCard; 

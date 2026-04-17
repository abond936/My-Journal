'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FileText, Images } from 'lucide-react';
import JournalImage from '@/components/common/JournalImage';
import { Card } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils'; // Corrected import path
import {
  getAspectRatioBucket,
  getAspectRatioValue,
  getObjectPositionForAspectRatio,
} from '@/lib/utils/objectPositionUtils';
import { getEffectiveGalleryObjectPosition } from '@/lib/utils/galleryObjectPosition';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import { extractMediaFromContent, formatQuoteAttribution } from '@/lib/utils/cardUtils';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import styles from './V2ContentCard.module.css';

// Simple horizontal slider
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

/** Canonical media id for the card cover (for deduping gallery slides). */
function getCoverMediaId(card: Card): string | undefined {
  if (card.coverImageId) return card.coverImageId;
  const c = card.coverImage;
  if (c && typeof c === 'object' && 'docId' in c && typeof (c as { docId?: string }).docId === 'string') {
    return (c as { docId: string }).docId;
  }
  return undefined;
}

function hasBodyText(card: Card): boolean {
  const content = typeof card.content === 'string' ? card.content.trim() : '';
  return content.length > 0;
}

// --- Card Type Renderers ---

const StoryCardContent: React.FC<{ card: Card; displayMode: string }> = ({ card, displayMode }) => {
  const coverRatio = getAspectRatioValue(getAspectRatioBucket(card.coverImage));
  const objectPosition =
    card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
      ? getObjectPositionForAspectRatio(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height },
          coverRatio,
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

// Gallery feed: Swiper with cover as first slide when set; gallery items omit any row whose mediaId matches cover (dedupe).
const GalleryCardContent: React.FC<{ card: Card; displayMode: string }> = ({ card, displayMode }) => {
  const coverId = useMemo(() => getCoverMediaId(card), [card]);
  const coverRatio = getAspectRatioValue(getAspectRatioBucket(card.coverImage));

  const gallerySlides = useMemo(() => {
    const items = (card.galleryMedia ?? []).filter((item) => item.media);
    if (!coverId) return items;
    return items.filter((item) => item.mediaId !== coverId);
  }, [card.galleryMedia, coverId]);

  const coverObjectPosition =
    card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
      ? getObjectPositionForAspectRatio(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height },
          coverRatio,
          400
        )
      : 'center';

  const hasCoverSlide = Boolean(card.coverImage);
  const showSwiper = hasCoverSlide || gallerySlides.length > 0;

  return (
    <>
      {showSwiper ? (
        <div className={styles.imageContainer}>
          <Swiper spaceBetween={0} slidesPerView={1} className={styles.swiperContainer}>
            {hasCoverSlide && card.coverImage ? (
              <SwiperSlide key={`cover-${card.docId}`}>
                <JournalImage
                  src={getDisplayUrl(card.coverImage)}
                  alt={card.title}
                  className={styles.image}
                  width={400}
                  height={300}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectPosition: coverObjectPosition }}
                  priority={false}
                />
              </SwiperSlide>
            ) : null}
            {gallerySlides.map((item) => (
              <SwiperSlide key={item.mediaId}>
                <JournalImage
                  src={getDisplayUrl(item.media!)}
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
        </div>
      ) : null}
      <div className={styles.content}>
        <h3 className={styles.title}>{card.title}</h3>
      </div>
    </>
  );
};

/**
 * Quote feed tile: **Content** = quote (TipTap). Title is omitted here (see `/view/[id]` detail header).
 * **Attribution** = `subtitle` preferred, else `excerpt` (em dash added by `formatQuoteAttribution` when missing).
 */
const QuoteCardContent: React.FC<{ card: Card; displayMode: string }> = ({ card }) => {
  const attribution = formatQuoteAttribution(card.subtitle, card.excerpt);
  return (
    <div className={styles.content}>
      {card.content ? (
        <blockquote className={styles.quoteBody}>
          <TipTapRenderer content={card.content} surface="transparent" />
        </blockquote>
      ) : null}
      {attribution ? <cite className={styles.quoteCite}>{attribution}</cite> : null}
    </div>
  );
};

const QACardContent: React.FC<{ card: Card; displayMode: string }> = ({ card, displayMode }) => {
  const coverRatio = getAspectRatioValue(getAspectRatioBucket(card.coverImage));
  const objectPosition =
    card.coverImageFocalPoint && card.coverImage?.width && card.coverImage?.height
      ? getObjectPositionForAspectRatio(
          {
            x: card.coverImageFocalPoint.x ?? 0,
            y: card.coverImageFocalPoint.y ?? 0,
          },
          { width: card.coverImage.width, height: card.coverImage.height },
          coverRatio,
          400
        )
      : 'center';

  if (displayMode === 'inline') {
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
          <h3 className={styles.qaQuestion}>{card.title}</h3>
          {card.excerpt && <p className={styles.qaTeaser}>{card.excerpt}</p>}
          {card.content && (
            <div className={styles.inlineContent}>
              <TipTapRenderer content={card.content} surface="transparent" />
            </div>
          )}
        </div>
      </>
    );
  }

  if (displayMode === 'static') {
    return (
      <div className={styles.content}>
        <h3 className={styles.qaQuestion}>{card.title}</h3>
        {card.excerpt ? <p className={styles.qaTeaser}>{card.excerpt}</p> : null}
      </div>
    );
  }

  // navigate — question + optional excerpt teaser; optional cover hero like story
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
        <h3 className={styles.qaQuestion}>{card.title}</h3>
        {card.excerpt ? <p className={styles.qaTeaser}>{card.excerpt}</p> : null}
      </div>
    </>
  );
};

const CalloutCardContent: React.FC<{ card: Card }> = ({ card }) => {
  /** Callouts are static-only in product rules; feed still shows TipTap like quote tiles. */
  const showBody = Boolean(card.content?.trim());
  const hasExcerpt = Boolean(card.excerpt?.trim());
  const titleText = card.title?.trim() ?? '';
  const subtitleText = card.subtitle?.trim() ?? '';

  return (
    <div className={styles.content}>
      {titleText ? <h3 className={styles.calloutTitle}>{titleText}</h3> : null}
      {!titleText && subtitleText ? <h3 className={styles.calloutTitle}>{subtitleText}</h3> : null}
      {titleText && subtitleText ? <p className={styles.calloutSubtitle}>{subtitleText}</p> : null}
      {hasExcerpt ? <p className={styles.calloutExcerpt}>{card.excerpt}</p> : null}
      {showBody ? (
        <div className={`${styles.inlineContent} ${styles.calloutBody}`}>
          <TipTapRenderer content={card.content} surface="transparent" />
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
}

const V2ContentCard: React.FC<V2ContentCardProps> = ({
  card,
  size = 'medium',
  fullWidth = false,
  onClick,
  onBeforeNavigateToAdminEdit,
  adminEditReturnTo = '/view',
}) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const displayMode = normalizeDisplayModeForType(card.type, card.displayMode);
  
  // Determine if card should be interactive based on display mode
  const isInteractive =
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
  const frameSource =
    card.coverImage ||
    (card.galleryMedia?.find((item) => item.media)?.media as { width?: number; height?: number } | undefined);
  const aspectBucket = getAspectRatioBucket(frameSource);
  const aspectClass =
    aspectBucket === 'landscape'
      ? styles.aspectLandscape
      : aspectBucket === 'square'
        ? styles.aspectSquare
        : styles.aspectPortrait;
  const className = `${styles.card} ${cardTypeClass} ${sizeClass} ${displayModeClass} ${qaWithCoverClass} ${fullWidth ? styles.fullWidth : ''} ${aspectClass}`.trim();
  const cardSupportsMediaBadge =
    card.type === 'story' || card.type === 'gallery' || card.type === 'qa';
  const cardSupportsTextBadge = card.type === 'story' || card.type === 'gallery';
  const coverId = getCoverMediaId(card);
  const galleryNonCoverCount = (card.galleryMedia ?? []).filter((item) => item.mediaId !== coverId).length;
  const contentMediaFromFieldCount = Array.isArray(card.contentMedia) ? card.contentMedia.length : 0;
  const contentMediaFromHtmlCount = extractMediaFromContent(card.content ?? '').length;
  const contentMediaCount = Math.max(contentMediaFromFieldCount, contentMediaFromHtmlCount);
  const showMediaBadge = cardSupportsMediaBadge && (galleryNonCoverCount > 0 || contentMediaCount > 0);
  const showTextBadge = cardSupportsTextBadge && !card.excerpt?.trim() && hasBodyText(card);

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

  const editHref =
    card.docId && isAdmin
      ? `/admin/card-admin/${card.docId}/edit?returnTo=${encodeURIComponent(returnToWithFocus)}`
      : null;

  const renderContent = () => {
    switch (card.type) {
      case 'gallery':
        return <GalleryCardContent card={card} displayMode={displayMode} />;
      case 'quote':
        return <QuoteCardContent card={card} displayMode={displayMode} />;
      case 'qa':
        return <QACardContent card={card} displayMode={displayMode} />;
      case 'callout':
        return (
          <>
            <CalloutCardContent card={card} />
            <div className={styles.calloutPinOverlay} aria-hidden>
              <img
                src="/images/pushpin.svg"
                alt=""
                width={458}
                height={443}
                className={styles.calloutPinWatermark}
                decoding="async"
              />
            </div>
          </>
        );
      case 'story':
      default:
        return <StoryCardContent card={card} displayMode={displayMode} />;
    }
  };

  const body =
    isInteractive && card.docId ? (
      <Link
        href={`/view/${card.docId}`}
        className={className}
        onClick={onClick}
        data-card-id={card.docId}
      >
        {(showMediaBadge || showTextBadge) && (
          <div className={styles.metaBadges} aria-hidden="true">
            {showMediaBadge ? (
              <span className={styles.metaBadge} title="More media inside">
                <Images size={14} />
              </span>
            ) : null}
            {showTextBadge ? (
              <span className={styles.metaBadge} title="More text inside">
                <FileText size={14} />
              </span>
            ) : null}
          </div>
        )}
        {renderContent()}
      </Link>
    ) : (
      <div className={className} data-card-id={card.docId}>
        {(showMediaBadge || showTextBadge) && (
          <div className={styles.metaBadges} aria-hidden="true">
            {showMediaBadge ? (
              <span className={styles.metaBadge} title="More media inside">
                <Images size={14} />
              </span>
            ) : null}
            {showTextBadge ? (
              <span className={styles.metaBadge} title="More text inside">
                <FileText size={14} />
              </span>
            ) : null}
          </div>
        )}
        {renderContent()}
      </div>
    );

  if (!editHref) {
    return body;
  }

  return (
    <div className={styles.cardShell}>
      {body}
      <Link
        href={editHref}
        className={styles.adminEditLink}
        onClick={() => onBeforeNavigateToAdminEdit?.()}
      >
        Edit
      </Link>
    </div>
  );
};

export default V2ContentCard; 
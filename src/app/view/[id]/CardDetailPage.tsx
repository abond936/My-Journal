'use client';

// DIAGNOSTIC: Forcing a file refresh to address module resolution issue.
import React from 'react';
import JournalImage from '@/components/common/JournalImage';
import { Card } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { getObjectPositionForAspectRatio } from '@/lib/utils/objectPositionUtils';
import styles from './CardDetail.module.css';
import CardGrid from '@/components/view/CardGrid';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import InlineGallery from '@/components/view/InlineGallery';
import DiscoverySection from '@/components/view/DiscoverySection';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CardDetailPageProps {
  card: Card;
  childrenCards: Card[];
}

const CardDetailPage: React.FC<CardDetailPageProps> = ({ card, childrenCards }) => {
  const router = useRouter();

  const childItems = (childrenCards || []).map(child => ({
    id: child.docId,
    title: child.title,
    description: child.excerpt || child.subtitle || '',
    href: `/view/${child.docId}`,
    imageUrl: child.coverImage ? getDisplayUrl(child.coverImage) : undefined,
    // The CardGrid component might need more properties, but this is a start.
  }));



  return (
    <article className={styles.container}>
      <div className={styles.backButtonContainer}>
        <button 
          onClick={() => router.back()} 
          className={styles.backButton}
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>
      <header className={styles.header}>
        {card.coverImage && (
          <div className={styles.coverImageContainer}>
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
                      '4/3',
                      800
                    )
                  : 'center'
              }}
              priority={true}
            />
          </div>
        )}
        <h1 className={styles.title}>{card.title}</h1>
        {card.subtitle && <p className={styles.subtitle}>{card.subtitle}</p>}
      </header>

      {card.content && (
        <section className={styles.content}>
          <TipTapRenderer content={card.content} />
        </section>
      )}

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
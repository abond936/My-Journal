'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/lib/types/card';
import { CardProvider, useCardContext } from '@/components/providers/CardProvider';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import SwipeableGallery from '@/components/common/SwipeableGallery';
import styles from './CardDetail.module.css'; // Updated path
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import CardGrid from '@/components/view/CardGrid';
import { useRouter } from 'next/navigation';

interface CardDetailPageProps {
  cardData: Card;
}

const ChildCard = ({ card }: { card: Card }) => {
    const [isOpen, setIsOpen] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hasValidContent = card.content && typeof card.content === 'object' && card.content.type === 'doc';
    const isGallery = card.type === 'gallery';
    const media = card.galleryMedia || [];

    const handleToggle = () => {
        if (card.displayMode === 'inline') {
            setIsOpen(!isOpen);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300; // Adjust this value to control scroll distance
            const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
            scrollContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });
        }
    };
    
    const cardHeader = (
        <div className={styles.cardHeader} onClick={handleToggle} style={{ cursor: card.displayMode === 'inline' ? 'pointer' : 'default' }}>
            <div className={styles.cardTitleContainer}>
                {card.title && <h2>{card.title}</h2>}
                {card.subtitle && <p className={styles.cardSubtitle}>{card.subtitle}</p>}
            </div>
            <span className={styles.cardType}>{card.type}</span>
        </div>
    );

    const cardBody = (
        <>
            {!isOpen && isGallery && media.length > 0 && (
                <div className={styles.horizontalScroll} ref={scrollContainerRef}>
                    {media.length > 1 && (
                        <>
                            <button 
                                className={`${styles.galleryNav} ${styles.prevButton}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); scroll('left'); }}
                                aria-label="Previous image"
                            >
                                ‹
                            </button>
                            <button 
                                className={`${styles.galleryNav} ${styles.nextButton}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); scroll('right'); }}
                                aria-label="Next image"
                            >
                                ›
                            </button>
                        </>
                    )}
                    {media.map((m, i) => (
                        <img key={i} src={getDisplayUrl(m.media)} alt={m.caption || ''} className={styles.scrollImage} />
                    ))}
                </div>
            )}

            {isOpen && (
                <div className={styles.cardBody}>
                    {card.coverImage &&
                        <img src={getDisplayUrl(card.coverImage)} alt={card.title || ''} className={styles.coverImage} />
                    }
                    {hasValidContent && <TipTapRenderer content={card.content} />}
                    {media.length > 0 && (
                        <div className={styles.gallery}>
                            <h3>Gallery</h3>
                            <div className={styles.galleryImages}>
                                {media.map((m, i) => (
                                    <img key={i} src={getDisplayUrl(m)} alt={m.caption || `Gallery image ${i + 1}`} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    if (card.displayMode === 'navigate') {
        return (
            <Link href={`/view/${card.id}`} className={styles.cardLink}> // Updated path
                <div className={styles.card}>
                    {cardHeader}
                    {cardBody}
                </div>
            </Link>
        );
    }

    return (
        <div className={`${styles.card} ${isOpen ? styles.cardIsOpen : ''}`}>
            {cardHeader}
            {cardBody}
        </div>
    );
}

const CardDetailContent = ({ cardData }: { cardData: Card }) => {
  const { cards: children, loadingMore, hasMore, loadMore } = useCardContext();
  const hasParentContent = cardData.content && typeof cardData.content === 'object' && cardData.content.type === 'doc';
  const isGallery = cardData.type === 'gallery';
  const media = cardData.galleryMedia || [];

  const loadMoreRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useCallback(node => {
    if (loadMoreRef.current) loadMoreRef.current.disconnect();
    loadMoreRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loadingMore) {
        loadMore();
      }
    });
    if (node) loadMoreRef.current.observe(node);
  }, [hasMore, loadingMore, loadMore]);

  const router = useRouter();

  const childItems = (children || []).map(child => ({
    id: child.id,
    title: child.title,
    description: child.excerpt || child.subtitle || '',
    href: `/view/${child.id}`,
    imageUrl: child.coverImage ? getDisplayUrl(child.coverImage) : undefined,
  }));

  return (
    <div className={styles.page}>
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
        {cardData.type !== 'gallery' && cardData.coverImage && (
          <div className={styles.coverImageContainer}>
            <img
              src={getDisplayUrl(cardData.coverImage)}
              alt={cardData.title}
              className={styles.coverImage}
              style={{ objectPosition: cardData.coverImage.objectPosition || 'center' }}
            />
          </div>
        )}
        <h1 className={styles.title}>{cardData.title}</h1>
        {cardData.subtitle && <p className={styles.subtitle}>{cardData.subtitle}</p>}
      </header>

      {cardData.type === 'gallery' && cardData.galleryMedia && cardData.galleryMedia.length > 0 && (
        <section className={styles.gallery}>
          <SwipeableGallery media={cardData.galleryMedia} />
        </section>
      )}

      {cardData.content && (
        <section className={styles.content}>
          <TipTapRenderer content={cardData.content} />
        </section>
      )}

      {children && children.length > 0 && (
        <section className={styles.children}>
          <h2>Related Content</h2>
          <CardGrid items={childItems} />
        </section>
      )}
      
      <div ref={loadMoreTriggerRef} style={{ height: '100px' }} />
      {loadingMore && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>}
    </div>
  );
}

export default function CardDetailPage({ cardData }: CardDetailPageProps) {
  return (
    <CardProvider collectionId={cardData.id}>
      <CardDetailContent cardData={cardData} />
    </CardProvider>
  );
} 
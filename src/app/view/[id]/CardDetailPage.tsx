'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/lib/types/card';
import { CardProvider, useCardContext } from '@/components/providers/CardProvider';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import styles from './CardDetail.module.css'; // Updated path
import { getDisplayUrl } from '@/lib/utils/photoUtils';

interface CardDetailPageProps {
  cardData: Card;
}

const ChildCard = ({ card }: { card: Card }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasValidContent = card.content && typeof card.content === 'object' && card.content.type === 'doc';
    const isGallery = card.type === 'gallery';
    const media = card.galleryMedia || [];

    const handleToggle = () => {
        if (card.displayMode === 'inline') {
            setIsOpen(!isOpen);
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
                <div className={styles.horizontalScroll}>
                    {media.map((m, i) => (
                        <img key={i} src={getDisplayUrl(m)} alt={m.caption || ''} className={styles.scrollImage} />
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {cardData.title && <h1>{cardData.title}</h1>}
        {cardData.subtitle && <p className={styles.pageSubtitle}>{cardData.subtitle}</p>}
        {hasParentContent && (
          <div className={styles.parentContent}>
            <TipTapRenderer content={cardData.content} />
          </div>
        )}
      </header>
      <main className={styles.grid}>
        {children.map((card) => (
          <ChildCard key={card.id} card={card} />
        ))}
      </main>
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
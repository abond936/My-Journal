'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/lib/types/card';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import styles from './Collection.module.css';

interface CollectionClientPageProps {
  collectionData: Card & { children: Card[] };
}

const ChildCard = ({ card }: { card: Card }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasValidContent = card.content && typeof card.content === 'object' && card.content.type === 'doc';
    const isGallery = card.type === 'gallery';

    const handleToggle = () => {
        if (card.displayMode === 'inline') {
            setIsOpen(!isOpen);
        }
    };
    
    const cardHeader = (
        <div className={styles.cardHeader} onClick={handleToggle}>
            <div className={styles.cardTitleContainer}>
                {card.title && <h2>{card.title}</h2>}
                {card.subtitle && <p className={styles.cardSubtitle}>{card.subtitle}</p>}
            </div>
            <span className={styles.cardType}>{card.type}</span>
        </div>
    );

    const cardBody = (
        <>
            {!isOpen && isGallery && card.media && card.media.length > 0 && (
                <div className={styles.horizontalScroll}>
                    {card.media.map((m, i) => (
                        <img key={i} src={m.url} alt={m.caption || ''} className={styles.scrollImage} />
                    ))}
                </div>
            )}

            {isOpen && (
                <div className={styles.cardBody}>
                    {card.coverImage && card.coverImage.url &&
                        <img src={card.coverImage.url} alt={card.title || card.subtitle} className={styles.coverImage} />
                    }
                    {hasValidContent && <TipTapRenderer content={card.content} />}
                    {card.media && card.media.length > 0 && (
                        <div className={styles.gallery}>
                            <h3>Gallery</h3>
                            <div className={styles.galleryImages}>
                                {card.media.map((m, i) => (
                                    <img key={i} src={m.url} alt={m.caption || `Gallery image ${i + 1}`} />
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
            <Link href={`/collections/${card.id}`} className={styles.cardLink}>
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

export default function CollectionClientPage({ collectionData }: CollectionClientPageProps) {
  const { children, ...parentCard } = collectionData;
  const hasParentContent = parentCard.content && typeof parentCard.content === 'object' && parentCard.content.type === 'doc';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {parentCard.title && <h1>{parentCard.title}</h1>}
        {parentCard.subtitle && <p className={styles.pageSubtitle}>{parentCard.subtitle}</p>}
        {hasParentContent && (
          <div className={styles.parentContent}>
            <TipTapRenderer content={parentCard.content} />
          </div>
        )}
      </header>
      <main className={styles.grid}>
        {children.map((card) => (
          <ChildCard key={card.id} card={card} />
        ))}
      </main>
    </div>
  );
} 
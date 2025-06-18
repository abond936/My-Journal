'use client';

// DIAGNOSTIC: Forcing a file refresh to address module resolution issue.
import React from 'react';
import { Card } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './CardDetail.module.css';
import CardGrid from '@/components/view/CardGrid';
import TipTapRenderer from '@/components/common/TipTapRenderer';

interface CardDetailPageProps {
  card: Card;
  childrenCards: Card[];
}

const CardDetailPage: React.FC<CardDetailPageProps> = ({ card, childrenCards }) => {
  const childItems = (childrenCards || []).map(child => ({
    id: child.id,
    title: child.title,
    description: child.excerpt || child.subtitle || '',
    href: `/cards/${child.id}`,
    imageUrl: child.coverImage ? getDisplayUrl(child.coverImage) : undefined,
    // The CardGrid component might need more properties, but this is a start.
  }));

  // DIAGNOSTIC LOG
  console.log('Inspecting cover image data:', card.coverImage);

  return (
    <article className={styles.container}>
      <header className={styles.header}>
        {card.coverImage && (
          <div className={styles.coverImageContainer}>
            <img
              src={getDisplayUrl(card.coverImage)}
              alt={card.title}
              className={styles.coverImage}
              style={{ objectPosition: card.coverImage.objectPosition || 'center' }}
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

      {/* TODO: Implement Gallery View */}
      {card.galleryMedia && card.galleryMedia.length > 0 && (
        <section className={styles.gallery}>
          <h2>Gallery</h2>
          {/* Gallery implementation will go here */}
        </section>
      )}

      {childItems.length > 0 && (
        <section className={styles.children}>
          <h2>Related Content</h2>
          <CardGrid items={childItems} />
        </section>
      )}
    </article>
  );
};

export default CardDetailPage; 
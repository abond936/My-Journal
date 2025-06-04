'use client';

import React from 'react';
import Link from 'next/link';
import styles from '@/app/view/entry-view/EntryCard.module.css';

interface EntryCardProps {
  id: string;
  title: string;
  excerpt?: string;
  date?: string;
  tags?: string[];
  imageUrl?: string;
  href: string;
  size?: 'large' | 'medium' | 'small';
  overlay?: boolean;
}

const EntryCard: React.FC<EntryCardProps> = ({
  id,
  title,
  excerpt,
  date,
  tags = [],
  imageUrl,
  href,
  size = 'medium',
  overlay = size === 'large' // Default to overlay for large cards
}) => {
  const content = (
    <div className={styles.entryContent}>
      <div className={styles.entryHeader}>
        {tags && tags.length > 0 && (
          <div className={styles.entryTags}>
            {tags.slice(0, 4).map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <h2 className={styles.entryTitle}>
          <Link href={href}>
            {title}
          </Link>
        </h2>
        {date && <time className={styles.entryDate}>{date}</time>}
      </div>
      {excerpt && <p className={styles.entryExcerpt}>{excerpt}</p>}
    </div>
  );

  if (overlay && imageUrl) {
    return (
      <article className={`${styles.entryCard} ${styles[size]} ${styles.overlay}`}>
        <div className={styles.featuredMedia}>
          <img src={imageUrl} alt={title} className={styles.featuredImage} />
          {content}
        </div>
      </article>
    );
  }

  return (
    <article className={`${styles.entryCard} ${styles[size]}`}>
      {imageUrl && (
        <div className={styles.featuredMedia}>
          <img src={imageUrl} alt={title} className={styles.featuredImage} />
        </div>
      )}
      {content}
    </article>
  );
};

export default EntryCard; 
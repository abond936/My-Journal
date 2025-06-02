'use client';

import React from 'react';
import Link from 'next/link';
import styles from '@/lib/styles/components/content/StoryCard.module.css';

interface StoryCardProps {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  imageUrl?: string;
  href: string;
}

const StoryCard: React.FC<StoryCardProps> = ({
  id,
  title,
  excerpt,
  date,
  tags = [],
  imageUrl,
  href
}) => {
  return (
    <article className={styles.storyCard}>
      {imageUrl && (
        <div className={styles.featuredMedia}>
          <img src={imageUrl} alt={title} className={styles.featuredImage} />
        </div>
      )}
      <div className={styles.storyHeader}>
        <h2 className={styles.storyTitle}>
          <Link href={href}>
            {title}
          </Link>
        </h2>
        <time className={styles.storyDate}>{date}</time>
      </div>
      <p className={styles.storyExcerpt}>{excerpt}</p>
      <div className={styles.storyMeta}>
        {tags.length > 0 && (
          <div className={styles.storyTags}>
            {tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export default StoryCard; 
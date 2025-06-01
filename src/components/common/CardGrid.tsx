'use client';

import React from 'react';
import ContentCard from '@/components/common/ContentCard';
import styles from '@/styles/components/layout/CardGrid.module.css';

interface BaseContent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  size?: 'large' | 'medium' | 'small';
  href: string;
}

interface TagContent extends BaseContent {
  type: 'tag';
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
  entryCount?: number;
  albumCount?: number;
  parentId?: string;
  onBack?: () => void;
}

interface EntryContent extends BaseContent {
  type: 'entry';
  date?: string;
  tags?: string[];
}

interface AlbumContent extends BaseContent {
  type: 'album';
  entryCount?: number;
  date?: string;
  tags?: string[];
}

type Content = TagContent | EntryContent | AlbumContent;

interface CardGridProps {
  entries?: Content[];
  title?: string;
  description?: string;
  onBack?: () => void;
}

const CardGrid: React.FC<CardGridProps> = ({
  entries = [],
  title,
  description,
  onBack
}) => {
  if (!entries || entries.length === 0) {
    return (
      <section className={styles.section}>
        {(title || description || onBack) && (
          <div className={styles.header}>
            {onBack && (
              <button 
                onClick={onBack}
                className={styles.backButton}
                aria-label="Go back"
              >
                ← Back
              </button>
            )}
            {title && <h2 className={styles.title}>{title}</h2>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
        )}
        <div className={styles.empty}>
          No entries to display.
        </div>
      </section>
    );
  }

  // Assign random sizes to entries if not specified
  const entriesWithSizes = entries.map(entry => ({
    ...entry,
    size: entry.size || ['large', 'medium', 'small'][Math.floor(Math.random() * 3)] as 'large' | 'medium' | 'small'
  }));

  return (
    <section className={styles.section}>
      {(title || description || onBack) && (
        <div className={styles.header}>
          {onBack && (
            <button 
              onClick={onBack}
              className={styles.backButton}
              aria-label="Go back"
            >
              ← Back
            </button>
          )}
          {title && <h2 className={styles.title}>{title}</h2>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      )}
      
      <div className={styles.grid}>
        {entriesWithSizes.map(entry => (
          <ContentCard
            key={entry.id}
            {...entry}
          />
        ))}
      </div>
    </section>
  );
};

export default CardGrid; 
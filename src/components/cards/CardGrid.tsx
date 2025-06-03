'use client';

import React from 'react';
import ContentCard from '@/components/common/ContentCard';
import styles from './CardGrid.module.css';

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
      <div className={styles.gridContainer}>
        {(title || description || onBack) && (
          <div className={styles.cardContent}>
            {onBack && (
              <button 
                onClick={onBack}
                className={styles.cardLink}
                aria-label="Go back"
              >
                ← Back
              </button>
            )}
            {title && <h2 className={styles.cardTitle}>{title}</h2>}
            {description && <p className={styles.cardExcerpt}>{description}</p>}
          </div>
        )}
        <div className={styles.cardContent}>
          No entries to display.
        </div>
      </div>
    );
  }

  // Assign random sizes to entries if not specified
  const entriesWithSizes = entries.map(entry => ({
    ...entry,
    size: entry.size || ['large', 'medium', 'small'][Math.floor(Math.random() * 3)] as 'large' | 'medium' | 'small'
  }));

  return (
    <div className={styles.gridContainer}>
      {(title || description || onBack) && (
        <div className={styles.cardContent}>
          {onBack && (
            <button 
              onClick={onBack}
              className={styles.cardLink}
              aria-label="Go back"
            >
              ← Back
            </button>
          )}
          {title && <h2 className={styles.cardTitle}>{title}</h2>}
          {description && <p className={styles.cardExcerpt}>{description}</p>}
        </div>
      )}
      
      {entriesWithSizes.map(entry => (
        <ContentCard
          key={entry.id}
          {...entry}
        />
      ))}
    </div>
  );
};

export default CardGrid; 
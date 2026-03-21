'use client';

import React from 'react';
import ContentCard from './ContentCard';
import styles from './CardGrid.module.css';

interface BaseContent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  size?: 'large' | 'medium' | 'small' | 'wide';
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

type Content = TagContent;

interface CardGridProps {
  items?: Content[];
  title?: string;
  description?: string;
  onBack?: () => void;
}

const CardGrid: React.FC<CardGridProps> = ({
  items = [],
  title,
  description,
  onBack
}) => {
  if (!items || items.length === 0) {
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
          No items to display.
        </div>
      </div>
    );
  }

  // Assign deterministic sizes to items if not specified (ContentCard tag mode: no "wide")
  // Uses index to avoid Math.random() which causes hydration mismatch (server vs client differ)
  const sizeOptions = ['large', 'medium', 'small'] as const;
  const itemsWithSizes = items.map((item, idx) => {
    const pick = item.size
      ? item.size === 'wide'
        ? 'large'
        : item.size
      : sizeOptions[idx % sizeOptions.length];
    return { ...item, size: pick };
  });

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
      
      {itemsWithSizes.map((item, idx) => (
        <ContentCard
          key={item.id || `${item.type}-${idx}`}
          {...item}
        />
      ))}
    </div>
  );
};

export default CardGrid; 
'use client';

import React from 'react';
import { Tag } from '@/lib/types/tag';
import styles from '@/lib/styles/components/features/tag/TagBox.module.css';

interface TagBoxProps {
  tag: Tag;
  size?: 'large' | 'medium' | 'small';
  isExpanded?: boolean;
  onClick?: () => void;
  entryCount?: number;
  albumCount?: number;
}

export default function TagBox({
  tag,
  size = 'medium',
  isExpanded = false,
  onClick,
  entryCount = 0,
  albumCount = 0
}: TagBoxProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`${styles.tagBox} ${styles[size]} ${isExpanded ? styles.expanded : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className={styles.content}>
        <h3 className={styles.title}>{tag.name}</h3>
        {(entryCount > 0 || albumCount > 0) && (
          <div className={styles.counts}>
            {entryCount > 0 && (
              <span className={styles.count}>
                {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
              </span>
            )}
            {albumCount > 0 && (
              <span className={styles.count}>
                {albumCount} {albumCount === 1 ? 'album' : 'albums'}
              </span>
            )}
          </div>
        )}
        {tag.description && (
          <p className={styles.description}>{tag.description}</p>
        )}
      </div>
    </div>
  );
} 
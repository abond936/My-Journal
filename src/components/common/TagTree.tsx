'use client';

import React, { useState, useEffect } from 'react';
import styles from './TagTree.module.css';
import { Tag } from '@/lib/types/tag';
import { useTag } from '@/components/providers/TagProvider';

interface TagNode extends Tag {
  children: TagNode[];
}

interface TagTreeProps {
  onTagSelect: (tagId: string) => void;
  selectedTags: string[];
}

export default function TagTree({ onTagSelect, selectedTags }: TagTreeProps) {
  const { dimensionalTree, loading: isLoading, error } = useTag();
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  const toggleTag = (tagId: string) => {
    setExpandedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const renderTag = (tag: TagNode, level: number = 0) => {
    const isExpanded = expandedTags.has(tag.id);
    const isSelected = selectedTags.includes(tag.id);

    return (
      <div
        key={tag.id}
        className={styles.tagItem}
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        <div className={styles.tagHeader}>
          <button
            className={styles.expandButton}
            onClick={() => toggleTag(tag.id)}
            aria-expanded={isExpanded}
            disabled={tag.children.length === 0}
          >
            {tag.children.length > 0 && (
              <span className={styles.expandIcon}>
                {isExpanded ? '▼' : '►'}
              </span>
            )}
          </button>
          
          <button
            onClick={() => onTagSelect(tag.id)}
            className={`${styles.tagButton} ${isSelected ? styles.active : ''}`}
          >
            <span className={styles.tagName}>{tag.name}</span>
          </button>
        </div>

        {isExpanded && tag.children.length > 0 && (
          <div className={styles.children}>
            {tag.children.map(child => renderTag(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading tags...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error.message}</div>;
  }

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Explore</h2>
      <nav className={styles.navigation}>
        {dimensionalTree.map(rootTagNode => renderTag(rootTagNode, 0))}
      </nav>
    </aside>
  );
} 
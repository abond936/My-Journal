'use client';

import React, { useState, useEffect } from 'react';
import styles from './TagTree.module.css';
import { Tag } from '@/lib/types/tag';

interface TagTreeProps {
  onTagSelect: (tagId: string) => void;
  selectedTags: string[];
}

interface TagWithCount extends Tag {
  entryCount: number;
}

export default function TagTree({ onTagSelect, selectedTags }: TagTreeProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTagTree() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/tags/tree');
        if (!response.ok) {
          throw new Error('Failed to fetch tag tree data');
        }
        const data: TagWithCount[] = await response.json();
        setTags(data);

        // Expand root tags by default
        const rootTags = data
          .filter(tag => !tag.parentId)
          .map(tag => tag.id);
        setExpandedTags(new Set(rootTags));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTagTree();
  }, []);

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

  const renderTag = (tag: TagWithCount, level: number = 0, index: number = 0) => {
    const children = tags.filter(t => t.parentId === tag.id);
    const isExpanded = expandedTags.has(tag.id);
    const isSelected = selectedTags.includes(tag.id);
    const isTopLevel = !tag.parentId;

    return (
      <div
        key={`tag-${level}-${tag.id}-${index}`}
        className={`${styles.categoryItem} ${isTopLevel ? styles.topLevel : ''}`}
      >
        <div
          className={styles.categoryHeader}
          style={{ paddingLeft: `${level * 0.5}rem` }}
        >
          <button
            className={styles.expandButton}
            onClick={() => toggleTag(tag.id)}
            aria-expanded={isExpanded}
            disabled={children.length === 0}
          >
            {children.length > 0 && (
              <span className={styles.expandIcon}>
                {isExpanded ? '−' : '+'}
              </span>
            )}
          </button>
          
          <button
            onClick={() => onTagSelect(tag.id)}
            className={`${styles.categoryButton} ${isSelected ? styles.active : ''}`}
            data-dimension={tag.dimension}
          >
            <span className={styles.tagName}>{tag.name}</span>
            <span className={styles.entryCount}>({tag.entryCount})</span>
          </button>
        </div>

        {isExpanded && children.length > 0 && (
          <div className={styles.children}>
            {children.map((child, childIndex) => renderTag(child, level + 1, childIndex))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading tags...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  const rootTags = tags.filter(tag => !tag.parentId);

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navigation}>
        {rootTags.map((tag, index) => (
          <React.Fragment key={`root-${tag.id}-${index}`}>
            {renderTag(tag)}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
} 
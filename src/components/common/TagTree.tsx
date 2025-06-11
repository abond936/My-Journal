'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './TagTree.module.css';
import { Tag } from '@/lib/types/tag';
import { useTag } from '@/lib/contexts/TagContext';

interface TagTreeProps {
  onTagSelect: (tagId: string) => void;
  selectedTags: string[];
}

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

export default function TagTree({ onTagSelect, selectedTags }: TagTreeProps) {
  const { tags, loading: isLoading, error: contextError } = useTag();
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  
  const [error, setError] = useState<string | null>(contextError?.message || null);

  const tagTree = useMemo(() => {
    if (!tags || tags.length === 0) return [];

    const tagsWithChildren: TagWithChildren[] = tags.map(tag => ({ ...tag, children: [] }));
    const tagMap = new Map(tagsWithChildren.map(tag => [tag.id, tag]));
    const rootTags: TagWithChildren[] = [];

    tagsWithChildren.forEach(tag => {
      if (tag.parentId) {
        const parent = tagMap.get(tag.parentId);
        if (parent) {
          parent.children.push(tag);
        }
      } else {
        rootTags.push(tag);
      }
    });

    // Recursive sort function
    const sortTags = (tagList: TagWithChildren[]) => {
      tagList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      tagList.forEach(tag => {
        if (tag.children.length > 0) {
          sortTags(tag.children);
        }
      });
    };

    sortTags(rootTags);
    return rootTags;
  }, [tags]);

  useEffect(() => {
    // When the tree is built, expand the root tags by default.
    if (tagTree.length > 0) {
      const rootTagIds = new Set(tagTree.map(t => t.id));
      setExpandedTags(rootTagIds);
    }
  }, [tagTree]);

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

  const renderTag = (tag: TagWithChildren, level: number = 0, index: number = 0) => {
    const children = tag.children; // Use children from the processed tree
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
                {isExpanded ? '▼' : '►'}
              </span>
            )}
          </button>
          
          <button
            onClick={() => onTagSelect(tag.id)}
            className={`${styles.categoryButton} ${isSelected ? styles.active : ''}`}
            data-dimension={tag.dimension}
          >
            <span className={styles.tagName}>{tag.name}</span>
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

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Explore</h2>
      <nav className={styles.navigation}>
        {tagTree.map((tag, index) => (
          <React.Fragment key={`root-${tag.id}-${index}`}>
            {renderTag(tag, 0, index)}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
} 
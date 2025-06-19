'use client';

import React, { useState, useMemo } from 'react';
import { Tag } from '@/lib/types/tag';
import styles from './TagSelector.module.css';

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

interface TagSelectorProps {
  tree: TagWithChildren[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  tree,
  selectedTags = [],
  onTagsChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  const visibleTags = useMemo(() => {
    if (!searchTerm) {
      return new Set<string>();
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const matchingTags = new Set<string>();

    const findMatchingChildren = (tag: TagWithChildren): boolean => {
      let isMatch = tag.name.toLowerCase().includes(lowerCaseSearchTerm);

      if (tag.children?.length > 0) {
        for (const child of tag.children) {
          if (findMatchingChildren(child)) {
            isMatch = true;
          }
        }
      }
      
      if (isMatch) {
        matchingTags.add(tag.id);
      }
      return isMatch;
    };

    tree.forEach(findMatchingChildren);
    return matchingTags;
  }, [searchTerm, tree]);
  
  const toggleTagExpansion = (tagId: string) => {
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

  const handleTagSelectionToggle = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onTagsChange(newSelectedTags);
  };

  const renderTag = (tag: TagWithChildren, level: number = 0) => {
    const isExpanded = expandedTags.has(tag.id);
    const hasChildren = tag.children && tag.children.length > 0;
    const isSelected = selectedTags.includes(tag.id);

    if (searchTerm && !visibleTags.has(tag.id)) {
      return null;
    }

    return (
      <div 
        key={tag.id}
        className={styles.tagItem}
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        <div className={styles.tagRow}>
          {hasChildren && (
            <button
              className={styles.expandButton}
              onClick={() => toggleTagExpansion(tag.id)}
              aria-expanded={isExpanded}
            >
              <span className={styles.expandIcon}>
                {isExpanded ? '−' : '+'}
              </span>
            </button>
          )}
          <button
            className={`${styles.tag} ${isSelected ? styles.selected : ''}`}
            onClick={() => handleTagSelectionToggle(tag.id)}
            type="button"
            title={tag.description}
          >
            {tag.name}
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div className={styles.children}>
            {tag.children.map(child => renderTag(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!tree) {
    return <div className={styles.loading}>Loading tags...</div>;
  }

  return (
    <div className={styles.tagSelector}>
      <input
        type="text"
        placeholder="Search tags..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />
      <div className={styles.tagList}>
        {tree.map(tag => renderTag(tag))}
      </div>
    </div>
  );
};

export default TagSelector; 
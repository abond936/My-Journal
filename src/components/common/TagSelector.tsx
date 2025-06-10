'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTag } from '@/lib/contexts/TagContext';
import { Tag } from '@/lib/types/tag';
import styles from './TagSelector.module.css';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
}

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  dimension
}) => {
  const { tags: allTags, loading: isLoading, error } = useTag();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  const tagTree = useMemo(() => {
    const filteredTags = dimension 
      ? allTags.filter(tag => tag.dimension === dimension) 
      : allTags;

    const tagMap = new Map<string, TagWithChildren>();
    const rootTags: TagWithChildren[] = [];

    filteredTags.forEach(tag => {
      tagMap.set(tag.id, { ...tag, children: [] });
    });

    filteredTags.forEach(tag => {
      const tagWithChildren = tagMap.get(tag.id)!;
      if (tag.parentId && tagMap.has(tag.parentId)) {
        const parent = tagMap.get(tag.parentId)!;
        parent.children.push(tagWithChildren);
      } else {
        rootTags.push(tagWithChildren);
      }
    });

    const sortTags = (tags: TagWithChildren[]) => {
      return tags.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    };

    const sortTree = (tags: TagWithChildren[]) => {
      sortTags(tags);
      tags.forEach(tag => sortTree(tag.children));
    };

    sortTree(rootTags);
    return rootTags;
  }, [allTags, dimension]);
  
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
    const hasChildren = tag.children.length > 0;
    const isSelected = selectedTags.includes(tag.id);
    
    const matchesSearch = useMemo(() => {
        if (!searchTerm) return true;
        const selfMatches = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
        const childMatches = tag.children.some(child => 
            child.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return selfMatches || childMatches;
    }, [tag, searchTerm]);

    if (!matchesSearch) {
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

  if (isLoading) {
    return <div className={styles.loading}>Loading tags...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error loading tags: {error.message}</div>;
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
        {tagTree.map(tag => renderTag(tag))}
      </div>
    </div>
  );
};

export default TagSelector; 
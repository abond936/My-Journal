'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';
import { Tag } from '@/lib/types/tag';
import styles from '@/styles/components/features/entry/TagSelector.module.css';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
}

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
  isExpanded?: boolean;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  dimension
}) => {
  const [tags, setTags] = useState<TagWithChildren[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tagsRef = collection(db, 'tags');
        const q = query(tagsRef, orderBy('name'));
        const snapshot = await getDocs(q);
        const fetchedTags = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Tag))
          .filter(tag => !dimension || tag.dimension === dimension);

        // Organize tags into a tree structure
        const tagMap = new Map<string, TagWithChildren>();
        const rootTags: TagWithChildren[] = [];

        // First pass: create all tag objects
        fetchedTags.forEach(tag => {
          tagMap.set(tag.id, { ...tag, children: [] });
        });

        // Second pass: build the tree
        fetchedTags.forEach(tag => {
          const tagWithChildren = tagMap.get(tag.id)!;
          if (tag.parentId && tagMap.has(tag.parentId)) {
            const parent = tagMap.get(tag.parentId)!;
            parent.children.push(tagWithChildren);
          } else {
            rootTags.push(tagWithChildren);
          }
        });

        // Sort tags by order if available, otherwise by name
        const sortTags = (tags: TagWithChildren[]) => {
          return tags.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
              return a.order - b.order;
            }
            return a.name.localeCompare(b.name);
          });
        };

        // Sort all levels of the tree
        const sortTree = (tags: TagWithChildren[]) => {
          sortTags(tags);
          tags.forEach(tag => {
            if (tag.children.length > 0) {
              sortTree(tag.children);
            }
          });
        };

        sortTree(rootTags);
        setTags(rootTags);
      } catch (err) {
        setError('Failed to load tags');
        console.error('Error loading tags:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [dimension]);

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

  const handleTagToggle = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onTagsChange(newSelectedTags);
  };

  const renderTag = (tag: TagWithChildren, level: number = 0) => {
    const isExpanded = expandedTags.has(tag.id);
    const hasChildren = tag.children.length > 0;
    const isSelected = selectedTags.includes(tag.id);
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());

    // If searching and this tag doesn't match, only show if it has matching children
    if (searchTerm && !matchesSearch && !tag.children.some(child => 
      child.name.toLowerCase().includes(searchTerm.toLowerCase())
    )) {
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
              onClick={() => toggleTag(tag.id)}
              aria-expanded={isExpanded}
            >
              <span className={styles.expandIcon}>
                {isExpanded ? '−' : '+'}
              </span>
            </button>
          )}
          <button
            className={`${styles.tag} ${isSelected ? styles.selected : ''}`}
            onClick={() => handleTagToggle(tag.id)}
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
    return <div className={styles.error}>{error}</div>;
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
        {tags.map(tag => renderTag(tag))}
      </div>
    </div>
  );
};

export default TagSelector; 
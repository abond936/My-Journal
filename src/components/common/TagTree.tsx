'use client';

import React, { useState, useEffect } from 'react';
import styles from './TagTree.module.css';
import { TagWithChildren } from '@/components/providers/TagProvider';

interface TagTreeProps {
  tree: TagWithChildren[];
  onSelectionChange: (tagId: string, isSelected: boolean) => void;
  selectedTags: string[];
  loading?: boolean;
}

const getAllParentTagIds = (tree: TagWithChildren[]): Set<string> => {
  const parentIds = new Set<string>();
  const traverse = (nodes: TagWithChildren[]) => {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        parentIds.add(node.id);
        traverse(node.children);
      }
    });
  };
  traverse(tree);
  return parentIds;
};

export default function TagTree({ tree, onSelectionChange, selectedTags, loading }: TagTreeProps) {
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  // Expand all tags by default when the tree is first loaded
  useEffect(() => {
    if (tree.length > 0) {
      setExpandedTags(getAllParentTagIds(tree));
    }
  }, [tree]);

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

  const renderTag = (tag: TagWithChildren, level: number = 0) => {
    const isExpanded = expandedTags.has(tag.id);
    const isSelected = selectedTags.includes(tag.id);

    return (
      <div
        key={tag.id}
        className={styles.tagItem}
        style={{ paddingLeft: `${level * 0.2}rem` }}
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
          
          <input
            type="checkbox"
            id={`tag-${tag.id}`}
            checked={isSelected}
            onChange={e => onSelectionChange(tag.id, e.target.checked)}
            className={styles.checkbox}
          />
          <label htmlFor={`tag-${tag.id}`} className={styles.tagName}>
            {tag.name}
          </label>
        </div>

        {isExpanded && tag.children.length > 0 && (
          <div className={styles.children}>
            {tag.children.map(child => renderTag(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Loading tags...</div>;
  }
  if (!tree || tree.length === 0) {
    return <div className={styles.loading}>No tags available.</div>;
  }

  return (
    <>
      {tree.map(rootTagNode => renderTag(rootTagNode, 0))}
    </>
  );
} 
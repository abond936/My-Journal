'use client';

import React, { useEffect, useMemo } from 'react';
import styles from './TagTree.module.css';
import { TagWithChildren } from '@/components/providers/TagProvider';
import { getDefaultExpandedTagIds, getAllExpandableTagIds } from '@/lib/utils/tagUtils';
import { usePersistentTreeExpansion } from '@/lib/hooks/usePersistentTreeExpansion';

interface TagTreeProps {
  tree: TagWithChildren[];
  onSelectionChange: (tagId: string, isSelected: boolean) => void;
  selectedTags: string[];
  loading?: boolean;
  emptyMessage?: string;
  forceExpandAll?: boolean;
  /** When provided (and user is admin), shows control to set default expand state */
  onSetDefaultExpanded?: (tagId: string, expanded: boolean) => void;
  showDefaultExpandControl?: boolean;
}

export default function TagTree({
  tree,
  onSelectionChange,
  selectedTags,
  loading,
  emptyMessage = 'No tags available.',
  forceExpandAll = false,
  onSetDefaultExpanded,
  showDefaultExpandControl = false,
}: TagTreeProps) {
  const {
    expandedIds,
    toggleExpanded,
    initializeIfEmpty,
  } = usePersistentTreeExpansion('myjournal:tag-tree:expanded');

  const forceExpandedIds = useMemo(() => getAllExpandableTagIds(tree), [tree]);
  const effectiveExpanded = forceExpandAll ? forceExpandedIds : expandedIds;

  // Set initial expanded state based on tag.defaultExpanded (collapsed when false).
  useEffect(() => {
    if (tree.length > 0) {
      initializeIfEmpty(Array.from(getDefaultExpandedTagIds(tree)));
    }
  }, [tree, initializeIfEmpty]);

  const renderTag = (tag: TagWithChildren, level: number = 0) => {
    const isExpanded = effectiveExpanded.has(tag.docId);
    const isSelected = selectedTags.includes(tag.docId);
    const hasChildren = tag.children && tag.children.length > 0;
    const isDefaultExpanded = tag.defaultExpanded !== false;

    return (
      <div
        key={tag.docId}
        className={styles.tagItem}
        style={{ paddingLeft: `${level * 0.2}rem` }}
      >
        <div className={styles.tagHeader}>
          <div className={styles.tagHeaderLeading}>
            <button
              className={styles.expandButton}
              onClick={() => toggleExpanded(tag.docId)}
              aria-expanded={isExpanded}
              disabled={!hasChildren}
            >
              {hasChildren && (
                <span className={styles.expandIcon}>
                  {isExpanded ? '▼' : '►'}
                </span>
              )}
            </button>
            {showDefaultExpandControl && hasChildren && onSetDefaultExpanded && (
              <button
                type="button"
                className={styles.defaultExpandButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefaultExpanded(tag.docId!, !isDefaultExpanded);
                }}
                title={isDefaultExpanded ? 'Collapse by default' : 'Expand by default'}
                aria-label={isDefaultExpanded ? 'Set collapsed by default' : 'Set expanded by default'}
              >
                {isDefaultExpanded ? '⊟' : '⊞'}
              </button>
            )}
          </div>
          <input
            type="checkbox"
            id={`tag-${tag.docId}`}
            checked={isSelected}
            onChange={e => onSelectionChange(tag.docId, e.target.checked)}
            className={styles.checkbox}
          />
          <label htmlFor={`tag-${tag.docId}`} className={styles.tagName}>
            {tag.name}
            <span className={styles.cardCount}>
              ({tag.cardCount ?? 0}/{tag.mediaCount ?? 0})
            </span>
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
    return <div className={styles.loading}>{emptyMessage}</div>;
  }

  return (
    <>
      {tree.map(rootTagNode => renderTag(rootTagNode, 0))}
    </>
  );
} 
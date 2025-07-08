/**
 * @file TagAdminRow.tsx
 * @description This component renders a single row in the tag management tree.
 * It is a purely presentational component responsible for displaying tag information,
 * handling user interactions like editing, adding a child, and deleting, but it
 * does NOT contain any drag-and-drop logic itself. The drag-and-drop capability
 * is provided by a parent wrapper component (e.g., SortableTag).
 */
'use client';

import React, { useState } from 'react';
import { Tag } from '@/lib/types/tag';
import styles from './TagAdminRow.module.css';

// Extends the base Tag type to include children for tree structures.
interface TagWithChildren extends Tag {
  children?: TagWithChildren[];
}

// Defines the props accepted by the TagAdminRow component.
interface TagAdminRowProps {
  tag: TagWithChildren;
  depth: number; // The nesting level of the tag in the tree, used for indentation.
  onUpdateTag: (id: string, tagData: Partial<Omit<Tag, 'docId'>>) => void;
  onDeleteTag: (id: string) => void;
  onCreateTag: (tagData: Omit<Tag, 'docId' | 'createdAt' | 'updatedAt'>) => void;
  isCollapsed: boolean; // Whether the node's children are currently hidden.
  onToggleCollapse: (tagId: string) => void;
}

export function TagAdminRow({
  tag,
  depth,
  onUpdateTag,
  onDeleteTag,
  onCreateTag,
  isCollapsed,
  onToggleCollapse,
}: TagAdminRowProps) {
  // State for handling inline editing of the tag name.
  const [isEditing, setIsEditing] = useState(false);
  const [tagName, setTagName] = useState(tag.name);

  // State for showing/hiding the "add child" form.
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [childName, setChildName] = useState('');

  // Check if this is an artificial dimension label
  const isDimensionLabel = tag.docId?.startsWith('dim-');
  
  // Check if this is a top-level parent (first actual tag in a dimension)
  const isTopLevelParent = depth === 0 && !isDimensionLabel;

  // Hide dimension labels completely
  if (isDimensionLabel) {
    return null;
  }

  /**
   * Saves the updated tag name if it has changed.
   */
  const handleSave = () => {
    if (tagName.trim() && tagName.trim() !== tag.name) {
      onUpdateTag(tag.docId!, { name: tagName.trim() });
    }
    setIsEditing(false);
  };

  /**
   * Handles the form submission for creating a new child tag.
   */
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (childName.trim()) {
      // The parentId is the current tag's docId.
      await onCreateTag({ name: childName.trim(), parentId: tag.docId! });
      setIsAddingChild(false);
      setChildName('');
    }
  };

  const hasChildren = tag.children && tag.children.length > 0;

  return (
    <div className={styles.tagAdminRow}>
      <div className={styles.tagContent}>
        {/* Expander button (for nodes with children) */}
        {hasChildren && (
          <div className={styles.expander}>
            <button onClick={() => onToggleCollapse(tag.docId!)} className={styles.expandButton}>
              {isCollapsed ? '►' : '▼'}
            </button>
          </div>
        )}
        {!hasChildren && <div className={styles.expander} />}

        {/* Tag name (editable on click) */}
        <div className={styles.tagNameContainer}>
          {isEditing ? (
            <input
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              className={styles.editInput}
            />
          ) : (
            <span 
              onClick={() => setIsEditing(true)} 
              className={`${styles.tagName} ${isTopLevelParent ? styles.topLevelParent : ''}`}
              data-dimension={tag.dimension || 'none'}
            >
              {tag.name}
              {tag.cardCount !== undefined && (
                <span className={styles.cardCount}>
                  ({tag.cardCount})
                </span>
              )}
            </span>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className={styles.actions}>
          <button onClick={() => setIsAddingChild(p => !p)} className={styles.actionButton}>+</button>
          <button onClick={() => onDeleteTag(tag.docId!)} className={styles.actionButton}>×</button>
        </div>
      </div>

      {/* Form for adding a new child tag */}
      {isAddingChild && (
        <form onSubmit={handleAddChild} className={styles.addChildForm}>
          <input
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="New child name"
            autoFocus
            className={styles.addChildInput}
          />
          <button type="submit" className={styles.addChildButton}>Add</button>
        </form>
      )}
    </div>
  );
} 
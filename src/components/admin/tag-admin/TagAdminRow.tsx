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
  onUpdateTag: (id: string, tagData: Partial<Omit<Tag, 'id'>>) => void;
  onDeleteTag: (id: string) => void;
  onCreateTag: (tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => void;
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

  // Dynamic style to apply indentation based on the tag's depth in the tree.
  const rowStyle = {
    marginLeft: `${depth * 24}px`,
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    boxSizing: 'border-box' as const,
  };

  /**
   * Saves the updated tag name if it has changed.
   */
  const handleSave = () => {
    if (tagName.trim() && tagName.trim() !== tag.name) {
      onUpdateTag(tag.id, { name: tagName.trim() });
    }
    setIsEditing(false);
  };

  /**
   * Handles the form submission for creating a new child tag.
   */
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (childName.trim()) {
      // The parentId is the current tag's id.
      await onCreateTag({ name: childName.trim(), parentId: tag.id });
      setIsAddingChild(false);
      setChildName('');
    }
  };

  const hasChildren = tag.children && tag.children.length > 0;

  return (
    <div className={styles.tagAdminRow}>
      <div className={styles.tagContent}>
        {/* Expander button (for nodes with children) */}
        <div className={styles.expander}>
          {hasChildren && (
            <button onClick={() => onToggleCollapse(tag.id)} className={styles.expandButton}>
              {isCollapsed ? '►' : '▼'}
            </button>
          )}
        </div>

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
            <span onClick={() => setIsEditing(true)} className={styles.tagName}>
              {tag.name}
            </span>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className={styles.actions}>
          <button onClick={() => setIsAddingChild(p => !p)} className={styles.actionButton}>+</button>
          <button onClick={() => onDeleteTag(tag.id)} className={styles.actionButton}>Delete</button>
        </div>
      </div>

      {/* Form for adding a new child tag */}
      {isAddingChild && (
        <form onSubmit={handleAddChild} className={styles.addChildForm} style={{ marginLeft: `${depth * 24}px` }}>
          <input
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="New child name"
            autoFocus
            className={styles.addChildInput}
          />
          <button type="submit" className={styles.addChildButton}>Add Child</button>
        </form>
      )}
    </div>
  );
} 
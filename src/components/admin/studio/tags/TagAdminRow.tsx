'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Ellipsis,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Tag } from '@/lib/types/tag';
import styles from './TagAdminRow.module.css';

interface TagWithChildren extends Tag {
  children?: TagWithChildren[];
}

interface TagAdminRowProps {
  tag: TagWithChildren;
  depth: number;
  onUpdateTag: (id: string, tagData: Partial<Omit<Tag, 'docId'>>) => void;
  onDeleteTag: (id: string) => void;
  onCreateTag: (tagData: Omit<Tag, 'docId' | 'createdAt' | 'updatedAt'>) => void;
  isCollapsed: boolean;
  onToggleCollapse: (tagId: string) => void;
  highlighted?: boolean;
}

export function TagAdminRow({
  tag,
  depth,
  onUpdateTag,
  onDeleteTag,
  onCreateTag,
  isCollapsed,
  onToggleCollapse,
  highlighted = false,
}: TagAdminRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tagName, setTagName] = useState(tag.name);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [menuOpen]);

  if (tag.docId?.startsWith('dim-')) return null;

  const isTopLevelParent = depth === 0;
  const hasChildren = Boolean(tag.children?.length);

  const restoreMenuFocus = () => {
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  const handleSave = () => {
    if (tagName.trim() && tagName.trim() !== tag.name) {
      onUpdateTag(tag.docId!, { name: tagName.trim() });
    }
    setIsEditing(false);
    restoreMenuFocus();
  };

  const handleCancelEdit = () => {
    setTagName(tag.name);
    setIsEditing(false);
    restoreMenuFocus();
  };

  const handleAddChild = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!childName.trim()) return;
    await onCreateTag({ name: childName.trim(), parentId: tag.docId! });
    setIsAddingChild(false);
    setChildName('');
    restoreMenuFocus();
  };

  const handleCancelAddChild = () => {
    setChildName('');
    setIsAddingChild(false);
    restoreMenuFocus();
  };

  return (
    <div className={styles.tagAdminRow}>
      <div className={`${styles.tagContent} ${highlighted ? styles.tagContentHighlighted : ''}`}>
        <div className={styles.expander}>
          {hasChildren && (
            <button
              type="button"
              onClick={() => onToggleCollapse(tag.docId!)}
              className={styles.expandButton}
              aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${tag.name}`}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <ChevronRight size={14} aria-hidden="true" />
              ) : (
                <ChevronDown size={14} aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        <div className={styles.tagNameContainer}>
          {isEditing ? (
            <input
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              onBlur={handleSave}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSave();
                if (event.key === 'Escape') handleCancelEdit();
              }}
              aria-label={`Rename ${tag.name}`}
              autoFocus
              className={styles.editInput}
            />
          ) : (
            <span
              className={`${styles.tagName} ${isTopLevelParent ? styles.topLevelParent : ''}`}
              data-dimension={tag.dimension || 'none'}
            >
              {tag.name}
              <span
                className={styles.cardCount}
                title={`${tag.cardCount ?? 0} cards, ${tag.mediaCount ?? 0} media items`}
                aria-label={`${tag.cardCount ?? 0} cards, ${tag.mediaCount ?? 0} media items`}
              >
                ({tag.cardCount ?? 0}/{tag.mediaCount ?? 0})
              </span>
            </span>
          )}
        </div>

        <div className={styles.actions} ref={menuRef}>
          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setMenuOpen((open) => !open)}
            className={styles.actionButton}
            aria-label={`Actions for ${tag.name}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Ellipsis size={16} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div
              className={styles.actionMenu}
              role="menu"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setMenuOpen(false);
                  restoreMenuFocus();
                }
              }}
            >
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setIsEditing(true); }}>
                <Pencil size={14} aria-hidden="true" /> Rename
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setIsAddingChild(true); }}>
                <Plus size={14} aria-hidden="true" /> Add child
              </button>
              {hasChildren && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onUpdateTag(tag.docId!, { defaultExpanded: tag.defaultExpanded === false });
                  }}
                >
                  {tag.defaultExpanded === false ? (
                    <PanelLeftOpen size={14} aria-hidden="true" />
                  ) : (
                    <PanelLeftClose size={14} aria-hidden="true" />
                  )}
                  {tag.defaultExpanded === false ? 'Expand in Reader' : 'Collapse in Reader'}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className={styles.destructiveMenuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteTag(tag.docId!);
                }}
              >
                <Trash2 size={14} aria-hidden="true" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {isAddingChild && (
        <form onSubmit={handleAddChild} className={styles.addChildForm}>
          <input
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                handleCancelAddChild();
              }
            }}
            placeholder="New child name"
            aria-label={`New child of ${tag.name}`}
            autoFocus
            className={styles.addChildInput}
          />
          <button type="submit" className={styles.addChildButton}>Add</button>
        </form>
      )}
    </div>
  );
}

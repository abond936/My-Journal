'use client';

import React, { useState, useCallback } from 'react';
import { Tag, TagWithChildren } from '@/lib/types/tag';
import { useTag } from '@/components/providers/TagProvider';
import { getTagTreeExpandLevelsForDimension } from '@/lib/constants/tagTreeExpansion';
import styles from './MacroTagSelector.module.css';

type TagDimension = NonNullable<Tag['dimension']>;

interface TagPickerDimensionColumnProps {
  dimension: TagWithChildren;
  selection: Set<string>;
  onSelectionChange: (tagId: string, selected: boolean) => void;
  getSelectionState?: (tagId: string) => 'checked' | 'unchecked' | 'mixed';
  onToggleTag?: (tagId: string, currentState: 'checked' | 'unchecked' | 'mixed') => void;
  expandedNodeIds?: Set<string>;
  checkboxIdPrefix: string;
  forceExpandAll?: boolean;
}

export default function TagPickerDimensionColumn({
  dimension,
  selection,
  onSelectionChange,
  getSelectionState,
  onToggleTag,
  expandedNodeIds,
  checkboxIdPrefix,
  forceExpandAll = false,
}: TagPickerDimensionColumnProps) {
  const { createTag } = useTag();
  const dimensionKey = dimension.dimension as TagDimension;
  const [rootDraft, setRootDraft] = useState('');
  const [childDraft, setChildDraft] = useState('');
  const [pendingChild, setPendingChild] = useState<{ id: string; name: string } | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(
    async (name: string, parentId: string | undefined) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setAddError(null);
      setCreating(true);
      try {
        const payload: Omit<Tag, 'docId'> = {
          name: trimmed,
          ...(parentId ? { parentId } : { dimension: dimensionKey }),
        };
        const tag = await createTag(payload);
        if (!tag?.docId) {
          setAddError('Could not create tag. The name may already exist.');
          return;
        }
        onSelectionChange(tag.docId, true);
        setRootDraft('');
        setChildDraft('');
        setPendingChild(null);
      } finally {
        setCreating(false);
      }
    },
    [createTag, dimensionKey, onSelectionChange]
  );

  const requestAddChild = (id: string, name: string) => {
    setAddError(null);
    setPendingChild({ id, name });
    setChildDraft('');
  };

  const cancelPendingChild = () => {
    setPendingChild(null);
    setChildDraft('');
    setAddError(null);
  };

  return (
    <div className={styles.dimensionColumn}>
      <h4>{dimension.name}</h4>

      <div className={styles.addTagBlock}>
        <span className={styles.addTagLabel}>New tag (top level)</span>
        <div className={styles.addTagRow}>
          <input
            type="text"
            className={styles.addTagInput}
            value={rootDraft}
            onChange={e => setRootDraft(e.target.value)}
            placeholder="Name"
            disabled={creating}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreate(rootDraft, undefined);
              }
            }}
          />
          <button
            type="button"
            className={styles.addTagButton}
            disabled={creating || !rootDraft.trim()}
            onClick={() => void handleCreate(rootDraft, undefined)}
          >
            Add
          </button>
        </div>
      </div>

      {pendingChild && (
        <div className={styles.addTagChildPanel}>
          <div className={styles.addTagChildHeading}>
            New tag under <strong>{pendingChild.name}</strong>
          </div>
          <div className={styles.addTagRow}>
            <input
              type="text"
              className={styles.addTagInput}
              value={childDraft}
              onChange={e => setChildDraft(e.target.value)}
              placeholder="Name"
              disabled={creating}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreate(childDraft, pendingChild.id);
                }
              }}
            />
            <button
              type="button"
              className={styles.addTagButton}
              disabled={creating || !childDraft.trim()}
              onClick={() => void handleCreate(childDraft, pendingChild.id)}
            >
              Add
            </button>
            <button
              type="button"
              className={styles.addTagCancel}
              disabled={creating}
              onClick={cancelPendingChild}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {addError && <p className={styles.addTagError}>{addError}</p>}

      <div className={styles.interactiveTree}>
        {dimension.children.map(root => (
          <TagPickerInteractiveTagNode
            key={root.docId}
            node={root}
            selection={selection}
            onChange={onSelectionChange}
            getSelectionState={getSelectionState}
            onToggleTag={onToggleTag}
            expandedNodeIds={expandedNodeIds}
            depth={0}
            dimensionKey={dimensionKey}
            checkboxIdPrefix={checkboxIdPrefix}
            onRequestAddChild={requestAddChild}
            forceExpandAll={forceExpandAll}
          />
        ))}
      </div>
    </div>
  );
}

interface TagPickerInteractiveTagNodeProps {
  node: TagWithChildren;
  selection: Set<string>;
  onChange: (tagId: string, selected: boolean) => void;
  getSelectionState?: (tagId: string) => 'checked' | 'unchecked' | 'mixed';
  onToggleTag?: (tagId: string, currentState: 'checked' | 'unchecked' | 'mixed') => void;
  expandedNodeIds?: Set<string>;
  depth: number;
  dimensionKey: string;
  checkboxIdPrefix: string;
  onRequestAddChild: (id: string, name: string) => void;
  forceExpandAll?: boolean;
}

function TagPickerInteractiveTagNode({
  node,
  selection,
  onChange,
  getSelectionState,
  onToggleTag,
  expandedNodeIds,
  depth,
  dimensionKey,
  checkboxIdPrefix,
  onRequestAddChild,
  forceExpandAll = false,
}: TagPickerInteractiveTagNodeProps) {
  const expandLevels = getTagTreeExpandLevelsForDimension(dimensionKey);
  const [isCollapsed, setIsCollapsed] = useState(() => depth >= expandLevels);
  const selectionState = getSelectionState ? getSelectionState(node.docId) : (selection.has(node.docId) ? 'checked' : 'unchecked');
  const isSelected = selectionState === 'checked';
  const hasChildren = node.children && node.children.length > 0;
  const forceExpandedBySelection = expandedNodeIds?.has(node.docId) ?? false;
  const effectiveCollapsed = forceExpandAll || forceExpandedBySelection ? false : isCollapsed;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onToggleTag) {
      onToggleTag(node.docId, selectionState);
      return;
    }
    onChange(node.docId, e.target.checked);
  };

  const checkboxId = `${checkboxIdPrefix}-${node.docId}`;

  return (
    <div className={styles.interactiveNode}>
      <div className={styles.nodeControl}>
        <span className={styles.nodeGutter}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={styles.collapseButton}
            >
              {effectiveCollapsed ? '►' : '▼'}
            </button>
          ) : (
            <span className={styles.collapseSpacer} aria-hidden />
          )}
          <button
            type="button"
            className={styles.addChildIconButton}
            title={`Add child tag under “${node.name}”`}
            aria-label={`Add child tag under ${node.name}`}
            onClick={() => onRequestAddChild(node.docId!, node.name)}
          >
            +
          </button>
        </span>
        <input
          type="checkbox"
          id={checkboxId}
          checked={isSelected}
          ref={(el) => {
            if (!el) return;
            el.indeterminate = selectionState === 'mixed';
          }}
          aria-checked={selectionState === 'mixed' ? 'mixed' : isSelected}
          onChange={handleCheckboxChange}
        />
        <label htmlFor={checkboxId}>{node.name}</label>
        {selectionState === 'mixed' ? <span className={styles.mixedMarker}>—</span> : null}
      </div>
      {!effectiveCollapsed && hasChildren && (
        <div className={styles.tagChildren}>
          {node.children.map(child => (
            <TagPickerInteractiveTagNode
              key={child.docId}
              node={child}
              selection={selection}
              onChange={onChange}
              getSelectionState={getSelectionState}
              onToggleTag={onToggleTag}
              expandedNodeIds={expandedNodeIds}
              depth={depth + 1}
              dimensionKey={dimensionKey}
              checkboxIdPrefix={checkboxIdPrefix}
              onRequestAddChild={onRequestAddChild}
              forceExpandAll={forceExpandAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

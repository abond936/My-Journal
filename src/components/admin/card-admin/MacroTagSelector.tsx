'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import { Tag, TagWithChildren } from '@/lib/types/tag';
import styles from './MacroTagSelector.module.css';
import { buildSparseTagTree, createUITreeFromDimensions } from '@/lib/utils/tagUtils';
import clsx from 'clsx';
import { useCardForm } from '@/components/providers/CardFormProvider';

interface MacroTagSelectorProps {
  selectedTags: Tag[];
  allTags: Tag[];
  onChange: (newIds: string[]) => void;
  error?: string;
  className?: string;
}

export default function MacroTagSelector({ selectedTags, allTags, onChange, error, className }: MacroTagSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = (newSelection: string[]) => {
    onChange(newSelection);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setIsExpanded(false);
  };

  const selectedTagIds = selectedTags.map(tag => tag.id);

  return (
    <>
      <div className={clsx(styles.container, className, error && styles.error)}>
        <div className={styles.header}>
          <h3>Tags</h3>
          <button
            onClick={() => setIsExpanded(true)}
            className={styles.editButton}
            type="button"
          >
            Edit Tags
          </button>
        </div>
        <div className={styles.collapsedView}>
          {selectedTags.length === 0 ? (
            <span className={styles.noTags}>No tags selected</span>
          ) : (
            <div className={styles.dimensionColumns}>
              {['who', 'what', 'when', 'where', 'reflection'].map(dimension => {
                const dimensionTags = selectedTags.filter(tag => tag.dimension === dimension);
                return (
                  <div key={dimension} className={styles.dimensionColumn}>
                    <h4>{dimension.charAt(0).toUpperCase() + dimension.slice(1)}</h4>
                    {dimensionTags.map(tag => (
                      <div key={tag.id} className={styles.tagNode}>
                        {tag.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {error && <p className={styles.errorText}>{error}</p>}
      </div>
      {isExpanded && (
        <ExpandedView
          initialSelection={selectedTagIds}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}

// A simple recursive component to render the nodes of the sparse tree
function TagNode({ node }: { node: TagWithChildren }) {
  return (
    <div className={styles.tagNode}>
      <span>{node.name}</span>
      {node.children && node.children.length > 0 && (
        <div className={styles.tagChildren}>
          {node.children.map(child => <TagNode key={child.id} node={child} />)}
        </div>
      )}
    </div>
  );
}

// --- Expanded View Component ---

interface ExpandedViewProps {
  initialSelection: string[];
  onSave: (newSelection: string[]) => void;
  onCancel: () => void;
  className?: string;
}

function ExpandedView({ initialSelection, onSave, onCancel, className }: ExpandedViewProps) {
  const { tags } = useTag();
  const [currentSelection, setCurrentSelection] = useState<Set<string>>(new Set(initialSelection));

  const dimensionalTree = useMemo(() => {
    if (!tags) return [];
    return createUITreeFromDimensions(tags);
  }, [tags]);

  const handleTagChange = (tagId: string, isSelected: boolean) => {
    setCurrentSelection(prev => {
      const newSelection = new Set(prev);
      if (isSelected) {
        newSelection.add(tagId);
      } else {
        newSelection.delete(tagId);
      }
      return newSelection;
    });
  };

  const handleSaveClick = () => {
    onSave(Array.from(currentSelection));
  };

  return (
    <div className={clsx(styles.overlay, className)}>
      <div className={styles.modalContainer}>
        <h2 className={styles.modalHeader}>Edit Tags</h2>
        <div className={styles.interactiveColumns}>
          {dimensionalTree.map(dimension => (
            <div key={dimension.id} className={styles.dimensionColumn}>
              <h4>{dimension.name}</h4>
              <div className={styles.interactiveTree}>
                {dimension.children.map(root => (
                  <InteractiveTagNode
                    key={root.id}
                    node={root}
                    selection={currentSelection}
                    onChange={handleTagChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelButton}>Cancel</button>
          <button onClick={handleSaveClick} className={styles.saveButton}>Save</button>
        </div>
      </div>
    </div>
  );
}

// --- Recursive Interactive Node Component ---

interface InteractiveTagNodeProps {
  node: TagWithChildren;
  selection: Set<string>;
  onChange: (tagId: string, selected: boolean) => void;
}

function InteractiveTagNode({ node, selection, onChange }: InteractiveTagNodeProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isSelected = selection.has(node.id);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(node.id, e.target.checked);
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={styles.interactiveNode}>
      <div className={styles.nodeControl}>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={styles.collapseButton}
          >
            {isCollapsed ? '►' : '▼'}
          </button>
        )}
        <input
          type="checkbox"
          id={`tag-${node.id}`}
          checked={isSelected}
          onChange={handleCheckboxChange}
        />
        <label htmlFor={`tag-${node.id}`}>{node.name}</label>
      </div>
      {!isCollapsed && hasChildren && (
        <div className={styles.tagChildren}>
          {node.children.map(child => (
            <InteractiveTagNode
              key={child.id}
              node={child}
              selection={selection}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
} 
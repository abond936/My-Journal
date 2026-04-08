'use client';

import React, { useState, useMemo } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import { Tag, TagWithChildren } from '@/lib/types/tag';
import styles from './MacroTagSelector.module.css';
import { buildSparseTagTree, createUITreeFromDimensions, filterTreesBySearch } from '@/lib/utils/tagUtils';
import clsx from 'clsx';
import TagPickerDimensionColumn from '@/components/admin/card-admin/TagPickerDimensionColumn';

interface MacroTagSelectorProps {
  selectedTags: Tag[];
  allTags: Tag[];
  onChange: (newIds: string[]) => void;
  onSaveSelection?: (newIds: string[]) => void | Promise<void>;
  error?: string;
  className?: string;
  startExpanded?: boolean;
  onRequestClose?: () => void;
}

export default function MacroTagSelector({
  selectedTags,
  allTags,
  onChange,
  onSaveSelection,
  error,
  className,
  startExpanded = false,
  onRequestClose,
}: MacroTagSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(startExpanded);
  const [saving, setSaving] = useState(false);
  const { tags: providerTags } = useTag();
  const effectiveAllTags = providerTags.length > 0 ? providerTags : allTags;

  const handleSave = async (newSelection: string[]) => {
    onChange(newSelection);
    if (onSaveSelection) {
      setSaving(true);
      try {
        await onSaveSelection(newSelection);
      } finally {
        setSaving(false);
      }
      return;
    }
    setIsExpanded(false);
  };

  const handleCancel = () => {
    if (startExpanded && onRequestClose) {
      onRequestClose();
      return;
    }
    setIsExpanded(false);
  };

  const selectedTagIds = selectedTags.map(tag => tag.docId);

  // Build the sparse tree of selected tags and their ancestors
  const selectedTagTree = useMemo(() => {
    if (!effectiveAllTags?.length || selectedTagIds.length === 0) return [];
    return buildSparseTagTree(effectiveAllTags, selectedTagIds);
  }, [effectiveAllTags, selectedTagIds]);

  // Organize the sparse tree by dimension
  const dimensionalSelectedTree = useMemo(() => {
    const dimensions: Record<string, TagWithChildren[]> = {
      who: [],
      what: [],
      when: [],
      where: [],
    };
    selectedTagTree.forEach(rootNode => {
      if (rootNode.dimension && dimensions[rootNode.dimension]) {
        dimensions[rootNode.dimension].push(rootNode);
      }
    });
    return dimensions;
  }, [selectedTagTree]);

  if (isExpanded) {
    return (
      <ExpandedView
        initialSelection={selectedTagIds}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    );
  }

  // This is the default, collapsed view
  return (
    <div className={clsx(styles.container, className, error && styles.error)}>
      <div className={styles.header}>
        <h3>Tags</h3>
        <button
          onClick={() => setIsExpanded(true)}
          className={styles.editButton}
          type="button"
        >
          Edit
        </button>
      </div>
      <div className={styles.collapsedView}>
        <div className={styles.dimensionColumns}>
          {Object.entries(dimensionalSelectedTree).map(([dimension, roots]) => (
            <div key={dimension} className={styles.dimensionColumn}>
              {roots.length > 0 ? (
                roots.map(root => <TagNode key={root.docId} node={root} />)
              ) : (
                <span className={styles.dimensionLabel}>{dimension.toUpperCase()}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

// A simple recursive component to render the nodes of the sparse tree
function TagNode({ node }: { node: TagWithChildren }) {
  const hasChildren = node.children && node.children.length > 0;
  
  return (
    <div className={styles.tagNode}>
      <span className={styles.tagName}>{node.name}</span>
      {hasChildren && (
        <div className={styles.tagChildren}>
          {node.children.map(child => <TagNode key={child.docId} node={child} />)}
        </div>
      )}
    </div>
  );
}

// --- Expanded View Component ---

interface ExpandedViewProps {
  initialSelection: string[];
  onSave: (newSelection: string[]) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  className?: string;
}

function ExpandedView({ initialSelection, onSave, onCancel, saving = false, className }: ExpandedViewProps) {
  const { tags } = useTag();
  const [currentSelection, setCurrentSelection] = useState<Set<string>>(new Set(initialSelection));
  const [searchTerm, setSearchTerm] = useState('');

  const dimensionalTree = useMemo(() => {
    if (!tags) return [];
    return createUITreeFromDimensions(tags);
  }, [tags]);

  const filteredDimensionalTree = useMemo(() => {
    const search = searchTerm.trim();
    if (!search) return dimensionalTree;
    return dimensionalTree.map(dim => ({
      ...dim,
      children: filterTreesBySearch(dim.children, search),
    }));
  }, [dimensionalTree, searchTerm]);

  // Build sparse tree showing selected tags and their ancestors
  const selectedTagTree = useMemo(() => {
    if (!tags || currentSelection.size === 0) return [];
    return buildSparseTagTree(tags, Array.from(currentSelection));
  }, [tags, currentSelection]);

  // Organize the sparse tree by dimension (same logic as main component)
  const dimensionalSelectedTree = useMemo(() => {
    const dimensions: Record<string, TagWithChildren[]> = {
      who: [],
      what: [],
      when: [],
      where: [],
    };
    selectedTagTree.forEach(rootNode => {
      if (rootNode.dimension && dimensions[rootNode.dimension]) {
        dimensions[rootNode.dimension].push(rootNode);
      }
    });
    return dimensions;
  }, [selectedTagTree]);

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

  const handleSaveClick = async () => {
    await onSave(Array.from(currentSelection));
  };

  return (
    <div className={clsx(styles.overlay, className)}>
      <div className={styles.modalContainer}>
        <h2 className={styles.modalHeader}>Edit Tags</h2>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search tags…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={styles.searchClear}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        
        {selectedTagTree.length > 0 && (
          <div className={styles.treeDisplaySection}>
            <h3>Selected Tags</h3>
            <div className={styles.dimensionColumns}>
              {Object.entries(dimensionalSelectedTree).map(([dimension, roots]) => (
                <div key={dimension} className={styles.dimensionColumn}>
                  {roots.length > 0 ? (
                    roots.map(root => <TagNode key={root.docId} node={root} />)
                  ) : (
                    <span className={styles.dimensionLabel}>{dimension.toUpperCase()}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className={styles.interactiveColumns}>
          {filteredDimensionalTree.map(dimension => (
            <TagPickerDimensionColumn
              key={dimension.docId}
              dimension={dimension}
              selection={currentSelection}
              onSelectionChange={handleTagChange}
              checkboxIdPrefix="tag"
              forceExpandAll={!!searchTerm.trim()}
            />
          ))}
        </div>
        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelButton} disabled={saving}>Cancel</button>
          <button onClick={() => void handleSaveClick()} className={styles.saveButton} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

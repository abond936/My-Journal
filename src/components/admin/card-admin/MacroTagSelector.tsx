'use client';

import React, { useState, useMemo } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import { Tag, TagWithChildren } from '@/lib/types/tag';
import styles from './MacroTagSelector.module.css';
import {
  buildSparseTagTree,
  createUITreeFromDimensions,
  filterTreesBySearch,
  normalizeTagDimensionKey,
} from '@/lib/utils/tagUtils';
import { DIMENSION_ORDER } from '@/lib/utils/tagDisplay';
import clsx from 'clsx';
import TagPickerDimensionColumn from '@/components/admin/card-admin/TagPickerDimensionColumn';

export type MacroTagCollapsedSummary = 'sparseTrees' | 'none';

interface MacroTagSelectorProps {
  selectedTags: Tag[];
  allTags: Tag[];
  onChange: (newIds: string[]) => void;
  onSaveSelection?: (newIds: string[]) => void | Promise<void>;
  error?: string;
  className?: string;
  startExpanded?: boolean;
  onRequestClose?: () => void;
  /** When set with `onExpandedChange`, expansion is controlled by the parent (e.g. Edit on the tag command bar). */
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  /** Collapsed face: full sparse trees (default) or hidden when the parent shows tags elsewhere. */
  collapsedSummary?: MacroTagCollapsedSummary;
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
  expanded: expandedProp,
  onExpandedChange,
  collapsedSummary = 'sparseTrees',
}: MacroTagSelectorProps) {
  const isControlled =
    typeof expandedProp === 'boolean' && typeof onExpandedChange === 'function';
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(startExpanded);
  const isExpanded = isControlled ? expandedProp : uncontrolledExpanded;
  const setExpanded = (next: boolean) => {
    if (isControlled) onExpandedChange!(next);
    else setUncontrolledExpanded(next);
  };

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
    setExpanded(false);
  };

  const handleCancel = () => {
    if (startExpanded && onRequestClose) {
      onRequestClose();
      if (isControlled) onExpandedChange?.(false);
      return;
    }
    setExpanded(false);
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
    selectedTagTree.forEach((rootNode) => {
      const dim = normalizeTagDimensionKey(rootNode.dimension as string | undefined);
      if (dim) dimensions[dim].push(rootNode);
    });
    return dimensions;
  }, [selectedTagTree]);

  if (isExpanded) {
    return (
      <ExpandedView
        initialSelection={selectedTagIds}
        allTags={allTags}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    );
  }

  if (collapsedSummary === 'none') {
    return error ? (
      <div className={clsx(styles.container, className)}>
        <p className={styles.errorText}>{error}</p>
      </div>
    ) : null;
  }

  // Default collapsed view: header + sparse trees
  return (
    <div className={clsx(styles.container, className, error && styles.error)}>
      <div className={styles.header}>
        <h4 className={styles.sectionTitle}>Tags</h4>
        <button
          onClick={() => setExpanded(true)}
          className={styles.editButton}
          type="button"
        >
          Edit
        </button>
      </div>
      <div className={styles.collapsedView}>
        <div className={styles.dimensionColumns}>
          {DIMENSION_ORDER.map((dimension) => {
            const roots = dimensionalSelectedTree[dimension] ?? [];
            return (
              <div key={dimension} className={styles.dimensionColumn}>
                {roots.length > 0 ? (
                  roots.map((root) => <TagNode key={root.docId} node={root} />)
                ) : (
                  <span className={styles.dimensionLabel}>{dimension.toUpperCase()}</span>
                )}
              </div>
            );
          })}
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
  /** Fallback when TagProvider list is still empty; merged so trees show every tag. */
  allTags: Tag[];
  onSave: (newSelection: string[]) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  className?: string;
}

function ExpandedView({
  initialSelection,
  allTags,
  onSave,
  onCancel,
  saving = false,
  className,
}: ExpandedViewProps) {
  const { tags } = useTag();
  const tagSource = useMemo(() => {
    const a = tags ?? [];
    const b = allTags ?? [];
    if (!a.length) return b;
    if (!b.length) return a;
    const map = new Map<string, Tag>();
    for (const t of b) {
      if (t.docId) map.set(t.docId, t);
    }
    for (const t of a) {
      if (t.docId) map.set(t.docId, t);
    }
    return Array.from(map.values());
  }, [tags, allTags]);

  const [currentSelection, setCurrentSelection] = useState<Set<string>>(new Set(initialSelection));
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    setCurrentSelection(new Set(initialSelection));
  }, [initialSelection]);

  const dimensionalTree = useMemo(() => {
    if (!tagSource.length) return [];
    return createUITreeFromDimensions(tagSource);
  }, [tagSource]);

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
    if (!tagSource.length || currentSelection.size === 0) return [];
    return buildSparseTagTree(tagSource, Array.from(currentSelection));
  }, [tagSource, currentSelection]);

  // Organize the sparse tree by dimension (same logic as main component)
  const dimensionalSelectedTree = useMemo(() => {
    const dimensions: Record<string, TagWithChildren[]> = {
      who: [],
      what: [],
      when: [],
      where: [],
    };
    selectedTagTree.forEach((rootNode) => {
      const dim = normalizeTagDimensionKey(rootNode.dimension as string | undefined);
      if (dim) dimensions[dim].push(rootNode);
    });
    return dimensions;
  }, [selectedTagTree]);

  const expandedNodeIds = useMemo(() => {
    const expanded = new Set<string>();
    const walk = (node: TagWithChildren): boolean => {
      const selfSelected = currentSelection.has(node.docId);
      let childSelected = false;
      for (const child of node.children || []) {
        if (walk(child)) childSelected = true;
      }
      if (childSelected) expanded.add(node.docId);
      return selfSelected || childSelected;
    };
    for (const dimension of dimensionalTree) {
      for (const child of dimension.children || []) {
        walk(child);
      }
    }
    return expanded;
  }, [dimensionalTree, currentSelection]);

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

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className={clsx(styles.overlay, className)} onClick={onCancel} role="presentation">
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
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
              {DIMENSION_ORDER.map((dimension) => {
                const roots = dimensionalSelectedTree[dimension] ?? [];
                return (
                  <div key={dimension} className={styles.dimensionColumn}>
                    {roots.length > 0 ? (
                      roots.map((root) => <TagNode key={root.docId} node={root} />)
                    ) : (
                      <span className={styles.dimensionLabel}>{dimension.toUpperCase()}</span>
                    )}
                  </div>
                );
              })}
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
              expandedNodeIds={expandedNodeIds}
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

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
import { DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import clsx from 'clsx';
import TagPickerDimensionColumn from '@/components/admin/studio/cards/TagPickerDimensionColumn';

export type MacroTagCollapsedSummary = 'sparseTrees' | 'none';

function isAuthorFacingTag(tag: Tag): boolean {
  return !tag.name.trim().toLowerCase().startsWith('z-');
}

function subjectChipDimensionClass(dimension: Tag['dimension']): string {
  switch (dimension) {
    case 'who':
      return styles.subjectChipWho;
    case 'what':
      return styles.subjectChipWhat;
    case 'when':
      return styles.subjectChipWhen;
    case 'where':
      return styles.subjectChipWhere;
    default:
      return '';
  }
}

const SUBJECT_DIMENSION_ORDER: Record<string, number> = {
  who: 0,
  what: 1,
  when: 2,
  where: 3,
};

interface MacroTagSelectorProps {
  selectedTags: Tag[];
  allTags: Tag[];
  onChange: (newIds: string[]) => void | Promise<void>;
  onSaveSelection?: (newIds: string[]) => void | Promise<void>;
  subjectTagId?: string | null;
  onSubjectTagIdChange?: (nextSubjectTagId: string | null) => void | Promise<void>;
  subjectTagIds?: string[];
  onSubjectTagIdsChange?: (nextSubjectTagIds: string[]) => void | Promise<void>;
  onSaveAssignment?: (nextTagIds: string[], nextSubjectTagIds: string[]) => void | boolean | Promise<void | boolean>;
  error?: string;
  className?: string;
  startExpanded?: boolean;
  onRequestClose?: () => void;
  /** When set with `onExpandedChange`, expansion is controlled by the parent (e.g. Edit on the tag command bar). */
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  /** Collapsed face: full sparse trees (default) or hidden when the parent shows tags elsewhere. */
  collapsedSummary?: MacroTagCollapsedSummary;
  /** When true, expanded picker renders inline (no fixed backdrop). Use inside EditModal. */
  suppressOverlay?: boolean;
  /** When true, each checkbox toggle calls onChange immediately (filter surfaces). */
  applySelectionOnChange?: boolean;
  /** Limit the expanded tree while preserving selections from hidden dimensions. */
  visibleDimensions?: TagDimension[];
  pickerTitle?: string;
  searchPlaceholder?: string;
  hidePickerHeading?: boolean;
}

export default function MacroTagSelector({
  selectedTags,
  allTags,
  onChange,
  onSaveSelection,
  subjectTagId,
  onSubjectTagIdChange,
  subjectTagIds,
  onSubjectTagIdsChange,
  onSaveAssignment,
  error,
  className,
  startExpanded = false,
  onRequestClose,
  expanded: expandedProp,
  onExpandedChange,
  collapsedSummary = 'sparseTrees',
  suppressOverlay = false,
  applySelectionOnChange = false,
  visibleDimensions = [...DIMENSION_ORDER],
  pickerTitle = 'Assign tags',
  searchPlaceholder = 'Find tags…',
  hidePickerHeading = false,
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
  const effectiveAllTags = useMemo(() => {
    const source = providerTags.length > 0 ? providerTags : allTags;
    return source.filter(isAuthorFacingTag);
  }, [providerTags, allTags]);

  const handleSave = async (newSelection: string[]) => {
    await onChange(newSelection);
    if (onSaveSelection) {
      setSaving(true);
      try {
        await onSaveSelection(newSelection);
      } finally {
        setSaving(false);
      }
      return;
    }
    if (applySelectionOnChange) return;
    setExpanded(false);
  };

  const handleCancel = () => {
    onRequestClose?.();
    if (isControlled) {
      onExpandedChange?.(false);
      return;
    }
    setExpanded(false);
  };

  const selectedTagIdsKey = useMemo(
    () =>
      selectedTags
        .map((tag) => tag.docId)
        .filter((id): id is string => Boolean(id))
        .sort()
        .join('\u001e'),
    [selectedTags]
  );

  const selectedTagIds = useMemo(
    () => (selectedTagIdsKey ? selectedTagIdsKey.split('\u001e') : []),
    [selectedTagIdsKey]
  );

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
        initialSelectionKey={selectedTagIdsKey}
        initialSubjectTagIds={subjectTagIds?.length ? subjectTagIds : subjectTagId ? [subjectTagId] : []}
        allTags={effectiveAllTags}
        onSave={handleSave}
        onSaveSubjectTagId={onSubjectTagIdChange}
        onSaveSubjectTagIds={onSubjectTagIdsChange}
        onSaveAssignment={onSaveAssignment}
        onCancel={handleCancel}
        saving={saving}
        suppressOverlay={suppressOverlay}
        applySelectionOnChange={applySelectionOnChange}
        visibleDimensions={visibleDimensions}
        pickerTitle={pickerTitle}
        searchPlaceholder={searchPlaceholder}
        hidePickerHeading={hidePickerHeading}
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
  initialSelectionKey: string;
  initialSubjectTagIds: string[];
  /** Fallback when TagProvider list is still empty; merged so trees show every tag. */
  allTags: Tag[];
  onSave: (newSelection: string[]) => void | Promise<void>;
  onSaveSubjectTagId?: (nextSubjectTagId: string | null) => void | Promise<void>;
  onSaveSubjectTagIds?: (nextSubjectTagIds: string[]) => void | Promise<void>;
  onSaveAssignment?: (nextTagIds: string[], nextSubjectTagIds: string[]) => void | boolean | Promise<void | boolean>;
  onCancel: () => void;
  saving?: boolean;
  className?: string;
  suppressOverlay?: boolean;
  applySelectionOnChange?: boolean;
  visibleDimensions: TagDimension[];
  pickerTitle: string;
  searchPlaceholder: string;
  hidePickerHeading: boolean;
}

function ExpandedView({
  initialSelection,
  initialSelectionKey,
  initialSubjectTagIds,
  allTags,
  onSave,
  onSaveSubjectTagId,
  onSaveSubjectTagIds,
  onSaveAssignment,
  onCancel,
  saving = false,
  className,
  suppressOverlay = false,
  applySelectionOnChange = false,
  visibleDimensions,
  pickerTitle,
  searchPlaceholder,
  hidePickerHeading,
}: ExpandedViewProps) {
  const { tags } = useTag();
  const tagSource = useMemo(() => {
    const a = (tags ?? []).filter(isAuthorFacingTag);
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
  const [currentSubjectTagIds, setCurrentSubjectTagIds] = useState<Set<string>>(
    new Set(initialSubjectTagIds)
  );
  const initialSubjectTagIdsKey = initialSubjectTagIds.join('\u001e');
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    setCurrentSelection((prev) => {
      const next = new Set(initialSelection);
      if (prev.size === next.size && [...prev].every((id) => next.has(id))) {
        return prev;
      }
      return next;
    });
  }, [initialSelectionKey]);

  React.useEffect(() => {
    setCurrentSubjectTagIds(new Set(initialSubjectTagIdsKey ? initialSubjectTagIdsKey.split('\u001e') : []));
  }, [initialSubjectTagIdsKey]);

  const dimensionalTree = useMemo(() => {
    if (!tagSource.length) return [];
    const visible = new Set(visibleDimensions);
    return createUITreeFromDimensions(tagSource).filter((dimension) => {
      const key = normalizeTagDimensionKey(dimension.dimension as string | undefined);
      return key ? visible.has(key) : false;
    });
  }, [tagSource, visibleDimensions]);

  const filteredDimensionalTree = useMemo(() => {
    const search = searchTerm.trim();
    if (!search) return dimensionalTree;
    return dimensionalTree.map(dim => ({
      ...dim,
      children: filterTreesBySearch(dim.children, search),
    }));
  }, [dimensionalTree, searchTerm]);

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
    const newSelection = new Set(currentSelection);
    if (isSelected) {
      newSelection.add(tagId);
    } else {
      newSelection.delete(tagId);
    }
    if (!isSelected && currentSubjectTagIds.has(tagId)) {
      setCurrentSubjectTagIds((current) => {
        const next = new Set(current);
        next.delete(tagId);
        return next;
      });
    }
    setCurrentSelection(newSelection);
    if (applySelectionOnChange) {
      void onSave(Array.from(newSelection));
    }
  };

  const handleSaveClick = async () => {
    if (applySelectionOnChange) {
      onCancel();
      return;
    }
    const resolvedTagIds = Array.from(currentSelection);
    const resolvedSubjectTagIds = Array.from(currentSubjectTagIds).filter((tagId) =>
      currentSelection.has(tagId)
    );
    if (onSaveAssignment) {
      const saved = await onSaveAssignment(resolvedTagIds, resolvedSubjectTagIds);
      if (saved !== false) onCancel();
      return;
    }
    await onSave(resolvedTagIds);
    if (onSaveSubjectTagIds) {
      await onSaveSubjectTagIds(resolvedSubjectTagIds);
    } else if (onSaveSubjectTagId) {
      await onSaveSubjectTagId(resolvedSubjectTagIds[0] ?? null);
    }
    onCancel();
  };

  const selectedTagsById = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const tag of tagSource) {
      if (tag.docId && currentSelection.has(tag.docId)) {
        map.set(tag.docId, tag);
      }
    }
    const visible = new Set(visibleDimensions);
    return Array.from(map.values()).filter((tag) => {
      const dimension = normalizeTagDimensionKey(tag.dimension as string | undefined);
      return dimension ? visible.has(dimension) : false;
    }).sort((a, b) => {
      const dimensionRankA = SUBJECT_DIMENSION_ORDER[a.dimension ?? ''] ?? 99;
      const dimensionRankB = SUBJECT_DIMENSION_ORDER[b.dimension ?? ''] ?? 99;
      if (dimensionRankA !== dimensionRankB) return dimensionRankA - dimensionRankB;
      return a.name.localeCompare(b.name);
    });
  }, [currentSelection, tagSource, visibleDimensions]);

  React.useEffect(() => {
    if (suppressOverlay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel, suppressOverlay]);

  const panel = (
    <div
      className={clsx(
        suppressOverlay ? styles.embeddedModalContainer : styles.modalContainer,
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {hidePickerHeading ? null : <h2 className={styles.modalHeader}>{pickerTitle}</h2>}

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder={searchPlaceholder}
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
      {onSaveSubjectTagId || onSaveSubjectTagIds || onSaveAssignment ? (
        <div className={styles.subjectPanel}>
          <div className={styles.subjectPanelHeader}>Subject</div>
          <div className={styles.subjectPanelHint}>Click a selected tag to toggle subject.</div>
          <div className={styles.subjectChipRow}>
            {selectedTagsById.length > 0 ? (
              selectedTagsById.map((tag) => {
                const isSubject = currentSubjectTagIds.has(tag.docId);
                return (
                  <button
                    key={tag.docId}
                    type="button"
                    className={clsx(
                      styles.subjectChip,
                      subjectChipDimensionClass(tag.dimension),
                      isSubject && styles.subjectChipActive
                    )}
                    onClick={() => setCurrentSubjectTagIds((current) => {
                      if (!onSaveSubjectTagIds && !onSaveAssignment) {
                        return isSubject ? new Set<string>() : new Set([tag.docId]);
                      }
                      const next = new Set(current);
                      if (isSubject) next.delete(tag.docId);
                      else next.add(tag.docId);
                      return next;
                    })}
                  >
                    <span className={styles.subjectChipText}>{tag.name}</span>
                  </button>
                );
              })
            ) : (
              <span className={styles.subjectPanelEmpty}>Select one or more tags to choose a subject.</span>
            )}
          </div>
        </div>
      ) : null}
      <div
        className={clsx(
          styles.interactiveColumns,
          visibleDimensions.length === 1 && styles.interactiveColumnsSingle
        )}
      >
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
          {saving ? 'Saving…' : applySelectionOnChange ? 'Done' : 'Save'}
        </button>
      </div>
    </div>
  );

  if (suppressOverlay) {
    return panel;
  }

  return (
    <div className={clsx(styles.overlay, className)} onClick={onCancel} role="presentation">
      {panel}
    </div>
  );
}

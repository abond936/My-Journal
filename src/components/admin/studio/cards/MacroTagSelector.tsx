'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, MapPin, Square, User } from 'lucide-react';
import { useTag } from '@/components/providers/TagProvider';
import { Tag, TagWithChildren } from '@/lib/types/tag';
import styles from './MacroTagSelector.module.css';
import bulkStyles from './BulkEditTagsModal.module.css';
import TemporalValueControl from '@/components/admin/common/TemporalValueControl';
import type { TemporalValue } from '@/lib/types/temporal';
import {
  buildSparseTagTree,
  createUITreeFromDimensions,
  filterTreesBySearch,
  normalizeTagDimensionKey,
} from '@/lib/utils/tagUtils';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import clsx from 'clsx';
import TagPickerDimensionColumn from '@/components/admin/studio/cards/TagPickerDimensionColumn';
import type { GalleryTagInheritanceToggles } from '@/lib/types/authorSettings';
import type { GalleryTagRollupStatuses } from '@/lib/utils/galleryTagInheritance';
import TagSearchSelect from '@/components/admin/common/TagSearchSelect';
import type {
  DimensionResolution,
  DimensionReviewMap,
} from '@/lib/types/dimensionReview';
import { formatDimensionResolution } from '@/lib/utils/dimensionReview';
import { formatTemporalValue } from '@/lib/utils/temporalValue';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';

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

const DIMENSION_ICON = {
  who: User,
  what: Square,
  when: Calendar,
  where: MapPin,
} satisfies Record<TagDimension, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>>;

function SelectionStateExample({
  state,
  label,
}: {
  state: 'checked' | 'unchecked' | 'mixed';
  label: string;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = state === 'mixed';
  }, [state]);
  return (
    <span className={bulkStyles.stateExample}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={state === 'checked'}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

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
  /** Hide the picker's action row when a containing modal owns Cancel/Apply. */
  hideActions?: boolean;
  pickerToolbar?: React.ReactNode;
  dimensionHeaderControl?: (dimension: TagDimension) => React.ReactNode;
  showManagementControls?: boolean;
  initialExpandLevels?: number;
  /** Show the complete taxonomy, including legacy/system-named tags. Filters use this so every tree tag remains selectable. */
  includeAllTags?: boolean;
  dimensionDisabled?: (dimension: TagDimension) => boolean;
  dimensionHeaderIcon?: (dimension: TagDimension) => React.ReactNode;
  dimensionBodyOverride?: (dimension: TagDimension) => React.ReactNode | undefined;
  tagSearchDimensions?: TagDimension[];
  /** Keep tree scrollbars inside the containing modal instead of creating nested outer scrolling. */
  constrainTreeScroll?: boolean;
  /** Use the same assignment layout as the Media Tags modal. */
  unifiedAssignmentLayout?: boolean;
  galleryTagIdsByDimension?: Record<TagDimension, string[]>;
  galleryResolutionByDimension?: Record<TagDimension, DimensionResolution | null>;
  galleryTemporalValue?: TemporalValue | null;
  inheritanceByDimension?: GalleryTagInheritanceToggles;
  inheritanceAvailableByDimension?: GalleryTagInheritanceToggles;
  galleryRollupStatuses?: Partial<GalleryTagRollupStatuses>;
  temporalValue?: TemporalValue | null;
  dimensionReview?: DimensionReviewMap;
  onSaveAssignmentWithInheritance?: (
    nextTagIds: string[],
    nextSubjectTagIds: string[],
    inheritance: GalleryTagInheritanceToggles,
    temporal?: TemporalValue | null,
    dimensionReview?: DimensionReviewMap
  ) => void | boolean | Promise<void | boolean>;
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
  hideActions = false,
  pickerToolbar,
  dimensionHeaderControl,
  showManagementControls = false,
  initialExpandLevels,
  includeAllTags = false,
  dimensionDisabled,
  dimensionHeaderIcon,
  dimensionBodyOverride,
  tagSearchDimensions,
  constrainTreeScroll = false,
  unifiedAssignmentLayout = false,
  galleryTagIdsByDimension,
  galleryResolutionByDimension,
  galleryTemporalValue,
  inheritanceByDimension,
  inheritanceAvailableByDimension,
  galleryRollupStatuses,
  temporalValue,
  dimensionReview,
  onSaveAssignmentWithInheritance,
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
    return includeAllTags ? source : source.filter(isAuthorFacingTag);
  }, [providerTags, allTags, includeAllTags]);

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
        initialSubjectTagIds={subjectTagIds != null ? subjectTagIds : subjectTagId ? [subjectTagId] : []}
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
        hideActions={hideActions}
        pickerToolbar={pickerToolbar}
        dimensionHeaderControl={dimensionHeaderControl}
        showManagementControls={showManagementControls}
        initialExpandLevels={initialExpandLevels}
        dimensionDisabled={dimensionDisabled}
        dimensionHeaderIcon={dimensionHeaderIcon}
        dimensionBodyOverride={dimensionBodyOverride}
        tagSearchDimensions={tagSearchDimensions}
        constrainTreeScroll={constrainTreeScroll}
        unifiedAssignmentLayout={unifiedAssignmentLayout}
        galleryTagIdsByDimension={galleryTagIdsByDimension}
        galleryResolutionByDimension={galleryResolutionByDimension}
        galleryTemporalValue={galleryTemporalValue}
        inheritanceByDimension={inheritanceByDimension}
        inheritanceAvailableByDimension={inheritanceAvailableByDimension}
        galleryRollupStatuses={galleryRollupStatuses}
        temporalValue={temporalValue}
        dimensionReview={dimensionReview}
        onSaveAssignmentWithInheritance={onSaveAssignmentWithInheritance}
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
  hideActions: boolean;
  pickerToolbar?: React.ReactNode;
  dimensionHeaderControl?: (dimension: TagDimension) => React.ReactNode;
  showManagementControls: boolean;
  initialExpandLevels?: number;
  dimensionDisabled?: (dimension: TagDimension) => boolean;
  dimensionHeaderIcon?: (dimension: TagDimension) => React.ReactNode;
  dimensionBodyOverride?: (dimension: TagDimension) => React.ReactNode | undefined;
  tagSearchDimensions?: TagDimension[];
  constrainTreeScroll: boolean;
  unifiedAssignmentLayout: boolean;
  galleryTagIdsByDimension?: Record<TagDimension, string[]>;
  galleryResolutionByDimension?: Record<TagDimension, DimensionResolution | null>;
  galleryTemporalValue?: TemporalValue | null;
  inheritanceByDimension?: GalleryTagInheritanceToggles;
  inheritanceAvailableByDimension?: GalleryTagInheritanceToggles;
  galleryRollupStatuses?: Partial<GalleryTagRollupStatuses>;
  temporalValue?: TemporalValue | null;
  dimensionReview?: DimensionReviewMap;
  onSaveAssignmentWithInheritance?: MacroTagSelectorProps['onSaveAssignmentWithInheritance'];
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
  hideActions,
  pickerToolbar,
  dimensionHeaderControl,
  showManagementControls,
  initialExpandLevels,
  dimensionDisabled,
  dimensionHeaderIcon,
  dimensionBodyOverride,
  tagSearchDimensions,
  constrainTreeScroll,
  unifiedAssignmentLayout,
  galleryTagIdsByDimension,
  galleryResolutionByDimension,
  galleryTemporalValue,
  inheritanceByDimension,
  inheritanceAvailableByDimension,
  galleryRollupStatuses,
  temporalValue,
  dimensionReview,
  onSaveAssignmentWithInheritance,
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
  const [temporalDraft, setTemporalDraft] = useState<TemporalValue | null | undefined>(temporalValue);
  const [dimensionReviewDraft, setDimensionReviewDraft] = useState<DimensionReviewMap>(
    dimensionReview
  );
  useEffect(() => {
    setTemporalDraft(temporalValue);
  }, [temporalValue]);
  useEffect(() => {
    setDimensionReviewDraft(dimensionReview);
  }, [dimensionReview]);
  const tagById = useMemo(
    () => new Map(tagSource.filter((tag) => tag.docId).map((tag) => [tag.docId, tag])),
    [tagSource]
  );
  const dimensionByTagId = useMemo(
    () => buildResolvedTagDimensionMap(tagSource),
    [tagSource]
  );

  const [currentSelection, setCurrentSelection] = useState<Set<string>>(new Set(initialSelection));
  const [currentSubjectTagIds, setCurrentSubjectTagIds] = useState<Set<string>>(
    new Set(initialSubjectTagIds)
  );
  const initialSubjectTagIdsKey = initialSubjectTagIds.join('\u001e');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftInheritance, setDraftInheritance] = useState<GalleryTagInheritanceToggles>(
    inheritanceByDimension ?? { who: false, what: false, when: false, where: false }
  );
  const structuredDateAssignment =
    Boolean(onSaveAssignmentWithInheritance) ||
    temporalValue !== undefined ||
    dimensionReview !== undefined;

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

  React.useEffect(() => {
    if (inheritanceByDimension) setDraftInheritance(inheritanceByDimension);
  }, [inheritanceByDimension]);

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
      const dimension = dimensionByTagId.get(tagId);
      if (dimension) {
        setDimensionReviewDraft((current) => ({
          ...(current ?? {}),
          [dimension]: {
            ...(current?.[dimension] ?? { reviewed: false }),
            resolution: null,
          },
        }));
      }
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
    const resolvedSubjectTagIds = Array.from(currentSubjectTagIds).filter(
      (tagId) =>
        currentSelection.has(tagId) &&
        !(temporalDraft?.status === 'known' && dimensionByTagId.get(tagId) === 'when')
    );
    if (onSaveAssignmentWithInheritance) {
      const saved = temporalDraft === undefined && dimensionReviewDraft === undefined
        ? await onSaveAssignmentWithInheritance(
            resolvedTagIds,
            resolvedSubjectTagIds,
            draftInheritance
          )
        : temporalDraft === undefined
          ? await onSaveAssignmentWithInheritance(
              resolvedTagIds,
              resolvedSubjectTagIds,
              draftInheritance,
              undefined,
              dimensionReviewDraft
            )
        : await onSaveAssignmentWithInheritance(
            resolvedTagIds,
            resolvedSubjectTagIds,
            draftInheritance,
            temporalDraft,
            dimensionReviewDraft
          );
      if (saved !== false) onCancel();
      return;
    }
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
      const dimension = tag.docId ? dimensionByTagId.get(tag.docId) : undefined;
      if (!dimension || !visible.has(dimension)) return false;
      return !(dimension === 'when' && temporalDraft?.status === 'known');
    }).sort((a, b) => {
      const dimensionRankA = SUBJECT_DIMENSION_ORDER[a.dimension ?? ''] ?? 99;
      const dimensionRankB = SUBJECT_DIMENSION_ORDER[b.dimension ?? ''] ?? 99;
      if (dimensionRankA !== dimensionRankB) return dimensionRankA - dimensionRankB;
      return a.name.localeCompare(b.name);
    });
  }, [currentSelection, dimensionByTagId, tagSource, temporalDraft, visibleDimensions]);

  const toggleSubjectTag = (tagId: string) => {
    setCurrentSubjectTagIds((current) => {
      const isSubject = current.has(tagId);
      if (!onSaveSubjectTagIds && !onSaveAssignment && !onSaveAssignmentWithInheritance) {
        return isSubject ? new Set<string>() : new Set([tagId]);
      }
      const next = new Set(current);
      if (isSubject) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const setDimensionInheritance = (dimension: TagDimension, inherit: boolean) => {
    if (inheritanceAvailableByDimension && !inheritanceAvailableByDimension[dimension]) return;
    setDraftInheritance((current) => ({ ...current, [dimension]: inherit }));
    if (!inherit) return;

    const galleryIds = galleryTagIdsByDimension?.[dimension] ?? [];
    setCurrentSelection((current) => {
      const next = new Set(
        Array.from(current).filter((tagId) => dimensionByTagId.get(tagId) !== dimension)
      );
      galleryIds.forEach((tagId) => next.add(tagId));
      return next;
    });
    setCurrentSubjectTagIds((current) => {
      const next = new Set(
        Array.from(current).filter(
          (tagId) =>
            dimensionByTagId.get(tagId) !== dimension || galleryIds.includes(tagId)
        )
      );
      return next;
    });
  };

  const setDimensionResolution = (
    dimension: TagDimension,
    resolution: DimensionResolution
  ) => {
    setDimensionReviewDraft((current) => ({
      ...(current ?? {}),
      [dimension]: {
        reviewed: true,
        resolution:
          current?.[dimension]?.resolution === resolution ? null : resolution,
      },
    }));
    setCurrentSelection((current) => new Set(
      Array.from(current).filter((tagId) => dimensionByTagId.get(tagId) !== dimension)
    ));
    setCurrentSubjectTagIds((current) => new Set(
      Array.from(current).filter((tagId) => dimensionByTagId.get(tagId) !== dimension)
    ));
    if (dimension === 'when') setTemporalDraft(null);
  };

  const clearDimension = (dimension: TagDimension) => {
    setCurrentSelection((current) => new Set(
      Array.from(current).filter((tagId) => dimensionByTagId.get(tagId) !== dimension)
    ));
    setCurrentSubjectTagIds((current) => new Set(
      Array.from(current).filter((tagId) => dimensionByTagId.get(tagId) !== dimension)
    ));
    setDimensionReviewDraft((current) => {
      const next = { ...(current ?? {}) };
      delete next[dimension];
      return next;
    });
    if (dimension === 'when') setTemporalDraft(null);
  };

  React.useEffect(() => {
    if (suppressOverlay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel, suppressOverlay]);

  const standardPanel = (
    <div
      className={clsx(
        suppressOverlay ? styles.embeddedModalContainer : styles.modalContainer,
        constrainTreeScroll && styles.constrainedTreeLayout,
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {hidePickerHeading ? null : <h2 className={styles.modalHeader}>{pickerTitle}</h2>}

      <div className={styles.searchBar}>
        <TagSearchSelect
          allTags={allTags}
          selectedTagIds={currentSelection}
          value={searchTerm}
          onValueChange={setSearchTerm}
          onSelect={(tagId) => handleTagChange(tagId, true)}
          allowedDimensions={tagSearchDimensions ?? visibleDimensions}
          placeholder={searchPlaceholder}
          inputClassName={styles.searchInput}
          clearClassName={styles.searchClear}
          autoFocus
        />
        {false && (
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
      {pickerToolbar}
      {onSaveSubjectTagId || onSaveSubjectTagIds || onSaveAssignment || onSaveAssignmentWithInheritance ? (
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
                    onClick={() => toggleSubjectTag(tag.docId)}
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
        {filteredDimensionalTree.map(dimension => {
          const dimensionKey =
            normalizeTagDimensionKey(dimension.dimension as string | undefined) ?? 'who';
          return (
          <TagPickerDimensionColumn
            key={dimension.docId}
            dimension={dimension}
            selection={currentSelection}
            onSelectionChange={handleTagChange}
            expandedNodeIds={expandedNodeIds}
            checkboxIdPrefix="tag"
            forceExpandAll={!!searchTerm.trim()}
            showManagementControls={showManagementControls}
            headerControl={dimensionHeaderControl?.(
              dimensionKey
            )}
            initialExpandLevels={initialExpandLevels}
            disabled={dimensionDisabled?.(
              dimensionKey
            )}
            headerIcon={dimensionHeaderIcon?.(
              dimensionKey
            )}
            bodyOverride={dimensionBodyOverride?.(dimensionKey)}
          />
          );
        })}
      </div>
      {hideActions ? null : <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancelButton} disabled={saving}>Cancel</button>
        <button onClick={() => void handleSaveClick()} className={styles.saveButton} disabled={saving}>
          {saving ? 'Saving…' : applySelectionOnChange ? 'Done' : 'Save'}
        </button>
      </div>}
    </div>
  );

  const unifiedPanel = (
    <div
      className={clsx(bulkStyles.modalContainer, className)}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {hidePickerHeading ? null : <h2 className={bulkStyles.modalHeader}>{pickerTitle}</h2>}
      {pickerToolbar}
      <div className={bulkStyles.mediaTagWorkspace}>
        <div className={bulkStyles.dimensionHeadings}>
          {visibleDimensions.map((dimension) => {
            const Icon = DIMENSION_ICON[dimension];
            return (
              <h4 key={dimension} className={bulkStyles.dimensionHeading}>
                <Icon size={16} aria-hidden={true} />
                <span>{DIMENSION_LABEL[dimension]}</span>
              </h4>
            );
          })}
        </div>

        {galleryTagIdsByDimension ? (
          <>
            <div className={bulkStyles.galleryTagBand}>
              <div className={bulkStyles.assignmentBandLabel}>Gallery tags</div>
              <div className={bulkStyles.subjectColumns}>
                {visibleDimensions.map((dimension) => {
                  const tagIds = galleryTagIdsByDimension[dimension] ?? [];
                  const status = galleryRollupStatuses?.[dimension] ?? 'empty';
                  const resolutionLabel = formatDimensionResolution(
                    galleryResolutionByDimension?.[dimension]
                      ? {
                          reviewed: true,
                          resolution: galleryResolutionByDimension[dimension],
                        }
                      : undefined
                  );
                  return (
                    <div
                      key={dimension}
                      className={clsx(
                        bulkStyles.galleryTagColumn,
                        !draftInheritance[dimension] && bulkStyles.galleryTagColumnReference
                      )}
                      data-gallery-dimension={dimension}
                    >
                      {status === 'unreviewed' ? (
                        <span className={bulkStyles.galleryTagState}>Unreviewed</span>
                      ) : dimension === 'when' && galleryTemporalValue ? (
                        <span className={bulkStyles.galleryTagState}>
                          {formatTemporalValue(galleryTemporalValue)}
                        </span>
                      ) : resolutionLabel ? (
                        <span className={bulkStyles.galleryTagState}>{resolutionLabel}</span>
                      ) : tagIds.length > 0 ? (
                        tagIds.map((tagId) => (
                          <span key={tagId} className={bulkStyles.galleryTagChip}>
                            {tagById.get(tagId)?.name ?? tagId}
                          </span>
                        ))
                      ) : (
                        <span className={bulkStyles.galleryTagState}>No Gallery tags</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={bulkStyles.inheritanceBand}>
              <div className={bulkStyles.assignmentBandLabel}>Tag source</div>
              <div className={bulkStyles.subjectColumns}>
                {visibleDimensions.map((dimension) => {
                  const available = inheritanceAvailableByDimension?.[dimension] ?? false;
                  return (
                    <label
                      key={dimension}
                      className={bulkStyles.inheritanceOption}
                      title={
                        available
                          ? `Inherit ${DIMENSION_LABEL[dimension]} from Gallery items`
                          : `${DIMENSION_LABEL[dimension]} inheritance is unavailable`
                      }
                    >
                      <input
                        type="checkbox"
                        checked={available && draftInheritance[dimension]}
                        disabled={!available}
                        onChange={(event) =>
                          setDimensionInheritance(dimension, event.target.checked)
                        }
                      />
                      <span>Inherit?</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        <div className={bulkStyles.searchBar}>
          <TagSearchSelect
            allTags={allTags}
            selectedTagIds={currentSelection}
            value={searchTerm}
            onValueChange={setSearchTerm}
            onSelect={(tagId) => {
              const dimension = dimensionByTagId.get(tagId);
              if (dimension && draftInheritance[dimension]) {
                setDimensionInheritance(dimension, false);
              }
              handleTagChange(tagId, true);
            }}
            allowedDimensions={visibleDimensions.filter(
              (dimension) => dimension !== 'when' || !structuredDateAssignment
            )}
            placeholder={searchPlaceholder}
            inputClassName={bulkStyles.searchInput}
            clearClassName={bulkStyles.searchClear}
            autoFocus
          />
          {false ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={bulkStyles.searchClear}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        {onSaveSubjectTagId || onSaveSubjectTagIds || onSaveAssignment || onSaveAssignmentWithInheritance ? (
          <div className={bulkStyles.subjectBand}>
            <div className={bulkStyles.dimensionSubjectLabel}>
              Subjects <span>(Choose one or more assigned tags as subjects.)</span>
            </div>
            <div className={bulkStyles.subjectColumns}>
              {visibleDimensions.map((dimension) => (
                <div
                  key={dimension}
                  className={bulkStyles.dimensionSubjectOptions}
                  data-subject-dimension={dimension}
                >
                  {selectedTagsById
                    .filter(
                      (tag) =>
                        normalizeTagDimensionKey(tag.dimension as string | undefined) === dimension
                    )
                    .map((tag) => (
                      <label
                        key={tag.docId}
                        className={bulkStyles.subjectOption}
                        htmlFor={`card-subject-${tag.docId}`}
                      >
                        <input
                          id={`card-subject-${tag.docId}`}
                          type="checkbox"
                          checked={currentSubjectTagIds.has(tag.docId)}
                          onChange={() => toggleSubjectTag(tag.docId)}
                        />
                        <span className={bulkStyles.subjectOptionCopy}>
                          <span>{tag.name}</span>
                        </span>
                      </label>
                    ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className={`${bulkStyles.interactiveColumns} ${bulkStyles.mediaInteractiveColumns}`}>
          {filteredDimensionalTree.map((dimension) => {
            const dimensionKey =
              normalizeTagDimensionKey(dimension.dimension as string | undefined) ?? 'who';
            const inherited = Boolean(
              galleryTagIdsByDimension && draftInheritance[dimensionKey]
            );
            const review = dimensionReviewDraft?.[dimensionKey];
            return (
              <div
                key={dimension.docId}
                className={bulkStyles.reviewableDimensionColumn}
              >
                {structuredDateAssignment ? (
                <div className={bulkStyles.dimensionReviewControls}>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`${dimensionKey} reviewed`}
                      checked={review?.reviewed === true}
                      disabled={inherited}
                      onChange={(event) =>
                        setDimensionReviewDraft((current) => ({
                          ...(current ?? {}),
                          [dimensionKey]: {
                            ...(current?.[dimensionKey] ?? {}),
                            reviewed: event.target.checked,
                          },
                        }))
                      }
                    />
                    <span>Reviewed</span>
                  </label>
                  <button
                    type="button"
                    aria-label={`Clear ${dimensionKey}`}
                    disabled={inherited}
                    onClick={() => clearDimension(dimensionKey)}
                  >
                    Clear
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`${dimensionKey} unknown`}
                      checked={review?.resolution === 'unknown'}
                      disabled={inherited}
                      onChange={() => setDimensionResolution(dimensionKey, 'unknown')}
                    />
                    <span>Unknown</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`${dimensionKey} not applicable`}
                      checked={review?.resolution === 'not_applicable'}
                      disabled={inherited}
                      onChange={() => setDimensionResolution(dimensionKey, 'not_applicable')}
                    />
                    <span>Not applicable</span>
                  </label>
                </div>
                ) : null}
                {dimensionKey === 'when' && structuredDateAssignment ? (
                  <div className={bulkStyles.temporalColumnControl}>
                    <TemporalValueControl
                      idPrefix="compose-card"
                      value={temporalDraft}
                      disabled={inherited || Boolean(review?.resolution)}
                      directEntryOnly
                      showResolvedStates={false}
                      onChange={(next) => {
                        setTemporalDraft(next);
                        if (next?.status === 'known') {
                          setDimensionReviewDraft((current) => ({
                            ...(current ?? {}),
                            when: {
                              ...(current?.when ?? { reviewed: false }),
                              resolution: null,
                            },
                          }));
                        }
                      }}
                    />
                  </div>
                ) : (
                  <TagPickerDimensionColumn
                    dimension={dimension}
                    selection={currentSelection}
                    onSelectionChange={handleTagChange}
                    expandedNodeIds={expandedNodeIds}
                    checkboxIdPrefix="card-tag"
                    forceExpandAll
                    showManagementControls={false}
                    hideHeader
                    disabled={inherited || Boolean(review?.resolution)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={bulkStyles.mediaFooter}>
        <div className={bulkStyles.stateLegend} aria-label="Tag selection states">
          <span className={bulkStyles.legendLabel}>Legend:</span>
          <SelectionStateExample state="unchecked" label="Empty" />
          <SelectionStateExample state="mixed" label="Some" />
          <SelectionStateExample state="checked" label="All" />
        </div>
        <div className={bulkStyles.mediaActions}>
          <button
            type="button"
            onClick={onCancel}
            className={bulkStyles.cancelButton}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSaveClick()}
            className={bulkStyles.saveButton}
            disabled={saving}
          >
            {saving ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );

  const panel = unifiedAssignmentLayout ? unifiedPanel : standardPanel;

  if (suppressOverlay) {
    return panel;
  }

  return (
    <div
      className={clsx(unifiedAssignmentLayout ? bulkStyles.overlay : styles.overlay, className)}
      onClick={onCancel}
      role="presentation"
    >
      {panel}
    </div>
  );
}

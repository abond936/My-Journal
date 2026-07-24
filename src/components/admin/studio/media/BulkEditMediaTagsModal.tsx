'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Square, User } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TagPickerDimensionColumn from '@/components/admin/studio/cards/TagPickerDimensionColumn';
import { useTag } from '@/components/providers/TagProvider';
import { useMedia } from '@/components/providers/MediaProvider';
import type { Media } from '@/lib/types/photo';
import { createUITreeFromDimensions, filterTreesBySearch } from '@/lib/utils/tagUtils';
import type { TagWithChildren } from '@/components/providers/TagProvider';
import { buildResolvedTagDimensionMap, buildTagByIdMap, getTagPathDisplay } from '@/lib/utils/tagDimensionResolve';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import styles from '@/components/admin/studio/cards/BulkEditTagsModal.module.css';

interface BulkEditMediaTagsModalProps {
  mediaIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { mediaIds: string[]; addTagIds: string[]; removeTagIds: string[] }) => Promise<void>;
}

type SelectionState = 'checked' | 'unchecked' | 'mixed';

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
  state: SelectionState;
  label: string;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = state === 'mixed';
  }, [state]);

  return (
    <span className={styles.stateExample}>
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

function SubjectDecisionRow({
  id,
  label,
  state,
  disabled,
  onToggle,
}: {
  id: string;
  label: string;
  state: SelectionState;
  disabled: boolean;
  onToggle: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = state === 'mixed';
  }, [state]);
  return (
    <label className={styles.subjectOption} htmlFor={`media-subject-${id}`}>
      <input
        ref={inputRef}
        id={`media-subject-${id}`}
        type="checkbox"
        checked={state === 'checked'}
        disabled={disabled}
        onChange={onToggle}
      />
      <span className={styles.subjectOptionCopy}>
        <span>{label}</span>
        {state === 'mixed' ? <small>Some selected media</small> : null}
      </span>
    </label>
  );
}

export default function BulkEditMediaTagsModal({
  mediaIds,
  isOpen,
  onClose,
  onSave,
}: BulkEditMediaTagsModalProps) {
  const { tags: allTags, loading: tagsLoading } = useTag();
  const { media, resolveMediaById, bulkApplyTags } = useMedia();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);
  const [tagDecisions, setTagDecisions] = useState<Map<string, boolean>>(new Map());
  const [subjectDecisions, setSubjectDecisions] = useState<Map<string, boolean>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

  const mediaIdsKey = useMemo(() => [...new Set(mediaIds)].sort().join('\u001e'), [mediaIds]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSelectedMedia([]);
      setTagDecisions(new Map());
      setSubjectDecisions(new Map());
      setSearchTerm('');
      return;
    }

    const ids = mediaIdsKey ? mediaIdsKey.split('\u001e') : [];
    if (ids.length === 0) return;

    let cancelled = false;

    const fetchSelectedMedia = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetched = await Promise.all(
          ids.map(async (mediaId) => {
            const cached = media.find((item) => item.docId === mediaId) ?? resolveMediaById(mediaId);
            if (cached) return cached;
            try {
              const response = await fetch(`/api/images/${encodeURIComponent(mediaId)}`, {
                cache: 'no-store',
                credentials: 'same-origin',
              });
              if (!response.ok) return null;
              const payload = (await response.json().catch(() => ({}))) as { media?: Media };
              return payload.media ?? null;
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;
        setSelectedMedia(fetched.filter((item): item is Media => Boolean(item?.docId)));
        setTagDecisions(new Map());
        setSubjectDecisions(new Map());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchSelectedMedia();

    return () => {
      cancelled = true;
    };
  }, [isOpen, media, mediaIdsKey, resolveMediaById]);

  const dimensionalTree = useMemo(() => {
    if (!allTags) return [];
    return createUITreeFromDimensions(allTags);
  }, [allTags]);

  const filteredDimensionalTree = useMemo(() => {
    const search = searchTerm.trim();
    if (!search) return dimensionalTree;
    return dimensionalTree.map((dim) => ({
      ...dim,
      children: filterTreesBySearch(dim.children, search),
    }));
  }, [dimensionalTree, searchTerm]);

  const tagPresenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of selectedMedia) {
      for (const tagId of item.tags || []) {
        counts.set(tagId, (counts.get(tagId) || 0) + 1);
      }
    }
    return counts;
  }, [selectedMedia]);

  const subjectPresenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of selectedMedia) {
      const subjects = item.subjectTagIds?.length
        ? item.subjectTagIds
        : item.subjectTagId
          ? [item.subjectTagId]
          : [];
      for (const tagId of subjects) counts.set(tagId, (counts.get(tagId) || 0) + 1);
    }
    return counts;
  }, [selectedMedia]);

  const getSelectionState = React.useCallback(
    (tagId: string): 'checked' | 'unchecked' | 'mixed' => {
      const explicit = tagDecisions.get(tagId);
      if (explicit !== undefined) return explicit ? 'checked' : 'unchecked';
      const count = tagPresenceCounts.get(tagId) || 0;
      if (count === 0) return 'unchecked';
      if (count === selectedMedia.length) return 'checked';
      return 'mixed';
    },
    [selectedMedia.length, tagDecisions, tagPresenceCounts]
  );

  const checkedSelection = useMemo(() => {
    const selected = new Set<string>();
    for (const tag of allTags || []) {
      if (getSelectionState(tag.docId) === 'checked') selected.add(tag.docId);
    }
    return selected;
  }, [allTags, getSelectionState]);

  const getSubjectState = React.useCallback(
    (tagId: string): SelectionState => {
      const explicit = subjectDecisions.get(tagId);
      if (explicit !== undefined) return explicit ? 'checked' : 'unchecked';
      const count = subjectPresenceCounts.get(tagId) || 0;
      if (count === 0) return 'unchecked';
      if (count === selectedMedia.length) return 'checked';
      return 'mixed';
    },
    [selectedMedia.length, subjectDecisions, subjectPresenceCounts]
  );

  const tagById = useMemo(() => buildTagByIdMap(allTags || []), [allTags]);
  const resolvedDimension = useMemo(
    () => buildResolvedTagDimensionMap(allTags || []),
    [allTags]
  );
  const subjectOptions = useMemo(() => {
    const rows = Array.from(checkedSelection)
      .map((tagId) => {
        const tag = tagById.get(tagId);
        if (!tag) return null;
        const dimension = resolvedDimension.get(tagId);
        if (!dimension) return null;
        return {
          tagId,
          dimension,
          name: tag.name,
          label: getTagPathDisplay(tag, tagById),
        };
      })
      .filter(
        (row): row is {
          tagId: string;
          dimension: TagDimension;
          name: string;
          label: string;
        } => Boolean(row)
      );

    rows.sort((a, b) => {
      const dimensionOrder = DIMENSION_ORDER.indexOf(a.dimension) - DIMENSION_ORDER.indexOf(b.dimension);
      if (dimensionOrder !== 0) return dimensionOrder;
      return a.label.localeCompare(b.label);
    });
    return rows;
  }, [checkedSelection, resolvedDimension, tagById]);

  useEffect(() => {
    setSubjectDecisions((current) => {
      let changed = false;
      const next = new Map(current);
      for (const [tagId, decision] of next) {
        if (decision && !checkedSelection.has(tagId)) {
          next.set(tagId, false);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [checkedSelection]);

  const expandedNodeIds = useMemo(() => {
    const expanded = new Set<string>();
    const walk = (node: TagWithChildren): boolean => {
      const state = getSelectionState(node.docId);
      const selfSelected = state === 'checked' || state === 'mixed';
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
  }, [dimensionalTree, getSelectionState]);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const addTagIds = Array.from(tagDecisions.entries())
        .filter(([, value]) => value)
        .map(([tagId]) => tagId);
      const removeTagIds = Array.from(tagDecisions.entries())
        .filter(([, value]) => !value)
        .map(([tagId]) => tagId);
      const addSubjectTagIds = Array.from(subjectDecisions.entries())
        .filter(([, value]) => value)
        .map(([tagId]) => tagId);
      const removeSubjectTagIds = Array.from(subjectDecisions.entries())
        .filter(([, value]) => !value)
        .map(([tagId]) => tagId);

      if (
        addTagIds.length > 0 ||
        removeTagIds.length > 0 ||
        addSubjectTagIds.length > 0 ||
        removeSubjectTagIds.length > 0
      ) {
        await bulkApplyTags(mediaIds, {
          addTagIds,
          removeTagIds,
          addSubjectTagIds,
          removeSubjectTagIds,
        });
      }

      await onSave({ mediaIds, addTagIds, removeTagIds });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagChange = (tagId: string, isSelected: boolean) => {
    setTagDecisions((prev) => {
      const next = new Map(prev);
      next.set(tagId, isSelected);
      return next;
    });
  };

  const handleToggleTag = (tagId: string, currentState: 'checked' | 'unchecked' | 'mixed') => {
    setTagDecisions((prev) => {
      const next = new Map(prev);
      if (currentState === 'checked') {
        next.set(tagId, false);
      } else {
        next.set(tagId, true);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        <h2 className={styles.modalHeader}>Media Tags</h2>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={styles.searchClear}
              aria-label="Clear search"
            >
              x
            </button>
          ) : null}
        </div>

        {isLoading || tagsLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.mediaTagWorkspace}>
            <div className={styles.dimensionHeadings}>
              {DIMENSION_ORDER.map((dimension) => {
                const Icon = DIMENSION_ICON[dimension];
                return (
                  <h4 key={dimension} className={styles.dimensionHeading}>
                    <Icon size={16} aria-hidden={true} />
                    <span>{DIMENSION_LABEL[dimension]}</span>
                  </h4>
                );
              })}
            </div>

            <div className={styles.subjectBand}>
              <div className={styles.dimensionSubjectLabel}>
                Subjects <span>(Choose one or more assigned tags as subjects.)</span>
              </div>
              <div className={styles.subjectColumns}>
                {DIMENSION_ORDER.map((dimension) => {
                  const options = subjectOptions.filter(
                    (option) => option.dimension === dimension
                  );
                  return (
                    <div
                      key={dimension}
                      className={styles.dimensionSubjectOptions}
                      data-subject-dimension={dimension}
                    >
                      {options.map((option) => {
                        const state = getSubjectState(option.tagId);
                        return (
                          <SubjectDecisionRow
                            key={option.tagId}
                            id={option.tagId}
                            label={option.name}
                            state={state}
                            disabled={isLoading || tagsLoading}
                            onToggle={() =>
                              setSubjectDecisions((current) => {
                                const next = new Map(current);
                                next.set(option.tagId, state !== 'checked');
                                return next;
                              })
                            }
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${styles.interactiveColumns} ${styles.mediaInteractiveColumns}`}>
              {filteredDimensionalTree.map((dimension) => (
                <TagPickerDimensionColumn
                  key={dimension.docId}
                  dimension={dimension}
                  selection={checkedSelection}
                  onSelectionChange={handleTagChange}
                  getSelectionState={getSelectionState}
                  onToggleTag={handleToggleTag}
                  expandedNodeIds={expandedNodeIds}
                  checkboxIdPrefix="bulk-media-tag"
                  forceExpandAll
                  showManagementControls
                  hideHeader
                />
              ))}
            </div>
          </div>
        )}

        <div className={styles.mediaFooter}>
          <div className={styles.stateLegend} aria-label="Tag selection states">
            <span className={styles.legendLabel}>Legend:</span>
            <SelectionStateExample state="unchecked" label="Empty" />
            <SelectionStateExample state="mixed" label="Some" />
            <SelectionStateExample state="checked" label="All" />
          </div>
          <div className={styles.mediaActions}>
            <button onClick={onClose} className={styles.cancelButton} disabled={isLoading}>
              Cancel
            </button>
            <button onClick={handleSaveChanges} className={styles.saveButton} disabled={isLoading || tagsLoading}>
              {isLoading ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

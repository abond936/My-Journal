'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectDecision, setSubjectDecision] = useState<{ touched: boolean; value: string | null }>({
    touched: false,
    value: null,
  });

  const mediaIdsKey = useMemo(() => [...new Set(mediaIds)].sort().join('\u001e'), [mediaIds]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSelectedMedia([]);
      setTagDecisions(new Map());
      setSearchTerm('');
      setSubjectDecision({ touched: false, value: null });
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
        setSubjectDecision({ touched: false, value: null });
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

  const subjectConsensus = useMemo(() => {
    const normalized = selectedMedia.map((item) => {
      const raw = item.subjectTagId;
      if (typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : null;
    });
    if (normalized.length === 0) {
      return { mixed: false, value: null as string | null };
    }
    const first = normalized[0] ?? null;
    const mixed = normalized.some((value) => value !== first);
    return { mixed, value: mixed ? null : first };
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
          label: getTagPathDisplay(tag, tagById),
        };
      })
      .filter(
        (row): row is { tagId: string; dimension: TagDimension; label: string } => Boolean(row)
      );

    rows.sort((a, b) => {
      const dimensionOrder = DIMENSION_ORDER.indexOf(a.dimension) - DIMENSION_ORDER.indexOf(b.dimension);
      if (dimensionOrder !== 0) return dimensionOrder;
      return a.label.localeCompare(b.label);
    });
    return rows;
  }, [checkedSelection, resolvedDimension, tagById]);

  useEffect(() => {
    if (!subjectDecision.touched) return;
    if (!subjectDecision.value) return;
    if (checkedSelection.has(subjectDecision.value)) return;
    setSubjectDecision({ touched: true, value: null });
  }, [checkedSelection, subjectDecision]);

  const subjectSelectValue = subjectDecision.touched
    ? subjectDecision.value ?? ''
    : subjectConsensus.mixed
      ? '__mixed__'
      : (subjectConsensus.value ?? '');

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

      if (removeTagIds.length > 0) {
        await bulkApplyTags(mediaIds, { tagIds: removeTagIds, mode: 'remove' });
      }
      if (addTagIds.length > 0) {
        await bulkApplyTags(mediaIds, { tagIds: addTagIds, mode: 'add' });
      }
      if (subjectDecision.touched) {
        await bulkApplyTags(mediaIds, {
          subjectTagId: subjectDecision.value,
          subjectTagIdProvided: true,
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
        <h2 className={styles.modalHeader}>Edit Tags for {mediaIds.length} Media Items</h2>
        <p className={styles.helpText}>
          Tag states reflect the selected media: <strong>checked = all</strong>, <strong>dash = some</strong>, <strong>empty = none</strong>.
          Click once to set for all, click again to remove from all.
        </p>
        <div className={styles.stateLegend} aria-hidden>
          <span>checked all</span>
          <span>dash some</span>
          <span>empty none</span>
        </div>

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

        <div className={styles.subjectSection}>
          <label htmlFor="bulk-media-subject" className={styles.subjectLabel}>
            Subject tag
          </label>
          <select
            id="bulk-media-subject"
            className={styles.subjectSelect}
            value={subjectSelectValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue === '__mixed__') return;
              setSubjectDecision({
                touched: true,
                value: nextValue ? nextValue : null,
              });
            }}
            disabled={isLoading || tagsLoading}
          >
            {!subjectDecision.touched && subjectConsensus.mixed ? (
              <option value="__mixed__">Keep mixed existing subjects</option>
            ) : null}
            <option value="">No subject</option>
            {subjectOptions.map((option) => (
              <option key={option.tagId} value={option.tagId}>
                {DIMENSION_LABEL[option.dimension]}: {option.label}
              </option>
            ))}
          </select>
          <p className={styles.subjectHelp}>
            Subject must be one of the tags assigned to every selected media item after this edit.
          </p>
        </div>

        {isLoading || tagsLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.interactiveColumns}>
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
                showManagementControls={false}
              />
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelButton} disabled={isLoading}>
            Cancel
          </button>
          <button onClick={handleSaveChanges} className={styles.saveButton} disabled={isLoading || tagsLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

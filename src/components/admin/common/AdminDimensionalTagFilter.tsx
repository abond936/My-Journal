'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Square, Tag as TagIcon, User } from 'lucide-react';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';
import type {
  AdminDimensionFilterMode,
  AdminDimensionFilterState,
} from '@/lib/preferences/adminFilters';
import EditModal from '@/components/admin/studio/cards/EditModal';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import styles from './AdminDimensionalTagFilter.module.css';

type AppliedTagFilterState = {
  selectedTagIds: string[];
  dimensionFilters: AdminDimensionFilterState;
};

const DIMENSION_ICON = {
  who: User,
  what: Square,
  when: Calendar,
  where: MapPin,
} satisfies Record<TagDimension, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>>;

type AdminDimensionalTagFilterProps = {
  selectedTagIds: string[];
  allTags: Tag[];
  onSelectedTagIdsChange: (tagIds: string[]) => void;
  dimensionFilters: AdminDimensionFilterState;
  onDimensionFilterChange: (
    dimension: TagDimension,
    patch: Partial<{ mode: AdminDimensionFilterMode; tagId: string; subjectOnly: boolean }>
  ) => void;
  className?: string;
  surfaceLabel: string;
  onApply?: (value: AppliedTagFilterState) => void;
};

export default function AdminDimensionalTagFilter({
  selectedTagIds,
  allTags,
  onSelectedTagIdsChange,
  dimensionFilters,
  onDimensionFilterChange,
  className,
  surfaceLabel,
  onApply,
}: AdminDimensionalTagFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftTagIds, setDraftTagIds] = useState(selectedTagIds);
  const [draftDimensionFilters, setDraftDimensionFilters] = useState(dimensionFilters);

  const activeRuleCount = DIMENSION_ORDER.reduce(
    (count, dimension) =>
      count +
      (dimensionFilters[dimension].mode === 'isEmpty' ? 1 : 0) +
      (dimensionFilters[dimension].subjectOnly ? 1 : 0),
    0
  );
  const activeCount = selectedTagIds.length + activeRuleCount;
  const selectedTagsByDimension = useMemo(() => {
    const resolvedDimensionById = buildResolvedTagDimensionMap(allTags);
    const tagById = new Map(
      allTags
        .filter((tag): tag is Tag & { docId: string } => Boolean(tag.docId))
        .map((tag) => [tag.docId, tag])
    );
    const grouped: Record<TagDimension, Tag[]> = {
      who: [],
      what: [],
      when: [],
      where: [],
    };
    selectedTagIds.forEach((tagId) => {
      const tag = tagById.get(tagId);
      const dimension = resolvedDimensionById.get(tagId);
      if (tag && dimension) grouped[dimension].push(tag);
    });
    return grouped;
  }, [allTags, selectedTagIds]);

  useEffect(() => {
    if (!open) return;
    setDraftTagIds(selectedTagIds);
    setDraftDimensionFilters(dimensionFilters);
  }, [dimensionFilters, open, selectedTagIds]);

  const applyDraft = () => {
    const resolvedDimensionById = buildResolvedTagDimensionMap(allTags);
    const appliedTagIds = draftTagIds.filter((tagId) => {
      const dimension = resolvedDimensionById.get(tagId);
      return !dimension || draftDimensionFilters[dimension].mode !== 'isEmpty';
    });
    if (onApply) {
      onApply({
        selectedTagIds: appliedTagIds,
        dimensionFilters: draftDimensionFilters,
      });
    } else {
      onSelectedTagIdsChange(appliedTagIds);
      for (const dimension of DIMENSION_ORDER) {
        const previous = dimensionFilters[dimension];
        const next = draftDimensionFilters[dimension];
        if (
          previous.mode !== next.mode ||
          previous.tagId !== next.tagId ||
          Boolean(previous.subjectOnly) !== Boolean(next.subjectOnly)
        ) {
          onDimensionFilterChange(dimension, next);
        }
      }
    }
    setOpen(false);
  };

  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      <div className={styles.summaryViewport}>
        <div className={styles.summaryBar}>
          <div className={styles.summaryColumns}>
            {DIMENSION_ORDER.map((dimension) => {
              const Icon = DIMENSION_ICON[dimension];
              const selectedTags =
                dimensionFilters[dimension].mode === 'isEmpty'
                  ? []
                  : selectedTagsByDimension[dimension];
              return (
                <div
                  key={dimension}
                  className={styles.summaryColumn}
                  data-dimension={dimension}
                >
                  <div className={styles.summaryHeading}>
                    <Icon size={14} aria-hidden={true} />
                    <span>{DIMENSION_LABEL[dimension]}</span>
                  </div>
                  <div className={styles.summaryPresence}>
                    {dimensionFilters[dimension].mode === 'isEmpty'
                      ? dimensionFilters[dimension].subjectOnly
                        ? 'Subjects empty'
                        : 'Empty'
                      : dimensionFilters[dimension].subjectOnly
                        ? 'Subjects only'
                        : 'Any assigned'}
                  </div>
                  <div className={styles.summaryTags}>
                    {selectedTags.length > 0 ? (
                      selectedTags.map((tag) => (
                        <span key={tag.docId} className={styles.summaryTag}>
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className={styles.summaryEmpty}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.summaryActions}>
            <button
              type="button"
              className={styles.filterButton}
              onClick={() => setOpen(true)}
              aria-label={`Open all ${surfaceLabel.toLowerCase()} tag filters`}
              aria-expanded={open}
            >
              <TagIcon size={17} aria-hidden="true" />
              {activeCount > 0 ? <span className={styles.ruleCount}>{activeCount}</span> : null}
            </button>
          </div>
        </div>
      </div>

      <EditModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`${surfaceLabel} tag filters`}
        size="wide"
        footer={(
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className={styles.applyButton} onClick={applyDraft}>
              Apply
            </button>
          </div>
        )}
      >
        <MacroTagSelector
          selectedTags={allTags.filter((tag) => tag.docId && draftTagIds.includes(tag.docId))}
          allTags={allTags}
          onChange={setDraftTagIds}
          expanded={open}
          onExpandedChange={(nextOpen) => {
            if (!nextOpen) setOpen(false);
          }}
          collapsedSummary="none"
          suppressOverlay
          applySelectionOnChange
          visibleDimensions={[...DIMENSION_ORDER]}
          pickerTitle={`${surfaceLabel} tag filters`}
          searchPlaceholder="Enter tags…"
          hidePickerHeading
          hideActions
          showManagementControls={false}
          initialExpandLevels={1}
          includeAllTags
          dimensionDisabled={(dimension) =>
            draftDimensionFilters[dimension].mode === 'isEmpty'
          }
          dimensionHeaderIcon={(dimension) => {
            const Icon = DIMENSION_ICON[dimension];
            return <Icon size={16} aria-hidden={true} />;
          }}
          dimensionHeaderControl={(dimension) => {
            const state = draftDimensionFilters[dimension];
            return (
              <div className={styles.dimensionOptions}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(state.subjectOnly)}
                    onChange={(event) =>
                      setDraftDimensionFilters((current) => ({
                        ...current,
                        [dimension]: {
                          ...current[dimension],
                          subjectOnly: event.target.checked,
                        },
                      }))
                    }
                  />
                  <span>Subjects only</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={state.mode === 'isEmpty'}
                    onChange={(event) => {
                      const isEmpty = event.target.checked;
                      setDraftDimensionFilters((current) => ({
                        ...current,
                        [dimension]: {
                          ...current[dimension],
                          mode: isEmpty ? 'isEmpty' : 'any',
                          tagId: '',
                        },
                      }));
                      if (isEmpty) {
                        const resolved = buildResolvedTagDimensionMap(allTags);
                        setDraftTagIds((current) =>
                          current.filter((tagId) => resolved.get(tagId) !== dimension)
                        );
                      }
                    }}
                  />
                  <span>Empty</span>
                </label>
              </div>
            );
          }}
        />

      </EditModal>
    </div>
  );
}

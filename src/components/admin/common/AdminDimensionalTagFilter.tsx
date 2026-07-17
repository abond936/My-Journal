'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ListTree, SlidersHorizontal } from 'lucide-react';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import type {
  AdminDimensionFilterMode,
  AdminDimensionFilterState,
  AdminTagFilterScope,
} from '@/lib/preferences/adminFilters';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import EditModal from '@/components/admin/studio/cards/EditModal';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import styles from './AdminDimensionalTagFilter.module.css';

type AdminDimensionalTagFilterProps = {
  selectedTagIds: string[];
  allTags: Tag[];
  onSelectedTagIdsChange: (tagIds: string[]) => void;
  tagScope: AdminTagFilterScope;
  onTagScopeChange: (scope: AdminTagFilterScope) => void;
  dimensionFilters: AdminDimensionFilterState;
  onDimensionFilterChange: (
    dimension: TagDimension,
    patch: Partial<{ mode: AdminDimensionFilterMode; tagId: string }>
  ) => void;
  className?: string;
  surfaceLabel: string;
};

export default function AdminDimensionalTagFilter({
  selectedTagIds,
  allTags,
  onSelectedTagIdsChange,
  tagScope,
  onTagScopeChange,
  dimensionFilters,
  onDimensionFilterChange,
  className,
  surfaceLabel,
}: AdminDimensionalTagFilterProps) {
  const [pickerDimensions, setPickerDimensions] = useState<TagDimension[] | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedTags = useMemo(
    () => allTags.filter((tag) => tag.docId && selectedTagIds.includes(tag.docId)),
    [allTags, selectedTagIds]
  );
  const activeRuleCount = DIMENSION_ORDER.filter(
    (dimension) => dimensionFilters[dimension].mode !== 'any'
  ).length + (tagScope === 'subject' ? 1 : 0);

  useEffect(() => {
    if (!rulesOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setRulesOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRulesOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [rulesOpen]);

  const pickerName = pickerDimensions?.length === 1
    ? `${DIMENSION_LABEL[pickerDimensions[0]]} filters`
    : `${surfaceLabel} tag filters`;

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`}>
      <CardDimensionalTagCommandBar
        card={{ tags: selectedTagIds }}
        allTags={allTags}
        onUpdateTags={onSelectedTagIdsChange}
        variant="compact"
        searchPlaceholder="Filter by tag…"
        onDimensionSelect={(dimension) => setPickerDimensions([dimension])}
        trailingSlot={
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setPickerDimensions([...DIMENSION_ORDER])}
              aria-label={`Browse all ${surfaceLabel.toLowerCase()} tag filters`}
              title="Browse all dimensions"
            >
              <ListTree size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setRulesOpen((current) => !current)}
              aria-label={`${surfaceLabel} tag rules`}
              aria-expanded={rulesOpen}
              title="Tag rules"
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              {activeRuleCount > 0 ? <span className={styles.ruleCount}>{activeRuleCount}</span> : null}
            </button>
          </div>
        }
      />

      {rulesOpen ? (
        <div className={styles.rulesPopover} role="group" aria-label={`${surfaceLabel} tag rules`}>
          <label className={styles.scopeRow}>
            <span>Match</span>
            <select value={tagScope} onChange={(event) => onTagScopeChange(event.target.value as AdminTagFilterScope)}>
              <option value="all">Any assigned tag</option>
              <option value="subject">Subjects only</option>
            </select>
          </label>
          <div className={styles.ruleList}>
            {DIMENSION_ORDER.map((dimension) => {
              const state = dimensionFilters[dimension];
              return (
                <label key={dimension} className={styles.ruleRow}>
                  <span>{DIMENSION_LABEL[dimension]}</span>
                  <select
                    value={state.mode === 'matches' ? 'any' : state.mode}
                    onChange={(event) =>
                      onDimensionFilterChange(dimension, {
                        mode: event.target.value as AdminDimensionFilterMode,
                        tagId: '',
                      })
                    }
                    aria-label={`${DIMENSION_LABEL[dimension]} tag presence`}
                  >
                    <option value="any">Any</option>
                    <option value="hasAny">Has tags</option>
                    <option value="isEmpty">Empty</option>
                  </select>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <EditModal
        isOpen={Boolean(pickerDimensions)}
        onClose={() => setPickerDimensions(null)}
        title={pickerName}
        size={pickerDimensions?.length === 1 ? 'default' : 'wide'}
      >
        <MacroTagSelector
          selectedTags={selectedTags}
          allTags={allTags}
          onChange={onSelectedTagIdsChange}
          expanded={Boolean(pickerDimensions)}
          onExpandedChange={(open) => {
            if (!open) setPickerDimensions(null);
          }}
          collapsedSummary="none"
          suppressOverlay
          applySelectionOnChange
          visibleDimensions={pickerDimensions ?? [...DIMENSION_ORDER]}
          pickerTitle={pickerName}
          searchPlaceholder={pickerDimensions?.length === 1
            ? `Find ${DIMENSION_LABEL[pickerDimensions[0]].toLowerCase()} tags`
            : 'Find tags'}
          hidePickerHeading
        />
      </EditModal>
    </div>
  );
}

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_LABEL, DIMENSION_ORDER, formatCoreTagsTooltipLines, type TagDimension } from '@/lib/utils/tagDisplay';
import {
  buildResolvedTagDimensionMap,
  buildTagByIdMap,
  getCoreTagsByDimensionFromTagIds,
} from '@/lib/utils/tagDimensionResolve';
import styles from './DimensionalTagVerticalChips.module.css';

export interface DimensionalTagVerticalChipsProps {
  /** Card `tags` or media `tags` (flat id list). */
  tagIds: string[];
  allTags: Tag[];
  onUpdateTags: (nextTagIds: string[]) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

/**
 * Read-only dimension order is Who → What → When → Where (no labels).
 * Tags are stacked vertically for admin grid cells.
 */
export default function DimensionalTagVerticalChips({
  tagIds,
  allTags,
  onUpdateTags,
  disabled = false,
  className,
}: DimensionalTagVerticalChipsProps) {
  const [saving, setSaving] = useState(false);
  const tagById = useMemo(() => buildTagByIdMap(allTags), [allTags]);
  const resolvedDimension = useMemo(() => buildResolvedTagDimensionMap(allTags), [allTags]);
  const currentTags = tagIds;

  const core = useMemo(
    () => getCoreTagsByDimensionFromTagIds(tagIds, resolvedDimension),
    [tagIds, resolvedDimension]
  );

  const persist = useCallback(
    async (next: string[]) => {
      setSaving(true);
      try {
        await onUpdateTags(next);
      } finally {
        setSaving(false);
      }
    },
    [onUpdateTags]
  );

  const railSummaryTitle = useMemo(
    () =>
      `Who → What → When → Where (top to bottom).\n\n${formatCoreTagsTooltipLines(core, (id) => tagById.get(id)?.name ?? id)}`,
    [core, tagById]
  );

  const removeFirstTagInDimension = useCallback(
    async (dim: TagDimension) => {
      const ids = core[dim];
      if (ids.length === 0) return;
      const firstId = ids[0];
      const next = currentTags.filter((id) => id !== firstId);
      await persist(next);
    },
    [core, currentTags, persist]
  );

  return (
    <div className={clsx(styles.root, className)} title={railSummaryTitle} onClick={(e) => e.stopPropagation()}>
      {DIMENSION_ORDER.map((dim, dimIndex) => {
        const ids = core[dim];
        const label = DIMENSION_LABEL[dim];
        if (ids.length === 0) {
          return (
            <div key={dim} className={clsx(styles.dimBlock, dimIndex > 0 && styles.dimBlockDivider)}>
              <span className={styles.empty}>—</span>
            </div>
          );
        }
        const firstId = ids[0];
        const firstName = tagById.get(firstId)?.name ?? firstId;
        const restCount = ids.length - 1;
        const allNames = ids.map((id) => tagById.get(id)?.name ?? id).join(', ');
        const rowTitle =
          restCount > 0
            ? `${label}: ${allNames}\n“${firstName}” is shown; ${restCount} more in this dimension.`
            : `${label}: ${allNames}.`;
        const removeLabel =
          restCount > 0
            ? `Remove “${firstName}” from ${label} (${restCount} more in this dimension).`
            : `Remove “${firstName}” from ${label}.`;
        return (
          <div key={dim} className={clsx(styles.dimBlock, dimIndex > 0 && styles.dimBlockDivider)}>
            <div
              className={clsx(
                styles.tagRow,
                dim === 'who' && styles.tagDimWho,
                dim === 'what' && styles.tagDimWhat,
                dim === 'when' && styles.tagDimWhen,
                dim === 'where' && styles.tagDimWhere,
                (disabled || saving) && styles.tagRowDisabled
              )}
              title={rowTitle}
            >
              <span className={styles.tagTextBlock}>
                <span className={styles.tagName}>{firstName}</span>
                {restCount > 0 ? (
                  <span className={styles.tagMore} aria-hidden>
                    +
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                className={styles.removeX}
                disabled={disabled || saving}
                title={removeLabel}
                aria-label={removeLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  void removeFirstTagInDimension(dim);
                }}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

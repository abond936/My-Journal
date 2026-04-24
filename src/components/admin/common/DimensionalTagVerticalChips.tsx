'use client';

import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Tag } from '@/lib/types/tag';
import {
  DIMENSION_LABEL,
  DIMENSION_ORDER,
  formatCoreTagsTooltipLines,
  type TagDimension,
} from '@/lib/utils/tagDisplay';
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
  variant?: 'rail' | 'inline';
}

/**
 * Read-only dimension order is Who -> What -> When -> Where.
 * In rail mode, tags stack vertically for admin grid cells.
 * In inline mode, only populated dimensions render as compact chips.
 */
export default function DimensionalTagVerticalChips({
  tagIds,
  allTags,
  onUpdateTags,
  disabled = false,
  className,
  variant = 'rail',
}: DimensionalTagVerticalChipsProps) {
  const [saving, setSaving] = useState(false);
  const tagById = useMemo(() => buildTagByIdMap(allTags), [allTags]);
  const resolvedDimension = useMemo(() => buildResolvedTagDimensionMap(allTags), [allTags]);
  const currentTags = tagIds;
  const inline = variant === 'inline';

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
      `Who -> What -> When -> Where (top to bottom).\n\n${formatCoreTagsTooltipLines(core, (id) => tagById.get(id)?.name ?? id)}`,
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

  const dimensionsToRender = inline ? DIMENSION_ORDER.filter((dim) => core[dim].length > 0) : DIMENSION_ORDER;

  return (
    <div
      className={clsx(styles.root, inline && styles.rootInline, className)}
      title={railSummaryTitle}
      onClick={(e) => e.stopPropagation()}
    >
      {dimensionsToRender.map((dim, dimIndex) => {
        const ids = core[dim];
        const label = DIMENSION_LABEL[dim];
        if (ids.length === 0) {
          if (inline) return null;
          return (
            <div key={dim} className={clsx(styles.dimBlock, dimIndex > 0 && styles.dimBlockDivider)}>
              <span className={styles.empty}>-</span>
            </div>
          );
        }

        const firstId = ids[0];
        const firstName = tagById.get(firstId)?.name ?? firstId;
        const restCount = ids.length - 1;
        const allNames = ids.map((id) => tagById.get(id)?.name ?? id).join(', ');
        const rowTitle =
          restCount > 0
            ? `${label}: ${allNames}\n"${firstName}" is shown; ${restCount} more in this dimension.`
            : `${label}: ${allNames}.`;
        const removeLabel =
          restCount > 0
            ? `Remove "${firstName}" from ${label} (${restCount} more in this dimension).`
            : `Remove "${firstName}" from ${label}.`;

        return (
          <div
            key={dim}
            className={clsx(
              styles.dimBlock,
              dimIndex > 0 && !inline && styles.dimBlockDivider,
              inline && styles.dimBlockInline
            )}
          >
            <div
              className={clsx(
                styles.tagRow,
                inline && styles.tagRowInline,
                dim === 'who' && styles.tagDimWho,
                dim === 'what' && styles.tagDimWhat,
                dim === 'when' && styles.tagDimWhen,
                dim === 'where' && styles.tagDimWhere,
                (disabled || saving) && styles.tagRowDisabled
              )}
              title={rowTitle}
            >
              {inline ? (
                <button
                  type="button"
                  className={clsx(styles.removeX, styles.removeXInline)}
                  disabled={disabled || saving}
                  title={removeLabel}
                  aria-label={removeLabel}
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeFirstTagInDimension(dim);
                  }}
                >
                  x
                </button>
              ) : null}
              <span className={styles.tagTextBlock}>
                <span className={styles.tagName}>{firstName}</span>
                {restCount > 0 ? (
                  <span className={styles.tagMore} aria-hidden>
                    +
                  </span>
                ) : null}
              </span>
              {!inline ? (
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
                  x
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

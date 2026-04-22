'use client';

import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_LABEL, DIMENSION_ORDER, formatCoreTagsTooltipLines, type TagDimension } from '@/lib/utils/tagDisplay';
import {
  buildResolvedTagDimensionMap,
  buildTagByIdMap,
  getCoreTagsByDimensionFromTagIds,
} from '@/lib/utils/tagDimensionResolve';
import styles from './DimensionalTagVerticalChips.module.css';

export interface DimensionalTagVerticalChipsProps {
  card: Card;
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
  card,
  allTags,
  onUpdateTags,
  disabled = false,
  className,
}: DimensionalTagVerticalChipsProps) {
  const [saving, setSaving] = useState(false);
  const tagById = useMemo(() => buildTagByIdMap(allTags), [allTags]);
  const resolvedDimension = useMemo(() => buildResolvedTagDimensionMap(allTags), [allTags]);
  const currentTags = card.tags || [];

  const core = useMemo(
    () => getCoreTagsByDimensionFromTagIds(card.tags, resolvedDimension),
    [card.tags, resolvedDimension]
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
            ? `${label}: ${allNames}\nRemove “${firstName}” (× removes the first tag in this dimension).`
            : `${label}: ${allNames}\nRemove “${firstName}”.`;
        return (
          <div key={dim} className={clsx(styles.dimBlock, dimIndex > 0 && styles.dimBlockDivider)}>
            <button
              type="button"
              className={clsx(
                styles.tagButton,
                dim === 'who' && styles.tagDimWho,
                dim === 'what' && styles.tagDimWhat,
                dim === 'when' && styles.tagDimWhen,
                dim === 'where' && styles.tagDimWhere
              )}
              disabled={disabled || saving}
              title={rowTitle}
              aria-label={
                restCount > 0
                  ? `Remove ${firstName} from ${label} (${restCount} more in this dimension; tooltip lists all).`
                  : `Remove ${firstName} from ${label}.`
              }
              onClick={() => void removeFirstTagInDimension(dim)}
            >
              <span className={styles.tagName}>{firstName}</span>
              {restCount > 0 ? (
                <span className={styles.tagMore} aria-hidden>
                  +
                </span>
              ) : null}
              <span className={styles.tagX} aria-hidden>
                ×
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

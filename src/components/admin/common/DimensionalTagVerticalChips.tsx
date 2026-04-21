'use client';

import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_ORDER } from '@/lib/utils/tagDisplay';
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

  const removeTag = useCallback(
    async (tagId: string) => {
      const next = currentTags.filter((id) => id !== tagId);
      await persist(next);
    },
    [currentTags, persist]
  );

  return (
    <div
      className={clsx(styles.root, className)}
      title="Dimension order (top to bottom): Who, What, When, Where."
      onClick={(e) => e.stopPropagation()}
    >
      {DIMENSION_ORDER.map((dim, dimIndex) => (
        <div key={dim} className={clsx(styles.dimBlock, dimIndex > 0 && styles.dimBlockDivider)}>
          {core[dim].length === 0 ? (
            <span className={styles.empty}>—</span>
          ) : (
            core[dim].map((id) => (
              <button
                key={id}
                type="button"
                className={styles.tagButton}
                disabled={disabled || saving}
                title={`Remove ${tagById.get(id)?.name ?? id}`}
                onClick={() => void removeTag(id)}
              >
                <span className={styles.tagName}>{tagById.get(id)?.name ?? id}</span>
                <span className={styles.tagX} aria-hidden>
                  ×
                </span>
              </button>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

'use client';

import React from 'react';
import clsx from 'clsx';
import type { OrganizedTags } from '@/lib/types/tag';
import {
  DIMENSION_LABEL,
  DIMENSION_ORDER,
  type TagDimension,
} from '@/lib/utils/tagDisplay';
import styles from './DirectDimensionChips.module.css';

function resolveNames(ids: string[], tagNameMap: Map<string, string>): string[] {
  return ids.map((id) => tagNameMap.get(id) ?? id);
}

export interface DirectDimensionChipCellProps {
  ids: string[];
  tagNameMap: Map<string, string>;
  dimension: TagDimension;
  /** Table cells need padding wrapper; grid chips sit in the row without it */
  variant?: 'grid' | 'table';
}

/**
 * One dimension: first direct tag name (ellipsis) + `+n` for additional direct tags.
 * Hover `title` lists all direct tag names in that dimension.
 */
export function DirectDimensionChipCell({
  ids,
  tagNameMap,
  dimension,
  variant = 'grid',
}: DirectDimensionChipCellProps) {
  const names = resolveNames(ids, tagNameMap);
  const label = DIMENSION_LABEL[dimension];
  const title =
    names.length === 0 ? `${label}: (none)` : `${label}: ${names.join(', ')}`;

  const inner =
    names.length === 0 ? (
      <div className={styles.chipEmpty} title={title} aria-label={title}>
        —
      </div>
    ) : (
      <div className={styles.chip} title={title} aria-label={title}>
        <span className={styles.chipLabel}>{names[0]}</span>
        {names.length > 1 ? (
          <span className={styles.chipMore} aria-hidden={true}>
            +{names.length - 1}
          </span>
        ) : null}
      </div>
    );

  if (variant === 'table') {
    return <div className={styles.tableCell}>{inner}</div>;
  }

  return inner;
}

export interface DirectDimensionChipsRowProps {
  core: OrganizedTags;
  tagNameMap: Map<string, string>;
}

/** Four equal columns: Who, What, When, Where — for card/media admin grids */
export function DirectDimensionChipsRow({ core, tagNameMap }: DirectDimensionChipsRowProps) {
  return (
    <div className={styles.row}>
      {DIMENSION_ORDER.map((dim) => (
        <DirectDimensionChipCell
          key={dim}
          ids={core[dim]}
          tagNameMap={tagNameMap}
          dimension={dim}
          variant="grid"
        />
      ))}
    </div>
  );
}

export interface DirectDimensionTagsRailProps {
  core: OrganizedTags;
  tagNameMap: Map<string, string>;
  className?: string;
}

/**
 * Same dimension order as chips row (Who → What → When → Where) without column labels.
 * For admin media grid: full tag names, wrapping, read-only.
 */
export function DirectDimensionTagsRail({ core, tagNameMap, className }: DirectDimensionTagsRailProps) {
  return (
    <div
      className={clsx(styles.rail, className)}
      title="Dimension order (top to bottom): Who, What, When, Where."
    >
      {DIMENSION_ORDER.map((dim, index) => {
        const ids = core[dim];
        const label = DIMENSION_LABEL[dim];
        const names = resolveNames(ids, tagNameMap);
        const groupTitle = names.length === 0 ? `${label}: (none)` : `${label}: ${names.join(', ')}`;
        return (
          <div
            key={dim}
            className={clsx(styles.railDim, index > 0 && styles.railDimDivider)}
            title={groupTitle}
          >
            {ids.length === 0 ? (
              <span className={styles.railEmpty}>—</span>
            ) : (
              ids.map((id) => (
                <span key={`${dim}-${id}`} className={styles.railLine} title={`${label}: ${tagNameMap.get(id) ?? id}`}>
                  {tagNameMap.get(id) ?? id}
                </span>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

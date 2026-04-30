'use client';

import React from 'react';
import clsx from 'clsx';
import type { OrganizedTags } from '@/lib/types/tag';
import {
  DIMENSION_LABEL,
  DIMENSION_ORDER,
  formatCoreTagsTooltipLines,
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
 * One dimension: first direct tag name (hard clip) + `+` when more exist.
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
            +
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
 * One clipped preview per dimension; native `title` lists all tags in that dimension.
 */
export function DirectDimensionTagsRail({ core, tagNameMap, className }: DirectDimensionTagsRailProps) {
  const railTitle = `Who → What → When → Where (top to bottom).\n\n${formatCoreTagsTooltipLines(core, (id) => tagNameMap.get(id) ?? id)}`;
  return (
    <div className={clsx(styles.rail, className)} title={railTitle}>
      {DIMENSION_ORDER.map((dim, index) => {
        const ids = core[dim];
        const label = DIMENSION_LABEL[dim];
        const names = resolveNames(ids, tagNameMap);
        const groupTitle = names.length === 0 ? `${label}: (none)` : `${label}: ${names.join(', ')}`;
        const firstName = names[0] ?? '';
        const restCount = ids.length - 1;
        return (
          <div
            key={dim}
            className={clsx(styles.railDim, index > 0 && styles.railDimDivider)}
            title={groupTitle}
          >
            {ids.length === 0 ? (
              <span className={styles.railEmpty}>—</span>
            ) : (
              <span
                className={clsx(
                  styles.railLinePill,
                  dim === 'who' && styles.railLineWho,
                  dim === 'what' && styles.railLineWhat,
                  dim === 'when' && styles.railLineWhen,
                  dim === 'where' && styles.railLineWhere
                )}
              >
                <span className={styles.railLineText}>{firstName}</span>
                {restCount > 0 ? (
                  <span className={styles.railMore} aria-hidden>
                    +
                  </span>
                ) : null}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

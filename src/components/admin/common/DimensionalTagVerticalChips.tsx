'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getDimensionSubjectPresentation } from '@/lib/utils/subjectTag';

const LONG_PRESS_MS = 450;
const PANEL_WIDTH = 220;

type ActiveDimensionMenu = {
  dimension: TagDimension;
  left: number;
  top: number;
  selectedTagId: string | null;
};

function dimensionClassName(dimension: TagDimension): string {
  switch (dimension) {
    case 'who':
      return styles.tagDimWho;
    case 'what':
      return styles.tagDimWhat;
    case 'when':
      return styles.tagDimWhen;
    case 'where':
      return styles.tagDimWhere;
    default:
      return '';
  }
}

export interface DimensionalTagVerticalChipsProps {
  /** Card `tags` or media `tags` (flat id list). */
  tagIds: string[];
  allTags: Tag[];
  onUpdateTags: (nextTagIds: string[]) => void | Promise<void>;
  subjectTagId?: string | null;
  subjectTagIds?: string[];
  onUpdateSubjectTagId?: (nextSubjectTagId: string | null) => void | Promise<void>;
  onUpdateSubjectTagIds?: (nextSubjectTagIds: string[]) => void | Promise<void>;
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
  subjectTagId = null,
  subjectTagIds,
  onUpdateSubjectTagId,
  onUpdateSubjectTagIds,
  disabled = false,
  className,
  variant = 'rail',
}: DimensionalTagVerticalChipsProps) {
  const [saving, setSaving] = useState(false);
  const [activeMenu, setActiveMenu] = useState<ActiveDimensionMenu | null>(null);
  const tagById = useMemo(() => buildTagByIdMap(allTags), [allTags]);
  const resolvedDimension = useMemo(() => buildResolvedTagDimensionMap(allTags), [allTags]);
  const currentTags = tagIds;
  const currentSubjectTagIds = useMemo(
    () => subjectTagIds?.length ? subjectTagIds : subjectTagId ? [subjectTagId] : [],
    [subjectTagId, subjectTagIds]
  );
  const inline = variant === 'inline';
  const rootRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressHandledRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearLongPress, [clearLongPress]);

  const core = useMemo(
    () => getCoreTagsByDimensionFromTagIds(tagIds, resolvedDimension),
    [tagIds, resolvedDimension]
  );

  useEffect(() => {
    if (!activeMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setActiveMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

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

  const persistSubject = useCallback(
    async (nextSubjectTagId: string | null) => {
      if (!onUpdateSubjectTagId) return;
      setSaving(true);
      try {
        await onUpdateSubjectTagId(nextSubjectTagId);
      } finally {
        setSaving(false);
      }
    },
    [onUpdateSubjectTagId]
  );

  const toggleSubject = useCallback(async (tagId: string) => {
    if (onUpdateSubjectTagIds) {
      const next = currentSubjectTagIds.includes(tagId)
        ? currentSubjectTagIds.filter((id) => id !== tagId)
        : [...currentSubjectTagIds, tagId];
      setSaving(true);
      try {
        await onUpdateSubjectTagIds(next);
      } finally {
        setSaving(false);
      }
      return;
    }
    await persistSubject(subjectTagId === tagId ? null : tagId);
  }, [currentSubjectTagIds, onUpdateSubjectTagIds, persistSubject, subjectTagId]);

  const railSummaryTitle = useMemo(
    () =>
      `Who -> What -> When -> Where (top to bottom).\n\n${formatCoreTagsTooltipLines(core, (id) => tagById.get(id)?.name ?? id)}`,
    [core, tagById]
  );

  const removeTag = useCallback(
    async (tagId: string) => {
      const next = currentTags.filter((id) => id !== tagId);
      await persist(next);
    },
    [currentTags, persist]
  );

  const openDimensionMenu = useCallback((dimension: TagDimension, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8));
    const top = Math.min(rect.bottom + 6, window.innerHeight - 160);
    setActiveMenu((prev) =>
      prev?.dimension === dimension
        ? { ...prev, left, top }
        : { dimension, left, top, selectedTagId: null }
    );
  }, []);

  const beginLongPress = useCallback(
    (dimension: TagDimension, anchor: HTMLElement) => {
      clearLongPress();
      longPressHandledRef.current = false;
      longPressTimerRef.current = window.setTimeout(() => {
        longPressHandledRef.current = true;
        openDimensionMenu(dimension, anchor);
      }, LONG_PRESS_MS);
    },
    [clearLongPress, openDimensionMenu]
  );

  const dimensionsToRender = DIMENSION_ORDER;

  return (
    <div
      ref={rootRef}
      className={clsx(styles.root, inline && styles.rootInline, className)}
      title={railSummaryTitle}
      onClick={(e) => e.stopPropagation()}
    >
      {dimensionsToRender.map((dim, dimIndex) => {
        const ids = core[dim];
        const label = DIMENSION_LABEL[dim];
        if (ids.length === 0) {
          if (inline) {
            return (
              <div key={dim} className={clsx(styles.dimBlock, styles.dimBlockInline)}>
                <span
                  className={clsx(
                    styles.tagRow,
                    styles.tagRowInline,
                    styles.tagRowEmptyInline,
                    dimensionClassName(dim)
                  )}
                  aria-hidden="true"
                >
                  <span className={styles.tagTextBlock}>
                    <span className={styles.tagName}>
                      <span className={styles.tagNameText}>-</span>
                    </span>
                  </span>
                </span>
              </div>
            );
          }
          return (
            <div key={dim} className={clsx(styles.dimBlock, dimIndex > 0 && styles.dimBlockDivider)}>
              <span className={styles.empty}>-</span>
            </div>
          );
        }

        const firstId = currentSubjectTagIds.find((id) => ids.includes(id)) ?? ids[0];
        const firstName = tagById.get(firstId)?.name ?? firstId;
        const allNames = ids.map((id) => tagById.get(id)?.name ?? id).join(', ');
        const presentation = getDimensionSubjectPresentation(ids, currentSubjectTagIds);
        const displayName = presentation === 'multiple'
          ? 'Multiple'
          : presentation === 'subjects'
            ? 'Subjects+'
            : firstName;
        const selectedSubjectNames = currentSubjectTagIds
          .filter((id) => ids.includes(id))
          .map((id) => tagById.get(id)?.name ?? id);
        const isSubject = presentation === 'implicit' || presentation === 'subjects';
        const rowTitle = `${label}: ${displayName}\nTags: ${allNames}${selectedSubjectNames.length ? `\nSelected subjects: ${selectedSubjectNames.join(', ')}` : ''}`;

        return (
          <div
            key={dim}
            className={clsx(
              styles.dimBlock,
              dimIndex > 0 && !inline && styles.dimBlockDivider,
              inline && styles.dimBlockInline
            )}
          >
            <button
              type="button"
              className={clsx(
                styles.tagRow,
                inline && styles.tagRowInline,
                dimensionClassName(dim),
                isSubject && styles.tagRowSubject,
                (disabled || saving) && styles.tagRowDisabled
              )}
              title={rowTitle}
              aria-haspopup="dialog"
              aria-expanded={activeMenu?.dimension === dim}
              disabled={disabled || saving}
              onClick={(event) => {
                event.stopPropagation();
                if (longPressHandledRef.current) {
                  longPressHandledRef.current = false;
                  return;
                }
                openDimensionMenu(dim, event.currentTarget);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openDimensionMenu(dim, event.currentTarget);
              }}
              onPointerDown={(event) => {
                if (event.pointerType === 'touch' || event.pointerType === 'pen') {
                  beginLongPress(dim, event.currentTarget);
                }
              }}
              onPointerUp={clearLongPress}
              onPointerCancel={clearLongPress}
              onPointerLeave={clearLongPress}
            >
              <span className={styles.tagTextBlock}>
                <span className={styles.tagName}>
                  <span className={styles.tagNameText}>{displayName}</span>
                </span>
              </span>
            </button>
          </div>
        );
      })}

      {activeMenu ? (
        <div
          className={styles.dimensionMenu}
          role="dialog"
          aria-label={`${DIMENSION_LABEL[activeMenu.dimension]} tags`}
          style={{ left: activeMenu.left, top: activeMenu.top }}
        >
          <div className={styles.dimensionMenuHeader}>{DIMENSION_LABEL[activeMenu.dimension]}</div>
          <div className={styles.dimensionMenuList}>
            {core[activeMenu.dimension].map((id) => {
              const tagName = tagById.get(id)?.name ?? id;
              const isSubject = currentSubjectTagIds.includes(id);
              const isSelected = activeMenu.selectedTagId === id;
              return (
                <div key={id} className={styles.dimensionMenuEntry}>
                  <button
                    type="button"
                    className={clsx(
                      styles.dimensionMenuTag,
                      dimensionClassName(activeMenu.dimension),
                      isSubject && styles.dimensionMenuTagSubject,
                      isSelected && styles.dimensionMenuTagSelected
                    )}
                    onClick={() =>
                      setActiveMenu((prev) =>
                        prev
                          ? {
                              ...prev,
                              selectedTagId: prev.selectedTagId === id ? null : id,
                            }
                          : prev
                      )
                    }
                  >
                    <span className={styles.dimensionMenuTagName}>
                      <span className={styles.dimensionMenuTagNameText}>{tagName}</span>
                    </span>
                  </button>
                  {isSelected ? (
                    <div className={styles.dimensionMenuActions}>
                          {onUpdateSubjectTagId || onUpdateSubjectTagIds ? (
                        <button
                          type="button"
                          className={clsx(
                            styles.dimensionMenuAction,
                            isSubject && styles.dimensionMenuActionActive
                          )}
                          disabled={disabled || saving}
                          onClick={async () => {
                            await toggleSubject(id);
                            setActiveMenu(null);
                          }}
                        >
                          Subject
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.dimensionMenuAction}
                        disabled={disabled || saving}
                        onClick={async () => {
                          await removeTag(id);
                          setActiveMenu(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

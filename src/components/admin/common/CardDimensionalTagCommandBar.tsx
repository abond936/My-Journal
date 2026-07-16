'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import {
  buildResolvedTagDimensionMap,
  buildTagByIdMap,
  getCoreTagsByDimensionFromTagIds,
  getTagPathDisplay,
} from '@/lib/utils/tagDimensionResolve';
import styles from './CardDimensionalTagCommandBar.module.css';
import clsx from 'clsx';

const MAX_SUGGESTIONS = 25;
const LONG_PRESS_MS = 450;
const ACTION_MENU_WIDTH = 132;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function scoreTagSuggestion(query: string, tagName: string, pathLabel: string): number | null {
  if (!query) return null;

  const normalizedTagName = norm(tagName);
  const normalizedPath = norm(pathLabel);
  const pathSegments = normalizedPath.split('/').map((segment) => segment.trim()).filter(Boolean);
  const leafName = pathSegments[pathSegments.length - 1] ?? normalizedTagName;

  if (normalizedTagName === query || leafName === query) return 0;
  if (normalizedTagName.startsWith(query) || leafName.startsWith(query)) return 1;
  if (normalizedTagName.includes(query) || leafName.includes(query)) return 2;
  if (normalizedPath.endsWith(`/${query}`)) return 3;
  if (normalizedPath.includes(`/${query}/`) || normalizedPath.includes(`/${query}`)) return 4;
  if (normalizedPath.includes(query)) return 5;

  return null;
}

type ActiveTagMenu = {
  tagId: string;
  left: number;
  top: number;
};

function dimensionChipClassName(dimension: TagDimension): string {
  switch (dimension) {
    case 'who':
      return styles.chipDimWho;
    case 'what':
      return styles.chipDimWhat;
    case 'when':
      return styles.chipDimWhen;
    case 'where':
      return styles.chipDimWhere;
    default:
      return '';
  }
}

function orderDimensionTagIds(tagIds: string[], subjectTagIds: string[]): string[] {
  const subjects = subjectTagIds.filter((tagId) => tagIds.includes(tagId));
  if (subjects.length === 0) return tagIds;
  const subjectSet = new Set(subjects);
  return [...subjects, ...tagIds.filter((tagId) => !subjectSet.has(tagId))];
}

export interface CardDimensionalTagCommandBarProps {
  /** Tag assignment only; full `Card` is accepted at call sites. */
  card: Pick<Card, 'tags' | 'subjectTagId' | 'subjectTagIds' | 'galleryTagRollupStatuses' | 'galleryImplicitSubjectTagIds'>;
  allTags: Tag[];
  onUpdateTags: (nextTagIds: string[]) => void | Promise<void>;
  onUpdateSubjectTagId?: (nextSubjectTagId: string | null) => void | Promise<void>;
  onUpdateSubjectTagIds?: (nextSubjectTagIds: string[]) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'searchOnly';
  /** e.g. full MacroTagSelector trigger, aligned to the right of the dimension chip row */
  trailingSlot?: React.ReactNode;
  /** Form-level tag validation message / outline (e.g. when full selector is hidden on card edit). */
  tagError?: string;
  /** Search field placeholder (default matches Media toolbar "Edit tags..."). */
  searchPlaceholder?: string;
  /** When true, do not render per-dimension "Who/What/..." row labels (header-only layout, e.g. card admin table). */
  hideDimensionRowLabels?: boolean;
  /** Card admin table: larger chips, tighter toolbar; use with `variant="compact"`. */
  tableEmbed?: boolean;
  /** Narrow contexts (e.g. media grid tile): smaller typeahead suggestion rows. */
  suggestionsDensity?: 'default' | 'dense';
  /** Optional unified secondary block, such as advanced tag rules. */
  footerContent?: React.ReactNode;
  /** Compose/card-edit surfaces: render one tag per line within each dimension. */
  stackTagsWithinDimension?: boolean;
}

export default function CardDimensionalTagCommandBar({
  card,
  allTags,
  onUpdateTags,
  onUpdateSubjectTagId,
  onUpdateSubjectTagIds,
  disabled = false,
  className,
  variant = 'default',
  trailingSlot,
  tagError,
  searchPlaceholder = 'Edit tags...',
  hideDimensionRowLabels = false,
  tableEmbed = false,
  suggestionsDensity = 'default',
  footerContent,
  stackTagsWithinDimension = false,
}: CardDimensionalTagCommandBarProps) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTagMenu, setActiveTagMenu] = useState<ActiveTagMenu | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressHandledRef = useRef(false);

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearLongPress, [clearLongPress]);

  const tagById = useMemo(() => buildTagByIdMap(allTags), [allTags]);
  const resolvedDimension = useMemo(() => buildResolvedTagDimensionMap(allTags), [allTags]);

  const currentTags = useMemo(() => card.tags ?? [], [card.tags]);
  const selectedSet = useMemo(() => new Set(currentTags), [currentTags]);

  const core = useMemo(
    () => getCoreTagsByDimensionFromTagIds(card.tags, resolvedDimension),
    [card.tags, resolvedDimension]
  );
  const subjectTagId = card.subjectTagId ?? null;
  const subjectTagIds = useMemo(
    () => card.subjectTagIds?.length ? card.subjectTagIds : subjectTagId ? [subjectTagId] : [],
    [card.subjectTagIds, subjectTagId]
  );
  const orderedCore = useMemo(
    () =>
      Object.fromEntries(
        DIMENSION_ORDER.map((dimension) => [
          dimension,
          orderDimensionTagIds(core[dimension], subjectTagIds),
        ])
      ) as Record<TagDimension, string[]>,
    [core, subjectTagIds]
  );

  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    const out: { tag: Tag; pathLabel: string; dimension: TagDimension; rank: number; depth: number }[] = [];
    for (const tag of allTags) {
      if (!tag.docId || selectedSet.has(tag.docId)) continue;
      const dimension = resolvedDimension.get(tag.docId);
      if (!dimension) continue;
      const pathLabel = getTagPathDisplay(tag, tagById);
      const rank = scoreTagSuggestion(q, tag.name, pathLabel);
      if (rank === null) continue;
      out.push({ tag, pathLabel, dimension, rank, depth: tag.path?.length ?? 0 });
    }
    out.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.pathLabel.localeCompare(b.pathLabel);
    });
    return out.slice(0, MAX_SUGGESTIONS);
  }, [allTags, query, resolvedDimension, selectedSet, tagById]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  useEffect(() => {
    if (!activeTagMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setActiveTagMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTagMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTagMenu]);

  const persist = useCallback(
    async (next: string[]) => {
      setSaving(true);
      setSaveError(null);
      try {
        await onUpdateTags(next);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Failed to update tags');
      } finally {
        setSaving(false);
      }
    },
    [onUpdateTags]
  );

  const addTag = useCallback(
    async (tagId: string) => {
      if (!tagId || selectedSet.has(tagId)) return;
      const next = Array.from(new Set([...currentTags, tagId]));
      await persist(next);
      setQuery('');
      setHighlightIndex(-1);
      focusSearch();
    },
    [currentTags, persist, selectedSet, focusSearch]
  );

  const removeTag = useCallback(
    async (tagId: string) => {
      const next = currentTags.filter((id) => id !== tagId);
      await persist(next);
    },
    [currentTags, persist]
  );

  const persistSubjectTag = useCallback(
    async (nextSubjectTagId: string | null) => {
      if (!onUpdateSubjectTagId) return;
      setSaving(true);
      setSaveError(null);
      try {
        await onUpdateSubjectTagId(nextSubjectTagId);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Failed to update subject');
      } finally {
        setSaving(false);
      }
    },
    [onUpdateSubjectTagId]
  );

  const toggleSubject = useCallback(
    async (tagId: string) => {
      if (onUpdateSubjectTagIds) {
        const next = subjectTagIds.includes(tagId)
          ? subjectTagIds.filter((id) => id !== tagId)
          : [...subjectTagIds, tagId];
        setSaving(true);
        setSaveError(null);
        try {
          await onUpdateSubjectTagIds(next);
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : 'Failed to update subjects');
        } finally {
          setSaving(false);
        }
        return;
      }
      if (!onUpdateSubjectTagId) return;
      await persistSubjectTag(subjectTagId === tagId ? null : tagId);
    },
    [onUpdateSubjectTagId, onUpdateSubjectTagIds, persistSubjectTag, subjectTagId, subjectTagIds]
  );

  const openTagMenu = useCallback((tagId: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - ACTION_MENU_WIDTH - 8));
    const top = Math.min(rect.bottom + 6, window.innerHeight - 72);
    setActiveTagMenu({ tagId, left, top });
  }, []);

  const runSubjectAction = useCallback(
    async (tagId: string) => {
      await toggleSubject(tagId);
      setActiveTagMenu(null);
    },
    [toggleSubject]
  );

  const runRemoveAction = useCallback(
    async (tagId: string) => {
      await removeTag(tagId);
      setActiveTagMenu(null);
    },
    [removeTag]
  );

  const beginLongPress = useCallback(
    (tagId: string, anchor: HTMLElement) => {
      clearLongPress();
      longPressHandledRef.current = false;
      longPressTimerRef.current = window.setTimeout(() => {
        longPressHandledRef.current = true;
        openTagMenu(tagId, anchor);
      }, LONG_PRESS_MS);
    },
    [clearLongPress, openTagMenu]
  );

  const onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setHighlightIndex((i) => (i + 1 >= suggestions.length ? 0 : i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setHighlightIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      const idx = highlightIndex >= 0 ? highlightIndex : 0;
      const pick = suggestions[idx];
      if (pick?.tag.docId) void addTag(pick.tag.docId);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setHighlightIndex(-1);
      setActiveTagMenu(null);
    }
  };

  const renderChip = useCallback(
    (dimension: TagDimension, id: string) => {
      const tagName = tagById.get(id)?.name ?? id;
      const isSubject = subjectTagIds.includes(id) || (card.galleryImplicitSubjectTagIds ?? []).includes(id);
      return (
        <button
          key={id}
          type="button"
          className={clsx(
            styles.chip,
            dimensionChipClassName(dimension),
            isSubject && styles.chipSubject
          )}
          disabled={disabled || saving}
          title={`${tagName}${isSubject ? ' (subject)' : ''}`}
          aria-haspopup="menu"
          aria-expanded={activeTagMenu?.tagId === id}
          aria-label={`${tagName}${isSubject ? ', subject' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            if (longPressHandledRef.current) {
              longPressHandledRef.current = false;
              return;
            }
            openTagMenu(id, event.currentTarget);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openTagMenu(id, event.currentTarget);
          }}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch' || event.pointerType === 'pen') {
              beginLongPress(id, event.currentTarget);
            }
          }}
          onPointerUp={clearLongPress}
          onPointerCancel={clearLongPress}
          onPointerLeave={clearLongPress}
        >
          <span className={styles.chipName}>
            <span className={styles.chipNameText}>{tagName}</span>
          </span>
        </button>
      );
    },
    [
      activeTagMenu?.tagId,
      beginLongPress,
      clearLongPress,
      disabled,
      openTagMenu,
      saving,
      subjectTagIds,
      card.galleryImplicitSubjectTagIds,
      tagById,
    ]
  );

  return (
    <div
      ref={rootRef}
      className={clsx(
        styles.wrap,
        variant === 'compact' && styles.wrapCompact,
        variant === 'searchOnly' && styles.wrapSearchOnly,
        tableEmbed && styles.wrapTable,
        stackTagsWithinDimension && styles.wrapStackWithinDimension,
        suggestionsDensity === 'dense' && styles.wrapDenseSuggestions,
        tagError && styles.wrapError,
        className
      )}
      onMouseDown={(ev) => ev.stopPropagation()}
      onPointerDown={(ev) => ev.stopPropagation()}
      onClick={(ev) => ev.stopPropagation()}
    >
      {variant !== 'searchOnly' ? (
        <div className={styles.chipsToolbar}>
          <div className={styles.dimensionRow}>
            {DIMENSION_ORDER.map((dim) => (
              <div key={dim} className={styles.dimCell}>
                {hideDimensionRowLabels ? null : <div className={styles.dimLabel}>{DIMENSION_LABEL[dim]}</div>}
                <div className={styles.chipStrip}>
                  {core[dim].length === 0 ? (
                    card.galleryTagRollupStatuses?.[dim] === 'unreviewed' ? (
                      <span
                        className={clsx(styles.chipEmpty, styles.chipUnreviewed)}
                        title={`${DIMENSION_LABEL[dim]} requires review because at least one Gallery item is blank.`}
                      >
                        Unreviewed
                      </span>
                    ) : (
                      <span className={styles.chipEmpty}>-</span>
                    )
                  ) : (
                    orderedCore[dim].map((id) => renderChip(dim, id))
                  )}
                </div>
              </div>
            ))}
          </div>
          {trailingSlot ? <div className={styles.trailing}>{trailingSlot}</div> : null}
        </div>
      ) : null}

      <div className={clsx(styles.searchRow, variant === 'searchOnly' && styles.searchRowFoot)}>
        <input
          ref={searchInputRef}
          type="text"
          className={clsx(styles.searchInput, variant === 'searchOnly' && styles.searchInputFoot)}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={disabled || saving}
          aria-autocomplete="list"
        />
        {variant === 'searchOnly' && trailingSlot ? <div className={styles.searchTrailing}>{trailingSlot}</div> : null}
      </div>

      {query.trim() && suggestions.length > 0 ? (
        <div className={styles.suggestions} role="listbox" aria-label="Matching tags">
          {suggestions.map((row, index) => (
            <button
              key={row.tag.docId}
              type="button"
              role="option"
              aria-selected={index === highlightIndex}
              className={clsx(styles.suggestion, index === highlightIndex && styles.suggestionActive)}
              onMouseEnter={() => setHighlightIndex(index)}
              onClick={() => void addTag(row.tag.docId as string)}
              disabled={disabled || saving}
            >
              <span className={styles.pathLine}>{row.pathLabel}</span>
            </button>
          ))}
        </div>
      ) : query.trim() && suggestions.length === 0 ? (
        <div className={styles.error}>No matching tags.</div>
      ) : null}

      {activeTagMenu ? (
        <div
          className={styles.actionMenu}
          role="menu"
          aria-label={`${tagById.get(activeTagMenu.tagId)?.name ?? activeTagMenu.tagId} actions`}
          style={{ left: activeTagMenu.left, top: activeTagMenu.top }}
        >
          {onUpdateSubjectTagId || onUpdateSubjectTagIds ? (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={subjectTagIds.includes(activeTagMenu.tagId)}
              className={clsx(
                styles.actionMenuItem,
                subjectTagIds.includes(activeTagMenu.tagId) && styles.actionMenuItemActive
              )}
              disabled={disabled || saving}
              onClick={() => void runSubjectAction(activeTagMenu.tagId)}
            >
              Subject
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={styles.actionMenuItem}
            disabled={disabled || saving}
            onClick={() => void runRemoveAction(activeTagMenu.tagId)}
          >
            Remove
          </button>
        </div>
      ) : null}

      {saveError ? <div className={styles.errorMessage}>{saveError}</div> : null}
      {tagError ? <div className={styles.errorMessage}>{tagError}</div> : null}
      {footerContent ? <div className={styles.footerContent}>{footerContent}</div> : null}
    </div>
  );
}

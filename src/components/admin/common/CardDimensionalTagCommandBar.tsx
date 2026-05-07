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

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export interface CardDimensionalTagCommandBarProps {
  /** Tag assignment only; full `Card` is accepted at call sites. */
  card: Pick<Card, 'tags'>;
  allTags: Tag[];
  onUpdateTags: (nextTagIds: string[]) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'searchOnly';
  /** e.g. full MacroTagSelector trigger, aligned to the right of the dimension chip row */
  trailingSlot?: React.ReactNode;
  /** Form-level tag validation message / outline (e.g. when full selector is hidden on card edit). */
  tagError?: string;
  /** Search field placeholder (default matches Media toolbar “Edit tags…"). */
  searchPlaceholder?: string;
  /** When true, do not render per-dimension “Who/What/…” row labels (header-only layout, e.g. card admin table). */
  hideDimensionRowLabels?: boolean;
  /** Card admin table: larger chips, tighter toolbar; use with `variant="compact"`. */
  tableEmbed?: boolean;
  /** Narrow contexts (e.g. media grid tile): smaller typeahead suggestion rows. */
  suggestionsDensity?: 'default' | 'dense';
  /** Optional unified secondary block, such as advanced tag rules. */
  footerContent?: React.ReactNode;
}

export default function CardDimensionalTagCommandBar({
  card,
  allTags,
  onUpdateTags,
  disabled = false,
  className,
  variant = 'default',
  trailingSlot,
  tagError,
  searchPlaceholder = 'Edit tags…',
  hideDimensionRowLabels = false,
  tableEmbed = false,
  suggestionsDensity = 'default',
  footerContent,
}: CardDimensionalTagCommandBarProps) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  const tagById = useMemo(() => buildTagByIdMap(allTags), [allTags]);
  const resolvedDimension = useMemo(() => buildResolvedTagDimensionMap(allTags), [allTags]);

  const currentTags = useMemo(() => card.tags ?? [], [card.tags]);
  const selectedSet = useMemo(() => new Set(currentTags), [currentTags]);

  const core = useMemo(
    () => getCoreTagsByDimensionFromTagIds(card.tags, resolvedDimension),
    [card.tags, resolvedDimension]
  );

  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    const out: { tag: Tag; pathLabel: string; dimension: TagDimension }[] = [];
    for (const tag of allTags) {
      if (!tag.docId || selectedSet.has(tag.docId)) continue;
      const dimension = resolvedDimension.get(tag.docId);
      if (!dimension) continue;
      const pathLabel = getTagPathDisplay(tag, tagById);
      if (norm(tag.name).includes(q) || norm(pathLabel).includes(q)) {
        out.push({ tag, pathLabel, dimension });
      }
    }
    out.sort((a, b) => a.pathLabel.localeCompare(b.pathLabel));
    return out.slice(0, MAX_SUGGESTIONS);
  }, [allTags, query, resolvedDimension, selectedSet, tagById]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

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
    }
  };

  return (
    <div
      className={clsx(
        styles.wrap,
        variant === 'compact' && styles.wrapCompact,
        variant === 'searchOnly' && styles.wrapSearchOnly,
        tableEmbed && styles.wrapTable,
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
                    <span className={styles.chipEmpty}>—</span>
                  ) : (
                    core[dim].map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={styles.chip}
                        disabled={disabled || saving}
                        title={`Remove ${tagById.get(id)?.name ?? id}`}
                        onClick={() => void removeTag(id)}
                      >
                        {tagById.get(id)?.name ?? id}
                        <span className={styles.chipX} aria-hidden>
                          ×
                        </span>
                      </button>
                    ))
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
              <span className={styles.dimBadge}>{DIMENSION_LABEL[row.dimension]}</span>
              <span className={styles.pathLine}>{row.pathLabel}</span>
            </button>
          ))}
        </div>
      ) : query.trim() && suggestions.length === 0 ? (
        <div className={styles.error}>No matching tags.</div>
      ) : null}

      {saveError ? <div className={styles.errorMessage}>{saveError}</div> : null}
      {tagError ? <div className={styles.errorMessage}>{tagError}</div> : null}
      {footerContent ? <div className={styles.footerContent}>{footerContent}</div> : null}
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Tag } from '@/lib/types/tag';
import type { TagDimension } from '@/lib/utils/tagDisplay';
import {
  buildResolvedTagDimensionMap,
  buildTagByIdMap,
  getTagPathDisplay,
} from '@/lib/utils/tagDimensionResolve';
import styles from './TagSearchSelect.module.css';

const MAX_RESULTS = 30;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export default function TagSearchSelect({
  allTags,
  selectedTagIds,
  value,
  onValueChange,
  onSelect,
  placeholder = 'Search tags...',
  disabled = false,
  inputClassName,
  clearClassName,
  autoFocus = false,
  allowedDimensions,
}: {
  allTags: Tag[];
  selectedTagIds: Iterable<string>;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (tagId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputClassName?: string;
  clearClassName?: string;
  autoFocus?: boolean;
  allowedDimensions?: TagDimension[];
}) {
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const selected = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const tagById = useMemo(() => buildTagByIdMap(allTags), [allTags]);
  const resolvedDimension = useMemo(
    () => buildResolvedTagDimensionMap(allTags),
    [allTags]
  );
  const results = useMemo(() => {
    const query = normalize(value);
    if (!query) return [];
    return allTags
      .filter((tag) => {
        const dimension = tag.docId ? resolvedDimension.get(tag.docId) : undefined;
        if (
          !tag.docId ||
          selected.has(tag.docId) ||
          !dimension ||
          (allowedDimensions && !allowedDimensions.includes(dimension))
        ) {
          return false;
        }
        return normalize(getTagPathDisplay(tag, tagById)).includes(query);
      })
      .map((tag) => ({
        tag,
        path: getTagPathDisplay(tag, tagById),
      }))
      .sort((a, b) => {
        const aLeaf = normalize(a.tag.name);
        const bLeaf = normalize(b.tag.name);
        const query = normalize(value);
        const aRank = aLeaf === query ? 0 : aLeaf.startsWith(query) ? 1 : 2;
        const bRank = bLeaf === query ? 0 : bLeaf.startsWith(query) ? 1 : 2;
        return aRank - bRank || a.path.localeCompare(b.path);
      })
      .slice(0, MAX_RESULTS);
  }, [allTags, allowedDimensions, resolvedDimension, selected, tagById, value]);

  useEffect(() => setHighlightIndex(-1), [value]);

  const choose = (tagId: string) => {
    onSelect(tagId);
    onValueChange('');
    setHighlightIndex(-1);
  };

  return (
    <div className={styles.root}>
      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlightIndex((index) =>
                results.length === 0 ? -1 : (index + 1) % results.length
              );
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlightIndex((index) =>
                results.length === 0
                  ? -1
                  : index <= 0
                    ? results.length - 1
                    : index - 1
              );
            } else if (event.key === 'Enter' && results.length > 0) {
              event.preventDefault();
              choose(results[highlightIndex >= 0 ? highlightIndex : 0].tag.docId as string);
            } else if (event.key === 'Escape') {
              onValueChange('');
            }
          }}
          className={clsx(styles.input, inputClassName)}
          disabled={disabled}
          autoFocus={autoFocus}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={Boolean(value.trim())}
          aria-controls="tag-search-results"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onValueChange('')}
            className={clsx(styles.clear, clearClassName)}
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null}
      </div>
      {value.trim() ? (
        <div id="tag-search-results" className={styles.results} role="listbox" aria-label="Matching tags">
          {results.length > 0 ? results.map((result, index) => (
            <button
              key={result.tag.docId}
              type="button"
              className={clsx(styles.result, index === highlightIndex && styles.resultActive)}
              role="option"
              aria-selected={index === highlightIndex}
              onMouseEnter={() => setHighlightIndex(index)}
              onClick={() => choose(result.tag.docId as string)}
            >
              {result.path}
            </button>
          )) : <div className={styles.empty}>No matching tags.</div>}
        </div>
      ) : null}
    </div>
  );
}

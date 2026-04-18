'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/card-admin/card-admin.module.css';

type Dimension = 'who' | 'what' | 'when' | 'where';

interface DimensionTagCellEditorProps {
  card: Card;
  dimension: Dimension;
  tagIds: string[];
  dimensionOptions: Tag[];
  tagNameMap: Map<string, string>;
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export default function DimensionTagCellEditor({
  card,
  dimension,
  tagIds,
  dimensionOptions,
  tagNameMap,
  onUpdateCard,
}: DimensionTagCellEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOpen]);

  const selectedSet = useMemo(() => new Set(tagIds), [tagIds]);

  const suggestions = useMemo(() => {
    const q = normalize(query);
    return dimensionOptions
      .filter((tag) => tag.docId && !selectedSet.has(tag.docId))
      .filter((tag) => {
        if (!q) return true;
        const label = normalize(tag.name);
        const path = normalize(
          [...(tag.path || []), tag.docId as string]
            .map((id) => tagNameMap.get(id))
            .filter((name): name is string => Boolean(name))
            .join(' / ')
        );
        return label.includes(q) || path.includes(q);
      })
      .slice(0, 8);
  }, [dimensionOptions, query, selectedSet, tagNameMap]);

  const saveTags = async (nextTags: string[]) => {
    setIsSaving(true);
    setError(null);
    try {
      await onUpdateCard(card.docId, { tags: nextTags });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tags');
    } finally {
      setIsSaving(false);
    }
  };

  const removeTag = async (tagId: string) => {
    const next = (card.tags || []).filter((id) => id !== tagId);
    await saveTags(next);
  };

  const addTag = async (tagId: string) => {
    if (!tagId || selectedSet.has(tagId)) return;
    const next = Array.from(new Set([...(card.tags || []), tagId]));
    await saveTags(next);
    setQuery('');
    setIsOpen(false);
  };

  const onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (suggestions.length === 0) return;
    await addTag(suggestions[0].docId as string);
  };

  return (
    <div
      ref={rootRef}
      className={styles.dimensionEditor}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles.dimensionChips}>
        {tagIds.length === 0 ? <span className={styles.dimensionEmpty}>—</span> : null}
        {tagIds.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.dimensionChip}
            onClick={() => void removeTag(id)}
            disabled={isSaving}
            title={`Remove ${tagNameMap.get(id) || id}`}
          >
            {tagNameMap.get(id) || id}
            <span className={styles.dimensionChipX} aria-hidden>
              ×
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.dimensionAddButton}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isSaving}
      >
        + Add
      </button>

      {isOpen ? (
        <div className={styles.dimensionPicker}>
          <input
            type="text"
            className={styles.dimensionPickerInput}
            placeholder={`Add ${dimension} tag...`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            disabled={isSaving}
            autoFocus
          />
          <div className={styles.dimensionSuggestionList}>
            {suggestions.length === 0 ? (
              <div className={styles.dimensionSuggestionEmpty}>No matches</div>
            ) : (
              suggestions.map((tag) => (
                <button
                  key={tag.docId}
                  type="button"
                  className={styles.dimensionSuggestionItem}
                  onClick={() => void addTag(tag.docId as string)}
                  disabled={isSaving}
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {error ? <div className={styles.dimensionError}>{error}</div> : null}
    </div>
  );
}

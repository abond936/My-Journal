'use client';

import React, { useMemo, useState } from 'react';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import styles from './InlineTagEditor.module.css';

interface InlineTagEditorProps {
  card: Card;
  allTags: Tag[];
  onUpdateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export default function InlineTagEditor({ card, allTags, onUpdateCard }: InlineTagEditorProps) {
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTags, setPendingTags] = useState<string[] | null>(null);

  const activeTags = pendingTags ?? (card.tags || []);
  const selectedSet = useMemo(() => new Set(activeTags), [activeTags]);

  const byId = useMemo(
    () => new Map(allTags.filter((tag) => tag.docId).map((tag) => [tag.docId as string, tag])),
    [allTags]
  );

  const getPathLabel = (tag: Tag): string => {
    if (!tag.docId) return tag.name;
    const ids = [...(tag.path || []), tag.docId];
    const names = ids
      .map((id) => byId.get(id)?.name)
      .filter((name): name is string => Boolean(name));
    return names.length ? names.join(' / ') : tag.name;
  };

  const suggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    const unselected = allTags.filter((tag) => tag.docId && !selectedSet.has(tag.docId));
    return unselected
      .map((tag) => ({
        tag,
        pathLabel: getPathLabel(tag),
      }))
      .filter(({ tag, pathLabel }) => {
        return normalize(tag.name).includes(q) || normalize(pathLabel).includes(q);
      })
      .slice(0, 8);
  }, [allTags, query, selectedSet]);

  const save = async (nextTags: string[]) => {
    setIsSaving(true);
    setError(null);
    setPendingTags(nextTags);
    try {
      await onUpdateCard(card.docId, { tags: nextTags });
    } catch (err) {
      setPendingTags(null);
      setError(err instanceof Error ? err.message : 'Failed to update tags');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = async (tagId: string) => {
    if (!tagId || selectedSet.has(tagId)) return;
    const nextTags = [...activeTags, tagId];
    await save(nextTags);
    setQuery('');
  };

  const removeTag = async (tagId: string) => {
    const nextTags = activeTags.filter((id) => id !== tagId);
    await save(nextTags);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (suggestions.length > 0) {
      await addTag(suggestions[0].tag.docId as string);
    }
  };

  return (
    <div className={styles.editor} onClick={(event) => event.stopPropagation()}>
      <div className={styles.chips}>
        {activeTags.map((tagId) => {
          const tag = byId.get(tagId);
          if (!tag) return null;
          return (
            <button
              key={tagId}
              type="button"
              className={styles.chip}
              onClick={() => void removeTag(tagId)}
              disabled={isSaving}
              title={`Remove ${getPathLabel(tag)}`}
            >
              {tag.name} <span aria-hidden>×</span>
            </button>
          );
        })}
      </div>

      <input
        type="text"
        className={styles.input}
        placeholder="Add tag..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={isSaving}
      />

      {query.trim() && suggestions.length > 0 ? (
        <div className={styles.suggestions}>
          {suggestions.map(({ tag, pathLabel }) => (
            <button
              key={tag.docId}
              type="button"
              className={styles.suggestion}
              onClick={() => void addTag(tag.docId as string)}
              disabled={isSaving}
              title={pathLabel}
            >
              {pathLabel}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { Tag } from '@/lib/types/tag';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { suggestExistingCardTags, type CardTagSuggestion } from '@/lib/utils/cardTagSuggestions';
import styles from './CardTextTagSuggestions.module.css';

type SuggestionSource = { title: string; subtitle?: string | null; content?: string | null };

export default function CardTextTagSuggestions({
  allTags,
  selectedTagIds,
  getSource,
  onAccept,
  disabled = false,
}: {
  allTags: Tag[];
  selectedTagIds: string[];
  getSource: () => SuggestionSource;
  onAccept: (tagId: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<CardTagSuggestion[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const selectedKey = selectedTagIds.join('|');
  const visibleSuggestions = useMemo(
    () => suggestions?.filter((suggestion) => !selectedTagIds.includes(suggestion.tagId)) ?? null,
    // selectedKey intentionally makes an in-place assignment change remove an accepted suggestion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedKey, suggestions]
  );

  const findSuggestions = () => {
    const source = getSource();
    setSuggestions(suggestExistingCardTags({ ...source, allTags, selectedTagIds }));
  };

  const accept = async (suggestion: CardTagSuggestion) => {
    setSavingId(suggestion.tagId);
    try {
      await onAccept(suggestion.tagId);
      setSuggestions((current) => current?.filter((item) => item.tagId !== suggestion.tagId) ?? null);
    } finally {
      setSavingId(null);
    }
  };

  const grouped = visibleSuggestions
    ? Object.fromEntries(DIMENSION_ORDER.map((dimension) => [
        dimension,
        visibleSuggestions.filter((suggestion) => suggestion.dimension === dimension),
      ])) as Record<TagDimension, CardTagSuggestion[]>
    : null;

  return (
    <div className={styles.root}>
      <button type="button" className={styles.suggestButton} disabled={disabled || savingId !== null} onClick={findSuggestions}>
        Suggest existing Tags from this Card
      </button>
      {grouped ? (
        visibleSuggestions?.length ? (
          <div className={styles.results} aria-label="Suggested existing Tags">
            <p>Review each match. Nothing is assigned until you choose Add.</p>
            {DIMENSION_ORDER.map((dimension) => grouped[dimension].length ? (
              <div key={dimension} className={styles.dimensionGroup}>
                <strong>{DIMENSION_LABEL[dimension]}</strong>
                <ul>
                  {grouped[dimension].map((suggestion) => (
                    <li key={suggestion.tagId}>
                      <span>{suggestion.pathLabel} <small>matched {suggestion.evidence}</small></span>
                      <button
                        type="button"
                        disabled={disabled || savingId !== null}
                        onClick={() => void accept(suggestion)}
                        aria-label={`Add ${suggestion.pathLabel}`}
                      >
                        {savingId === suggestion.tagId ? 'Adding...' : 'Add'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null)}
          </div>
        ) : <p className={styles.empty}>No unassigned existing Tag names were found in this Card&apos;s words.</p>
      ) : null}
    </div>
  );
}

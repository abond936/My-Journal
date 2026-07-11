'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { useTag } from '@/components/providers/TagProvider';
import { resolveFeedTileDirectTagIds } from '@/lib/reader/readerFeedPresentation';
import { buildFeedTileDimensionSlots } from '@/lib/utils/readerCardContext';
import { DIMENSION_LABEL } from '@/lib/utils/tagDisplay';
import styles from './FeedTileChipStrip.module.css';

interface FeedTileChipStripProps {
  card: Card;
  /** When provided (admin grid), skip TagProvider lookup. */
  allTags?: Tag[];
  className?: string;
}

/** Fixed four-slot bottom tag row for square feed tiles (Who | What | When | Where). */
export default function FeedTileChipStrip({ card, allTags: allTagsOverride, className }: FeedTileChipStripProps) {
  const { tags: contextTags, loading: tagsLoading } = useTag();
  const allTags = allTagsOverride ?? contextTags;
  const tagsLoadingEffective = allTagsOverride ? false : tagsLoading;

  const slots = useMemo(() => {
    if (tagsLoadingEffective) {
      return buildFeedTileDimensionSlots({ tags: [] }, []);
    }
    return buildFeedTileDimensionSlots(
      { tags: resolveFeedTileDirectTagIds(card) },
      allTags
    );
  }, [allTags, card, tagsLoadingEffective]);

  return (
    <div className={clsx(styles.feedTileChipStrip, className)}>
      <div className={styles.feedTileChipStripRow}>
        {slots.map((slot) => {
          const empty = !slot.label;
          const ariaLabel = empty
            ? `${DIMENSION_LABEL[slot.dimension]}: empty`
            : `${DIMENSION_LABEL[slot.dimension]}: ${slot.label}`;
          return (
            <span
              key={slot.dimension}
              className={clsx(styles.slot, empty && styles.slotEmpty)}
              data-dimension={slot.dimension}
              aria-label={ariaLabel}
              title={empty ? undefined : slot.label}
            >
              {empty ? '-' : slot.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

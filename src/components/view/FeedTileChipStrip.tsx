'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { useTag } from '@/components/providers/TagProvider';
import { resolveFeedTileDirectTagIds } from '@/lib/reader/readerFeedPresentation';
import { buildFeedTileDimensionSlots } from '@/lib/utils/readerCardContext';
import { DIMENSION_LABEL } from '@/lib/utils/tagDisplay';
import { formatTemporalValue, formatTemporalValueLong } from '@/lib/utils/temporalValue';
import { formatDimensionResolution } from '@/lib/utils/dimensionReview';
import styles from './FeedTileChipStrip.module.css';

interface FeedTileChipStripProps {
  card: Card;
  /** When provided (admin grid), skip TagProvider lookup. */
  allTags?: Tag[];
  /** Compact but readable treatment for narrow discovery rails. */
  compact?: boolean;
  className?: string;
}

/** Fixed four-slot bottom tag row for square feed tiles (Who | What | When | Where). */
export default function FeedTileChipStrip({ card, allTags: allTagsOverride, compact = false, className }: FeedTileChipStripProps) {
  const { tags: contextTags, loading: tagsLoading } = useTag();
  const allTags = allTagsOverride ?? contextTags;
  const tagsLoadingEffective = allTagsOverride ? false : tagsLoading;

  const slots = useMemo(() => {
    if (tagsLoadingEffective) {
      return buildFeedTileDimensionSlots({ tags: [] }, []);
    }
    return buildFeedTileDimensionSlots(
      {
        tags: resolveFeedTileDirectTagIds(card),
        subjectTagId: card.subjectTagId,
        subjectTagIds: card.subjectTagIds,
      },
      allTags
    );
  }, [allTags, card, tagsLoadingEffective]);

  return (
    <div className={clsx(styles.feedTileChipStrip, compact && styles.compact, className)}>
      <div className={styles.feedTileChipStripRow}>
        {slots.map((slot) => {
          const resolutionLabel = formatDimensionResolution(
            card.dimensionReview?.[slot.dimension]
          );
          const structuredWhen = slot.dimension === 'when'
            ? card.galleryTemporalRollupStatus === 'unreviewed'
              ? 'Unreviewed'
              : card.temporal
                ? formatTemporalValue(card.temporal)
                : null
            : null;
          const displayLabel = resolutionLabel ?? structuredWhen ?? slot.label;
          const empty = !displayLabel;
          const ariaLabel = empty
            ? `${DIMENSION_LABEL[slot.dimension]}: empty`
            : `${DIMENSION_LABEL[slot.dimension]}: ${
                slot.dimension === 'when' && card.galleryTemporalRollupStatus === 'unreviewed'
                  ? 'Gallery dates conflict and require review'
                  : slot.dimension === 'when' && card.temporal
                  ? formatTemporalValueLong(card.temporal)
                  : displayLabel
              }`;
          return (
            <span
              key={slot.dimension}
              className={clsx(styles.slot, empty && styles.slotEmpty)}
              data-dimension={slot.dimension}
              aria-label={ariaLabel}
              title={empty
                ? undefined
                : slot.dimension === 'when' && card.galleryTemporalRollupStatus === 'unreviewed'
                  ? 'Gallery dates conflict and require an explicit Card date'
                  : slot.dimension === 'when' && card.temporal
                  ? formatTemporalValueLong(card.temporal)
                  : slot.tooltip ?? displayLabel}
            >
              {empty ? '-' : displayLabel}
            </span>
          );
        })}
      </div>
    </div>
  );
}

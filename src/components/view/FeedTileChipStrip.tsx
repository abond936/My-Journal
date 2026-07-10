'use client';

import React, { useMemo } from 'react';
import { Card } from '@/lib/types/card';
import { useTag } from '@/components/providers/TagProvider';
import { resolveFeedTileDirectTagIds } from '@/lib/reader/readerFeedPresentation';
import { buildReaderCardPresentation } from '@/lib/utils/readerCardContext';
import ReaderCardContextMeta from '@/components/view/ReaderCardContextMeta';
import styles from './FeedTileChipStrip.module.css';

interface FeedTileChipStripProps {
  card: Card;
}

/** Fixed-height bottom tag row for square feed tiles; spacer when no tags resolve. */
export default function FeedTileChipStrip({ card }: FeedTileChipStripProps) {
  const { tags: allTags, loading: tagsLoading } = useTag();
  const chips = useMemo(() => {
    if (tagsLoading || allTags.length === 0) return [];
    return buildReaderCardPresentation(
      { ...card, tags: resolveFeedTileDirectTagIds(card) },
      allTags
    ).chips;
  }, [allTags, card, tagsLoading]);

  return (
    <div className={styles.feedTileChipStrip}>
      {chips.length > 0 ? (
        <ReaderCardContextMeta badgeLabel={null} chips={chips} variant="feed" />
      ) : (
        <div className={styles.feedTileChipStripSpacer} aria-hidden="true" />
      )}
    </div>
  );
}

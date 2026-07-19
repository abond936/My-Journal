'use client';

import React, { useMemo } from 'react';
import V2ContentCard from '@/components/view/V2ContentCard';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import styles from './ComposeFeedTilePreview.module.css';

interface ComposeFeedTilePreviewProps {
  card: Card;
  allTags: Tag[];
  /** Live Compose cover crop while focal controls move. */
  coverObjectPosition?: string;
  onQuestionRevealFitChange?: (fits: boolean) => void;
  onCalloutFitChange?: (fits: boolean) => void;
}

/** Live noninteractive Reader presentation for the current unsaved Compose card. */
export default function ComposeFeedTilePreview({
  card,
  allTags,
  coverObjectPosition,
  onQuestionRevealFitChange,
  onCalloutFitChange,
}: ComposeFeedTilePreviewProps) {
  const previewCard = useMemo(
    (): Card => ({
      ...card,
      docId: card.docId ?? 'compose-reader-preview',
      status: card.status ?? 'draft',
      title: card.title?.trim() ? card.title : 'Untitled',
    }),
    [card]
  );

  return (
    <div
      className={styles.composeFeedTilePreview}
      data-testid="compose-feed-tile-preview"
      data-preview-tag-count={allTags.length}
    >
      <V2ContentCard
        card={previewCard}
        size="medium"
        fullWidth
        previewOnly
        previewCoverObjectPosition={coverObjectPosition}
        onQuestionRevealFitChange={onQuestionRevealFitChange}
        onCalloutFitChange={onCalloutFitChange}
      />
    </div>
  );
}

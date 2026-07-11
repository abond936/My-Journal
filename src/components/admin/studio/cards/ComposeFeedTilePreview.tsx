'use client';

import React, { useMemo } from 'react';
import AdminClosedCardTileShell from '@/components/admin/studio/cards/AdminClosedCardTileShell';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import { usesSquareFeedTile } from '@/lib/reader/readerFeedPresentation';
import {
  getPreviewObjectFit,
  getPreviewObjectPosition,
  previewImage,
  shouldRenderUtilityPreviewInCover,
} from '@/components/admin/studio/cards/closedCardTilePreviewUtils';
import styles from './ComposeFeedTilePreview.module.css';

interface ComposeFeedTilePreviewProps {
  card: Card;
  allTags: Tag[];
  /** Live closed-feed cover crop for Compose sliders (1:1 band math). */
  coverObjectPosition?: string;
}

/** Closed feed tile preview for Compose; uses the same shell as Studio Cards grid and reader tiles. */
export default function ComposeFeedTilePreview({
  card,
  allTags,
  coverObjectPosition,
}: ComposeFeedTilePreviewProps) {
  const displayMode = normalizeDisplayModeForType(card.type ?? 'story', card.displayMode);
  const eligible = usesSquareFeedTile(card.type ?? 'story', displayMode);

  const previewCard = useMemo(
    (): Card => ({
      ...card,
      docId: card.docId ?? 'compose-feed-preview',
      status: card.status ?? 'draft',
      title: card.title?.trim() ? card.title : 'Untitled',
    }),
    [card]
  );

  if (!eligible) {
    return null;
  }

  const preview = previewImage(previewCard);
  const previewObjectFit = getPreviewObjectFit(previewCard, preview);
  const previewObjectPosition =
    coverObjectPosition ?? getPreviewObjectPosition(previewCard, preview);

  return (
    <div className={styles.composeFeedTilePreview} data-testid="compose-feed-tile-preview">
      <AdminClosedCardTileShell
        card={previewCard}
        allTags={allTags}
        preview={preview}
        previewObjectFit={previewObjectFit}
        previewObjectPosition={previewObjectPosition}
        renderUtilityPreview={shouldRenderUtilityPreviewInCover(previewCard, preview)}
        pendingFocus={false}
        onCoverClick={() => {}}
        thumbnailTooltip={previewCard.title || 'Untitled'}
        imageSizes="(max-width: 768px) 100vw, 300px"
      />
    </div>
  );
}

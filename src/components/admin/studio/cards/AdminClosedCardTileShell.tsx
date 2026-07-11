'use client';

import React from 'react';
import JournalImage from '@/components/common/JournalImage';
import FeedTileChipStrip from '@/components/view/FeedTileChipStrip';
import UtilityCardPreview from '@/components/admin/studio/cards/UtilityCardPreview';
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import styles from './AdminClosedCardTileShell.module.css';

export type AdminClosedCardTileShellProps = {
  card: Card;
  allTags: Tag[];
  preview: Card['coverImage'];
  previewObjectFit: 'cover' | 'contain';
  previewObjectPosition: string;
  renderUtilityPreview: boolean;
  pendingFocus: boolean;
  overlayCoverBottom?: React.ReactNode;
  onCoverClick: (e: React.MouseEvent) => void;
  thumbnailTooltip: string;
  imageSizes: string;
};

/** Reader-parity 1:1 closed tile: cover band, title band, four-slot chip row. */
export default function AdminClosedCardTileShell({
  card,
  allTags,
  preview,
  previewObjectFit,
  previewObjectPosition,
  renderUtilityPreview,
  pendingFocus,
  overlayCoverBottom,
  onCoverClick,
  thumbnailTooltip,
  imageSizes,
}: AdminClosedCardTileShellProps) {
  return (
    <div className={styles.closedTileShell}>
      <div
        className={styles.closedTileCoverBand}
        title={thumbnailTooltip}
        onClick={onCoverClick}
      >
        <div className={styles.closedTileCoverScrim} aria-hidden />
        {renderUtilityPreview ? (
          <div className={styles.closedTileUtilityWrap}>
            <UtilityCardPreview card={card} />
          </div>
        ) : preview ? (
          <JournalImage
            src={getStudioDisplayUrl(preview)}
            alt={card.title || 'Cover'}
            fill
            className={styles.closedTileCoverImage}
            style={{ objectFit: previewObjectFit, objectPosition: previewObjectPosition }}
            sizes={imageSizes}
          />
        ) : (
          <div className={styles.noCover}>No cover</div>
        )}
        {overlayCoverBottom ? (
          <div className={styles.closedTileCoverOverlay}>{overlayCoverBottom}</div>
        ) : null}
        {pendingFocus ? (
          <div className={styles.pendingThumbOverlay} aria-hidden="true">
            <div className={styles.pendingThumbSpinner} />
            <span className={styles.pendingThumbLabel}>Opening...</span>
          </div>
        ) : null}
      </div>
      <div className={styles.closedTileTitle} title={card.title}>
        {card.title || 'Untitled'}
      </div>
      <FeedTileChipStrip card={card} allTags={allTags} />
    </div>
  );
}

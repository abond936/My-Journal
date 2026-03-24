'use client';

import React from 'react';
import JournalImage from '@/components/common/JournalImage';
import { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './MediaAdminGrid.module.css';

interface MediaAdminGridCellProps {
  media: Media;
  isSelected: boolean;
  onToggleSelection: () => void;
}

function MediaAdminGridCell({ media, isSelected, onToggleSelection }: MediaAdminGridCellProps) {
  return (
    <div
      className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(`.${styles.checkboxWrap}`)) return;
        onToggleSelection();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSelection();
        }
      }}
    >
      <div className={styles.checkboxWrap} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          aria-label={`Select ${media.filename}`}
        />
      </div>
      <div className={styles.thumbnailWrap}>
        <JournalImage
          src={getDisplayUrl(media)}
          alt={media.filename}
          fill
          className={styles.thumbnail}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
        />
        {media.caption && (
          <div className={styles.captionOverlay} title={media.caption}>
            {media.caption}
          </div>
        )}
      </div>
      <div className={styles.filename} title={media.filename}>
        {media.filename}
      </div>
    </div>
  );
}

export default function MediaAdminGrid() {
  const { media, selectedMediaIds, toggleMediaSelection, selectAll, selectNone } = useMedia();

  return (
    <div className={styles.container}>
      {media.length > 0 && (
        <div className={styles.selectAllRow}>
          <input
            type="checkbox"
            checked={selectedMediaIds.length === media.length}
            onChange={(e) => (e.target.checked ? selectAll() : selectNone())}
            aria-label="Select all on page"
          />
          <span className={styles.selectAllLabel}>Select all on page</span>
        </div>
      )}
      <div className={styles.grid}>
        {media.map((item) => (
          <MediaAdminGridCell
            key={item.docId}
            media={item}
            isSelected={selectedMediaIds.includes(item.docId)}
            onToggleSelection={() => toggleMediaSelection(item.docId)}
          />
        ))}
      </div>
      {media.length === 0 && (
        <div className={styles.emptyState}>
          <p>No media found matching the current filters.</p>
        </div>
      )}
    </div>
  );
}

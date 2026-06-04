'use client';

import React, { useEffect, useState } from 'react';
import JournalImage from '@/components/common/JournalImage';
import type { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import { parseObjectPositionToPercents } from '@/lib/utils/parseObjectPositionPercent';
import styles from './GalleryItemEditor.module.css';

export default function GalleryItemEditor({
  item,
  onSave,
  children,
  saveLabel = 'Save changes',
}: {
  item: HydratedGalleryMediaItem;
  onSave: (updatedItem: HydratedGalleryMediaItem) => void | Promise<void>;
  children?: React.ReactNode;
  saveLabel?: string;
}) {
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [hasFocalOverride, setHasFocalOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const inherited = parseObjectPositionToPercents(item.media?.objectPosition);
    const stored = item.objectPosition?.trim();
    if (stored) {
      setHasFocalOverride(true);
      const { horizontal, vertical } = parseObjectPositionToPercents(item.objectPosition);
      setHorizontalPosition(horizontal);
      setVerticalPosition(vertical);
    } else {
      setHasFocalOverride(false);
      setHorizontalPosition(inherited.horizontal);
      setVerticalPosition(inherited.vertical);
    }
  }, [item]);

  const objectPosition = `${horizontalPosition}% ${verticalPosition}%`;

  const handleResetFocalToMediaDefault = () => {
    setHasFocalOverride(false);
    const { horizontal, vertical } = parseObjectPositionToPercents(item.media?.objectPosition);
    setHorizontalPosition(horizontal);
    setVerticalPosition(vertical);
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      const nextItem = { ...item };
      if (hasFocalOverride) {
        nextItem.objectPosition = objectPosition;
      } else {
        delete nextItem.objectPosition;
      }
      await onSave(nextItem);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.editor}>
      {item.media ? (
        <div className={styles.previewFrame}>
          <JournalImage
            src={getStudioDisplayUrl(item.media)}
            alt={item.media.caption || item.media.filename || ''}
            width={520}
            height={380}
            className={styles.previewImage}
            sizes="(max-width: 900px) 90vw, 520px"
            style={{ objectFit: 'cover', objectPosition }}
            priority={false}
          />
        </div>
      ) : null}

      <div className={styles.intentCard}>
        <div className={styles.intentTitle}>Gallery crop override</div>
        <p className={styles.intentBody}>
          Use the image&apos;s Studio Media focal point by default. Adjusting these sliders creates a crop override for this image in this gallery only.
        </p>
        <p className={styles.intentBody}>
          Captions stay outside this modal: change the media default in Studio Media or use the inline gallery caption field for a card-only exception.
        </p>
      </div>

      <div className={styles.sliderCard}>
        <div className={styles.sliderRow}>
          <div className={styles.sliderHeader}>
            <label htmlFor="gallery-focal-h">Horizontal</label>
            <span className={styles.sliderValue}>{Math.round(horizontalPosition)}%</span>
          </div>
          <input
            id="gallery-focal-h"
            type="range"
            min={0}
            max={100}
            value={horizontalPosition}
            onChange={(e) => {
              setHasFocalOverride(true);
              setHorizontalPosition(Number(e.target.value));
            }}
            className={styles.slider}
          />
        </div>
        <div className={styles.sliderRow}>
          <div className={styles.sliderHeader}>
            <label htmlFor="gallery-focal-v">Vertical</label>
            <span className={styles.sliderValue}>{Math.round(verticalPosition)}%</span>
          </div>
          <input
            id="gallery-focal-v"
            type="range"
            min={0}
            max={100}
            value={verticalPosition}
            onChange={(e) => {
              setHasFocalOverride(true);
              setVerticalPosition(Number(e.target.value));
            }}
            className={styles.slider}
          />
        </div>
      </div>

      {children}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleResetFocalToMediaDefault}
          disabled={!hasFocalOverride || saving}
        >
          Use media default crop
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            void handleSaveClick();
          }}
          disabled={saving}
        >
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import JournalImage from '@/components/common/JournalImage';
import EditModal from '@/components/admin/card-admin/EditModal';
import { useCardForm } from '@/components/providers/CardFormProvider';
import type { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import {
  StudioDropZone,
  StudioGallerySortableRow,
} from '@/components/admin/studio/studioRelationshipDndPrimitives';
import { gallerySlotHasCaptionOverride } from '@/lib/utils/galleryObjectPosition';
import { parseObjectPositionToPercents } from '@/lib/utils/parseObjectPositionPercent';
import styles from './StudioWorkspace.module.css';

function applySlotCaptionEdit(item: HydratedGalleryMediaItem, newText: string): HydratedGalleryMediaItem {
  const mediaDefault = item.media?.caption ?? '';
  if (newText === mediaDefault) {
    if (!gallerySlotHasCaptionOverride(item)) return item;
    const rest = { ...item };
    delete rest.caption;
    return rest;
  }
  return { ...item, caption: newText };
}

function cardCaptionFieldValue(item: HydratedGalleryMediaItem): string {
  return gallerySlotHasCaptionOverride(item) ? (item.caption ?? '') : '';
}

export default function StudioCardFormGallery({
  disabled,
  onSetAsCover,
  currentCoverMediaId,
}: {
  disabled: boolean;
  onSetAsCover: (item: HydratedGalleryMediaItem) => void;
  currentCoverMediaId: string | null;
}) {
  const { formState, setField } = useCardForm();
  const gallery = useMemo(
    () => ((formState.cardData.galleryMedia || []) as HydratedGalleryMediaItem[]),
    [formState.cardData.galleryMedia]
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const editingItem = useMemo(
    () => gallery.find((item) => item.mediaId === editingItemId) ?? null,
    [editingItemId, gallery]
  );

  const updateGalleryItem = useCallback(
    (mediaId: string, updater: (item: HydratedGalleryMediaItem) => HydratedGalleryMediaItem) => {
      setField(
        'galleryMedia',
        gallery.map((item) => (item.mediaId === mediaId ? updater(item) : item))
      );
    },
    [gallery, setField]
  );

  const removeFromGallery = useCallback(
    (item: HydratedGalleryMediaItem) => {
      setField(
        'galleryMedia',
        gallery.filter((g) => !(g.mediaId === item.mediaId && g.order === item.order))
      );
      if (editingItemId === item.mediaId) setEditingItemId(null);
    },
    [editingItemId, gallery, setField]
  );

  const saveGalleryItemOverrides = useCallback(
    (updatedItem: HydratedGalleryMediaItem) => {
      setField(
        'galleryMedia',
        gallery.map((item) => (item.mediaId === updatedItem.mediaId ? updatedItem : item))
      );
      setEditingItemId(null);
    },
    [gallery, setField]
  );

  return (
    <div>
      <h4 className={styles.studioFormSectionTitle}>Gallery</h4>
      {gallery.length ? (
        <StudioDropZone
          id="drop:gallery"
          accepts={['source']}
          ariaLabel="Gallery drop target: drop source media here to append"
          className={styles.studioGalleryDropZone}
          eligibleHint="Release here to add to the gallery"
        >
          <div className={styles.studioGalleryStrip}>
            {gallery.map((item) => (
              <StudioGallerySortableRow
                key={`${item.mediaId}-${item.order}`}
                id={`gallery:${item.mediaId}:${item.order}`}
                galleryFocusMediaId={item.mediaId}
              >
                <div className={styles.studioGalleryCard}>
                  <div className={styles.studioGalleryThumbWrap}>
                    {item.media ? (
                      <JournalImage
                        src={getDisplayUrl(item.media)}
                        alt={item.caption || item.media.filename || 'Gallery image'}
                        width={220}
                        height={168}
                        className={styles.studioGalleryThumb}
                        sizes="220px"
                        style={{ objectPosition: item.objectPosition || item.media.objectPosition || '50% 50%' }}
                      />
                    ) : (
                      <div className={styles.mediaThumbFallback}>No thumb</div>
                    )}
                  </div>
                  <div className={styles.studioGalleryCaptionBlock}>
                    {item.media?.caption?.trim() ? (
                      <p className={styles.studioGalleryMediaCaption}>{item.media.caption}</p>
                    ) : null}
                    <textarea
                      className={styles.studioGalleryCaptionInput}
                      rows={2}
                      value={cardCaptionFieldValue(item)}
                      onChange={(e) => updateGalleryItem(item.mediaId, (current) => applySlotCaptionEdit(current, e.target.value))}
                      placeholder="Card caption…"
                      disabled={disabled}
                    />
                  </div>
                  <div className={styles.studioGalleryActions}>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      disabled={disabled || item.mediaId === currentCoverMediaId}
                      onClick={() => onSetAsCover(item)}
                    >
                      {item.mediaId === currentCoverMediaId ? 'Cover' : 'Set cover'}
                    </button>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      disabled={disabled}
                      onClick={() => setEditingItemId(item.mediaId)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      disabled={disabled}
                      onClick={() => removeFromGallery(item)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </StudioGallerySortableRow>
            ))}
          </div>
        </StudioDropZone>
      ) : (
        <StudioDropZone
          id="drop:gallery"
          accepts={['source']}
          ariaLabel="Gallery drop target: drop source media here to add first gallery item"
          className={styles.studioGalleryDropZone}
          eligibleHint="Release here to start the gallery"
        >
          <p className={styles.metaMuted}>No gallery media assigned.</p>
        </StudioDropZone>
      )}

      <EditModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItemId(null)}
        title={editingItem?.media?.filename ? `Edit: ${editingItem.media.filename}` : 'Edit gallery image'}
        size="wide"
      >
        {editingItem ? (
          <StudioGalleryItemEditor item={editingItem} onSave={saveGalleryItemOverrides} />
        ) : null}
      </EditModal>
    </div>
  );
}

function StudioGalleryItemEditor({
  item,
  onSave,
}: {
  item: HydratedGalleryMediaItem;
  onSave: (item: HydratedGalleryMediaItem) => void;
}) {
  const [caption, setCaption] = useState('');
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [hasFocalOverride, setHasFocalOverride] = useState(false);
  const [hasCaptionOverride, setHasCaptionOverride] = useState(false);

  useEffect(() => {
    const capOverride = gallerySlotHasCaptionOverride(item);
    setHasCaptionOverride(capOverride);
    setCaption(capOverride ? (item.caption ?? '') : (item.media?.caption ?? ''));

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

  const handleResetCaptionToMediaDefault = () => {
    setHasCaptionOverride(false);
    setCaption(item.media?.caption ?? '');
  };

  return (
    <div className={styles.studioGalleryEditor}>
      {item.media ? (
        <div className={styles.studioGalleryEditorPreview}>
          <JournalImage
            src={getDisplayUrl(item.media)}
            alt=""
            width={520}
            height={380}
            className={styles.studioGalleryEditorPreviewImage}
            sizes="(max-width: 900px) 90vw, 520px"
            style={{ objectFit: 'cover', objectPosition }}
          />
        </div>
      ) : null}
      <div className={styles.editFieldGroup}>
        <label htmlFor="studio-gallery-caption">Caption</label>
        <textarea
          id="studio-gallery-caption"
          value={caption}
          onChange={(e) => {
            setHasCaptionOverride(true);
            setCaption(e.target.value);
          }}
          className={styles.editTextarea}
          rows={3}
          placeholder="Optional caption for this slot on the card"
        />
      </div>
      <div className={styles.editFieldGroup}>
        <label htmlFor="studio-gallery-focal-h">Horizontal</label>
        <input
          id="studio-gallery-focal-h"
          type="range"
          min={0}
          max={100}
          value={horizontalPosition}
          onChange={(e) => {
            setHasFocalOverride(true);
            setHorizontalPosition(Number(e.target.value));
          }}
        />
      </div>
      <div className={styles.editFieldGroup}>
        <label htmlFor="studio-gallery-focal-v">Vertical</label>
        <input
          id="studio-gallery-focal-v"
          type="range"
          min={0}
          max={100}
          value={verticalPosition}
          onChange={(e) => {
            setHasFocalOverride(true);
            setVerticalPosition(Number(e.target.value));
          }}
        />
      </div>
      <div className={styles.studioGalleryEditorActions}>
        <button type="button" className={styles.inlineActionButton} onClick={handleResetCaptionToMediaDefault}>
          Use media caption
        </button>
        <button type="button" className={styles.inlineActionButton} onClick={handleResetFocalToMediaDefault}>
          Use media focal
        </button>
        <button
          type="button"
          className={styles.inlineActionButton}
          onClick={() => {
            const rest = { ...item };
            delete rest.objectPosition;
            delete rest.caption;
            onSave({
              ...rest,
              ...(hasCaptionOverride ? { caption } : {}),
              ...(hasFocalOverride ? { objectPosition } : {}),
            });
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

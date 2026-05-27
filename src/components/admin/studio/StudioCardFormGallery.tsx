'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageIcon, ImageUp, Pencil, Save, Trash2 } from 'lucide-react';
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

function shouldShowInlineCardCaptionInput(item: HydratedGalleryMediaItem): boolean {
  return gallerySlotHasCaptionOverride(item) || !(item.media?.caption?.trim());
}

export default function StudioCardFormGallery({
  disabled,
  onSetAsCover,
  currentCoverMediaId,
  onOpenMediaEditor,
}: {
  disabled: boolean;
  onSetAsCover: (item: HydratedGalleryMediaItem) => void;
  currentCoverMediaId: string | null;
  onOpenMediaEditor?: (mediaId: string) => void;
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
          <div className={styles.studioAppendDropHeader}>
            <span className={styles.studioAppendDropTitle}>Append media to Gallery</span>
            <span className={styles.studioAppendDropHint}>Drop anywhere in this panel to add the image at the end.</span>
          </div>
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
                        width={180}
                        height={132}
                        className={styles.studioGalleryThumb}
                        sizes="180px"
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
                    {shouldShowInlineCardCaptionInput(item) ? (
                      <textarea
                        className={styles.studioGalleryCaptionInput}
                        rows={2}
                        value={cardCaptionFieldValue(item)}
                        onChange={(e) =>
                          updateGalleryItem(item.mediaId, (current) =>
                            applySlotCaptionEdit(current, e.target.value)
                          )
                        }
                        placeholder="Card caption..."
                        disabled={disabled}
                      />
                    ) : null}
                  </div>
                  <div className={styles.studioGalleryActions}>
                    {onOpenMediaEditor ? (
                      <button
                        type="button"
                        className={`${styles.inlineActionButton} ${styles.inlineActionIconButton}`}
                        disabled={disabled}
                        onClick={() => onOpenMediaEditor(item.mediaId)}
                        aria-label="Open gallery image in media editor"
                        title="Open gallery image in media editor"
                      >
                        <ImageIcon size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`${styles.inlineActionButton} ${styles.inlineActionIconButton}`}
                      disabled={disabled || item.mediaId === currentCoverMediaId}
                      onClick={() => onSetAsCover(item)}
                      aria-label={item.mediaId === currentCoverMediaId ? 'Current cover image' : 'Set as cover image'}
                      title={item.mediaId === currentCoverMediaId ? 'Current cover image' : 'Set as cover image'}
                    >
                      <ImageUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${styles.inlineActionButton} ${styles.inlineActionIconButton}`}
                      disabled={disabled}
                      onClick={() => setEditingItemId(item.mediaId)}
                      aria-label="Edit gallery item"
                      title="Edit gallery item"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${styles.inlineActionButton} ${styles.inlineActionIconButton}`}
                      disabled={disabled}
                      onClick={() => removeFromGallery(item)}
                      aria-label="Remove from gallery"
                      title="Remove from gallery"
                    >
                      <Trash2 size={16} aria-hidden="true" />
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
          <div className={styles.studioAppendDropEmptyState}>
            <span className={styles.studioAppendDropTitle}>Append media to Gallery</span>
            <span className={styles.studioAppendDropHint}>Drop here to start the gallery.</span>
            <p className={styles.metaMuted}>No gallery media assigned.</p>
          </div>
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
          aria-label="Save gallery item changes"
          title="Save gallery item changes"
        >
          <Save size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

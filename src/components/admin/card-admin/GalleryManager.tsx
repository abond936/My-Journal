'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import JournalImage from '@/components/common/JournalImage';
import { useTag } from '@/components/providers/TagProvider';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { GalleryMediaItem, HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import styles from './GalleryManager.module.css';
import { SortableItem } from './SortableItem';
import EditModal from './EditModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { parseObjectPositionToPercents } from '@/lib/utils/parseObjectPositionPercent';
import {
  getEffectiveGalleryCaption,
  getEffectiveGalleryObjectPosition,
  gallerySlotHasCaptionOverride,
} from '@/lib/utils/galleryObjectPosition';
import { getAspectRatioBucket } from '@/lib/utils/objectPositionUtils';
import { useDefaultDndSensors } from '@/lib/hooks/useDefaultDndSensors';

function applySlotCaptionEdit(item: GalleryMediaItem, newText: string): GalleryMediaItem {
  const mediaDefault = item.media?.caption ?? '';
  if (newText === mediaDefault) {
    if (!gallerySlotHasCaptionOverride(item)) return item;
    const rest = { ...item };
    delete rest.caption;
    return rest;
  }
  return { ...item, caption: newText };
}

/** Value for the card-only override field (not merged with file caption). */
function cardCaptionFieldValue(item: GalleryMediaItem): string {
  return gallerySlotHasCaptionOverride(item) ? (item.caption ?? '') : '';
}

interface GalleryManagerProps {
  galleryMedia: HydratedGalleryMediaItem[];
  onUpdate: (newGallery: HydratedGalleryMediaItem[]) => void;
  onSetAsCover?: (item: HydratedGalleryMediaItem) => void;
  currentCoverMediaId?: string | null;
  error?: string;
  className?: string;
  /** Narrow Library tab in photo picker to media matching these card tags. */
  filterTagIds?: string[];
  /**
   * After a gallery slot is saved in the modal (tags PATCH + local slot state), persist
   * `galleryMedia` on the card so caption/focal overrides match Firestore and dirty/leave guards clear.
   * Return false if the card PATCH failed so the modal can stay open.
   */
  onPersistGalleryAfterSlotSave?: (
    nextGallery: HydratedGalleryMediaItem[]
  ) => boolean | Promise<boolean>;
}

export default function GalleryManager({
  galleryMedia,
  onUpdate,
  onSetAsCover,
  currentCoverMediaId,
  error,
  className,
  filterTagIds,
  onPersistGalleryAfterSlotSave,
}: GalleryManagerProps) {
  const [editingItem, setEditingItem] = useState<HydratedGalleryMediaItem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const galleryRef = useRef(galleryMedia);
  useEffect(() => {
    galleryRef.current = galleryMedia;
  }, [galleryMedia]);

  /** Keeps latest gallery for chunked imports; PhotoPicker closes itself after import—do not close here. */
  const handleMultiPhotoSelect = useCallback((newItems: HydratedGalleryMediaItem[]) => {
    const current = galleryRef.current;
    const base = current.length;
    const reindexed = newItems.map((item, i) => ({
      ...item,
      order: base + i,
    }));
    const merged = [...current, ...reindexed];
    galleryRef.current = merged;
    onUpdate(merged);
  }, [onUpdate]);

  const handleRemovePhoto = (mediaId: string) => {
    onUpdate(galleryMedia.filter(item => item.mediaId !== mediaId));
  };

  const handleInlineCaptionChange = (mediaId: string, newText: string) => {
    onUpdate(
      galleryMedia.map((g) =>
        g.mediaId === mediaId ? (applySlotCaptionEdit(g, newText) as HydratedGalleryMediaItem) : g
      )
    );
  };

  const handleSaveMetadata = async (updatedItem: HydratedGalleryMediaItem) => {
    const nextGallery = galleryMedia.map((item) =>
      item.mediaId === updatedItem.mediaId ? updatedItem : item
    );
    onUpdate(nextGallery);
    if (onPersistGalleryAfterSlotSave) {
      const ok = await onPersistGalleryAfterSlotSave(nextGallery);
      if (!ok) return;
    }
    setEditingItem(null);
  };

  const sensors = useDefaultDndSensors();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = galleryMedia.findIndex(p => p.mediaId === active.id);
      const newIndex = galleryMedia.findIndex(p => p.mediaId === over!.id);
      const reordered = arrayMove(galleryMedia, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        order: idx,
      }));
      onUpdate(reordered);
    }
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <h4 className={styles.sectionTitle}>Gallery</h4>
        <button
          onClick={() => setIsPickerOpen(true)}
          className={styles.addButton}
          type="button"
        >
          Add
        </button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={galleryMedia.map(i => i.mediaId)} strategy={rectSortingStrategy}>
          <div className={styles.imageGrid}>
            {galleryMedia.map((item) => (
              <SortableItem key={item.mediaId} id={item.mediaId}>
                <div className={styles.imageCell}>
                  <div
                    className={`${styles.imageItem} ${
                      getAspectRatioBucket(item.media) === 'landscape'
                        ? styles.imageLandscape
                        : getAspectRatioBucket(item.media) === 'square'
                          ? styles.imageSquare
                          : styles.imagePortrait
                    }`}
                  >
                    {item.media ? (
                      <JournalImage
                        src={getDisplayUrl(item.media)}
                        alt={
                          getEffectiveGalleryCaption(item, item.media) ||
                          item.media.filename ||
                          ''
                        }
                        className={styles.thumbnail}
                        width={240}
                        height={180}
                        sizes="(max-width: 768px) 50vw, 240px"
                        style={{
                          objectPosition: getEffectiveGalleryObjectPosition(item, item.media),
                        }}
                        priority={false}
                      />
                    ) : (
                      <div className={styles.placeholder}>
                        <LoadingSpinner />
                      </div>
                    )}
                    <div className={styles.controls}>
                      {onSetAsCover ? (
                        <button
                          onClick={() => onSetAsCover(item)}
                          className={styles.editButton}
                          aria-label="Set as cover image"
                          type="button"
                          disabled={item.mediaId === currentCoverMediaId}
                        >
                          {item.mediaId === currentCoverMediaId ? 'Cover' : 'Set Cover'}
                        </button>
                      ) : null}
                      <button
                        onClick={() => setEditingItem(item)}
                        className={styles.editButton}
                        aria-label="Edit image metadata"
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemovePhoto(item.mediaId)}
                        className={styles.removeButton}
                        aria-label="Remove image"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className={styles.captionBlock}>
                    {item.media?.caption?.trim() ? (
                      <p className={styles.mediaCaption}>{item.media.caption}</p>
                    ) : null}
                    <textarea
                      id={`gallery-caption-${item.mediaId}`}
                      className={styles.inlineCaption}
                      rows={2}
                      value={cardCaptionFieldValue(item)}
                      onChange={(e) => handleInlineCaptionChange(item.mediaId, e.target.value)}
                      placeholder="Card caption…"
                      aria-label={
                        item.media?.filename
                          ? `Card caption override for ${item.media.filename}`
                          : `Card caption override for gallery image ${item.mediaId}`
                      }
                    />
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editingItem && (
        <EditModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title={`Edit: ${editingItem.media?.filename || 'Image'}`}
          size="wide"
        >
          <GalleryItemForm
            item={editingItem}
            onSave={handleSaveMetadata}
          />
        </EditModal>
      )}

      {isPickerOpen && (
        <PhotoPicker
          isOpen={isPickerOpen}
          onMultiSelect={handleMultiPhotoSelect}
          onClose={() => setIsPickerOpen(false)}
          initialMode="multi"
          filterTagIds={filterTagIds}
        />
      )}
    </div>
  );
}

// --- Internal Form Component for the Modal ---
interface GalleryItemFormProps {
  item: HydratedGalleryMediaItem;
  onSave: (updatedItem: HydratedGalleryMediaItem) => void | Promise<void>;
}

function GalleryItemForm({ item, onSave }: GalleryItemFormProps) {
  const { tags: allTags } = useTag();

  const [caption, setCaption] = useState('');
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [hasFocalOverride, setHasFocalOverride] = useState(false);
  const [hasCaptionOverride, setHasCaptionOverride] = useState(false);
  const [mediaTagIds, setMediaTagIds] = useState<string[]>([]);
  const [tagSaveError, setTagSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
  }, [item.mediaId, item.caption, item.objectPosition, item.media?.objectPosition, item.media?.caption]);

  useEffect(() => {
    setMediaTagIds(item.media?.tags ?? []);
    setTagSaveError(null);
  }, [item.mediaId, item.media?.tags]);

  const objectPosition = `${horizontalPosition}% ${verticalPosition}%`;

  const handleSliderH = (v: number) => {
    setHasFocalOverride(true);
    setHorizontalPosition(v);
  };

  const handleSliderV = (v: number) => {
    setHasFocalOverride(true);
    setVerticalPosition(v);
  };

  const handleResetFocalToMediaDefault = () => {
    setHasFocalOverride(false);
    const { horizontal, vertical } = parseObjectPositionToPercents(item.media?.objectPosition);
    setHorizontalPosition(horizontal);
    setVerticalPosition(vertical);
  };

  const handleCaptionChange = (value: string) => {
    setHasCaptionOverride(true);
    setCaption(value);
  };

  const handleResetCaptionToMediaDefault = () => {
    setHasCaptionOverride(false);
    setCaption(item.media?.caption ?? '');
  };

  /**
   * Must not use a nested <form> here: GalleryManager lives inside CardForm's <form id="card-form">.
   * A nested form is invalid HTML; the browser can treat the modal "Save" as submitting the outer
   * card form instead of this flow (tags PATCH + gallery slot PATCH never run).
   */
  const handleSaveClick = async () => {
    setTagSaveError(null);
    const tagsPayload = [...mediaTagIds];
    setSaving(true);
    try {
      const res = await fetch(`/api/images/${item.mediaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tagsPayload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.message === 'string' ? data.message : res.statusText);
      }
    } catch (err) {
      setTagSaveError(err instanceof Error ? err.message : 'Could not save tags on this image.');
      setSaving(false);
      return;
    }
    setSaving(false);

    const { objectPosition: _op, caption: _cap, ...rest } = item;
    await onSave({
      ...rest,
      ...(item.media
        ? {
            media: {
              ...item.media,
              tags: tagsPayload,
            },
          }
        : {}),
      ...(hasCaptionOverride ? { caption } : {}),
      ...(hasFocalOverride ? { objectPosition } : {}),
    });
  };

  const selectedTagObjects = allTags.filter(t => t.docId && mediaTagIds.includes(t.docId));

  return (
    <div className={styles.form}>
      {item.media ? (
        <div className={styles.previewStack}>
          <div className={styles.focalPreview}>
            <JournalImage
              src={getDisplayUrl(item.media)}
              alt=""
              fill
              className={styles.focalPreviewImage}
              sizes="(max-width: 900px) 90vw, 800px"
              style={{
                objectFit: 'cover',
                objectPosition,
              }}
              priority={false}
            />
          </div>
          <div className={styles.focalSliders}>
            <div className={styles.sliderRow}>
              <label htmlFor="gallery-focal-h">Horizontal</label>
              <input
                id="gallery-focal-h"
                type="range"
                min={0}
                max={100}
                value={horizontalPosition}
                onChange={(e) => handleSliderH(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.sliderRow}>
              <label htmlFor="gallery-focal-v">Vertical</label>
              <input
                id="gallery-focal-v"
                type="range"
                min={0}
                max={100}
                value={verticalPosition}
                onChange={(e) => handleSliderV(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.focalActions}>
              <button
                type="button"
                className={styles.resetFocalButton}
                onClick={handleResetFocalToMediaDefault}
                disabled={!hasFocalOverride}
              >
                Use media default
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.formGroup}>
        <label htmlFor="gallery-caption">Caption</label>
        <textarea
          id="gallery-caption"
          value={caption}
          onChange={(e) => handleCaptionChange(e.target.value)}
          className={styles.textarea}
          rows={3}
          placeholder="Optional caption for this slot on the card"
        />
      </div>

      <div className={`${styles.formGroup} ${styles.tagBlock}`}>
        {tagSaveError ? <p className={styles.whoError}>{tagSaveError}</p> : null}
        <MacroTagSelector
          selectedTags={selectedTagObjects}
          allTags={allTags}
          onChange={setMediaTagIds}
        />
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.saveButton}
          disabled={saving}
          onClick={() => {
            void handleSaveClick();
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
} 
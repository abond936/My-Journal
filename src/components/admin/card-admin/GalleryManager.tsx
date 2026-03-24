'use client';

import React, { useState, useEffect } from 'react';
import JournalImage from '@/components/common/JournalImage';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { HydratedGalleryMediaItem } from '@/lib/types/card';
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

interface GalleryManagerProps {
  galleryMedia: HydratedGalleryMediaItem[];
  onUpdate: (newGallery: HydratedGalleryMediaItem[]) => void;
  error?: string;
  className?: string;
}

export default function GalleryManager({ galleryMedia, onUpdate, error, className }: GalleryManagerProps) {
  const [editingItem, setEditingItem] = useState<HydratedGalleryMediaItem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleMultiPhotoSelect = (newItems: HydratedGalleryMediaItem[]) => {
    const base = galleryMedia.length;
    const reindexed = newItems.map((item, i) => ({
      ...item,
      order: base + i,
    }));
    onUpdate([...galleryMedia, ...reindexed]);
    setIsPickerOpen(false);
  };

  const handleRemovePhoto = (mediaId: string) => {
    onUpdate(galleryMedia.filter(item => item.mediaId !== mediaId));
  };

  const handleSaveMetadata = (updatedItem: HydratedGalleryMediaItem) => {
    onUpdate(galleryMedia.map(item =>
      item.mediaId === updatedItem.mediaId ? updatedItem : item
    ));
    setEditingItem(null);
  };

  const sensors = useSensors(useSensor(PointerSensor));

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
        <h3>Gallery Images</h3>
        <button
          onClick={() => setIsPickerOpen(true)}
          className={styles.addButton}
          type="button"
        >
          Add Photos
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
                <div className={styles.imageItem}>
                  {item.media ? (
                    <JournalImage
                      src={getDisplayUrl(item.media)}
                      alt={
                        getEffectiveGalleryCaption(item, item.media) ||
                        item.media.filename ||
                        ''
                      }
                      className={styles.thumbnail}
                      width={200}
                      height={150}
                      sizes="200px"
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
                    <button
                      onClick={() => setEditingItem(item)}
                      className={styles.editButton}
                      aria-label="Edit image metadata"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemovePhoto(item.mediaId)}
                      className={styles.removeButton}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
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
        />
      )}
    </div>
  );
}

// --- Internal Form Component for the Modal ---
interface GalleryItemFormProps {
  item: HydratedGalleryMediaItem;
  onSave: (updatedItem: HydratedGalleryMediaItem) => void;
}

function GalleryItemForm({ item, onSave }: GalleryItemFormProps) {
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
  }, [item.mediaId, item.caption, item.objectPosition, item.media?.objectPosition, item.media?.caption]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { objectPosition: _op, caption: _cap, ...rest } = item;
    onSave({
      ...rest,
      ...(hasCaptionOverride ? { caption } : {}),
      ...(hasFocalOverride ? { objectPosition } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {item.media ? (
        <div className={styles.focalPreview}>
          <JournalImage
            src={getDisplayUrl(item.media)}
            alt=""
            className={styles.focalPreviewImage}
            width={480}
            height={360}
            sizes="(max-width: 520px) 100vw, 480px"
            style={{
              objectFit: 'cover',
              objectPosition,
            }}
          />
        </div>
      ) : null}

      <div className={styles.formGroup}>
        <label htmlFor="gallery-caption">Caption</label>
        <textarea
          id="gallery-caption"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          className={styles.textarea}
          rows={3}
          placeholder="Optional; shown under the image on the card"
        />
      </div>

      <div className={styles.formGroup}>
        <span className={styles.focalLabel}>Focal point (crop preview)</span>
        <p className={styles.focalInheritHint}>
          {hasFocalOverride
            ? 'This card overrides the media default for this slot only.'
            : 'Using the media default. Move a slider to set a per-card override, or edit default focal in Media Admin.'}
        </p>
        <div className={styles.sliderRow}>
          <label htmlFor="gallery-focal-h">Horizontal</label>
          <input
            id="gallery-focal-h"
            type="range"
            min={0}
            max={100}
            value={horizontalPosition}
            onChange={e => handleSliderH(Number(e.target.value))}
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
            onChange={e => handleSliderV(Number(e.target.value))}
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
        <p className={styles.focalHint}>
          Preview / override value: <code>{objectPosition}</code>
        </p>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.saveButton}>
          Save Changes
        </button>
      </div>
    </form>
  );
} 
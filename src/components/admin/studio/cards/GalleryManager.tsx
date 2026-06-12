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
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import styles from './GalleryManager.module.css';
import { SortableItem } from './SortableItem';
import EditModal from './EditModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  getEffectiveGalleryCaption,
  getEffectiveGalleryObjectPosition,
  gallerySlotHasCaptionOverride,
} from '@/lib/utils/galleryObjectPosition';
import { getAspectRatioBucket } from '@/lib/utils/objectPositionUtils';
import { useDefaultDndSensors } from '@/lib/hooks/useDefaultDndSensors';
import GalleryItemEditor from './GalleryItemEditor';

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
   * Persist gallery membership or slot edits immediately so Firestore stays aligned with the visible gallery.
   * Return false if the card PATCH failed so the local UI can revert or the modal can stay open.
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
  className,
  filterTagIds,
  onPersistGalleryAfterSlotSave,
}: GalleryManagerProps) {
  const [editingItem, setEditingItem] = useState<HydratedGalleryMediaItem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [persistingGallery, setPersistingGallery] = useState(false);

  const galleryRef = useRef(galleryMedia);
  useEffect(() => {
    galleryRef.current = galleryMedia;
  }, [galleryMedia]);

  /** Keeps latest gallery for chunked imports; PhotoPicker closes itself after import, do not close here. */
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

  const handleRemovePhoto = useCallback(async (mediaId: string) => {
    const previousGallery = galleryMedia;
    const nextGallery = previousGallery.filter((item) => item.mediaId !== mediaId);
    onUpdate(nextGallery);
    if (!onPersistGalleryAfterSlotSave) return;
    let ok = false;
    setPersistingGallery(true);
    try {
      ok = await onPersistGalleryAfterSlotSave(nextGallery);
    } finally {
      setPersistingGallery(false);
    }
    if (!ok) {
      onUpdate(previousGallery);
    }
  }, [galleryMedia, onPersistGalleryAfterSlotSave, onUpdate]);

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
      let ok = false;
      setPersistingGallery(true);
      try {
        ok = await onPersistGalleryAfterSlotSave(nextGallery);
      } finally {
        setPersistingGallery(false);
      }
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
          disabled={persistingGallery}
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
                        src={getStudioDisplayUrl(item.media)}
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
                          disabled={persistingGallery || item.mediaId === currentCoverMediaId}
                        >
                          {item.mediaId === currentCoverMediaId ? 'Cover' : 'Set Cover'}
                        </button>
                      ) : null}
                      <button
                        onClick={() => setEditingItem(item)}
                        className={styles.editButton}
                        aria-label="Edit image metadata"
                        type="button"
                        disabled={persistingGallery}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleRemovePhoto(item.mediaId)}
                        className={styles.removeButton}
                        aria-label="Remove image"
                        type="button"
                        disabled={persistingGallery}
                      >
                        x
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
                      placeholder="Card caption..."
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

interface GalleryItemFormProps {
  item: HydratedGalleryMediaItem;
  onSave: (updatedItem: HydratedGalleryMediaItem) => void | Promise<void>;
}

function GalleryItemForm({ item, onSave }: GalleryItemFormProps) {
  const { tags: allTags } = useTag();
  const [mediaTagIds, setMediaTagIds] = useState<string[]>([]);
  const [tagSaveError, setTagSaveError] = useState<string | null>(null);

  useEffect(() => {
    setMediaTagIds(item.media?.tags ?? []);
    setTagSaveError(null);
  }, [item.mediaId, item.media?.tags]);

  /**
   * Must not use a nested <form> here: GalleryManager lives inside CardForm's <form id="card-form">.
   * A nested form is invalid HTML; the browser can treat the modal Save as submitting the outer
   * card form instead of this flow (tags PATCH + gallery slot PATCH never run).
   */
  const handleSave = async (updatedItem: HydratedGalleryMediaItem) => {
    setTagSaveError(null);
    const tagsPayload = [...mediaTagIds];
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
      return;
    }

    await onSave({
      ...updatedItem,
      ...(updatedItem.media
        ? {
            media: {
              ...updatedItem.media,
              tags: tagsPayload,
            },
          }
        : {}),
    });
  };

  const selectedTagObjects = allTags.filter(t => t.docId && mediaTagIds.includes(t.docId));

  return (
    <GalleryItemEditor item={item} onSave={handleSave} saveLabel="Save changes">
      <div className={`${styles.formGroup} ${styles.tagBlock}`}>
        {tagSaveError ? <p className={styles.whoError}>{tagSaveError}</p> : null}
        <MacroTagSelector
          selectedTags={selectedTagObjects}
          allTags={allTags}
          onChange={setMediaTagIds}
        />
      </div>
    </GalleryItemEditor>
  );
}

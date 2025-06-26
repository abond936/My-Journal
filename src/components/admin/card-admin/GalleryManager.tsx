'use client';

import React, { useState } from 'react';
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
import { Media } from '@/lib/types/photo';
import { Card } from '@/lib/types/card';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import styles from './GalleryManager.module.css';
import { SortableItem } from './SortableItem';
import EditModal from './EditModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useCardForm } from '@/components/providers/CardFormProvider';

// Type for a single item in the galleryMedia array from the Card type
type GalleryMediaItem = Card['galleryMedia'][number];

interface GalleryManagerProps {
  className?: string;
}

export default function GalleryManager({ className }: GalleryManagerProps) {
  const { formState, updateGalleryMedia } = useCardForm();
  const { galleryMedia } = formState;
  const [editingItem, setEditingItem] = useState<GalleryMediaItem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handlePhotoSelect = (media: Media) => {
    const newGalleryItem = {
      mediaId: media.id,
      caption: media.caption || '',
      order: galleryMedia.length,
      objectPosition: media.objectPosition || 'center',
    };

    updateGalleryMedia([...galleryMedia, newGalleryItem]);
    setIsPickerOpen(false);
  };

  const handleRemovePhoto = (index: number) => {
    const newGalleryMedia = galleryMedia.filter((_, i) => i !== index);
    // Reorder remaining items
    const reorderedMedia = newGalleryMedia.map((item, i) => ({
      ...item,
      order: i,
    }));
    updateGalleryMedia(reorderedMedia);
  };

  const handleMovePhoto = (fromIndex: number, toIndex: number) => {
    const newGalleryMedia = [...galleryMedia];
    const [movedItem] = newGalleryMedia.splice(fromIndex, 1);
    newGalleryMedia.splice(toIndex, 0, movedItem);
    
    // Update order values
    const reorderedMedia = newGalleryMedia.map((item, i) => ({
      ...item,
      order: i,
    }));
    updateGalleryMedia(reorderedMedia);
  };

  const handleSaveMetadata = (updatedItem: GalleryMediaItem) => {
    // Also update the canonical object in the cache
    const fullMediaObject = formState.mediaCache.get(updatedItem.mediaId);
    if (fullMediaObject) {
      formState.mediaCache.set(updatedItem.mediaId, { ...fullMediaObject, caption: updatedItem.caption });
    }
    
    const newMedia = galleryMedia.map(item =>
      item.mediaId === updatedItem.mediaId ? updatedItem : item
    );
    updateGalleryMedia(newMedia);
    setEditingItem(null);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = galleryMedia.findIndex(p => p.mediaId === active.id);
      const newIndex = galleryMedia.findIndex(p => p.mediaId === over!.id);
      const newOrder = arrayMove(galleryMedia, oldIndex, newIndex);
      // Re-assign the order property based on the new array index
      const finalOrder = newOrder.map((item, index) => ({ ...item, order: index }));
      updateGalleryMedia(finalOrder);
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
          Add Photo
        </button>
      </div>

      <div className={styles.imageGrid}>
        {galleryMedia.map((item, index) => (
          <div key={item.mediaId} className={styles.imageItem}>
            <img
              src={formState.mediaCache.get(item.mediaId)?.url || ''}
              alt={formState.mediaCache.get(item.mediaId)?.alt || ''}
              className={styles.thumbnail}
              style={{ objectPosition: item.objectPosition }}
            />
            <div className={styles.controls}>
              {index > 0 && (
                <button
                  onClick={() => handleMovePhoto(index, index - 1)}
                  className={styles.moveButton}
                  aria-label="Move up"
                >
                  ↑
                </button>
              )}
              {index < galleryMedia.length - 1 && (
                <button
                  onClick={() => handleMovePhoto(index, index + 1)}
                  className={styles.moveButton}
                  aria-label="Move down"
                >
                  ↓
                </button>
              )}
              <button
                onClick={() => handleRemovePhoto(index)}
                className={styles.removeButton}
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingItem && (
        <EditModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title={`Edit: ${formState.mediaCache.get(editingItem.mediaId)?.filename || 'Image'}`}
        >
          <GalleryItemForm
            item={editingItem}
            onSave={handleSaveMetadata}
          />
        </EditModal>
      )}

      {isPickerOpen && (
        <PhotoPicker
          onSelect={handlePhotoSelect}
          onClose={() => setIsPickerOpen(false)}
          initialMode="single"
        />
      )}
    </div>
  );
}

// --- Internal Form Component for the Modal ---
interface GalleryItemFormProps {
  item: GalleryMediaItem;
  onSave: (updatedItem: GalleryMediaItem) => void;
}

function GalleryItemForm({ item, onSave }: GalleryItemFormProps) {
  const [caption, setCaption] = useState(item.caption || '');
  const [objectPosition, setObjectPosition] = useState(item.objectPosition || '50% 50%');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...item, caption, objectPosition });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="caption">Caption</label>
        <input
          type="text"
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className={styles.input}
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="objectPosition">Focal Point (Object Position)</label>
        <input
          type="text"
          id="objectPosition"
          value={objectPosition}
          onChange={(e) => setObjectPosition(e.target.value)}
          className={styles.input}
        />
      </div>
      <div className={styles.formActions}>
        <button type="submit" className={styles.saveButton}>
          Save Changes
        </button>
      </div>
    </form>
  );
} 
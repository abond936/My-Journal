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
import { HydratedGalleryMediaItem } from '@/lib/types/card';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import styles from './GalleryManager.module.css';
import { SortableItem } from './SortableItem';
import EditModal from './EditModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useCardForm } from '@/components/providers/CardFormProvider';

interface GalleryManagerProps {
  className?: string;
}

export default function GalleryManager({ className }: GalleryManagerProps) {
  const { formState: { cardData }, setField } = useCardForm();
  const { galleryMedia = [] } = cardData;

  const [editingItem, setEditingItem] = useState<HydratedGalleryMediaItem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleMultiPhotoSelect = (newItems: HydratedGalleryMediaItem[]) => {
    setField('galleryMedia', [...galleryMedia, ...newItems]);
    setIsPickerOpen(false);
  };

  const handleRemovePhoto = (mediaId: string) => {
    setField('galleryMedia', galleryMedia.filter(item => item.mediaId !== mediaId));
  };

  const handleSaveMetadata = (updatedItem: HydratedGalleryMediaItem) => {
    setField('galleryMedia', galleryMedia.map(item =>
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
      const newOrder = arrayMove(galleryMedia, oldIndex, newIndex);
      setField('galleryMedia', newOrder);
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
                  {item.media?.storageUrl ? (
                    <img
                      src={item.media.storageUrl}
                      alt={item.media.alt || ''}
                      className={styles.thumbnail}
                      style={{ objectPosition: item.objectPosition }}
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
          onSelect={(media) => handleMultiPhotoSelect([media])}
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
        <small>Use CSS object-position values (e.g., '50% 50%', 'center top', '25% 75%')</small>
      </div>
      <div className={styles.formActions}>
        <button type="submit" className={styles.saveButton}>
          Save Changes
        </button>
      </div>
    </form>
  );
} 
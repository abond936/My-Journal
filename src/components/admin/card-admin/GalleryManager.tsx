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
  const {
    formState: { cardData, mediaCache },
    addGalleryItems,
    removeGalleryItem,
    updateGalleryItem,
    reorderGalleryItems,
  } = useCardForm();
  
  const { galleryMedia } = cardData;

  console.log('GalleryManager - Current state:', {
    galleryMediaLength: galleryMedia?.length || 0,
    mediaCache: Array.from(mediaCache.entries()).map(([id, media]) => ({
      id,
      hasUrl: !!media?.url
    })),
    galleryMediaDetails: galleryMedia?.map(item => ({
      mediaId: item.mediaId,
      mediaInCache: mediaCache.has(item.mediaId),
      mediaUrl: mediaCache.get(item.mediaId)?.url || 'missing'
    }))
  });

  const [editingItem, setEditingItem] = useState<GalleryMediaItem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleMultiPhotoSelect = (medias: Media[]) => {
    addGalleryItems(medias);
    setIsPickerOpen(false);
  };

  const handleRemovePhoto = (mediaId: string) => {
    removeGalleryItem(mediaId);
  };

  const handleSaveMetadata = (updatedItem: GalleryMediaItem) => {
    updateGalleryItem(updatedItem.mediaId, updatedItem);
    setEditingItem(null);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = galleryMedia.findIndex(p => p.mediaId === active.id);
      const newIndex = galleryMedia.findIndex(p => p.mediaId === over!.id);
      const newOrder = arrayMove(galleryMedia, oldIndex, newIndex);
      reorderGalleryItems(newOrder);
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
        {galleryMedia.map((item, index) => {
          const media = mediaCache.get(item.mediaId);
          console.log('GalleryManager - Rendering item:', {
            mediaId: item.mediaId,
            hasMedia: !!media,
            mediaUrl: media?.url || 'missing'
          });
          return (
            <div key={item.mediaId} className={styles.imageItem}>
              {media?.url ? (
                <img
                  src={media.url}
                  alt={media.alt || ''}
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
          );
        })}
      </div>

      {editingItem && (
        <EditModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title={`Edit: ${mediaCache.get(editingItem.mediaId)?.filename || 'Image'}`}
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
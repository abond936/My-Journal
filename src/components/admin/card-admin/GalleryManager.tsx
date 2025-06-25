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
import PhotoPicker from './PhotoPicker';
import styles from './GalleryManager.module.css';
import { SortableItem } from './SortableItem';
import EditModal from './EditModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Type for a single item in the galleryMedia array from the Card type
type GalleryMediaItem = Card['galleryMedia'][number];

interface GalleryManagerProps {
  mediaItems: GalleryMediaItem[];
  mediaCache: Map<string, Media>;
  onGalleryChange: (newMedia: GalleryMediaItem[]) => void;
  onOpenPhotoPicker: () => void;
  isImporting?: boolean;
}

export default function GalleryManager({ 
  mediaItems,
  mediaCache,
  onGalleryChange, 
  onOpenPhotoPicker, 
  isImporting 
}: GalleryManagerProps) {
  const [editingItem, setEditingItem] = useState<GalleryMediaItem | null>(null);

  const handleRemovePhoto = (mediaIdToRemove: string) => {
    const newMedia = mediaItems.filter(item => item.mediaId !== mediaIdToRemove);
    onGalleryChange(newMedia);
  };

  const handleSaveMetadata = (updatedItem: GalleryMediaItem) => {
    // Also update the canonical object in the cache
    const fullMediaObject = mediaCache.get(updatedItem.mediaId);
    if (fullMediaObject) {
      mediaCache.set(updatedItem.mediaId, { ...fullMediaObject, caption: updatedItem.caption });
    }
    
    const newMedia = mediaItems.map(item =>
      item.mediaId === updatedItem.mediaId ? updatedItem : item
    );
    onGalleryChange(newMedia);
    setEditingItem(null);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = mediaItems.findIndex(p => p.mediaId === active.id);
      const newIndex = mediaItems.findIndex(p => p.mediaId === over!.id);
      const newOrder = arrayMove(mediaItems, oldIndex, newIndex);
      // Re-assign the order property based on the new array index
      const finalOrder = newOrder.map((item, index) => ({ ...item, order: index }));
      onGalleryChange(finalOrder);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label>Gallery</label>
        <button
          type="button"
          onClick={onOpenPhotoPicker}
          className={styles.addButton}
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <LoadingSpinner size={16} />
              <span style={{ marginLeft: '8px' }}>Importing...</span>
            </>
          ) : (
            'Add Images'
          )}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={mediaItems.map(p => p.mediaId)} strategy={rectSortingStrategy}>
          <div className={styles.grid}>
            {mediaItems.map(item => {
              const fullMediaObject = mediaCache.get(item.mediaId);
              if (!fullMediaObject) {
                // Render a placeholder if the media object isn't in the cache yet
                return <div key={item.mediaId} className={styles.thumbnailPlaceholder}>Loading...</div>;
              }
              return (
                <SortableItem key={item.mediaId} id={item.mediaId}>
                  <div className={styles.thumbnail}>
                    <img src={fullMediaObject.storageUrl} alt={item.caption || fullMediaObject.filename} style={{ objectPosition: item.objectPosition }}/>
                    <div className={styles.thumbnailOverlay}>
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className={styles.editButton}
                        title="Edit Metadata"
                      >
                        &#9998; {/* Pencil Icon */}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(item.mediaId)}
                        className={styles.removeButton}
                        title="Remove from Gallery"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

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
          placeholder="e.g., 50% 25% or top center"
        />
      </div>
      <button type="submit" className={styles.saveButton}>Save</button>
    </form>
  );
} 
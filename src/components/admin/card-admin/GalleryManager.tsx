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
import { PhotoMetadata } from '@/lib/types/photo';
import PhotoPicker from '@/components/common/PhotoPicker';
import styles from './GalleryManager.module.css';
import formStyles from './CardForm.module.css';
import { SortableItem } from './SortableItem';
import EditModal from './EditModal';

interface GalleryManagerProps {
  galleryMedia: PhotoMetadata[];
  onGalleryChange: (newMedia: PhotoMetadata[]) => void;
}

export default function GalleryManager({ galleryMedia, onGalleryChange }: GalleryManagerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoMetadata | null>(null);

  const handlePhotoSelection = (photos: PhotoMetadata[]) => {
    // This assumes the picker returns the full new set of selected photos.
    // We may need to adjust this depending on the picker's implementation.
    onGalleryChange(photos);
    setIsPickerOpen(false);
  };

  const handleRemovePhoto = (photoId: string) => {
    const newMedia = galleryMedia.filter(photo => photo.id !== photoId);
    onGalleryChange(newMedia);
  };

  const handleSaveMetadata = (updatedPhoto: PhotoMetadata) => {
    const newMedia = galleryMedia.map(photo =>
      photo.id === updatedPhoto.id ? updatedPhoto : photo
    );
    onGalleryChange(newMedia);
    setEditingPhoto(null);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = galleryMedia.findIndex(p => p.id === active.id);
      const newIndex = galleryMedia.findIndex(p => p.id === over!.id);
      const newOrder = arrayMove(galleryMedia, oldIndex, newIndex);
      onGalleryChange(newOrder);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label>Gallery</label>
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className={formStyles.secondaryButton}
        >
          Add / Manage Images
        </button>
      </div>

      {/* Thumbnail Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={galleryMedia.map(p => p.id)} strategy={rectSortingStrategy}>
          <div className={styles.grid}>
            {galleryMedia.map(photo => (
              <SortableItem key={photo.id} id={photo.id}>
                <div className={styles.thumbnail}>
                  <img src={photo.thumbnailUrl} alt={photo.caption || photo.filename} />
                  <div className={styles.thumbnailOverlay}>
                    <button
                      type="button"
                      onClick={() => setEditingPhoto(photo)}
                      className={styles.editButton}
                      title="Edit Metadata"
                    >
                      &#9998; {/* Pencil Icon */}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className={styles.removeButton}
                      title="Remove from Gallery"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editingPhoto && (
        <EditModal
          isOpen={!!editingPhoto}
          onClose={() => setEditingPhoto(null)}
          title={`Edit: ${editingPhoto.filename}`}
        >
          <PhotoMetadataForm
            photo={editingPhoto}
            onSave={handleSaveMetadata}
          />
        </EditModal>
      )}

      {isPickerOpen && (
        <PhotoPicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onPhotoSelected={(photo) => handlePhotoSelection([...galleryMedia, photo])} // Example for single add
          onMultiPhotoSelected={handlePhotoSelection}
          initialSelection={galleryMedia}
          allowMultiple
        />
      )}
    </div>
  );
}

// --- Internal Form Component for the Modal ---
interface PhotoMetadataFormProps {
  photo: PhotoMetadata;
  onSave: (updatedPhoto: PhotoMetadata) => void;
}

function PhotoMetadataForm({ photo, onSave }: PhotoMetadataFormProps) {
  const [caption, setCaption] = useState(photo.caption || '');
  const [objectPosition, setObjectPosition] = useState(photo.objectPosition || '50% 50%');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...photo, caption, objectPosition });
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
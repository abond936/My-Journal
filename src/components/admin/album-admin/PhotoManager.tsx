'use client';

import { useState } from 'react';
import PhotoAlbum from 'react-photo-album';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlbumImage } from '@/lib/types/album';
import styles from './PhotoManager.module.css';

interface PhotoManagerProps {
  photos?: AlbumImage[];
  onAdd: () => void;
  onRemove: (photoId: string) => void;
  onReorder: (reorderedPhotos: AlbumImage[]) => void;
}

function DraggablePhoto({ photo, selected, onSelect, ...rest }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo.key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={styles.photoWrapper}>
      <div style={{ position: 'relative', width: rest.layoutOptions.width, height: rest.layoutOptions.height }}>
        {rest.renderDefaultPhoto({ wrapped: true })}
        <div 
          className={`${styles.photoOverlay} ${selected ? styles.selected : ''}`}
          onClick={() => onSelect(photo.key!)}
        >
          <div className={styles.checkmark}>✓</div>
        </div>
      </div>
    </div>
  );
}

export default function PhotoManager({ photos = [], onAdd, onRemove, onReorder }: PhotoManagerProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  const handleSelectPhoto = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(photoId)) {
        newSelection.delete(photoId);
      } else {
        newSelection.add(photoId);
      }
      return newSelection;
    });
  };

  const handleRemoveSelected = () => {
    selectedPhotos.forEach(photoId => onRemove(photoId));
    setSelectedPhotos(new Set());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex((p) => p.sourceId === active.id);
      const newIndex = photos.findIndex((p) => p.sourceId === over.id);
      onReorder(arrayMove(photos, oldIndex, newIndex));
    }
  };

  const photoAlbumData = photos.map(p => ({
    src: p.path,
    width: p.width,
    height: p.height,
    key: p.sourceId
  }));

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button onClick={onAdd} className={styles.button}>Add Photos</button>
        {selectedPhotos.size > 0 && (
          <button onClick={handleRemoveSelected} className={`${styles.button} ${styles.removeButton}`}>
            Remove Selected ({selectedPhotos.size})
          </button>
        )}
      </div>
      <DndContext sensors={[]} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photoAlbumData.map(p => p.key!)} >
          <PhotoAlbum
            layout="rows"
            photos={photoAlbumData}
            renderPhoto={({ photo, ...rest }) => (
              <DraggablePhoto
                photo={photo}
                selected={selectedPhotos.has(photo.key!)}
                onSelect={handleSelectPhoto}
                {...rest}
              />
            )}
          />
        </SortableContext>
      </DndContext>
    </div>
  );
} 
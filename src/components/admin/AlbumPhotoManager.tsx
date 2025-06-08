'use client';

import { useState, useRef } from 'react';
import { Album, AlbumImage } from '@/lib/types/album';
import styles from './AlbumPhotoManager.module.css';
import PhotoPicker from '../PhotoPicker';
import { PhotoMetadata } from '@/lib/services/photos/photoService';

interface AlbumPhotoManagerProps {
  album: Album;
  onClose: () => void;
  onSave: (updatedAlbum: Partial<Album>) => Promise<void>;
}

export default function AlbumPhotoManager({ album, onClose, onSave }: AlbumPhotoManagerProps) {
  const [images, setImages] = useState<AlbumImage[]>(album.images || []);
  const [coverImage, setCoverImage] = useState<string | undefined>(album.coverImage);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ images, coverImage });
      onClose();
    } catch (error) {
      console.error('Failed to save album photos', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotosSelected = (selectedPhotos: PhotoMetadata[]) => {
    const newImages: AlbumImage[] = selectedPhotos.map(p => ({
      url: p.webUrl, // Assuming webUrl is the large image URL
      caption: '',
    }));
    setImages(prev => [...prev, ...newImages]);
    setIsPickerOpen(false);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, caption } : img));
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverImage = (url: string) => {
    setCoverImage(url);
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const newImages = [...images];
      const draggedItemContent = newImages.splice(dragItem.current, 1)[0];
      newImages.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setImages(newImages);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Manage Photos for: {album.title}</h2>
        
        <div className={styles.photoGrid}>
          {images.map((image, index) => (
            <div 
              key={index} 
              className={`${styles.photoItem} ${coverImage === image.url ? styles.coverImage : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <img src={image.url} alt={`Album photo ${index + 1}`} className={styles.thumbnail} />
              <textarea
                value={image.caption}
                onChange={(e) => handleCaptionChange(index, e.target.value)}
                placeholder="Enter caption..."
                className={styles.captionInput}
              />
              <div className={styles.photoActions}>
                <button onClick={() => handleSetCoverImage(image.url)}>
                  {coverImage === image.url ? '✓ Cover' : 'Set Cover'}
                </button>
                <button onClick={() => handleRemoveImage(index)}>Remove</button>
              </div>
            </div>
          ))}
          <button onClick={() => setIsPickerOpen(true)} className={styles.addPhotoButton}>
            + Add Photos
          </button>
        </div>
        
        <div className={styles.actions}>
          <button onClick={onClose} disabled={isSaving}>Cancel</button>
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save and Close'}
          </button>
        </div>

        {isPickerOpen && (
          <PhotoPicker
            multiSelect
            onMultiPhotoSelect={handlePhotosSelected}
            onClose={() => setIsPickerOpen(false)}
          />
        )}
      </div>
    </div>
  );
} 
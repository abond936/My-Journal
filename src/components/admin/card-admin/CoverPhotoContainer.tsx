'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Media } from '@/lib/types/photo';
import styles from './CoverPhotoContainer.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PhotoPicker from './PhotoPicker';
import { uploadBrowserFile } from '@/lib/services/images/imageService';

interface CoverPhotoContainerProps {
  coverImage?: Media | null;
  onUpdate: (media: Media | null) => void;
}

export default function CoverPhotoContainer({ coverImage, onUpdate }: CoverPhotoContainerProps) {
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (coverImage?.objectPosition) {
      const [xStr, yStr] = coverImage.objectPosition.split(' ');
      setPosition({ x: parseInt(xStr, 10), y: parseInt(yStr, 10) });
    } else {
      setPosition({ x: 50, y: 50 });
    }
    setHasError(false);
  }, [coverImage]);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Invalid file type. Only images are allowed.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const newMedia = await uploadBrowserFile(file);
      onUpdate(newMedia);
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFileUpload(e.dataTransfer.files?.[0]);
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(e.clipboardData.items).find(item => item.type.startsWith('image/'))?.getAsFile();
    handleFileUpload(file || null);
  };
  const handlePositionChange = (axis: 'x' | 'y', value: number) => setPosition(prev => ({ ...prev, [axis]: value }));
  const handleRepositionSave = () => {
    if (coverImage) {
      const updatedMedia = { ...coverImage, objectPosition: `${position.x}% ${position.y}%` };
      // Note: This only updates the object in parent state. It won't be persisted
      // unless the main card form is saved. Consider if this needs its own update mechanism.
      onUpdate(updatedMedia);
    }
    setIsRepositioning(false);
  };
  
  const handlePickerSelect = (media: Media) => {
    setShowPhotoPicker(false);
    onUpdate(media);
  }

  const isLoading = isUploading;

  return (
    <div className={styles.container} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onPaste={handlePaste} tabIndex={0}>
      <div className={styles.header}>
        <h3 className={styles.title}>Cover Photo</h3>
        <div className={styles.actions}>
          {coverImage && !isRepositioning && (
            <>
              <button type="button" onClick={() => setIsRepositioning(true)} className={styles.button} disabled={isLoading}>Reposition</button>
              <button type="button" onClick={() => setShowPhotoPicker(true)} className={styles.button} disabled={isLoading}>Change</button>
              <button type="button" onClick={() => onUpdate(null)} className={`${styles.button} ${styles.removeButton}`} disabled={isLoading}>Remove</button>
            </>
          )}
          {!coverImage && !isLoading && (
            <button type="button" onClick={() => setShowPhotoPicker(true)} className={styles.button}>
              Add Photo
            </button>
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
        style={{ display: 'none' }}
        accept="image/*"
      />
      {isLoading ? (
        <div className={`${styles.placeholder} ${styles.importing}`}><LoadingSpinner /><div className={styles.placeholderText}>Uploading...</div></div>
      ) : coverImage ? (
        <div className={styles.coverPhoto}>
          {hasError ? <div className={`${styles.placeholder} ${styles.error}`}><div className={styles.placeholderText}>Image not found</div></div> : <img src={getDisplayUrl(coverImage)} alt={coverImage.filename} className={styles.image} style={{ objectPosition: `${position.x}% ${position.y}%` }} onError={() => setHasError(true)} />}
        </div>
      ) : (
        <div className={`${styles.placeholder} ${styles.clickable}`} onClick={() => setShowPhotoPicker(true)}>
          <div className={styles.placeholderText}>{isDragging ? 'Drop image here' : 'Click to add a photo, or drag and drop one here'}</div>
        </div>
      )}
      {uploadError && <div className={styles.errorBanner}>{uploadError}</div>}
      {isRepositioning && (
        <div className={styles.repositionControls}>
          <div className={styles.sliderContainer}><label>Horizontal</label><input type="range" min="0" max="100" value={position.x} onChange={(e) => handlePositionChange('x', Number(e.target.value))} /></div>
          <div className={styles.sliderContainer}><label>Vertical</label><input type="range" min="0" max="100" value={position.y} onChange={(e) => handlePositionChange('y', Number(e.target.value))} /></div>
          <button onClick={handleRepositionSave} className={styles.button}>Done</button>
        </div>
      )}
      {showPhotoPicker && <PhotoPicker onSelect={handlePickerSelect} onClose={() => setShowPhotoPicker(false)} />}
    </div>
  );
} 
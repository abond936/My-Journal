'use client';

import React, { useState, useEffect } from 'react';
import { Media } from '@/lib/types/photo';
import styles from './CoverPhotoContainer.module.css';
import PhotoPicker from './PhotoPicker';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { SlidersHorizontal, Trash2, ImageUp } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface CoverPhotoContainerProps {
  coverPhoto?: Media | null;
  isImporting?: boolean;
  onSelect: (photo: Media) => void;
  onUpload: (file: File) => void;
  onMetadataUpdate: (metadata: Media) => void;
  onRemove: () => void;
}

export default function CoverPhotoContainer({
  coverPhoto,
  isImporting,
  onSelect,
  onUpload,
  onMetadataUpdate,
  onRemove
}: CoverPhotoContainerProps) {
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (coverPhoto?.objectPosition) {
      const [xStr, yStr] = coverPhoto.objectPosition.split(' ');
      setPosition({
        x: parseInt(xStr, 10),
        y: parseInt(yStr, 10),
      });
    } else {
      setPosition({ x: 50, y: 50 });
    }
    // Reset error state when the photo changes
    setHasError(false);
  }, [coverPhoto]);

  const handlePhotoSelect = (photo: Media) => {
    onSelect(photo);
    setShowPhotoPicker(false);
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    setPosition(prev => ({ ...prev, [axis]: value }));
  };

  const handleRepositionSave = () => {
    if (coverPhoto) {
      const updatedPhoto = {
        ...coverPhoto,
        objectPosition: `${position.x}% ${position.y}%`,
      };
      onMetadataUpdate(updatedPhoto);
    }
    setIsRepositioning(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onUpload(file);
      }
    }
  };
  
  const imageStyle = {
    objectPosition: `${position.x}% ${position.y}%`,
  };

  return (
    <div 
      className={styles.container}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>Cover Photo</h3>
        <div className={styles.actions}>
          {coverPhoto && !isRepositioning && (
            <button
              type="button"
              onClick={() => setIsRepositioning(true)}
              className={styles.button}
              disabled={isImporting}
            >
              Reposition
            </button>
          )}
          {coverPhoto ? (
            <>
              {!isRepositioning && (
                <button
                  type="button"
                  onClick={() => setShowPhotoPicker(true)}
                  className={styles.button}
                  disabled={isImporting}
                >
                  Change
                </button>
              )}
              <button
                type="button"
                onClick={onRemove}
                className={`${styles.button} ${styles.removeButton}`}
                disabled={isImporting}
              >
                Remove
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowPhotoPicker(true)}
              className={styles.button}
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Add Cover'}
            </button>
          )}
        </div>
      </div>

      {isImporting ? (
        <div className={`${styles.placeholder} ${styles.importing}`}>
          <LoadingSpinner />
          <div className={styles.placeholderText}>Importing photo...</div>
        </div>
      ) : coverPhoto ? (
        <div className={styles.coverPhoto}>
          {hasError ? (
            <div className={`${styles.placeholder} ${styles.error}`}>
              <div className={styles.placeholderText}>Image not found</div>
            </div>
          ) : (
            <img
              src={getDisplayUrl(coverPhoto)}
              alt={coverPhoto.filename}
              className={styles.image}
              style={imageStyle}
              onError={() => setHasError(true)}
            />
          )}
        </div>
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.placeholderText}>
            {isDragging ? 'Drop image here' : 'No cover photo selected'}
          </div>
          <div className={styles.placeholderSubtext}>
            You can also drag & drop or paste an image
          </div>
        </div>
      )}

      {isRepositioning && coverPhoto && (
        <div className={styles.repositionControls}>
          <div className={styles.sliderContainer}>
            <label>Horizontal</label>
            <input
              type="range"
              min="0"
              max="100"
              value={position.x}
              onChange={(e) => handlePositionChange('x', Number(e.target.value))}
              className={styles.slider}
            />
          </div>
          <div className={styles.sliderContainer}>
            <label>Vertical</label>
            <input
              type="range"
              min="0"
              max="100"
              value={position.y}
              onChange={(e) => handlePositionChange('y', Number(e.target.value))}
              className={styles.slider}
            />
          </div>
          <button onClick={handleRepositionSave} className={styles.button}>Done</button>
        </div>
      )}

      {showPhotoPicker && (
        <PhotoPicker
          onSelect={handlePhotoSelect}
          onClose={() => setShowPhotoPicker(false)}
          mode="single"
        />
      )}
    </div>
  );
} 
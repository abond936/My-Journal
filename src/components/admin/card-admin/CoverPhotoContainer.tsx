'use client';

import React, { useState, useEffect } from 'react';
import styles from './CoverPhotoContainer.module.css';
import { Media } from '@/lib/types/photo';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface CoverPhotoContainerProps {
  className?: string;
  error?: string;
  onChange: (media: Media | null) => void;
  coverImage: Media | null;
}

export default function CoverPhotoContainer({ className, error, onChange, coverImage }: CoverPhotoContainerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);

  useEffect(() => {
    if (coverImage?.objectPosition) {
      const [x, y] = coverImage.objectPosition.split(' ').map(pos => parseInt(pos));
      setHorizontalPosition(x || 50);
      setVerticalPosition(y || 50);
    } else {
      setHorizontalPosition(50);
      setVerticalPosition(50);
    }
  }, [coverImage]);

  const handlePhotoSelect = async (media: Media) => {
    try {
      setIsLoading(true);
      console.log('Selected new photo:', media);
      console.log('Media URL:', media.storageUrl);
      console.log('Full media object:', JSON.stringify(media, null, 2));
      onChange(media);
    } finally {
      setIsLoading(false);
      setIsPickerOpen(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      if (coverImage?.id && coverImage.status === 'temporary') {
        // Delete temporary media if it exists
        await fetch(`/api/images/${coverImage.id}`, {
          method: 'DELETE'
        });
      }
      onChange(null);
    } catch (error) {
      console.error('Error removing cover image:', error);
      // Still remove from form even if delete fails
      onChange(null);
    }
  };

  const handlePositionChange = (horizontal: number, vertical: number) => {
    if (!coverImage) return;
    
    const updatedMedia: Media = {
      ...coverImage,
      objectPosition: `${horizontal}% ${vertical}%`
    };
    onChange(updatedMedia);
  };

  return (
    <div className={`${styles.container} ${className || ''} ${error ? styles.error : ''}`}>
      {isLoading ? (
        <div className={styles.placeholder}>
          <LoadingSpinner />
        </div>
      ) : coverImage && coverImage.storageUrl ? (
        <>
          <div className={styles.imageContainer}>
            <img
              src={coverImage.storageUrl}
              alt={coverImage.filename}
              className={styles.coverImage}
              style={{ objectPosition: `${horizontalPosition}% ${verticalPosition}%` }}
              onLoad={() => {
                console.log('Cover image loaded successfully:', coverImage.storageUrl);
              }}
              onError={(e) => {
                console.error('Failed to load cover image:', e);
                console.log('Failed image details:', {
                  url: coverImage.storageUrl,
                  id: coverImage.id,
                  status: coverImage.status
                });
                onChange(null);
              }}
            />
            <div className={styles.buttonContainer}>
              <button
                onClick={() => setIsPickerOpen(true)}
                className={styles.changeButton}
                type="button"
              >
                Change
              </button>
              <button
                onClick={handleRemovePhoto}
                className={styles.removeButton}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
          <div className={styles.repositionControls}>
            <div className={styles.sliderContainer}>
              <label htmlFor="horizontal-position">Horizontal:</label>
              <input
                id="horizontal-position"
                type="range"
                min="0"
                max="100"
                value={horizontalPosition}
                onChange={(e) => {
                  const newHorizontal = parseInt(e.target.value);
                  setHorizontalPosition(newHorizontal);
                  handlePositionChange(newHorizontal, verticalPosition);
                }}
                className={styles.slider}
              />
            </div>
            <div className={styles.sliderContainer}>
              <label htmlFor="vertical-position">Vertical:</label>
              <input
                id="vertical-position"
                type="range"
                min="0"
                max="100"
                value={verticalPosition}
                onChange={(e) => {
                  const newVertical = parseInt(e.target.value);
                  setVerticalPosition(newVertical);
                  handlePositionChange(horizontalPosition, newVertical);
                }}
                className={styles.slider}
              />
            </div>
          </div>
        </>
      ) : (
        <div className={styles.placeholder}>
          <button
            onClick={() => setIsPickerOpen(true)}
            className={styles.addButton}
            type="button"
          >
            Add Cover Photo
          </button>
        </div>
      )}

      {isPickerOpen && (
        <PhotoPicker
          isOpen={isPickerOpen}
          onSelect={handlePhotoSelect}
          onClose={() => setIsPickerOpen(false)}
          initialMode="single"
        />
      )}
      
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
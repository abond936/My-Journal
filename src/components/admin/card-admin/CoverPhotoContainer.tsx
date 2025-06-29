'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CoverPhotoContainer.module.css';
import { Media } from '@/lib/types/photo';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface CoverPhotoContainerProps {
  coverImage: Media | null;
  objectPosition?: string;
  onChange: (newCoverImage: Media | null, newPosition?: string) => void;
  error?: string;
  className?: string;
  isSaving: boolean;
}

export default function CoverPhotoContainer({ 
  coverImage, 
  objectPosition,
  onChange,
  error,
  className,
  isSaving
}: CoverPhotoContainerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);

  useEffect(() => {
    if (objectPosition) {
      const [x, y] = objectPosition.split(' ').map(pos => parseInt(pos));
      setHorizontalPosition(x || 50);
      setVerticalPosition(y || 50);
    } else {
      setHorizontalPosition(50);
      setVerticalPosition(50);
    }
  }, [objectPosition]);

  const handlePhotoSelect = (media: Media) => {
    setIsPickerOpen(false);
    onChange(media);
  };

  const handleRemovePhoto = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const handlePositionChange = useCallback((horizontal: number, vertical: number) => {
    onChange(coverImage, `${horizontal}% ${vertical}%`);
  }, [onChange, coverImage]);
  
  const displayError = error;

  return (
    <div className={`${styles.container} ${className || ''} ${displayError ? styles.error : ''}`}>
      {isSaving ? (
        <div className={styles.placeholder}>
          <LoadingSpinner />
        </div>
      ) : coverImage ? (
        <>
          <div className={styles.imageContainer}>
            <img
              src={getDisplayUrl(coverImage)}
              alt={coverImage.filename || 'Cover image'}
              className={styles.coverImage}
              style={{ objectPosition: objectPosition || '50% 50%' }}
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
      
      {displayError && <p className={styles.errorText}>{displayError}</p>}
    </div>
  );
}
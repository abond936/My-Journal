'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CoverPhotoContainer.module.css';
import { HydratedGalleryMediaItem } from '@/lib/types/card';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useCardForm } from '@/components/providers/CardFormProvider';

interface CoverPhotoContainerProps {
  className?: string;
}

export default function CoverPhotoContainer({ className }: CoverPhotoContainerProps) {
  const { formState: { cardData, errors, isSaving }, setField } = useCardForm();
  const { coverImage } = cardData;
  
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);

  useEffect(() => {
    if (cardData.coverImageObjectPosition) {
      const [x, y] = cardData.coverImageObjectPosition.split(' ').map(pos => parseInt(pos));
      setHorizontalPosition(x || 50);
      setVerticalPosition(y || 50);
    } else {
      setHorizontalPosition(50);
      setVerticalPosition(50);
    }
  }, [cardData.coverImageObjectPosition]);

  const handlePhotoSelect = (selectedMedia: HydratedGalleryMediaItem) => {
    setIsPickerOpen(false);
    setField('coverImage', selectedMedia.media);
    setField('coverImageId', selectedMedia.mediaId);
  };

  const handleRemovePhoto = useCallback(() => {
    setField('coverImage', null);
    setField('coverImageId', null);
  }, [setField]);

  const handlePositionChange = useCallback((horizontal: number, vertical: number) => {
    setField('coverImageObjectPosition', `${horizontal}% ${vertical}%`);
  }, [setField]);
  
  const displayError = errors.coverImage;

  return (
    <div className={`${styles.container} ${className || ''} ${displayError ? styles.error : ''}`}>
      {isSaving ? (
        <div className={styles.placeholder}>
          <LoadingSpinner />
        </div>
      ) : coverImage && coverImage.storageUrl ? (
        <>
          <div className={styles.imageContainer}>
            <img
              src={coverImage.storageUrl}
              alt={coverImage.filename || 'Cover image'}
              className={styles.coverImage}
              style={{ objectPosition: cardData.coverImageObjectPosition || '50% 50%' }}
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
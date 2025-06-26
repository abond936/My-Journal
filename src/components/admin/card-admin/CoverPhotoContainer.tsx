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

  useEffect(() => {
    console.log('CoverPhotoContainer received coverImage:', coverImage);
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

  useEffect(() => {
    if (coverImage) {
      console.log('CoverPhotoContainer: Displaying image:', {
        id: coverImage.id,
        url: coverImage.storageUrl,
        filename: coverImage.filename,
        source: coverImage.source,
        status: coverImage.status
      });
    }
  }, [coverImage]);

  console.log('CoverPhotoContainer styles:', {
    container: styles.container,
    imageContainer: styles.imageContainer,
    coverImage: styles.coverImage,
    placeholder: styles.placeholder,
    addButton: styles.addButton,
    buttonContainer: styles.buttonContainer,
    changeButton: styles.changeButton,
    removeButton: styles.removeButton
  });

  return (
    <div className={`${styles.container} ${className || ''} ${error ? styles.error : ''}`}>
      {isLoading ? (
        <div className={styles.placeholder}>
          <LoadingSpinner />
        </div>
      ) : coverImage && coverImage.storageUrl ? (
        <div className={styles.imageContainer}>
          <img
            src={coverImage.storageUrl}
            alt={coverImage.filename}
            className={styles.coverImage}
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
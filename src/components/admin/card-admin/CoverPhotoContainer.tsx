'use client';

import React, { useState } from 'react';
import styles from './CoverPhotoContainer.module.css';
import { Media } from '@/lib/types/photo';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';

interface CoverPhotoContainerProps {
  className?: string;
  error?: string;
  onChange: (media: Media | null) => void;
  coverImage: Media | null;
}

export default function CoverPhotoContainer({ className, error, onChange, coverImage }: CoverPhotoContainerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handlePhotoSelect = (media: Media) => {
    onChange(media);
    setIsPickerOpen(false);
  };

  return (
    <div className={`${styles.container} ${className || ''} ${error ? styles.error : ''}`}>
      {coverImage ? (
        <div className={styles.imageContainer}>
          <img
            src={coverImage.url}
            alt={coverImage.alt || 'Cover image'}
            className={styles.coverImage}
            style={{ objectPosition: coverImage.objectPosition || 'center' }}
          />
          <button
            onClick={() => onChange(null)}
            className={styles.removeButton}
            type="button"
            aria-label="Remove cover image"
          >
            Remove
          </button>
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

      <PhotoPicker
        isOpen={isPickerOpen}
        onSelect={handlePhotoSelect}
        onClose={() => setIsPickerOpen(false)}
        initialMode="single"
      />
      
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
} 
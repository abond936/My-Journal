'use client';

import { useState } from 'react';
import { PhotoMetadata } from '@/lib/services/photos/photoService';
import PhotoPicker from '@/components/PhotoPicker';
import styles from './CoverPhotoContainer.module.css';

interface CoverPhotoContainerProps {
  coverPhoto?: PhotoMetadata;
  onCoverPhotoSelect: (photo: PhotoMetadata) => void;
  onCoverPhotoRemove: () => void;
}

export default function CoverPhotoContainer({
  coverPhoto,
  onCoverPhotoSelect,
  onCoverPhotoRemove
}: CoverPhotoContainerProps) {
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  const handlePhotoSelect = (photo: PhotoMetadata) => {
    onCoverPhotoSelect(photo);
    setShowPhotoPicker(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Cover Photo</h3>
        <div className={styles.actions}>
          {coverPhoto ? (
            <>
              <button
                type="button"
                onClick={() => setShowPhotoPicker(true)}
                className={styles.button}
              >
                Change Cover
              </button>
              <button
                type="button"
                onClick={onCoverPhotoRemove}
                className={`${styles.button} ${styles.removeButton}`}
              >
                Remove
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowPhotoPicker(true)}
              className={styles.button}
            >
              Add Cover Photo
            </button>
          )}
        </div>
      </div>

      {coverPhoto ? (
        <div className={styles.coverPhoto}>
          <img
            src={coverPhoto.previewUrl}
            alt={coverPhoto.filename}
            className={styles.image}
          />
          {coverPhoto.caption && (
            <div className={styles.caption}>{coverPhoto.caption}</div>
          )}
        </div>
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.placeholderText}>
            No cover photo selected
          </div>
        </div>
      )}

      {showPhotoPicker && (
        <PhotoPicker
          onPhotoSelect={handlePhotoSelect}
          onClose={() => setShowPhotoPicker(false)}
        />
      )}
    </div>
  );
} 
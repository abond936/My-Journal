'use client';

import { useState, useEffect } from 'react';
import { PhotoMetadata } from '@/lib/types/photo';
import PhotoPicker from '@/components/PhotoPicker';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './CoverPhotoContainer.module.css';

interface CoverPhotoContainerProps {
  coverPhoto?: PhotoMetadata | null;
  onCoverPhotoSelect: (photo: PhotoMetadata) => void;
  onCoverPhotoRemove: () => void;
}

export default function CoverPhotoContainer({
  coverPhoto,
  onCoverPhotoSelect,
  onCoverPhotoRemove
}: CoverPhotoContainerProps) {
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

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
  }, [coverPhoto]);

  const handlePhotoSelect = (photo: PhotoMetadata) => {
    onCoverPhotoSelect(photo);
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
      onCoverPhotoSelect(updatedPhoto);
    }
    setIsRepositioning(false);
  };

  const imageStyle = {
    objectPosition: `${position.x}% ${position.y}%`,
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Cover Photo</h3>
        <div className={styles.actions}>
          {coverPhoto && !isRepositioning && (
            <button
              type="button"
              onClick={() => setIsRepositioning(true)}
              className={styles.button}
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
                >
                  Change
                </button>
              )}
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
              Add Cover
            </button>
          )}
        </div>
      </div>

      {coverPhoto ? (
        <div className={styles.coverPhoto}>
          <img
            src={getDisplayUrl(coverPhoto)}
            alt={coverPhoto.filename}
            className={styles.image}
            style={imageStyle}
          />
        </div>
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.placeholderText}>
            No cover photo selected
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
          onPhotoSelect={handlePhotoSelect}
          onClose={() => setShowPhotoPicker(false)}
          initialMode="single"
        />
      )}
    </div>
  );
} 
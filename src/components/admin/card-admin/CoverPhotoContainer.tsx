'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import JournalImage from '@/components/common/JournalImage';
import styles from './CoverPhotoContainer.module.css';
import { Media } from '@/lib/types/photo';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { getImageFileFromDataTransfer } from '@/lib/utils/clipboardImage';
import { getAspectRatioBucket } from '@/lib/utils/objectPositionUtils';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface CoverPhotoContainerProps {
  coverImage: Media | null;
  objectPosition?: string;
  onChange: (newCoverImage: Media | null, newPosition?: string) => void;
  onCommit?: (newCoverImage: Media | null, newPosition?: string) => void;
  error?: string;
  className?: string;
  isSaving: boolean;
  /** Disable local save overlay when a global save indicator is active. */
  showSavingOverlay?: boolean;
  /** Narrow Library tab in photo picker to media matching these card tags. */
  filterTagIds?: string[];
}

export default function CoverPhotoContainer({ 
  coverImage, 
  objectPosition,
  onChange,
  onCommit,
  error,
  className,
  isSaving,
  showSavingOverlay = true,
  filterTagIds,
}: CoverPhotoContainerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const latestHorizontalRef = useRef(50);
  const latestVerticalRef = useRef(50);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/images/browser', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        const media: Media = data.media ?? data;
        if (!media?.docId) throw new Error('Invalid response');
        onChange(media, '50% 50%');
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif'] },
    maxFiles: 1,
    multiple: false,
    disabled: isSaving || isUploading,
    noClick: true,
  });

  useEffect(() => {
    if (objectPosition) {
      const parts = objectPosition.trim().split(/\s+/);
      const x = parseFloat(parts[0] ?? '50') || 50;
      const y = parseFloat(parts[1] ?? '50') || 50;
      setHorizontalPosition(Math.round(x));
      setVerticalPosition(Math.round(y));
      latestHorizontalRef.current = Math.round(x);
      latestVerticalRef.current = Math.round(y);
    } else {
      setHorizontalPosition(50);
      setVerticalPosition(50);
      latestHorizontalRef.current = 50;
      latestVerticalRef.current = 50;
    }
  }, [objectPosition]);

  useEffect(() => {
    const el = pasteAreaRef.current;
    if (!el) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = getImageFileFromDataTransfer(e.clipboardData);
      if (file) {
        e.preventDefault();
        uploadFile(file);
      }
    };
    el.addEventListener('paste', onPaste);
    return () => el.removeEventListener('paste', onPaste);
  }, [uploadFile]);

  const swallowButtonEvent = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  const handlePhotoSelect = (media: Media) => {
    setIsPickerOpen(false);
    onChange(media, '50% 50%');
  };

  const handleRemovePhoto = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    swallowButtonEvent(e);
    setHorizontalPosition(50);
    setVerticalPosition(50);
    onChange(null, '50% 50%');
  }, [onChange, swallowButtonEvent]);

  const handleOpenPicker = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    swallowButtonEvent(e);
    setIsPickerOpen(true);
  }, [swallowButtonEvent]);

  const handlePositionChange = useCallback((horizontal: number, vertical: number) => {
    onChange(coverImage, `${horizontal}% ${vertical}%`);
  }, [onChange, coverImage]);

  const commitPositionChange = useCallback((horizontal: number, vertical: number) => {
    onCommit?.(coverImage, `${horizontal}% ${vertical}%`);
  }, [coverImage, onCommit]);
  
  const displayError = error || portraitError || uploadError;
  const coverBucket = getAspectRatioBucket(coverImage);
  const coverFrameClass =
    coverBucket === 'landscape'
      ? styles.imageLandscape
      : coverBucket === 'square'
        ? styles.imageSquare
        : styles.imagePortrait;

  return (
    <div
      ref={pasteAreaRef}
      tabIndex={isSaving || isUploading ? -1 : 0}
      role="group"
      aria-label="Cover image: drop, paste, or browse"
      className={`${styles.pasteTargetWrap} ${className || ''}`}
    >
      <div
        {...getRootProps({
          className: `${styles.container} ${displayError ? styles.error : ''} ${isDragActive ? styles.containerDragActive : ''}`,
        })}
        data-testid="cover-dropzone"
      >
        <input {...getInputProps()} />
      <h4 className={styles.sectionTitle}>Cover</h4>
      {coverImage ? (
        <>
          <div className={`${styles.imageContainer} ${coverFrameClass}`} style={{ position: 'relative' }}>
            {isDragActive && (
              <div className={styles.dropOverlay}>
                Drop to replace cover
              </div>
            )}
            {isSaving && showSavingOverlay && (
              <div className={styles.savingOverlay} aria-label="Saving cover image changes">
                <LoadingSpinner />
              </div>
            )}
            <JournalImage
              src={getDisplayUrl(coverImage)}
              alt={coverImage.filename || 'Cover image'}
              className={styles.coverImage}
              width={600}
              height={450}
              sizes="(max-width: 768px) 100vw, 600px"
              style={{
                objectPosition: objectPosition || '50% 50%',
                objectFit: 'cover',
              }}
              priority={false}
            />
            <div className={styles.buttonContainer}>
              <button
                onMouseDown={swallowButtonEvent}
                onClick={handleOpenPicker}
                className={styles.changeButton}
                type="button"
                disabled={isSaving || isUploading}
              >
                Change
              </button>
              <button
                onMouseDown={swallowButtonEvent}
                onClick={handleRemovePhoto}
                className={styles.removeButton}
                type="button"
                disabled={isSaving || isUploading}
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
                  latestHorizontalRef.current = newHorizontal;
                  setHorizontalPosition(newHorizontal);
                  handlePositionChange(newHorizontal, verticalPosition);
                }}
                onPointerUp={() =>
                  commitPositionChange(latestHorizontalRef.current, latestVerticalRef.current)
                }
                onBlur={() =>
                  commitPositionChange(latestHorizontalRef.current, latestVerticalRef.current)
                }
                className={styles.slider}
                disabled={isSaving || isUploading}
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
                  latestVerticalRef.current = newVertical;
                  setVerticalPosition(newVertical);
                  handlePositionChange(horizontalPosition, newVertical);
                }}
                onPointerUp={() =>
                  commitPositionChange(latestHorizontalRef.current, latestVerticalRef.current)
                }
                onBlur={() =>
                  commitPositionChange(latestHorizontalRef.current, latestVerticalRef.current)
                }
                className={styles.slider}
                disabled={isSaving || isUploading}
              />
            </div>
          </div>
        </>
      ) : (
        <div
          className={`${styles.placeholder} ${isDragActive ? styles.placeholderDragActive : ''}`}
          style={{ cursor: isUploading ? 'wait' : 'pointer', outline: 'none' }}
        >
          {isUploading ? (
            <>
              <LoadingSpinner />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <p className={styles.dropHint}>
                {isDragActive ? 'Drop the image here' : 'Drag and drop or paste image'}
              </p>
              <button
                onMouseDown={swallowButtonEvent}
                onClick={handleOpenPicker}
                className={styles.addButton}
                type="button"
              >
                Or browse folders
              </button>
            </>
          )}
        </div>
      )}
      </div>

      {isPickerOpen && (
        <PhotoPicker
          isOpen={isPickerOpen}
          onSelect={handlePhotoSelect}
          onClose={() => { setIsPickerOpen(false); setPortraitError(null); }}
          initialMode="single"
          filterTagIds={filterTagIds}
        />
      )}

      {displayError && <p className={styles.errorText}>{displayError}</p>}
    </div>
  );
}

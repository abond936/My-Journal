'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronDown, ChevronUp, ImageIcon, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import JournalImage from '@/components/common/JournalImage';
import styles from './CoverPhotoContainer.module.css';
import { Media } from '@/lib/types/photo';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import { getImageFileFromDataTransfer } from '@/lib/utils/clipboardImage';
import { getAspectRatioBucket, getAspectRatioValue } from '@/lib/utils/objectPositionUtils';
import ComposeFeedTilePreview from '@/components/admin/studio/cards/ComposeFeedTilePreview';
import PhotoPicker from '@/components/admin/studio/cards/PhotoPicker';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useMedia } from '@/components/providers/MediaProvider';

const COVER_FIT_MODE_HINT =
  'Fit preserves the full image inside the frame. Position sliders apply only to Fill mode.';

interface CoverPhotoContainerProps {
  coverImage: Media | null;
  coverImageMode?: 'fill' | 'fit';
  layoutMode?: 'default' | 'studioCompact';
  objectPosition?: string;
  onChange: (newCoverImage: Media | null, newPosition?: string) => void;
  onCommit?: (newCoverImage: Media | null, newPosition?: string) => void;
  onCoverModeChange?: (mode: 'fill' | 'fit') => void;
  onCoverModeCommit?: (mode: 'fill' | 'fit') => void;
  error?: string;
  className?: string;
  isSaving: boolean;
  /** Disable local save overlay when a global save indicator is active. */
  showSavingOverlay?: boolean;
  /** Narrow Library tab in photo picker to media matching these card tags. */
  filterTagIds?: string[];
  onOpenMediaEditor?: (mediaId: string) => void;
  /** Live card snapshot for closed feed tile preview (Compose). */
  feedPreviewCard?: Card | null;
  /** Tags for feed tile preview chip row. */
  feedPreviewTags?: Tag[];
}

export default function CoverPhotoContainer({ 
  coverImage, 
  coverImageMode = 'fill',
  layoutMode = 'default',
  objectPosition,
  onChange,
  onCommit,
  onCoverModeChange,
  onCoverModeCommit,
  error,
  className,
  isSaving,
  showSavingOverlay = true,
  filterTagIds,
  onOpenMediaEditor,
  feedPreviewCard,
  feedPreviewTags = [],
}: CoverPhotoContainerProps) {
  const { registerCreatedMedia } = useMedia();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [feedPreviewOpen, setFeedPreviewOpen] = useState(true);
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
        registerCreatedMedia(media);
        onChange(media, '50% 50%');
        void onCommit?.(media, '50% 50%');
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, onCommit, registerCreatedMedia]
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
    void onCommit?.(media, '50% 50%');
  };

  const handleRemovePhoto = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    swallowButtonEvent(e);
    setHorizontalPosition(50);
    setVerticalPosition(50);
    onChange(null, '50% 50%');
    void onCommit?.(null, '50% 50%');
  }, [onChange, onCommit, swallowButtonEvent]);

  const handleOpenPicker = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    swallowButtonEvent(e);
    setIsPickerOpen(true);
  }, [swallowButtonEvent]);

  const handleOpenMediaEditor = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    swallowButtonEvent(e);
    if (!coverImage?.docId) return;
    onOpenMediaEditor?.(coverImage.docId);
  }, [coverImage?.docId, onOpenMediaEditor, swallowButtonEvent]);

  const handlePositionChange = useCallback((horizontal: number, vertical: number) => {
    onChange(coverImage, `${horizontal}% ${vertical}%`);
  }, [onChange, coverImage]);

  const commitPositionChange = useCallback((horizontal: number, vertical: number) => {
    onCommit?.(coverImage, `${horizontal}% ${vertical}%`);
  }, [coverImage, onCommit]);

  const handleCoverModeSelect = useCallback(
    (mode: 'fill' | 'fit') => {
      if (mode === coverImageMode) return;
      onCoverModeChange?.(mode);
      onCoverModeCommit?.(mode);
    },
    [coverImageMode, onCoverModeChange, onCoverModeCommit]
  );
  
  const displayError = error || portraitError || uploadError;
  const coverBucket = getAspectRatioBucket(coverImage);
  const coverFrameRatio = getAspectRatioValue(coverBucket);

  const resolvedFeedPreviewCard = feedPreviewCard
    ? {
        ...feedPreviewCard,
        coverImage: coverImage ?? feedPreviewCard.coverImage ?? undefined,
        coverImageMode: coverImageMode ?? feedPreviewCard.coverImageMode,
        coverImageFocalPoint:
          coverImage?.width && coverImage?.height
            ? {
                x: (horizontalPosition / 100) * coverImage.width,
                y: (verticalPosition / 100) * coverImage.height,
              }
            : feedPreviewCard.coverImageFocalPoint,
      }
    : null;
  const showFeedPreviewPanel = Boolean(resolvedFeedPreviewCard);

  /** Compose preview: same raw focal % as the main cover frame so sliders track live. */
  const feedPreviewCoverObjectPosition = useMemo(() => {
    if (coverImageMode === 'fit' || !coverImage) return 'center';
    return `${horizontalPosition}% ${verticalPosition}%`;
  }, [coverImage, coverImageMode, horizontalPosition, verticalPosition]);

  const repositionControls = (
    <div
      className={`${styles.repositionControls} ${layoutMode === 'studioCompact' ? styles.repositionControlsStudioCompact : ''} ${showFeedPreviewPanel ? styles.repositionControlsInFeedRow : ''}`}
    >
      <div
        className={`${styles.coverModeControls} ${layoutMode === 'studioCompact' ? styles.coverModeControlsStudioCompact : ''}`}
      >
        <span className={styles.coverModeLabelRow}>
          <span className={styles.coverModeLabel}>Framing:</span>
          {coverImageMode === 'fit' ? (
            <button
              type="button"
              className={styles.coverModeInfoButton}
              aria-label="Fit framing help"
              title={COVER_FIT_MODE_HINT}
            >
              <Info size={14} aria-hidden="true" />
            </button>
          ) : null}
        </span>
        <div className={styles.coverModeButtonRow}>
          <button
            type="button"
            className={`${styles.coverModeButton} ${coverImageMode === 'fill' ? styles.coverModeButtonActive : ''}`}
            onMouseDown={swallowButtonEvent}
            onClick={(e) => {
              swallowButtonEvent(e);
              handleCoverModeSelect('fill');
            }}
            disabled={isSaving || isUploading}
          >
            Fill
          </button>
          <button
            type="button"
            className={`${styles.coverModeButton} ${coverImageMode === 'fit' ? styles.coverModeButtonActive : ''}`}
            onMouseDown={swallowButtonEvent}
            onClick={(e) => {
              swallowButtonEvent(e);
              handleCoverModeSelect('fit');
            }}
            disabled={isSaving || isUploading}
          >
            Fit
          </button>
        </div>
      </div>
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
          disabled={isSaving || isUploading || coverImageMode === 'fit'}
          title={coverImageMode === 'fit' ? COVER_FIT_MODE_HINT : undefined}
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
          disabled={isSaving || isUploading || coverImageMode === 'fit'}
          title={coverImageMode === 'fit' ? COVER_FIT_MODE_HINT : undefined}
        />
      </div>
    </div>
  );

  const readerPreviewPanel = showFeedPreviewPanel ? (
    <div className={styles.feedPreviewPanel}>
      <button
        type="button"
        className={styles.feedPreviewToggle}
        aria-expanded={feedPreviewOpen}
        onClick={() => setFeedPreviewOpen((open) => !open)}
      >
        <span>Reader preview</span>
        {feedPreviewOpen ? (
          <ChevronUp size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
      </button>
      {feedPreviewOpen ? (
        <div
          className={`${styles.feedPreviewRow} ${layoutMode === 'studioCompact' ? styles.feedPreviewRowStudioCompact : styles.feedPreviewRowDefault}`}
        >
          {resolvedFeedPreviewCard ? (
            <ComposeFeedTilePreview
              card={resolvedFeedPreviewCard}
              allTags={feedPreviewTags}
              coverObjectPosition={feedPreviewCoverObjectPosition}
            />
          ) : null}
          {coverImage ? repositionControls : null}
        </div>
      ) : null}
    </div>
  ) : null;

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
          className: `${styles.container} ${layoutMode === 'studioCompact' ? styles.containerStudioCompact : ''} ${displayError ? styles.error : ''} ${isDragActive ? styles.containerDragActive : ''}`,
        })}
        data-testid="cover-dropzone"
      >
        <input {...getInputProps()} />
      <h4 className={styles.sectionTitle}>Cover</h4>
      {coverImage ? (
        <>
          <div
            className={`${styles.imageContainer} ${layoutMode === 'studioCompact' ? styles.imageContainerStudioCompact : ''}`}
            style={{ position: 'relative', aspectRatio: coverFrameRatio }}
          >
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
              src={getStudioDisplayUrl(coverImage)}
              alt={coverImage.filename || 'Cover image'}
              className={styles.coverImage}
              width={600}
              height={450}
              sizes="(max-width: 768px) 100vw, 600px"
              style={{
                objectPosition: objectPosition || '50% 50%',
                objectFit: coverImageMode === 'fit' ? 'contain' : 'cover',
              }}
              priority={false}
            />
            <div className={styles.buttonContainer}>
              {coverImage?.docId && onOpenMediaEditor ? (
                <button
                  onMouseDown={swallowButtonEvent}
                  onClick={handleOpenMediaEditor}
                  className={styles.jumpButton}
                  type="button"
                  disabled={isSaving || isUploading}
                  aria-label="Open cover image in media editor"
                  title="Open cover image in media editor"
                >
                  <ImageIcon size={16} aria-hidden="true" />
                </button>
              ) : null}
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
          {readerPreviewPanel ?? repositionControls}
        </>
      ) : (
        <>
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
          {readerPreviewPanel}
        </>
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

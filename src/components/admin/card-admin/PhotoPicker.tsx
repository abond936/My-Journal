'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getFolderTree, getFolderContents } from '@/lib/services/images/local/photoService';
import { Media, TreeNode } from '@/lib/types/photo';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './PhotoPicker.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface PhotoPickerProps {
  isOpen: boolean;
  onSelect: (media: Media) => void;
  onMultiSelect?: (media: Media[]) => void;
  onClose: () => void;
  initialMode?: 'single' | 'multi';
}

export default function PhotoPicker({ 
  isOpen,
  onSelect, 
  onMultiSelect, 
  onClose, 
  initialMode = 'single',
}: PhotoPickerProps) {
  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [photos, setPhotos] = useState<Media[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode] = useState<'single' | 'multi'>(initialMode);

  const loadFolderTree = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tree = await getFolderTree();
      setFolderTree(tree);
      if (tree.length > 0) {
        setSelectedFolder(tree[0].id);
      }
    } catch (err) {
      setError('Failed to load folder structure. Please try again.');
      console.error('Error loading folder tree:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPhotos = useCallback(async (folderId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const contents = await getFolderContents(folderId);
      setPhotos(contents);
    } catch (err) {
      setError('Failed to load photos. Please try again.');
      console.error('Error loading photos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPhotos([]);
      setError(null);
      loadFolderTree();
    }
  }, [isOpen, loadFolderTree]);

  // Load photos when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadPhotos(selectedFolder);
    }
  }, [selectedFolder, loadPhotos]);

  const handleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedPhotos([]);
    setError(null);
  }, []);

  const handlePhotoSelect = useCallback((photo: Media) => {
    if (mode === 'single') {
      onSelect(photo);
    } else {
      setSelectedPhotos(prev => {
        const isSelected = prev.some(p => p.id === photo.id);
        if (isSelected) {
          return prev.filter(p => p.id !== photo.id);
        } else {
          return [...prev, photo];
        }
      });
    }
  }, [mode, onSelect]);

  const handleDone = useCallback(() => {
    if (mode === 'multi' && onMultiSelect) {
      onMultiSelect(selectedPhotos);
    }
    onClose();
  }, [mode, onMultiSelect, selectedPhotos, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Select Photo</h2>
          <button 
            onClick={onClose} 
            className={styles.closeButton} 
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
            <button 
              onClick={() => selectedFolder ? loadPhotos(selectedFolder) : loadFolderTree()} 
              className={styles.retryButton}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.albumList}>
            <h3 className={styles.albumTitle}>Albums</h3>
            {folderTree.map(folder => (
              <div
                key={folder.id}
                className={`${styles.albumItem} ${selectedFolder === folder.id ? styles.albumItemSelected : ''}`}
                onClick={() => handleFolderSelect(folder.id)}
                role="button"
                tabIndex={0}
              >
                {folder.name}
              </div>
            ))}
          </div>

          <div className={styles.photoGrid}>
            {isLoading ? (
              <div className={styles.loading}>
                <LoadingSpinner />
              </div>
            ) : photos.length === 0 ? (
              <div className={styles.noContent}>
                No photos in this album
              </div>
            ) : (
              <div className={styles.grid}>
                {photos.map(photo => {
                  const isSelected = mode === 'multi' 
                    ? selectedPhotos.some(p => p.id === photo.id)
                    : false;
                  
                  return (
                    <div
                      key={photo.id}
                      className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''}`}
                      onClick={() => handlePhotoSelect(photo)}
                      role="button"
                      tabIndex={0}
                    >
                      <img
                        src={getDisplayUrl(photo)}
                        alt={photo.alt || ''}
                        className={styles.photoImage}
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className={styles.checkmark} aria-hidden="true">✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {mode === 'multi' && (
          <div className={styles.footer}>
            <button
              onClick={handleDone}
              className={styles.doneButton}
              disabled={selectedPhotos.length === 0}
              type="button"
            >
              Done ({selectedPhotos.length} selected)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
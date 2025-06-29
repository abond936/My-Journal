'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getFolderTree, getFolderContents } from '@/lib/services/images/local/photoService';
import { Media, TreeNode } from '@/lib/types/photo';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './PhotoPicker.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { importLocalFile } from '@/lib/services/images/imageService';
import { HydratedGalleryMediaItem } from '@/lib/types/card';

interface PhotoPickerProps {
  isOpen: boolean;
  onSelect: (media: HydratedGalleryMediaItem) => void;
  onMultiSelect?: (media: HydratedGalleryMediaItem[]) => void;
  onClose: () => void;
  initialMode?: 'single' | 'multi';
}

interface FolderItemProps {
  node: TreeNode;
  selectedFolder: string | null;
  onSelect: (folderId: string) => void;
  level?: number;
}

const FolderItem = ({ node, selectedFolder, onSelect, level = 0 }: FolderItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={styles.treeNode} style={{ marginLeft: `${level * 8}px` }}>
      <div className={styles.treeNodeHeader}>
        {hasChildren && (
          <button
            className={styles.treeToggle}
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        <div
          className={`${styles.treeNodeName} ${selectedFolder === node.id ? styles.treeNodeSelected : ''}`}
          onClick={() => onSelect(node.id)}
          role="button"
          tabIndex={0}
        >
          {node.name}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className={styles.treeChildren}>
          {node.children.map(child => (
            <FolderItem
              key={child.id}
              node={child}
              selectedFolder={selectedFolder}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode] = useState<'single' | 'multi'>(initialMode);

  const loadFolderTree = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tree = await getFolderTree();
      console.log('Loaded folder tree:', tree);
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

  useEffect(() => {
    if (isOpen) {
      setSelectedPhotos([]);
      setError(null);
      loadFolderTree();
    }
  }, [isOpen, loadFolderTree]);

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

  const handleDone = useCallback(async () => {
    if (selectedPhotos.length === 0) return;
    
    try {
      setIsImporting(true);
      setError(null);

      // Import all selected photos
      const importPromises = selectedPhotos.map(async (photo) => {
        const response = await fetch('/api/images/local/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourcePath: photo.sourcePath })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to import image: ${errorText}`);
        }

        return await response.json();
      });

      const importedMedia: Media[] = await Promise.all(importPromises);
      console.log('Successfully imported media:', importedMedia);

      // Transform the imported Media objects into HydratedGalleryMediaItems
      const hydratedItems: HydratedGalleryMediaItem[] = importedMedia.map(media => ({
        mediaId: media.id,
        order: 0, // Default order, can be adjusted later if needed
        media: media,
      }));

      if (mode === 'single' && hydratedItems.length > 0) {
        onSelect(hydratedItems[0]);
      } else if (mode === 'multi' && onMultiSelect) {
        onMultiSelect(hydratedItems);
      }
      onClose();
    } catch (error) {
      console.error('Error importing photos:', error);
      setError(error instanceof Error ? error.message : 'Failed to import photos');
    } finally {
      setIsImporting(false);
    }
  }, [mode, onSelect, onMultiSelect, onClose, selectedPhotos]);

  const handlePhotoSelect = useCallback((photo: Photo) => {
    if (mode === 'single') {
      setSelectedPhotos([photo]);
      handleDone();
    } else {
      // Toggle selection for multi-select mode
      setSelectedPhotos(prev => {
        const isSelected = prev.some(p => p.sourcePath === photo.sourcePath);
        if (isSelected) {
          return prev.filter(p => p.sourcePath !== photo.sourcePath);
        } else {
          return [...prev, photo];
        }
      });
    }
  }, [mode, handleDone]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Select Photos</h2>
          <button 
            onClick={onClose} 
            className={styles.closeButton} 
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.albumList}>
            <h3 className={styles.albumTitle}>Albums</h3>
            {folderTree.map(node => (
              <FolderItem
                key={node.id}
                node={node}
                selectedFolder={selectedFolder}
                onSelect={handleFolderSelect}
              />
            ))}
          </div>

          <div className={styles.photoGrid}>
            {isLoading ? (
              <div className={styles.loading}>
                <LoadingSpinner />
                <p>Loading photos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className={styles.noContent}>
                No photos in this album
              </div>
            ) : (
              <div className={styles.grid}>
                {photos.map(photo => {
                  const isSelected = selectedPhotos.some(p => p.sourcePath === photo.sourcePath);
                  
                  return (
                    <div
                      key={photo.id}
                      className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''}`}
                      onClick={() => !isImporting && handlePhotoSelect(photo)}
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

        <div className={styles.footer}>
          <button
            onClick={handleDone}
            className={styles.doneButton}
            disabled={selectedPhotos.length === 0 || isImporting}
            type="button"
          >
            {isImporting ? (
              <>
                <LoadingSpinner size="small" />
                <span>Importing {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}...</span>
              </>
            ) : (
              `Add ${selectedPhotos.length} Photo${selectedPhotos.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
            <button 
              onClick={() => {
                setError(null);
                if (isImporting) {
                  handleDone();
                } else if (selectedFolder) {
                  loadPhotos(selectedFolder);
                } else {
                  loadFolderTree();
                }
              }}
              className={styles.retryButton}
              type="button"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { getFolderTree, getFolderContents } from '@/lib/services/images/local/photoService';
import { Media, TreeNode } from '@/lib/types/photo';
import { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './PhotoPicker.module.css';

interface PhotoPickerProps {
  isOpen: boolean;
  /**
   * For single-select mode the picker returns a plain Media object.
   * It is optional so callers that only use multi-select (gallery) don't need to pass it.
   */
  onSelect?: (media: Media) => void;
  /** For multi-select mode the picker returns an array of HydratedGalleryMediaItems */
  onMultiSelect?: (media: HydratedGalleryMediaItem[]) => void;
  onClose: () => void;
  initialMode?: 'single' | 'multi';
}

interface FolderItemProps {
  node: TreeNode;
  selectedFolder: string | null;
  expandedFolders: Set<string>;
  onSelect: (folderId: string) => void;
  onToggle: (folderId: string) => void;
  level?: number;
}

const FolderItem = ({ 
  node, 
  selectedFolder, 
  expandedFolders, 
  onSelect, 
  onToggle, 
  level = 0 
}: FolderItemProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedFolder === node.id;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  return (
    <div className={styles.treeNode} style={{ marginLeft: `${level * 8}px` }}>
      <div 
        className={`${styles.treeNodeHeader} ${isSelected ? styles.treeNodeSelected : ''}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        role="button"
        tabIndex={0}
        style={{ 
          backgroundColor: isSelected ? '#f0f0f0' : 'transparent',
          cursor: 'pointer'
        }}
      >
        <span className={styles.folderIcon}>
          📁
        </span>
        <div className={styles.treeNodeName}>
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
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggle={onToggle}
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
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Media[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode] = useState<'single' | 'multi'>(initialMode);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Check if folder should be auto-collapsed
  const shouldAutoCollapse = (folderName: string) => {
    return folderName === 'xNormalized' || 
           folderName === 'yEdited' || 
           folderName === 'zOriginals';
  };

  const loadFolderTree = useCallback(async () => {
    try {
      setIsLoadingFolders(true);
      setError(null);
      const tree = await getFolderTree();
      setFolderTree(tree);
      
      // Debug logging
      console.log('Full tree structure:', JSON.stringify(tree, null, 2));
      console.log('All folder names:', tree.map(node => node.name));
      
      // Initialize expansion state - expand all except processing folders
      const initialExpanded = new Set<string>();
      const addToExpanded = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          console.log(`Checking folder: "${node.name}" - shouldAutoCollapse: ${shouldAutoCollapse(node.name)}`);
          if (!shouldAutoCollapse(node.name)) {
            initialExpanded.add(node.id);
            console.log(`Added to expanded: "${node.name}" (${node.id})`);
          } else {
            console.log(`NOT added to expanded (auto-collapsed): "${node.name}" (${node.id})`);
          }
          if (node.children) {
            addToExpanded(node.children);
          }
        });
      };
      addToExpanded(tree);
      console.log('Final expanded folders:', Array.from(initialExpanded));
      setExpandedFolders(initialExpanded);
      
      if (tree.length > 0) {
        setSelectedFolder(tree[0].id);
      }
    } catch (err) {
      setError('Failed to load folder structure. Please try again.');
      console.error('Error loading folder tree:', err);
    } finally {
      setIsLoadingFolders(false);
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

  const handleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedPhotos([]);
    setError(null);
  }, []);

  const handleFolderToggle = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
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

      const importedResults: { mediaId: string; media: Media }[] = await Promise.all(importPromises);

      if (mode === 'single') {
        if (importedResults.length > 0 && onSelect) {
          onSelect(importedResults[0].media);
        }
      } else if (mode === 'multi' && onMultiSelect) {
        const hydratedItems: HydratedGalleryMediaItem[] = importedResults.map(res => ({
          mediaId: res.mediaId,
          order: 0,
          media: res.media,
        }));
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

  const handlePhotoSelect = useCallback((photo: Media) => {
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
            {isLoadingFolders ? (
              <div className={styles.loading}>
                <LoadingSpinner />
                <p>Loading folders...</p>
              </div>
            ) : (
              folderTree.map(node => (
                <FolderItem
                  key={node.id}
                  node={node}
                  selectedFolder={selectedFolder}
                  expandedFolders={expandedFolders}
                  onSelect={handleFolderSelect}
                  onToggle={handleFolderToggle}
                />
              ))
            )}
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
                      <Image
                        src={getDisplayUrl(photo)}
                        alt={photo.alt || ''}
                        className={styles.photoImage}
                        width={150}
                        height={150}
                        sizes="150px"
                        priority={false}
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
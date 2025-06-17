'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PhotoService } from '@/lib/services/photos/photoService';
import { PhotoMetadata, TreeNode } from '@/lib/types/photo'; // Import directly from the source
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from '@/components/common/PhotoPicker.module.css';

const photoService = new PhotoService(); // Instantiate service once

interface PhotoPickerProps {
  onPhotoSelect?: (photo: PhotoMetadata) => void;
  onMultiPhotoSelect?: (photos: PhotoMetadata[]) => void;
  onClose: () => void;
  initialMode?: 'single' | 'multi'; // New prop
}

const FolderTree = ({ nodes, onSelect, selectedId }: { nodes: TreeNode[], onSelect: (node: TreeNode) => void, selectedId: string | null }) => {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (nodeId: string) => {
    setOpenFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderNodes = (nodesToRender: TreeNode[], level = 0) => {
    return (
      <ul className={styles.tree} style={{ paddingLeft: `${level * 15}px` }}>
        {nodesToRender.map(node => {
          const isOpen = openFolders.has(node.id);
          const hasChildren = node.children && node.children.length > 0;
          return (
            <li key={node.id}>
              <div className={`${styles.treeNode} ${selectedId === node.id ? styles.treeNodeSelected : ''}`}>
                {hasChildren && (
                  <span onClick={() => toggleFolder(node.id)} className={styles.treeToggle}>
                    {isOpen ? '▼' : '►'}
                  </span>
                )}
                <span onClick={() => onSelect(node)} className={styles.treeNodeName}>
                  {node.name}
                </span>
              </div>
              {hasChildren && isOpen && (
                renderNodes(node.children, level + 1)
              )}
            </li>
          );
        })}
      </ul>
    );
  };
  
  return renderNodes(nodes);
};

export default function PhotoPicker({ 
  onPhotoSelect, 
  onMultiPhotoSelect, 
  onClose, 
  initialMode = 'single' // Default to single
}: PhotoPickerProps) {
  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<TreeNode | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State to manage the current selection mode
  const [isMultiSelect, setIsMultiSelect] = useState(initialMode === 'multi');
  
  useEffect(() => {
    // Lock multi-select mode if the initial mode was 'multi'
    if (initialMode === 'multi') {
      setIsMultiSelect(true);
    }
  }, [initialMode]);

  useEffect(() => {
    console.log('PhotoPicker mounted');
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const tree = await photoService.getFolderTree();
      setFolderTree(tree);
    } catch (err: any) {
      console.error('Error in loadInitialData:', err);
      setError(err.message || 'Failed to load folder structure.');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = async (node: TreeNode) => {
    if (selectedFolder?.id === node.id) {
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedFolder(node);
    setPhotos([]);
    setSelectedPhotos([]);

    try {
      const folderPhotos = await photoService.getFolderContents(node.id);
      setPhotos(folderPhotos);
    } catch (err: any) {
      console.error('Error in handleFolderSelect:', err);
      setError(err.message || `Failed to load photos for folder: ${node.name}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = (photo: PhotoMetadata) => {
    if (isMultiSelect) {
      setSelectedPhotos(prev => {
        if (prev.find(p => p.id === photo.id)) {
          return prev.filter(p => p.id !== photo.id);
        } else {
          return [...prev, photo];
        }
      });
    } else {
      // In single select mode, fire the event and close immediately
      if (onPhotoSelect) {
        onPhotoSelect(photo);
        onClose(); // Close after selection
      } else if (onMultiPhotoSelect) {
        // Fallback for single-click when only multi-select handler is provided
        onMultiPhotoSelect([photo]);
        onClose();
      }
    }
  };

  const handleDoneClick = () => {
    if (isMultiSelect && onMultiPhotoSelect) {
      onMultiPhotoSelect(selectedPhotos);
      onClose(); // Close after selection
    }
  };

  if (loading && folderTree.length === 0) {
    return <div className={styles.loading}>Loading folder structure...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Select Photo</h2>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.albumList}>
            <h3 className={styles.albumTitle}>Photo Folders</h3>
            {folderTree.length > 0 ? (
              <FolderTree nodes={folderTree} onSelect={handleFolderSelect} selectedId={selectedFolder?.id || null} />
            ) : (
              <div className={styles.noContent}>Loading folders...</div>
            )}
          </div>

          <div className={styles.photoGrid}>
            {loading ? (
              <div className={styles.loading}>Loading photos...</div>
            ) : photos.length > 0 ? (
              <div className={styles.grid}>
                {photos.map(photo => {
                  const isSelected = isMultiSelect && selectedPhotos.some(p => p.id === photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''}`}
                      onClick={() => handlePhotoClick(photo)}
                    >
                      {isSelected && <div className={styles.checkmark}>✓</div>}
                      <Image
                        src={getDisplayUrl(photo)}
                        alt={photo.filename}
                        width={150}
                        height={150}
                        className={styles.photoImage}
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.noContent}>
                {selectedFolder ? 'No photos found in this folder.' : 'Select a folder to view photos'}
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.footer}>
          {/* Only show the multi-select toggle if not locked into multi mode */}
          {initialMode !== 'multi' && (
            <div className={styles.multiSelectToggle}>
              <input
                type="checkbox"
                id="multiSelectCheckbox"
                checked={isMultiSelect}
                onChange={(e) => setIsMultiSelect(e.target.checked)}
              />
              <label htmlFor="multiSelectCheckbox">Select multiple photos</label>
            </div>
          )}

          {isMultiSelect && (
            <button onClick={handleDoneClick} className={styles.doneButton} disabled={selectedPhotos.length === 0}>
              Add {selectedPhotos.length} Photos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PhotoService } from '@/lib/services/photos/photoService';
import { PhotoMetadata, TreeNode } from '@/lib/types/photo'; // Import directly from the source
import styles from './PhotoPicker.module.css';

interface PhotoPickerProps {
  onPhotoSelect?: (photo: PhotoMetadata) => void;
  onMultiPhotoSelect?: (photos: PhotoMetadata[]) => void;
  multiSelect?: boolean;
  onClose: () => void;
}

const FolderTree = ({ nodes, onSelect, selectedId }: { nodes: TreeNode[], onSelect: (node: TreeNode) => void, selectedId: string | null }) => {
  return (
    <ul className={styles.tree}>
      {nodes.map(node => (
        <li key={node.id}>
          <div 
            onClick={() => onSelect(node)} 
            className={`${styles.treeNode} ${selectedId === node.id ? styles.treeNodeSelected : ''}`}
          >
            {node.name}
          </div>
          {node.children && node.children.length > 0 && (
            <FolderTree nodes={node.children} onSelect={onSelect} selectedId={selectedId} />
          )}
        </li>
      ))}
    </ul>
  );
};

export default function PhotoPicker({ onPhotoSelect, onMultiPhotoSelect, multiSelect = false, onClose }: PhotoPickerProps) {
  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<TreeNode | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const photoService = new PhotoService();

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
    if (multiSelect) {
      setSelectedPhotos(prev => {
        if (prev.find(p => p.id === photo.id)) {
          return prev.filter(p => p.id !== photo.id);
        } else {
          return [...prev, photo];
        }
      });
    } else {
      if(onPhotoSelect) {
        onPhotoSelect(photo);
      }
    }
  };

  const handleDoneClick = () => {
    if (multiSelect && onMultiPhotoSelect) {
      onMultiPhotoSelect(selectedPhotos);
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
                  const isSelected = multiSelect && selectedPhotos.some(p => p.id === photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''}`}
                      onClick={() => handlePhotoClick(photo)}
                    >
                      {isSelected && <div className={styles.checkmark}>✓</div>}
                      {/* REPLACED standard <img> with Next.js <Image> */}
                      <Image
                        src={photo.path} // Use the simple web path
                        alt={photo.filename}
                        width={150} // Provide a base width for the grid
                        height={150} // Provide a base height for the grid
                        className={styles.photoImage}
                        // The 'style' prop ensures the image covers the grid cell without distortion.
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
        {multiSelect && (
          <div className={styles.footer}>
            <button onClick={handleDoneClick} className={styles.doneButton} disabled={selectedPhotos.length === 0}>
              Add {selectedPhotos.length} Photos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { PhotoService } from '@/lib/services/photos/photoService';
import { PhotoMetadata, TreeNode } from '@/lib/types/album';
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
      const response = await fetch('/api/photos/folder-tree');
      if (!response.ok) {
        throw new Error('Failed to fetch folder tree from API');
      }
      const tree = await response.json();
      setFolderTree(tree);
    } catch (err) {
      console.error('Error loading folder tree:', err);
      setError('Failed to load folder structure from OneDrive');
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
      const response = await fetch('/api/photos/folder-contents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderPath: node.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch photos for folder: ${node.name}`);
      }

      const folderPhotos: PhotoMetadata[] = await response.json();
      setPhotos(folderPhotos);

    } catch (err) {
      console.error('Error loading folder contents:', err);
      setError('Failed to load photos from the selected folder.');
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
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            ✕
          </button>
        </div>
        
        <div className={styles.content}>
          {/* Album List -> Becomes Folder Tree */}
          <div className={styles.albumList}>
            <h3 className={styles.albumTitle}>Photo Folders</h3>
            {folderTree.length > 0 ? (
              <FolderTree nodes={folderTree} onSelect={handleFolderSelect} selectedId={selectedFolder?.id || null} />
            ) : (
              <div className={styles.noContent}>Loading folders...</div>
            )}
          </div>

          {/* Photo Grid */}
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
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.filename}
                        className={styles.photoImage}
                        onError={(e) => {
                          console.error('Error loading image:', photo.thumbnailUrl);
                          e.currentTarget.src = '/placeholder-image.png';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', photo.thumbnailUrl);
                        }}
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
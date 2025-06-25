'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { getFolderTree, getFolderContents } from '@/lib/services/images/local/photoService';
import { Media, TreeNode } from '@/lib/types/photo';
import { importLocalFile } from '@/lib/services/images/imageService';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './PhotoPicker.module.css';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// The type from the server `getFolderContents` is a pointer to a file on the server.
interface ServerFile {
  id: string; // sourcePath
  filename: string;
  width: number;
  height: number;
  sourcePath: string;
  storageUrl: string; // temporary display url
}

interface PhotoPickerProps {
  onSelect: (media: Media) => void;
  onMultiSelect?: (photos: Media[]) => void;
  onClose: () => void;
  initialMode?: 'single' | 'multiple';
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
  onSelect, 
  onMultiSelect, 
  onClose, 
  initialMode = 'single',
}: PhotoPickerProps) {
  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [photos, setPhotos] = useState<ServerFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<TreeNode | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMultiMode, setIsMultiMode] = useState(initialMode === 'multiple');
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    // This effect now correctly syncs the internal mode with the prop
    // every time the picker is opened with a potentially different mode.
    setIsMultiMode(initialMode === 'multiple');
  }, [initialMode]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const tree = await getFolderTree();
        setFolderTree(tree);
      } catch (err: any) {
        console.error('Error in loadInitialData:', err);
        setError(err.message || 'Failed to load folder structure.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleFolderSelect = async (node: TreeNode) => {
    if (selectedFolder?.id === node.id || importingId) {
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedFolder(node);
    setPhotos([]);

    try {
      const folderPhotos = await getFolderContents(node.id);
      setPhotos(folderPhotos as ServerFile[]);
    } catch (err: any) {
      console.error('Error in handleFolderSelect:', err);
      setError(err.message || `Failed to load photos for folder: ${node.name}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = async (photo: ServerFile) => {
    if (isMultiMode || importingId) {
      return;
    }

    try {
      setError(null);
      setImportingId(photo.id);
      const newMedia = await importLocalFile(photo.sourcePath);
      onSelect(newMedia);
    } catch (err: any) {
      console.error('Failed to import photo:', err);
      setError('Failed to import selected photo. Please try again.');
    } finally {
      setImportingId(null);
    }
  };

  const handleDoneClick = () => {
    // This handler is now specifically for multi-select mode.
    if (isMultiMode && typeof onMultiSelect === 'function') {
      onMultiSelect(selectedPhotos);
    }
    onClose(); // Always close when done.
  };

  const buttonText = useMemo(() => {
    if (!isMultiMode) return 'Done'; // Should not be visible, but for completeness
    if (selectedPhotos.length === 0) return 'Done';
    return `Add ${selectedPhotos.length} Photo${selectedPhotos.length > 1 ? 's' : ''}`;
  }, [isMultiMode, selectedPhotos.length]);

  if (loading && folderTree.length === 0) {
    return <div className={styles.loading}>Loading folder structure...</div>;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Select Photo(s)</h2>
          <button onClick={onClose} className={styles.closeButton} disabled={!!importingId}>✕</button>
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
            {error && <div className={styles.errorBanner}>{error}</div>}
            {loading && photos.length === 0 ? (
              <div className={styles.noContent}>Loading photos...</div>
            ) : photos.length > 0 ? (
              <div className={styles.grid}>
                {photos.map(photo => {
                  const isSelected = isMultiMode && selectedPhotos.some(p => p.id === photo.id);
                  const isImporting = importingId === photo.id;
                  return (
                    <div
                      key={photo.id}
                      className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''} ${isImporting ? styles.photoItemImporting : ''}`}
                      onClick={() => handlePhotoClick(photo)}
                    >
                      {isImporting && <div className={styles.importingOverlay}><LoadingSpinner /></div>}
                      {isSelected && <div className={styles.checkmark}>✓</div>}
                      <Image
                        src={getDisplayUrl(photo as any)}
                        alt={photo.filename}
                        width={150}
                        height={150}
                        className={styles.photoImage}
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
          {isMultiMode && (
            <button onClick={handleDoneClick} className={styles.doneButton} disabled={!!importingId}>
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
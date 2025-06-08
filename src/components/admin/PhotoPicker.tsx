'use client';

import React, { useState, useEffect } from 'react';
import { TreeNode } from '@/lib/types/album';
import styles from './PhotoPicker.module.css';

interface PhotoPickerProps {
  onPhotoSelect: (photoPath: string) => void;
  multiSelect?: boolean;
  onMultiPhotoSelect?: (photoPaths: string[]) => void;
}

export default function PhotoPicker({ onPhotoSelect, multiSelect = false, onMultiPhotoSelect }: PhotoPickerProps) {
  const [folders, setFolders] = useState<TreeNode[]>([]);
  const [photos, setPhotos] = useState<{ id: string; name: string; path: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchFolders() {
      try {
        const response = await fetch('/api/photos/folder-tree');
        if (!response.ok) {
          throw new Error('Failed to fetch folder structure');
        }
        const data = await response.json();
        setFolders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    fetchFolders();
  }, []);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleFolderClick = async (folderPath: string) => {
    setSelectedFolder(folderPath);
    setPhotos([]);
    try {
      const response = await fetch('/api/photos/folder-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await response.json();
      setPhotos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handlePhotoClick = (photoPath: string) => {
    if (multiSelect) {
      const newSelection = selectedPhotos.includes(photoPath)
        ? selectedPhotos.filter(p => p !== photoPath)
        : [...selectedPhotos, photoPath];
      setSelectedPhotos(newSelection);
      onMultiPhotoSelect?.(newSelection);
    } else {
      onPhotoSelect(photoPath);
    }
  };
  
  const renderTree = (nodes: TreeNode[]) => (
    <ul className={styles.tree}>
      {nodes.map(node => (
        <li key={node.id}>
          <div className={styles.folderItem}>
            {node.children && node.children.length > 0 ? (
              <span onClick={() => toggleFolder(node.id)} className={styles.toggle}>
                {expandedFolders.has(node.id) ? '▼' : '▶'}
              </span>
            ) : (
              <span className={styles.toggle}></span>
            )}
            <span 
              onClick={() => handleFolderClick(node.id)}
              className={`${styles.folderName} ${selectedFolder === node.id ? styles.selected : ''}`}
            >
              {node.name}
            </span>
          </div>
          {node.children && node.children.length > 0 && expandedFolders.has(node.id) && (
            <div className={styles.children}>
              {renderTree(node.children)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  if (isLoading) return <p>Loading folders...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className={styles.pickerContainer}>
      <div className={styles.folderTree}>
        <h4>Folders</h4>
        {renderTree(folders)}
      </div>
      <div className={styles.photoGrid}>
        <h4>Photos</h4>
        <div className={styles.grid}>
          {photos.map(photo => (
            <div 
              key={photo.id} 
              className={`${styles.photoItem} ${selectedPhotos.includes(photo.path) ? styles.selected : ''}`}
              onClick={() => handlePhotoClick(photo.path)}
            >
              <img src={`/api/photos/image?path=${encodeURIComponent(photo.path)}`} alt={photo.name} />
              <p>{photo.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
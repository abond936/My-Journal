'use client';

import { useState, useEffect } from 'react';
import { PhotoService } from '@/lib/services/photos/photoService';
import { Album, PhotoMetadata } from '@/lib/services/photos/photoService';
import styles from './PhotoPicker.module.css';

interface PhotoPickerProps {
  onPhotoSelect: (photo: PhotoMetadata) => void;
  onClose: () => void;
}

export default function PhotoPicker({ onPhotoSelect, onClose }: PhotoPickerProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const photoService = new PhotoService();

  useEffect(() => {
    console.log('PhotoPicker mounted');
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      console.log('Loading albums...');
      setLoading(true);
      const allAlbums = await photoService.getAllAlbums();
      console.log('Loaded albums:', allAlbums);
      
      if (allAlbums.length === 0) {
        console.warn('No albums found');
      } else {
        console.log('First album photos:', allAlbums[0].photos);
      }
      
      setAlbums(allAlbums);
      if (allAlbums.length > 0) {
        setSelectedAlbum(allAlbums[0]);
      }
    } catch (err) {
      console.error('Error loading albums:', err);
      setError('Failed to load albums');
    } finally {
      setLoading(false);
    }
  };

  const handleAlbumSelect = async (album: Album) => {
    try {
      console.log('Selecting album:', album);
      setLoading(true);
      const fullAlbum = await photoService.loadAlbum(album.id);
      console.log('Loaded album details:', fullAlbum);
      setSelectedAlbum(fullAlbum);
    } catch (err) {
      console.error('Error loading album:', err);
      setError('Failed to load album details');
    } finally {
      setLoading(false);
    }
  };

  if (loading && albums.length === 0) {
    return <div className={styles.loading}>Loading albums...</div>;
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
          {/* Album List */}
          <div className={styles.albumList}>
            <h3 className={styles.albumTitle}>Albums</h3>
            {albums && albums.length > 0 ? (
              albums.map(album => (
                <div
                  key={album.id}
                  className={`${styles.albumItem} ${
                    selectedAlbum?.id === album.id ? styles.albumItemSelected : ''
                  }`}
                  onClick={() => handleAlbumSelect(album)}
                >
                  {album.name} ({album.photoCount} photos)
                </div>
              ))
            ) : (
              <div className={styles.noContent}>No albums available</div>
            )}
          </div>

          {/* Photo Grid */}
          <div className={styles.photoGrid}>
            {loading ? (
              <div className={styles.loading}>Loading photos...</div>
            ) : selectedAlbum ? (
              <div className={styles.grid}>
                {selectedAlbum.photos.map(photo => {
                  console.log('Rendering photo:', photo);
                  return (
                    <div
                      key={photo.id}
                      className={styles.photoItem}
                      onClick={() => onPhotoSelect(photo)}
                    >
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
              <div className={styles.noContent}>Select an album to view photos</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
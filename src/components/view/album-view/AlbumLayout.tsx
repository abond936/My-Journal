'use client';

import { useState, useEffect } from 'react';
import PhotoAlbum from 'react-photo-album';
import { Album } from '@/lib/types/album';
import styles from './AlbumLayout.module.css';

interface AlbumLayoutProps {
  album: Album;
  onClose: () => void;
}

export default function AlbumLayout({ album, onClose }: AlbumLayoutProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowRight') showNextImage();
      if (e.key === 'ArrowLeft') showPrevImage();
      if (e.key === 'Escape') setLightboxIndex(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, album.images.length]);

  const showNextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % album.images.length);
    }
  };

  const showPrevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + album.images.length) % album.images.length);
    }
  };

  const photoAlbumData = album.images.map((p, index) => ({
    src: p.displayUrl,
    width: p.width,
    height: p.height,
    key: `${p.sourceId}-${index}`
  }));

  return (
    <div className={styles.albumContainer}>
      <div className={styles.albumHeader}>
        <h2 className={styles.albumTitle}>{album.title}</h2>
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>
      
      <div className={styles.photoGridContainer}>
        <PhotoAlbum
          layout="rows"
          photos={photoAlbumData}
          targetRowHeight={300}
          onClick={({ index }) => setLightboxIndex(index)}
        />
      </div>

      {lightboxIndex !== null && (
        <div className={styles.lightbox} onClick={() => setLightboxIndex(null)}>
          <button 
            className={styles.lightboxClose}
            onClick={() => setLightboxIndex(null)}
            aria-label="Close lightbox"
          >
            ×
          </button>
          
          <button 
            className={`${styles.lightboxNav} ${styles.prevButton}`}
            onClick={(e) => { e.stopPropagation(); showPrevImage(); }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={album.images[lightboxIndex].displayUrl}
              alt={album.images[lightboxIndex].caption || 'Album image'}
              className={styles.lightboxImage}
            />
            {album.images[lightboxIndex].caption && (
                <div className={styles.lightboxCaption}>
                    <p className={styles.lightboxText}>{album.images[lightboxIndex].caption}</p>
                </div>
            )}
          </div>
          
          <button 
            className={`${styles.lightboxNav} ${styles.nextButton}`}
            onClick={(e) => { e.stopPropagation(); showNextImage(); }}
            aria-label="Next photo"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
} 
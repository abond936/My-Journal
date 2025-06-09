'use client';

import { useState, useEffect } from 'react';
import PhotoAlbum from 'react-photo-album';
import { Album } from '@/lib/types/album';
import styles from './AlbumLayout.module.css';

interface AlbumLayoutProps {
  album: Album;
}

export default function AlbumLayout({ album }: AlbumLayoutProps) {
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
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{album.title}</h1>
        {album.description && <p className={styles.description}>{album.description}</p>}
      </header>
      
      <PhotoAlbum
        layout="rows"
        photos={photoAlbumData}
        targetRowHeight={300}
        onClick={({ index }) => setLightboxIndex(index)}
      />

      {lightboxIndex !== null && (
        <div className={styles.lightbox} onClick={() => setLightboxIndex(null)}>
          <button className={`${styles.lightboxNav} ${styles.prevButton}`} onClick={(e) => { e.stopPropagation(); showPrevImage(); }}>&#10094;</button>
          <button className={`${styles.lightboxNav} ${styles.nextButton}`} onClick={(e) => { e.stopPropagation(); showNextImage(); }}>&#10095;</button>
          <img
            src={album.images[lightboxIndex].displayUrl}
            alt={album.images[lightboxIndex].caption || ''}
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
} 
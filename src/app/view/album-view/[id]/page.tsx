'use client';

import { useState, useEffect } from 'react';
import { Album, AlbumImage } from '@/lib/types/album';
import styles from '../AlbumView.module.css';
import Link from 'next/link';

// The props for this page will include the 'id' from the dynamic route segment.
interface AlbumViewPageProps {
  params: {
    id: string;
  };
}

/**
 * Renders a detailed view of a single album, including its images.
 */
export default function AlbumViewPage({ params }: AlbumViewPageProps) {
  const { id } = params;
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State to manage the lightbox functionality
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // useEffect hook to fetch the album data when the component mounts or the id changes.
  useEffect(() => {
    if (!id) return;

    const fetchAlbum = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/albums/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Album not found.');
          }
          throw new Error('Failed to fetch album data.');
        }
        const data: Album = await response.json();
        setAlbum(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [id]);

  // Lightbox navigation functions
  const showNextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing the lightbox
    if (album && lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % album.images.length);
    }
  };

  const showPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing the lightbox
    if (album && lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + album.images.length) % album.images.length);
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (lightboxIndex === null) return;
    if (e.key === 'ArrowRight') showNextImage(e as any);
    if (e.key === 'ArrowLeft') showPrevImage(e as any);
    if (e.key === 'Escape') setLightboxIndex(null);
  };
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  if (loading) {
    return <div className={styles.centered}>Loading album...</div>;
  }

  if (error) {
    return <div className={`${styles.centered} ${styles.error}`}>{error}</div>;
  }

  if (!album) {
    // This state should ideally not be reached if error handling is correct.
    return <div className={styles.centered}>No album data available.</div>;
  }

  return (
    <div className={styles.albumContainer}>
      <header className={styles.albumHeader}>
        <h1 className={styles.albumTitle}>{album.title}</h1>
        {album.description && <p className={styles.description}>{album.description}</p>}
        <Link href="/admin/album-admin" className={styles.closeButton} aria-label="Close album view">
          &times;
        </Link>
      </header>

      <main className={styles.photoGrid}>
        {album.images && album.images.length > 0 ? (
          album.images.map((image, index) => (
            <figure key={`${image.sourceId}-${index}`} className={styles.photoFigure}>
              <button onClick={() => setLightboxIndex(index)} className={styles.photoButton}>
                <img
                  src={image.thumbnailUrl}
                  alt={image.caption || `Album photo ${index + 1}`}
                  className={styles.photo}
                />
              </button>
              {image.caption && <figcaption className={styles.photoCaption}>{image.caption}</figcaption>}
            </figure>
          ))
        ) : (
          <p>This album has no photos yet.</p>
        )}
      </main>

      {/* Lightbox Implementation */}
      {lightboxIndex !== null && (
        <div className={styles.lightbox} onClick={() => setLightboxIndex(null)}>
          <button className={styles.lightboxClose} aria-label="Close lightbox">&times;</button>
          <button className={`${styles.lightboxNav} ${styles.prevButton}`} onClick={showPrevImage} aria-label="Previous image">&#10094;</button>
          <button className={`${styles.lightboxNav} ${styles.nextButton}`} onClick={showNextImage} aria-label="Next image">&#10095;</button>
          
          <div className={styles.lightboxContent}>
            <img 
              src={album.images[lightboxIndex].displayUrl} 
              alt={album.images[lightboxIndex].caption || ''}
              className={styles.lightboxImage}
              onClick={(e) => e.stopPropagation()} // Prevent image click from closing lightbox
            />
            {album.images[lightboxIndex].caption && (
              <div className={styles.lightboxCaption}>
                <p className={styles.lightboxText}>{album.images[lightboxIndex].caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

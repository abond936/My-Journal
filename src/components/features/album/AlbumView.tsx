import React, { useState } from 'react';
import styles from '@/app/view/album-view/AlbumView.module.css';

interface Photo {
  src: string;
  alt: string;
  caption?: string;
  date?: string;
  location?: string;
}

interface AlbumViewProps {
  title: string;
  photos: Photo[];
  onClose: () => void;
}

const AlbumView: React.FC<AlbumViewProps> = ({ title, photos, onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % photos.length 
      : (currentIndex - 1 + photos.length) % photos.length;
    
    setSelectedPhoto(photos[newIndex]);
    setCurrentIndex(newIndex);
  };

  return (
    <div className={styles.albumContainer}>
      <div className={styles.albumHeader}>
        <h2 className={styles.albumTitle}>{title}</h2>
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>

      <div className={styles.photoGrid}>
        {photos.map((photo, index) => (
          <figure key={photo.src} className={styles.photoFigure}>
            <button 
              className={styles.photoButton}
              onClick={() => openLightbox(photo, index)}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className={styles.photo}
                loading="lazy"
              />
            </button>
            <figcaption className={styles.photoCaption}>
              {photo.caption}
              {photo.date && <time className={styles.photoDate}>{photo.date}</time>}
              {photo.location && <span className={styles.photoLocation}>{photo.location}</span>}
            </figcaption>
          </figure>
        ))}
      </div>

      {selectedPhoto && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <button 
            className={styles.lightboxClose}
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            ×
          </button>
          
          <button 
            className={`${styles.lightboxNav} ${styles.prevButton}`}
            onClick={(e) => {
              e.stopPropagation();
              navigatePhoto('prev');
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.src}
              alt={selectedPhoto.alt}
              className={styles.lightboxImage}
            />
            <div className={styles.lightboxCaption}>
              {selectedPhoto.caption && (
                <p className={styles.lightboxText}>{selectedPhoto.caption}</p>
              )}
              {selectedPhoto.date && (
                <time className={styles.lightboxDate}>{selectedPhoto.date}</time>
              )}
              {selectedPhoto.location && (
                <span className={styles.lightboxLocation}>{selectedPhoto.location}</span>
              )}
            </div>
          </div>
          
          <button 
            className={`${styles.lightboxNav} ${styles.nextButton}`}
            onClick={(e) => {
              e.stopPropagation();
              navigatePhoto('next');
            }}
            aria-label="Next photo"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default AlbumView; 
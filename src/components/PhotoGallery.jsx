// components/PhotoGallery.jsx
import { useState } from 'react';
import Image from 'next/image';
import styles from './PhotoGallery.module.css';

const PhotoGallery = ({ photos }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (index) => {
    setActiveIndex(index);
    setIsModalOpen(true);
    // Prevent scrolling when modal is open
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Restore scrolling
    document.body.style.overflow = '';
  };

  const goToPrevious = () => {
    setActiveIndex((prevIndex) => (prevIndex === 0 ? photos.length - 1 : prevIndex - 1));
  };

  const goToNext = () => {
    setActiveIndex((prevIndex) => (prevIndex === photos.length - 1 ? 0 : prevIndex + 1));
  };

  // Handle key press events for navigation
  const handleKeyDown = (e) => {
    if (!isModalOpen) return;
    
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  // Add event listener for keyboard navigation
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  // Create grid layout for thumbnail preview based on number of photos
  const getGridClass = () => {
    const count = photos.length;
    if (count <= 5) return styles.gridFive;
    return styles.gridMany;
  };

  return (
    <div className={styles.galleryContainer}>
      {/* Preview grid showing first 5 or more photos */}
      <div className={`${styles.photoGrid} ${getGridClass()}`}>
        {photos.slice(0, 5).map((photo, index) => (
          <div 
            key={`thumb-${photo.id || index}`} 
            className={styles.thumbnail}
            onClick={() => openModal(index)}
          >
            <Image
              src={photo.src}
              alt={photo.alt || `Photo ${index + 1}`}
              width={300}
              height={200}
              layout="responsive"
              objectFit="cover"
              className={styles.thumbnailImage}
            />
            
            {/* Show overlay with "+X more" for the last visible thumbnail if there are more */}
            {index === 4 && photos.length > 5 && (
              <div className={styles.moreOverlay}>
                <span className={styles.moreCount}>+{photos.length - 5} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full screen gallery modal */}
      {isModalOpen && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={`${styles.navButton} ${styles.closeButton}`} onClick={closeModal}>
              ×
            </button>
            
            <div className={styles.currentImageContainer}>
              <button className={`${styles.navButton} ${styles.prevButton}`} onClick={goToPrevious}>
                ‹
              </button>
              
              <div className={styles.currentImage}>
                <Image
                  src={photos[activeIndex].src}
                  alt={photos[activeIndex].alt || `Photo ${activeIndex + 1}`}
                  layout="fill"
                  objectFit="contain"
                />
                
                {photos[activeIndex].caption && (
                  <div className={styles.caption}>{photos[activeIndex].caption}</div>
                )}
              </div>
              
              <button className={`${styles.navButton} ${styles.nextButton}`} onClick={goToNext}>
                ›
              </button>
            </div>
            
            <div className={styles.galleryCounter}>
              {activeIndex + 1} / {photos.length}
            </div>
            
            {/* Thumbnail strip for navigation */}
            <div className={styles.thumbnailStrip}>
              {photos.map((photo, index) => (
                <div 
                  key={`modal-thumb-${photo.id || index}`}
                  className={`${styles.stripThumbnail} ${index === activeIndex ? styles.active : ''}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt || `Thumbnail ${index + 1}`}
                    width={60}
                    height={60}
                    objectFit="cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
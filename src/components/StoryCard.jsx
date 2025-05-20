// components/StoryCard.jsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './StoryCard.module.css';
import PhotoGallery from './PhotoGallery';
import MarkdownRenderer from './MarkdownRenderer';

const StoryCard = ({ 
  story, 
  isExpanded = false, 
  onToggleExpand = null, 
  showFullContent = false 
}) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [photos, setPhotos] = useState([]);
  
  // Reset expanded state when story changes
  useEffect(() => {
    setExpanded(isExpanded);
  }, [isExpanded, story.id]);

  // Fetch photos related to this story (simulated here)
  useEffect(() => {
    // In a real implementation, this would be fetched from your data source
    // For now, we'll just use the photos that come with the story
    setPhotos(story.photos || []);
  }, [story]);

  const toggleExpand = () => {
    const newExpandedState = !expanded;
    setExpanded(newExpandedState);
    
    // Notify parent component if callback provided
    if (onToggleExpand) {
      onToggleExpand(story.id, newExpandedState);
    }
  };

  // Helper to determine appropriate photo layout
  const getPhotoLayoutStyle = (count) => {
    if (count === 0) return '';
    if (count === 1) return styles.singlePhoto;
    if (count === 2) return styles.dualPhoto;
    if (count === 3) return styles.triplePhoto;
    if (count === 4) return styles.quadPhoto;
    return styles.galleryPhoto;
  };

  // Preview shows limited photos
  const previewPhotos = photos.slice(0, 4);
  
  return (
    <article className={`${styles.storyCard} ${expanded ? styles.expanded : ''}`}>
      <div className={styles.storyHeader}>
        <h2 className={styles.storyTitle}>{story.title}</h2>
        {story.date && (
          <time className={styles.storyDate} dateTime={new Date(story.date).toISOString()}>
            {new Date(story.date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </time>
        )}
      </div>
      
      {/* Show preview content in collapsed mode */}
      {!expanded && (
        <>
          {story.featuredPhoto && (
            <div className={styles.featuredMedia}>
              <Image
                src={story.featuredPhoto.src}
                alt={story.featuredPhoto.alt || story.title}
                width={800}
                height={500}
                layout="responsive"
                className={styles.featuredImage}
              />
            </div>
          )}
          
          <p className={styles.storyExcerpt}>{story.excerpt}</p>
          
          <div className={styles.storyMeta}>
            {/* Tags for dimensions */}
            <div className={styles.storyTags}>
              {story.people && story.people.map(person => (
                <Link key={`person-${person.id}`} href={`/people/${encodeURIComponent(person.id)}`}>
                  <a className={`${styles.tag} ${styles.personTag}`}>{person.name}</a>
                </Link>
              ))}
              
              {story.places && story.places.map(place => (
                <Link key={`place-${place.id}`} href={`/places/${encodeURIComponent(place.id)}`}>
                  <a className={`${styles.tag} ${styles.placeTag}`}>{place.name}</a>
                </Link>
              ))}
              
              {story.events && story.events.map(event => (
                <Link key={`event-${event.id}`} href={`/events/${encodeURIComponent(event.id)}`}>
                  <a className={`${styles.tag} ${styles.eventTag}`}>{event.name}</a>
                </Link>
              ))}
              
              {story.themes && story.themes.map(theme => (
                <Link key={`theme-${theme.id}`} href={`/themes/${encodeURIComponent(theme.id)}`}>
                  <a className={`${styles.tag} ${styles.themeTag}`}>{theme.name}</a>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
      
      {/* Show full content in expanded mode */}
      {expanded && (
        <div className={styles.storyExpandedContent}>
          {/* Photo gallery with appropriate layout based on count */}
          {photos.length > 0 && (
            <div className={`${styles.photoContainer} ${getPhotoLayoutStyle(photos.length)}`}>
              {photos.length <= 4 ? (
                // Display inline for 1-4 photos
                photos.map((photo, index) => (
                  <div key={`photo-${photo.id || index}`} className={styles.photoItem}>
                    <Image
                      src={photo.src}
                      alt={photo.alt || `Photo ${index + 1} for ${story.title}`}
                      width={400}
                      height={300}
                      layout="responsive"
                      className={styles.photo}
                    />
                    {photo.caption && <p className={styles.photoCaption}>{photo.caption}</p>}
                  </div>
                ))
              ) : (
                // Use gallery component for more than 4 photos
                <PhotoGallery photos={photos} />
              )}
            </div>
          )}
          
          {/* Render full markdown content */}
          <div className={styles.storyContent}>
            <MarkdownRenderer content={story.content} />
          </div>
          
          {/* Related content links */}
          {story.relatedContent && story.relatedContent.length > 0 && (
            <div className={styles.relatedContent}>
              <h3 className={styles.relatedTitle}>Related Stories</h3>
              <ul className={styles.relatedList}>
                {story.relatedContent.map(item => (
                  <li key={`related-${item.id}`} className={styles.relatedItem}>
                    <Link href={`/stories/${encodeURIComponent(item.id)}`}>
                      <a className={styles.relatedLink}>{item.title}</a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Full dimensions */}
          <div className={styles.storyFullMeta}>
            {/* People dimension */}
            {story.people && story.people.length > 0 && (
              <div className={styles.metaSection}>
                <h4 className={styles.metaTitle}>People</h4>
                <div className={styles.metaTags}>
                  {story.people.map(person => (
                    <Link key={`full-person-${person.id}`} href={`/people/${encodeURIComponent(person.id)}`}>
                      <a className={`${styles.tag} ${styles.personTag}`}>{person.name}</a>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Places dimension */}
            {story.places && story.places.length > 0 && (
              <div className={styles.metaSection}>
                <h4 className={styles.metaTitle}>Places</h4>
                <div className={styles.metaTags}>
                  {story.places.map(place => (
                    <Link key={`full-place-${place.id}`} href={`/places/${encodeURIComponent(place.id)}`}>
                      <a className={`${styles.tag} ${styles.placeTag}`}>{place.name}</a>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Other dimensions as needed */}
          </div>
        </div>
      )}
      
      {/* Toggle button */}
      {!showFullContent && (
        <button className={styles.expandButton} onClick={toggleExpand}>
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </article>
  );
};

export default StoryCard;
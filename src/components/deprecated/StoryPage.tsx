'use client';

import React from 'react';
import styles from '@/lib/styles/components/entry/StoryPage.module.css';

interface AlbumLink {
  id: string;
  title: string;
  photoCount: number;
}

interface StorySection {
  question?: string;
  title?: string;
  content: React.ReactNode;
  photos?: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  albumLinks?: AlbumLink[];
}

interface StoryPageProps {
  category: string;
  title: string;
  sections: StorySection[];
  metadata?: {
    date?: string;
    tags?: string[];
    relatedStories?: Array<{
      id: string;
      title: string;
      excerpt: string;
    }>;
  };
}

const StoryPage: React.FC<StoryPageProps> = ({ 
  category,
  title, 
  sections,
  metadata 
}) => {
  return (
    <div className={styles.storyContainer}>
      <article className={styles.storyContent}>
        <header className={styles.storyHeader}>
          <div className={styles.categoryTag}>{category}</div>
          <h1 className={styles.storyTitle}>{title}</h1>
          {metadata?.date && (
            <time className={styles.storyDate}>{metadata.date}</time>
          )}
        </header>

        <div className={styles.storyBody}>
          {sections.map((section, index) => (
            <section key={index} className={styles.storySection}>
              {section.question && (
                <h2 className={styles.question}>{section.question}</h2>
              )}
              {section.title && (
                <h2 className={styles.sectionTitle}>{section.title}</h2>
              )}
              
              {section.albumLinks && section.albumLinks.length > 0 && (
                <div className={styles.albumLinks}>
                  {section.albumLinks.map((album) => (
                    <button 
                      key={album.id}
                      className={styles.albumLink}
                      onClick={() => {/* TODO: Handle album view */}}
                    >
                      <span className={styles.albumIcon}>📸</span>
                      <span className={styles.albumTitle}>
                        {album.title} ({album.photoCount})
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.sectionContent}>
                {section.content}
              </div>

              {section.photos && section.photos.length > 0 && (
                <div className={styles.inlinePhotos}>
                  {section.photos.map((photo, photoIndex) => (
                    <figure key={photoIndex} className={styles.photoFigure}>
                      <img 
                        src={photo.src} 
                        alt={photo.alt}
                        className={styles.inlinePhoto}
                      />
                      {photo.caption && (
                        <figcaption className={styles.photoCaption}>
                          {photo.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {metadata?.tags && metadata.tags.length > 0 && (
          <div className={styles.storyTags}>
            {metadata.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {metadata?.relatedStories && metadata.relatedStories.length > 0 && (
          <aside className={styles.relatedStories}>
            <h2 className={styles.relatedTitle}>Related Stories</h2>
            <div className={styles.relatedGrid}>
              {metadata.relatedStories.map((story) => (
                <div key={story.id} className={styles.relatedCard}>
                  <h3 className={styles.relatedCardTitle}>{story.title}</h3>
                  <p className={styles.relatedCardExcerpt}>{story.excerpt}</p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </article>
    </div>
  );
};

export default StoryPage; 
'use client';

import React from 'react';
import styles from '../styles/components/story/StoryTemplate.module.css';

interface StoryTemplateProps {
  title: string;
  content: React.ReactNode;
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

const StoryTemplate: React.FC<StoryTemplateProps> = ({ 
  title, 
  content,
  metadata 
}) => {
  return (
    <div className={styles.storyContainer}>
      <article className={styles.storyContent}>
        <header className={styles.storyHeader}>
          <h1 className={styles.storyTitle}>{title}</h1>
          {metadata?.date && (
            <time className={styles.storyDate}>{metadata.date}</time>
          )}
        </header>

        <div className={styles.storyBody}>
          {content}
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

export default StoryTemplate; 
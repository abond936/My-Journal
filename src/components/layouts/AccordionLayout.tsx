import React, { useState } from 'react';
import styles from './AccordionLayout.module.css';

interface Story {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  metadata: {
    date?: Date;
    tags?: string[];
    images?: {
      url: string;
      caption?: string;
      order: number;
    }[];
  };
}

interface AccordionLayoutProps {
  stories: Story[];
}

export default function AccordionLayout({ stories }: AccordionLayoutProps) {
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  if (stories.length === 0) {
    return (
      <p className={styles.empty}>No stories found in this category.</p>
    );
  }

  const toggleStory = (storyId: string) => {
    setExpandedStory(prev => prev === storyId ? null : storyId);
  };

  return (
    <div className={styles.accordion}>
      {stories.map(story => (
        <div key={story.id} className={styles.story}>
          <button
            className={`${styles.header} ${expandedStory === story.id ? styles.expanded : ''}`}
            onClick={() => toggleStory(story.id)}
            aria-expanded={expandedStory === story.id}
          >
            <h2 className={styles.title}>{story.title}</h2>
            {story.metadata.date && (
              <time className={styles.date}>
                {new Date(story.metadata.date).toLocaleDateString()}
              </time>
            )}
            <span className={styles.icon}>
              {expandedStory === story.id ? '−' : '+'}
            </span>
          </button>

          {expandedStory === story.id && (
            <div className={styles.content}>
              <div className={styles.text}>
                {story.content}
              </div>

              {story.metadata.tags && story.metadata.tags.length > 0 && (
                <div className={styles.tags}>
                  {story.metadata.tags.map(tag => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {story.metadata.images && story.metadata.images.length > 0 && (
                <div className={styles.images}>
                  {story.metadata.images.map(image => (
                    <figure key={image.url} className={styles.image}>
                      <img src={image.url} alt={image.caption || ''} />
                      {image.caption && (
                        <figcaption>{image.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 
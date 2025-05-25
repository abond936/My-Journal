import React from 'react';
import styles from './BlogLayout.module.css';

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

interface BlogLayoutProps {
  stories: Story[];
}

export default function BlogLayout({ stories }: BlogLayoutProps) {
  if (stories.length === 0) {
    return (
      <p className={styles.empty}>No stories found in this category.</p>
    );
  }

  return (
    <div className={styles.stories}>
      {stories.map(story => (
        <article key={story.id} className={styles.story}>
          <h2 className={styles.storyTitle}>{story.title}</h2>
          
          {story.metadata.date && (
            <time className={styles.date}>
              {new Date(story.metadata.date).toLocaleDateString()}
            </time>
          )}
          
          <div className={styles.content}>
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
        </article>
      ))}
    </div>
  );
} 
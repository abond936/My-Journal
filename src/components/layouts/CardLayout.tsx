import React from 'react';
import styles from './CardLayout.module.css';

interface Story {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  metadata?: {
    date?: string;
    tags?: string[];
    images?: Array<{
      url: string;
      caption?: string;
    }>;
  };
}

interface CardLayoutProps {
  stories: Story[];
}

const CardLayout: React.FC<CardLayoutProps> = ({ stories }) => {
  if (!stories.length) {
    return (
      <div className={styles.empty}>
        No stories found in this category.
      </div>
    );
  }

  return (
    <div className={styles.cards}>
      {stories.map((story) => (
        <article key={story.id} className={styles.card}>
          {story.metadata?.images?.[0] && (
            <div className={styles.imageContainer}>
              <img
                src={story.metadata.images[0].url}
                alt={story.metadata.images[0].caption || story.title}
                className={styles.image}
              />
            </div>
          )}
          <div className={styles.content}>
            <h2 className={styles.title}>{story.title}</h2>
            {story.metadata?.date && (
              <time className={styles.date}>{story.metadata.date}</time>
            )}
            <p className={styles.excerpt}>
              {story.content.length > 200
                ? `${story.content.substring(0, 200)}...`
                : story.content}
            </p>
            {story.metadata?.tags && story.metadata.tags.length > 0 && (
              <div className={styles.tags}>
                {story.metadata.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
};

export default CardLayout; 
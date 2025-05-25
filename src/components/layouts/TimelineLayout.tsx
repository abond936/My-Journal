import React from 'react';
import styles from './TimelineLayout.module.css';

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

interface TimelineLayoutProps {
  stories: Story[];
}

const TimelineLayout: React.FC<TimelineLayoutProps> = ({ stories }) => {
  if (!stories.length) {
    return (
      <div className={styles.empty}>
        No stories found in this category.
      </div>
    );
  }

  // Sort stories by date if available
  const sortedStories = [...stories].sort((a, b) => {
    const dateA = a.metadata?.date ? new Date(a.metadata.date).getTime() : 0;
    const dateB = b.metadata?.date ? new Date(b.metadata.date).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className={styles.timeline}>
      {sortedStories.map((story, index) => (
        <div key={story.id} className={styles.timelineItem}>
          <div className={styles.timelineContent}>
            <div className={styles.timelinePoint} />
            {story.metadata?.date && (
              <time className={styles.date}>{story.metadata.date}</time>
            )}
            <article className={styles.story}>
              <h2 className={styles.title}>{story.title}</h2>
              <div className={styles.content}>{story.content}</div>
              {story.metadata?.tags && story.metadata.tags.length > 0 && (
                <div className={styles.tags}>
                  {story.metadata.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {story.metadata?.images && story.metadata.images.length > 0 && (
                <div className={styles.images}>
                  {story.metadata.images.map((image, imageIndex) => (
                    <figure key={imageIndex} className={styles.image}>
                      <img
                        src={image.url}
                        alt={image.caption || story.title}
                      />
                      {image.caption && (
                        <figcaption>{image.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineLayout; 
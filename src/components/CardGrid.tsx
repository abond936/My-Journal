'use client';

import React from 'react';
import StoryCard from './StoryCard';
import styles from '../styles/components/layout/CardGrid.module.css';

interface Story {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  imageUrl?: string;
  href: string;
}

interface CardGridProps {
  stories: Story[];
  title?: string;
  description?: string;
  columns?: 2 | 3 | 4;
}

const CardGrid: React.FC<CardGridProps> = ({
  stories,
  title,
  description,
  columns = 3
}) => {
  return (
    <section className={styles.section}>
      {(title || description) && (
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      )}
      
      <div className={`${styles.grid} ${styles[`columns${columns}`]}`}>
        {stories.map(story => (
          <StoryCard
            key={story.id}
            id={story.id}
            title={story.title}
            excerpt={story.excerpt}
            date={story.date}
            tags={story.tags}
            imageUrl={story.imageUrl}
            href={story.href}
          />
        ))}
      </div>
    </section>
  );
};

export default CardGrid; 
'use client';

import React from 'react';
import styles from '@/styles/storyTemplates/blog.module.css';
import { JournalPage } from '@/lib/journal';

interface BlogTemplateProps {
  story: JournalPage;
}

export default function BlogTemplate({ story }: BlogTemplateProps) {
  return (
    <article className={styles.blogPost}>
      <header className={styles.header}>
        <h1 className={styles.title}>{story.heading.title}</h1>
        {story.heading.metadata?.date && (
          <time className={styles.date}>{story.heading.metadata.date}</time>
        )}
      </header>

      <div className={styles.content}>
        {story.content.split('\n\n').map((paragraph, index) => (
          <p key={index} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </div>

      {story.heading.metadata?.tags && (
        <footer className={styles.footer}>
          <div className={styles.tags}>
            {story.heading.metadata.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </footer>
      )}
    </article>
  );
} 
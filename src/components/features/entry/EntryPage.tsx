'use client';

import React from 'react';
import { Entry } from '@/lib/types/entry';
import styles from '@/app/view/entry-view/EntryPage.module.css';

interface EntryPageProps {
  entry: Entry;
}

export default function EntryPage({ entry }: EntryPageProps) {
  return (
    <article className={styles.entryPage}>
      <header className={styles.header}>
        <h1 className={styles.title}>{entry.title}</h1>
        {entry.date && (
          <time className={styles.date}>{entry.date.toLocaleDateString()}</time>
        )}
      </header>

      <div className={styles.content}>
        {entry.content}
      </div>

      {entry.media && entry.media.length > 0 && (
        <div className={styles.gallery}>
          {entry.media.map((mediaUrl, index) => (
            <img
              key={index}
              src={mediaUrl}
              alt={`Media ${index + 1}`}
              className={styles.photo}
            />
          ))}
        </div>
      )}

      {entry.tags && entry.tags.length > 0 && (
        <div className={styles.tags}>
          {entry.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
} 
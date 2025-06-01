'use client';

import React from 'react';
import { Entry } from '@/types/entry';
import styles from '@/styles/components/features/entry/EntryPage.module.css';

interface EntryPageProps {
  entry: Entry;
}

export default function EntryPage({ entry }: EntryPageProps) {
  return (
    <article className={styles.entryPage}>
      <header className={styles.header}>
        <h1 className={styles.title}>{entry.title}</h1>
        <time className={styles.date}>{entry.date}</time>
      </header>

      <div className={styles.content}>
        {entry.content}
      </div>

      {entry.photos && entry.photos.length > 0 && (
        <div className={styles.gallery}>
          {entry.photos.map((photo, index) => (
            <img
              key={index}
              src={photo.url}
              alt={photo.alt || `Photo ${index + 1}`}
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

      {entry.relatedEntries && entry.relatedEntries.length > 0 && (
        <div className={styles.relatedEntries}>
          <h2 className={styles.relatedTitle}>Related Entries</h2>
          <div className={styles.relatedList}>
            {entry.relatedEntries.map((relatedEntry) => (
              <a
                key={relatedEntry.id}
                href={`/entries/${relatedEntry.id}`}
                className={styles.relatedLink}
              >
                {relatedEntry.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  );
} 
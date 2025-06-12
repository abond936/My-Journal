'use client';

import React from 'react';
import { useFilter, ContentType } from '@/components/providers/FilterProvider';
import { FilterableEntryType } from '@/lib/types/entry';
import styles from './ContentTypeFilter.module.css';

export default function ContentTypeFilter() {
  const { contentType, setContentType, entryType, setEntryType } = useFilter();

  const mainOptions: { label: string; value: ContentType }[] = [
    { label: 'All Content', value: 'all' },
    { label: 'Entries', value: 'entries' },
    { label: 'Albums', value: 'albums' },
  ];

  const entryTypeOptions: { label: string; value: FilterableEntryType }[] = [
    { label: 'All Stories', value: 'all' },
    { label: 'Stories', value: 'story' },
    { label: 'Reflections', value: 'reflection' },
    { label: 'Q&A', value: 'qa' },
    { label: 'Quotes', value: 'quote' },
    { label: 'Callouts', value: 'callout' },
  ];

  return (
    <div className={styles.filterContainer}>
      <div className={styles.mainFilterGroup}>
        {mainOptions.map(option => (
          <button
            key={option.value}
            className={`${styles.filterButton} ${contentType === option.value ? styles.active : ''}`}
            onClick={() => setContentType(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {contentType === 'entries' && (
        <div className={styles.entryFilterGroup}>
          {entryTypeOptions.map(option => (
            <button
              key={option.value}
              className={`${styles.filterButton} ${entryType === option.value ? styles.active : ''}`}
              onClick={() => setEntryType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 
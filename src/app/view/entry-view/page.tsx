'use client';

import React, { useEffect } from 'react';
import CardGrid from '@/components/view/CardGrid';
import { useEntries } from '@/lib/hooks/useEntries';
import styles from '@/components/view/CardGrid.module.css';
import Link from 'next/link';

export default function EntryViewPage() {
  const { entries, loading, error } = useEntries();

  useEffect(() => {
    if (entries) {
      console.log('Entries:', entries);
      entries.forEach(entry => {
        console.log(`Entry ${entry.id} media:`, entry.media);
      });
    }
  }, [entries]);

  if (loading) {
    return <div className={styles.loading}>Loading entries...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error loading entries: {error.message}</div>;
  }

  if (!entries || entries.length === 0) {
    return <div className={styles.empty}>No entries found.</div>;
  }

  const mappedEntries = entries.map(entry => ({
    id: entry.id,
    type: 'entry' as const,
    title: entry.title,
    description: entry.excerpt || '',
    date: entry.date?.toLocaleDateString(),
    tags: entry.tags,
    href: `/view/entry-view/${entry.id}`,
    imageUrl: entry.media && entry.media.length > 0 ? entry.media[0] : undefined,
    size: entry.size || 'medium',
    overlay: entry.size === 'large'
  }));

  console.log('Mapped entries:', mappedEntries);

  return (
    <div className={styles.entriesPage}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>My Stories</h1>
          <div className={styles.headerActions}>
            <Link href="/admin/entry-admin/new" className={styles.newEntryButton}>
              New Entry
            </Link>
          </div>
        </div>
      </header>

      <CardGrid
        entries={mappedEntries}
        title="Recent Entries"
        description="A collection of personal entries and reflections"
      />
    </div>
  );
} 
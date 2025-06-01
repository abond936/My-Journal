'use client';

import React, { Suspense } from 'react';
import { useEntry } from '@/lib/hooks/useEntry';
import EntryTemplate from '@/components/features/entry/EntryTemplate';
import { notFound } from 'next/navigation';
import styles from '@/styles/app/entries/entry.module.css';

function EntryContent({ id }: { id: string }) {
  const { entry, loading, error } = useEntry(id);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error.message}</div>;
  if (!entry) return notFound();

  return (
    <EntryTemplate entry={entry}>
      <div dangerouslySetInnerHTML={{ __html: entry.content }} />
    </EntryTemplate>
  );
}

export default function EntryPage({ params }: { params: { id: string } }) {
  return (
    <div className={styles.page}>
      <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
        <EntryContent id={params.id} />
      </Suspense>
    </div>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEntry } from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';
import EntryForm from '@/components/features/entry/EntryForm';
import styles from '@/styles/pages/edit.module.css';

interface EditEntryPageProps {
  params: {
    id: string;
  };
}

export default function EditEntryPage({ params }: EditEntryPageProps) {
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntry = async () => {
      try {
        const loadedEntry = await getEntry(params.id);
        if (!loadedEntry) {
          setError('Entry not found');
          return;
        }
        setEntry(loadedEntry);
      } catch (err) {
        console.error('Error loading entry:', err);
        setError(err instanceof Error ? err.message : 'Failed to load entry');
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [params.id]);

  if (loading) {
    return <div className={styles.loading}>Loading entry...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!entry) {
    return <div className={styles.error}>Entry not found</div>;
  }

  return (
    <div className={styles.editPage}>
      <div className={styles.header}>
        <h1>Edit Entry</h1>
      </div>
      <EntryForm initialEntry={entry} />
    </div>
  );
} 
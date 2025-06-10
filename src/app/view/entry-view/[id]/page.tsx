'use client';

import { useEntry } from '@/lib/hooks/useEntry';
import EntryLayout from '@/components/view/entry/EntryLayout';
import styles from './page.module.css';

interface EntryViewPageProps {
  params: {
    id: string;
  };
}

export default function EntryViewPage({ params }: EntryViewPageProps) {
  const { id } = params;
  const { entry, loading, error } = useEntry(id);

  if (loading) {
    return <div className={styles.centered}>Loading entry...</div>;
  }

  if (error) {
    return <div className={`${styles.centered} ${styles.error}`}>{error.message}</div>;
  }

  if (!entry) {
    return <div className={styles.centered}>Entry not found.</div>;
  }

  return <EntryLayout entry={entry} />;
} 
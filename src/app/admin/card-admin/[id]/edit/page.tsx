'use client';

import { useRouter } from 'next/navigation';
import { useEntry } from '@/lib/hooks/useEntry';
import { Entry } from '@/lib/types/entry';
import EntryForm from '@/components/admin/entry-admin/EntryForm';
import { use } from 'react';
import styles from './page.module.css';

export default function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { entry, loading, error, mutate } = useEntry(resolvedParams.id);

  const handleSuccess = (updatedEntry: Entry) => {
    mutate(updatedEntry); // Optimistically update the cache
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return <div className={styles.loading}>Loading entry...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error.message}</div>;
  }

  if (!entry) {
    return <div className={styles.error}>Entry not found</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Edit Entry</h1>
      </div>
      <EntryForm
        initialEntry={entry}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
} 
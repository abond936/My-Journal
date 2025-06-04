'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEntry } from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';
import EntryForm from '@/components/features/entry/EntryForm';
import styles from '@/app/admin/entry-admin/entry-admin.module.css';

export default function NewEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (entry: Entry) => {
    router.push(`/view/${entry.id}`);
  };

  const handleCancel = () => {
    router.push('/admin/entry-admin');
  };

  const handleSubmit = async (entryData: Partial<Entry>) => {
    try {
      const newEntry = await createEntry(entryData);
      handleSuccess(newEntry);
    } catch (error) {
      console.error('Error creating entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to create entry');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Entry</h1>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <EntryForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
} 
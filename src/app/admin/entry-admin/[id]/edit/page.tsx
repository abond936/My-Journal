'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import EntryForm from '@/components/admin/entry-admin/EntryForm';
import { Entry } from '@/lib/types/entry';
import { useEntry } from '@/lib/hooks/useEntry';
import styles from './page.module.css';

export default function EditEntryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { entry, loading, error } = useEntry(params.id);

  const handleSuccess = (updatedEntry: Entry) => {
    router.push('/admin/entry-admin');
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
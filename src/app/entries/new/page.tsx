'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import EntryForm from '@/components/features/entry/EntryForm';
import { Entry } from '@/lib/types/entry';
import styles from '@/styles/pages/entries/new.module.css';

export default function NewEntryPage() {
  const router = useRouter();

  const handleSuccess = (entry: Entry) => {
    router.push(`/entries/${entry.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Create New Entry</h1>
      </div>
      <EntryForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
} 
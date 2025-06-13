'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEntry } from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';
import EntryForm from '@/components/admin/entry-admin/EntryForm';
import styles from '@/app/admin/entry-admin/entry-admin.module.css';
import Modal from '@/components/common/Modal';
import EntryLayout from '@/components/view/entry-view/EntryLayout';

export default function NewEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [entry, setEntry] = useState<Entry>({
    id: 'new',
    title: '',
    content: '',
    tags: [],
    type: 'story',
    status: 'draft',
    date: new Date(),
    visibility: 'private',
    coverPhoto: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const handleUpdate = (updatedFields: Partial<Entry>) => {
    setEntry(prev => ({ ...prev, ...updatedFields }));
  };

  const handleCancel = () => {
    router.push('/admin/entry-admin');
  };

  const handleSave = async () => {
    try {
      const newEntry = await createEntry(entry);
      router.push('/admin/entry-admin');
    } catch (err) {
      console.error('Error creating entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>New Entry</h1>
        <div className={styles.actions}>
            <button onClick={() => setShowPreview(true)} className={styles.actionButton}>
                Preview
            </button>
            <button onClick={handleSave} className={`${styles.actionButton} ${styles.saveButton}`}>
                Save Entry
            </button>
        </div>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <EntryForm
        entry={entry}
        onUpdate={handleUpdate}
        onCancel={handleCancel}
      />

    {showPreview && (
        <Modal onClose={() => setShowPreview(false)}>
            <EntryLayout entry={entry} onClose={() => setShowPreview(false)} />
        </Modal>
    )}
    </div>
  );
} 
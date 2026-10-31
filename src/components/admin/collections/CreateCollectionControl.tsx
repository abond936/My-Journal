'use client';

import { useState } from 'react';
import type { Collection } from '@/lib/types/collection';
import styles from './CreateCollectionControl.module.css';

export default function CreateCollectionControl({
  onCreated,
}: {
  onCreated: (collection: Collection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'The Collection could not be created.');
      onCreated(data.collection as Collection);
      setTitle('');
      setDescription('');
      setOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'The Collection could not be created.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>New Collection</button>;
  }

  return (
    <section className={styles.form} aria-label="Create Collection">
      <label>
        Title
        <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} autoFocus />
      </label>
      <label>
        Description (optional)
        <textarea value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} rows={3} />
      </label>
      <div className={styles.actions}>
        <button type="button" disabled={saving || !title.trim()} onClick={() => void create()}>
          {saving ? 'Creating…' : 'Create Collection'}
        </button>
        <button type="button" disabled={saving} onClick={() => { setOpen(false); setError(null); }}>Cancel</button>
      </div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </section>
  );
}

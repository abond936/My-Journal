'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './NewAlbumPage.module.css';
import { Album } from '@/lib/types/album';
import Modal from '@/components/common/Modal';
import AlbumLayout from '@/components/view/album-view/AlbumLayout';

/**
 * A form page for creating a new album.
 * It holds all user input in local component state until the user explicitly saves.
 * No database record is created until the "Save Album" button is clicked.
 */
export default function NewAlbumPage() {
  const router = useRouter();
  
  // Local state to manage the form's data. These are the "dummy variables".
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // State to handle the UI feedback during the save operation.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  /**
   * Handles the "Save" button click.
   * Gathers data from local state and sends it to the backend API.
   */
  const handleSave = async () => {
    // Basic validation to ensure a title is provided.
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    
    setLoading(true);
    setError(null);

    // Assemble the new album data from our local state.
    const newAlbumData: Partial<Album> = {
      title: title.trim(),
      description: description.trim(),
      status: 'draft', // Default status for a new album.
      tags: [], // New albums start with no tags.
    };

    try {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlbumData),
      });

      if (!response.ok) {
        // If the server responds with an error, display it to the user.
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save the album.');
      }

      // On success, navigate the user back to the main album list.
      router.push('/admin/album-admin');

    } catch (err) {
      console.error('Album creation failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setLoading(false);
    }
  };

  /**
   * Handles the "Cancel" button click. Discards all changes.
   */
  const handleCancel = () => {
    // Simply navigate away. All local state (title, description) will be discarded.
    router.push('/admin/album-admin');
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  // Create a temporary album object from state for previewing
  const previewAlbumData: Album = {
    id: 'preview',
    title: title || 'Untitled Album',
    description: description || 'No description provided.',
    caption: '',
    coverImage: '',
    mediaCount: 0,
    status: 'draft',
    tags: [],
    images: [],
    name: title || 'Untitled Album',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Album Details</h1>
      </div>

      {/* Form Section */}
      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>Album Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            placeholder="e.g., Summer Vacation 2024"
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
            placeholder="A short description of the album's content..."
            rows={4}
            disabled={loading}
          />
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className={styles.actions}>
        <button
          onClick={handleCancel}
          disabled={loading}
          className={`${styles.button} ${styles.cancelButton}`}
        >
          Cancel
        </button>
        <button
          onClick={handlePreview}
          disabled={!title.trim()}
          className={`${styles.button} ${styles.previewButton}`}
        >
          Preview
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !title.trim()}
          className={`${styles.button} ${styles.saveButton}`}
        >
          {loading ? 'Saving...' : 'Save Album'}
        </button>
      </div>

      {/* Error Display */}
      {error && <p className={styles.error}>{error}</p>}

      {showPreview && (
        <Modal onClose={() => setShowPreview(false)}>
            <AlbumLayout album={previewAlbumData} onClose={() => setShowPreview(false)} />
        </Modal>
      )}
    </div>
  );
}
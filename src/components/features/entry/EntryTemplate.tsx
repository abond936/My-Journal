'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Entry } from '@/lib/types/entry';
import { deleteEntry } from '@/lib/services/entryService';
import styles from '@/app/view/entry-view/EntryTemplate.module.css';

interface EntryTemplateProps {
  entry: Entry;
  children: React.ReactNode;
}

const EntryTemplate: React.FC<EntryTemplateProps> = ({ entry, children }) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    router.push(`/admin/entry-admin/${entry.id}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteEntry(entry.id);
      router.push('/view/entry-view');
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.entryTemplate}>
      <header className={styles.entryHeader}>
        <div className={styles.headerContent}>
          <h1 className={styles.entryTitle}>{entry.title}</h1>
          {entry.date && (
            <time className={styles.entryDate}>
              {new Date(entry.date).toLocaleDateString()}
            </time>
          )}
        </div>
        <div className={styles.entryActions}>
          <button 
            onClick={handleEdit}
            className={styles.editButton}
            aria-label="Edit entry"
          >
            Edit
          </button>
          <button 
            onClick={handleDelete}
            className={styles.deleteButton}
            disabled={isDeleting}
            aria-label="Delete entry"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </header>
      <div className={styles.content}>
        <main className={styles.entryContent}>
          {children}
        </main>
        <aside className={styles.metadataPanel}>
          <div className={styles.metadataSection}>
            <h3>Type</h3>
            <p>{entry.type || 'Not specified'}</p>
          </div>
          <div className={styles.metadataSection}>
            <h3>Status</h3>
            <p>{entry.status || 'Not specified'}</p>
          </div>
          <div className={styles.metadataSection}>
            <h3>Visibility</h3>
            <p>{entry.visibility || 'Not specified'}</p>
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className={styles.metadataSection}>
              <h3>Tags</h3>
              <div className={styles.tags}>
                {entry.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      <footer className={styles.entryFooter}>
        {entry.media && entry.media.length > 0 && (
          <div className={styles.entryGallery}>
            {entry.media.map((mediaUrl, index) => (
              <figure key={index} className={styles.galleryFigure}>
                <img 
                  src={mediaUrl} 
                  alt={`Media ${index + 1}`} 
                  className={styles.galleryImage}
                />
              </figure>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
};

export default EntryTemplate; 
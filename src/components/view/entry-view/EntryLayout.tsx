'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Entry } from '@/lib/types/entry';
import { deleteEntry } from '@/lib/services/entryService'; // Note: This is a temporary architectural violation
import TipTapRenderer from '@/components/common/TipTapRenderer';
import styles from './EntryLayout.module.css';

interface EntryLayoutProps {
  entry: Entry;
}

export default function EntryLayout({ entry }: EntryLayoutProps) {
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
      // TODO: This should be an API call, not a direct service call.
      // Will be fixed in a subsequent refactoring step.
      await deleteEntry(entry.id);
      router.push('/view');
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className={styles.entryLayout}>
       <header className={styles.entryHeader}>
        <div className={styles.headerContent}>
            <button onClick={() => router.back()} className={styles.backButton}>
                &larr; Back
            </button>
            <h1 className={styles.entryTitle}>{entry.title}</h1>
            {entry.date && (
                <time className={styles.entryDate}>
                {new Date(entry.date).toLocaleDateString()}
                </time>
            )}
        </div>
        {/* TODO: This should be conditionally rendered based on user auth state */}
        <div className={styles.entryActions}>
          <button onClick={handleEdit} className={styles.editButton} aria-label="Edit entry">
            Edit
          </button>
          <button onClick={handleDelete} className={styles.deleteButton} disabled={isDeleting} aria-label="Delete entry">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </header>
      
      <div className={styles.contentContainer}>
        <main className={styles.mainContent}>
            {entry.coverPhoto && (
                <figure className={styles.coverPhotoContainer}>
                <img
                    src={entry.coverPhoto.url}
                    alt={entry.title}
                    className={styles.coverPhoto}
                    style={{ objectPosition: entry.coverPhoto.objectPosition || 'center' }}
                />
                </figure>
            )}
            <div className={styles.entryContent}>
                <TipTapRenderer content={entry.content} />
            </div>
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

      {entry.media && entry.media.length > 0 && (
        <footer className={styles.entryFooter}>
            <h3>Media Gallery</h3>
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
        </footer>
        )}
    </div>
  );
} 
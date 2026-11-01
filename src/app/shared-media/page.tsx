'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './shared-media.module.css';

type SharedMediaSummary = {
  docId: string;
  title: string;
  description?: string | null;
  mediaCount: number;
};

export default function SharedMediaCollectionsPage() {
  const [collections, setCollections] = useState<SharedMediaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/shared-media-collections')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Photo collections could not be loaded.');
        if (!cancelled) setCollections(Array.isArray(data.collections) ? data.collections : []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Photo collections could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p>Reader</p>
        <h1>Shared photo collections</h1>
        <span>Photo sets selected for you without exposing the private archive.</span>
      </header>
      {loading ? <p aria-busy="true">Loading photo collections...</p> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {!loading && !error && !collections.length ? <p>No photo collections are available to you yet.</p> : null}
      <div className={styles.collectionGrid}>
        {collections.map((collection) => (
          <Link key={collection.docId} href={`/shared-media/${encodeURIComponent(collection.docId)}`} className={styles.collectionCard}>
            <strong>{collection.title}</strong>
            {collection.description ? <span>{collection.description}</span> : null}
            <small>{collection.mediaCount} photo{collection.mediaCount === 1 ? '' : 's'}</small>
          </Link>
        ))}
      </div>
    </main>
  );
}

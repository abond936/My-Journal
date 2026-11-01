'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from '../shared-media.module.css';

type SharedMediaDetail = {
  docId: string;
  title: string;
  description?: string | null;
  media: Array<{
    docId: string;
    filename: string;
    caption?: string | null;
    width: number;
    height: number;
    url: string;
  }>;
};

export default function SharedMediaCollectionPage() {
  const params = useParams<{ id: string }>();
  const [collection, setCollection] = useState<SharedMediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/shared-media-collections/${encodeURIComponent(params.id)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'This photo collection could not be loaded.');
        if (!cancelled) setCollection(data.collection as SharedMediaDetail);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'This photo collection could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [params.id]);

  return (
    <main className={styles.page}>
      <Link href="/shared-media" className={styles.back}>← All photo collections</Link>
      {loading ? <p aria-busy="true">Loading photos...</p> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {collection ? (
        <>
          <header className={styles.hero}>
            <p>Photo collection</p>
            <h1>{collection.title}</h1>
            {collection.description ? <span>{collection.description}</span> : null}
          </header>
          <div className={styles.photoGrid}>
            {collection.media.map((media) => (
              <figure key={media.docId} className={styles.photo}>
                <Image
                  src={media.url}
                  alt={media.caption || media.filename}
                  width={media.width}
                  height={media.height}
                  sizes="(max-width: 700px) 100vw, 33vw"
                />
                {media.caption ? <figcaption>{media.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}

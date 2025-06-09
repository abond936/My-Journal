'use client';

import { useState, useEffect } from 'react';
import { Album } from '@/lib/types/album';
import AlbumLayout from '@/components/view/album/AlbumLayout';
import styles from '../AlbumView.module.css';

// The props for this page will include the 'id' from the dynamic route segment.
interface AlbumViewPageProps {
  params: {
    id: string;
  };
}

/**
 * Renders a detailed view of a single album, including its images.
 */
export default function AlbumViewPage({ params }: AlbumViewPageProps) {
  const { id } = params;
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect hook to fetch the album data when the component mounts or the id changes.
  useEffect(() => {
    if (!id) return;

    const fetchAlbum = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/albums/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Album not found.');
          }
          throw new Error('Failed to fetch album data.');
        }
        const data: Album = await response.json();
        setAlbum(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [id]);

  if (loading) {
    return <div className={styles.centered}>Loading album...</div>;
  }

  if (error) {
    return <div className={`${styles.centered} ${styles.error}`}>{error}</div>;
  }

  if (!album) {
    // This state should ideally not be reached if error handling is correct.
    return <div className={styles.centered}>No album data available.</div>;
  }

  return <AlbumLayout album={album} />;
}

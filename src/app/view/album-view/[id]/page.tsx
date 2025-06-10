'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Album } from '@/lib/types/album';
import AlbumLayout from '@/components/view/album-view/AlbumLayout';
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
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAlbum, setShowAlbum] = useState(false);

  // useEffect hook to fetch the album data when the component mounts or the id changes.
  useEffect(() => {
    if (!id) return;

    const fetchAlbum = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/albums/${id}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Album not found.' : 'Failed to fetch album data.');
        }
        const data: Album = await response.json();
        setAlbum(data);
        setShowAlbum(true); // Show album once data is fetched
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [id]);

  const handleClose = () => {
    setShowAlbum(false);
    // Navigate back to the main view page after a short delay to allow for animations
    setTimeout(() => {
      router.push('/view');
    }, 300);
  };

  if (loading) {
    return <div className={styles.centered}>Loading album...</div>;
  }

  if (error) {
    return <div className={`${styles.centered} ${styles.error}`}>{error}</div>;
  }

  return (
    <>
      {showAlbum && album && (
        <AlbumLayout album={album} onClose={handleClose} />
      )}
    </>
  );
}

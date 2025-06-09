'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Album, AlbumImage } from '@/lib/types/album';
import { PhotoMetadata } from '@/lib/types/photo';
import AlbumForm from '@/components/admin/album-admin/AlbumForm';
import PhotoManager from '@/components/admin/album-admin/PhotoManager';
import PhotoPicker from '@/components/PhotoPicker';
import AlbumStyleSelector from '@/components/admin/album-admin/AlbumStyleSelector';
import styles from './page.module.css';

export default function AlbumEditPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchAlbum = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/albums/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch album');
        }
        const data = await response.json();
        setAlbum(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [id]);

  const handleSave = async (updatedAlbum: Partial<Album>) => {
    try {
      const response = await fetch(`/api/albums/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAlbum),
      });

      if (!response.ok) {
        throw new Error('Failed to update album');
      }
      
      // Optionally, show a success message
      // For now, we just refetch the data to show the update
      const data = await response.json();
      setAlbum(data);
    } catch (err) {
      console.error(err);
      // Show error to user
    }
  };

  const handleUpdatePhotos = async (newImages: AlbumImage[]) => {
    try {
      const response = await fetch(`/api/albums/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: newImages }),
      });
      if (!response.ok) throw new Error('Failed to update photos');
      
      const updatedAlbum = await response.json();
      setAlbum(updatedAlbum);

    } catch (err) {
      console.error(err);
      // Show error to user
    }
  };

  const handleAddPhotos = (newPhotos: PhotoMetadata[]) => {
    if (!album) return;
    
    const existingImageIds = new Set((album.images || []).map(img => img.sourceId));
    
    const photosToAdd = newPhotos
      .filter(p => !existingImageIds.has(p.id))
      .map(p => ({
        sourceId: p.id,
        path: p.path,
        width: p.width,
        height: p.height,
        previewUrl: p.previewUrl,
        displayUrl: p.webUrl,
      }));

    const updatedImages = [...(album.images || []), ...photosToAdd];

    handleUpdatePhotos(updatedImages);
    setIsPickerOpen(false);
  };

  const handleRemovePhoto = (photoIdToRemove: string) => {
    if (!album) return;
    const updatedImages = album.images.filter(p => p.sourceId !== photoIdToRemove);
    handleUpdatePhotos(updatedImages);
  };

  const handleReorderPhotos = (reorderedPhotos: AlbumImage[]) => {
    if (!album) return;
    // The reorderedPhotos are already in the correct order from the component
    handleUpdatePhotos(reorderedPhotos);
  };

  const handleStyleSelect = (styleId: string) => {
    handleSave({ styleId });
  };

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (error) return <div className={styles.container}>Error: {error}</div>;
  if (!album) return <div className={styles.container}>Album not found.</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Edit Album</h1>
      <AlbumForm initialAlbum={album} onSave={handleSave} />

      <hr className={styles.divider} />

      <AlbumStyleSelector
        selectedStyleId={album.styleId}
        onStyleSelect={handleStyleSelect}
      />

      <hr className={styles.divider} />

      <PhotoManager
        photos={album.images}
        onAdd={() => setIsPickerOpen(true)}
        onRemove={handleRemovePhoto}
        onReorder={handleReorderPhotos}
      />

      {isPickerOpen && (
        <PhotoPicker
          onMultiPhotoSelect={handleAddPhotos}
          onClose={() => setIsPickerOpen(false)}
          initialMode="multi"
        />
      )}
    </div>
  );
} 
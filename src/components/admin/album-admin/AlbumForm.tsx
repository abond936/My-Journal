'use client';

import { useState, useEffect } from 'react';
import { Album } from '@/lib/types/album';
import { PhotoMetadata } from '@/lib/types/photo';
import CoverPhotoContainer from '../entry-admin/CoverPhotoContainer';
import styles from './AlbumForm.module.css';

interface AlbumFormProps {
  initialAlbum: Album;
  onSave: (updatedAlbum: Partial<Album>) => Promise<void>;
}

export default function AlbumForm({ initialAlbum, onSave }: AlbumFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    caption: '',
    coverPhoto: null as PhotoMetadata | null,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialAlbum) {
      setFormData({
        title: initialAlbum.title || '',
        description: initialAlbum.description || '',
        caption: initialAlbum.caption || '',
        coverPhoto: initialAlbum.coverPhoto || null,
      });
    }
  }, [initialAlbum]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverPhotoSelect = (photo: PhotoMetadata) => {
    setFormData(prev => ({ ...prev, coverPhoto: photo }));
  };

  const handleCoverPhotoRemove = () => {
    setFormData(prev => ({ ...prev, coverPhoto: null }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedFields: Partial<Album> = {};

    if (formData.title !== (initialAlbum.title || '')) {
      updatedFields.title = formData.title;
    }
    if (formData.description !== (initialAlbum.description || '')) {
      updatedFields.description = formData.description;
    }
    if (formData.caption !== (initialAlbum.caption || '')) {
      updatedFields.caption = formData.caption;
    }
    if (formData.coverPhoto !== (initialAlbum.coverPhoto || null)) {
      updatedFields.coverPhoto = formData.coverPhoto;
    }

    if (Object.keys(updatedFields).length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(updatedFields);
    } catch (error) {
      console.error("Failed to save album", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleInputChange}
          className={styles.input}
        />
      </div>
      
      <div className={styles.formGroup}>
        <label>Cover Photo</label>
        <CoverPhotoContainer
          coverPhoto={formData.coverPhoto}
          onCoverPhotoSelect={handleCoverPhotoSelect}
          onCoverPhotoRemove={handleCoverPhotoRemove}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className={styles.textarea}
        />
      </div>
      <button type="submit" disabled={isSaving} className={styles.saveButton}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
} 
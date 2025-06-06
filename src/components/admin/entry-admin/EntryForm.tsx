'use client';

import React, { useState, useEffect } from 'react';
import { Entry } from '@/lib/types/entry';
import { createEntry, updateEntry } from '@/lib/services/entryService';
import { organizeEntryTags } from '@/lib/services/tagService';
import TagSelector from '@/components/common/TagSelector';
import RichTextEditor from '@/components/common/RichTextEditor';
import CoverPhotoContainer from './CoverPhotoContainer';
import { PhotoMetadata } from '@/lib/services/photos/photoService';
import styles from './EntryForm.module.css';

interface EntryFormProps {
  initialEntry?: Entry;
  onSuccess?: (entry: Entry) => void;
  onCancel?: () => void;
}

const EntryForm: React.FC<EntryFormProps> = ({ 
  initialEntry,
  onSuccess,
  onCancel 
}) => {
  const [formData, setFormData] = useState<Partial<Entry>>({
    title: initialEntry?.title || '',
    content: initialEntry?.content || '',
    type: initialEntry?.type || 'text',
    status: initialEntry?.status || 'draft',
    visibility: initialEntry?.visibility || 'private',
    tags: initialEntry?.tags || [],
    coverPhoto: initialEntry?.coverPhoto || null,
    media: initialEntry?.media || []
  });

  // Organize tags when initialEntry changes
  useEffect(() => {
    if (initialEntry?.tags) {
      organizeEntryTags(initialEntry.tags).then(organizedTags => {
        setFormData(prev => ({
          ...prev,
          ...organizedTags
        }));
      });
    }
  }, [initialEntry]);

  // Replace the existing useEffect for initialEntry with this one
  useEffect(() => {
    if (initialEntry) {
      setFormData({
        title: initialEntry.title || '',
        content: initialEntry.content || '',
        type: initialEntry.type || 'text',
        status: initialEntry.status || 'draft',
        visibility: initialEntry.visibility || 'private',
        tags: initialEntry.tags || [],
        media: initialEntry.media || [],
        coverPhoto: initialEntry.coverPhoto || null,
      });
    }
  }, [initialEntry]); // Only run when initialEntry changes

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagsChange = (dimension: 'who' | 'what' | 'when' | 'where' | 'reflection', tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      [dimension]: tags,
      // Update the main tags array to include all dimension tags
      tags: [
        ...(prev.who || []),
        ...(prev.what || []),
        ...(prev.when || []),
        ...(prev.where || []),
        ...(prev.reflection || [])
      ]
    }));
  };

  const handleContentChange = (newContent: string, newMedia: PhotoMetadata[]) => {
    console.log('Content changed:', { newContent, newMedia });
    setFormData(prev => ({
      ...prev,
      content: newContent,
      media: newMedia
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Extract photo references from content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formData.content;
      const images = tempDiv.querySelectorAll('img[data-photo-metadata]');
      const photoRefs = Array.from(images).map(img => {
        const metadata = JSON.parse(img.getAttribute('data-photo-metadata') || '{}');
        return {
          id: metadata.id,
          filename: metadata.filename,
          path: metadata.path,
          albumId: metadata.albumId,
          albumName: metadata.albumName,
          size: metadata.size,
          lastModified: metadata.lastModified,
          caption: metadata.caption,
          tags: metadata.tags
        };
      });

      const entryData = {
        ...formData,
        media: photoRefs,
        coverPhoto: formData.coverPhoto || null
      };

      let result: Entry;
      if (initialEntry?.id) {
        result = await updateEntry(initialEntry.id, entryData);
      } else {
        result = await createEntry(entryData as Omit<Entry, 'id'>);
      }
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCoverPhotoSelect = (photo: PhotoMetadata) => {
    setFormData(prev => ({
      ...prev,
      coverPhoto: photo
    }));
  };

  const handleCoverPhotoRemove = () => {
    setFormData(prev => ({
      ...prev,
      coverPhoto: undefined
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}
      
      <div className={styles.mainContent}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Cover Photo</label>
          <CoverPhotoContainer
            coverPhoto={formData.coverPhoto}
            onPhotoSelect={handleCoverPhotoSelect}
            onPhotoRemove={handleCoverPhotoRemove}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="content" className={styles.label}>Content</label>
          <RichTextEditor
            content={formData.content || ''}
            media={formData.media || []}
            onChange={handleContentChange}
          />
        </div>
      </div>

      <div className={styles.sidebar}>
        <div className={styles.formGroup}>
          <label htmlFor="type">Type</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="story">Story</option>
            <option value="reflection">Reflection</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="visibility">Visibility</label>
          <select
            id="visibility"
            name="visibility"
            value={formData.visibility}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="private">Private</option>
            <option value="family">Family</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Who</label>
          <TagSelector
            selectedTags={formData.who || []}
            onTagsChange={(tags) => handleTagsChange('who', tags)}
            dimension="who"
          />
        </div>

        <div className={styles.formGroup}>
          <label>What</label>
          <TagSelector
            selectedTags={formData.what || []}
            onTagsChange={(tags) => handleTagsChange('what', tags)}
            dimension="what"
          />
        </div>

        <div className={styles.formGroup}>
          <label>When</label>
          <TagSelector
            selectedTags={formData.when || []}
            onTagsChange={(tags) => handleTagsChange('when', tags)}
            dimension="when"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Where</label>
          <TagSelector
            selectedTags={formData.where || []}
            onTagsChange={(tags) => handleTagsChange('where', tags)}
            dimension="where"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Reflection</label>
          <TagSelector
            selectedTags={formData.reflection || []}
            onTagsChange={(tags) => handleTagsChange('reflection', tags)}
            dimension="reflection"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : initialEntry ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default EntryForm; 
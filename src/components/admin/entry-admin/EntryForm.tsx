'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Entry } from '@/lib/types/entry';
import { createEntry, updateEntry } from '@/lib/services/entryService';
import { organizeEntryTags } from '@/lib/services/tagService';
import TagSelector from '@/components/common/TagSelector';
import RichTextEditor from '@/components/common/RichTextEditor';
import type { RichTextEditorRef } from '@/components/common/RichTextEditor'; // Import the Ref type
import CoverPhotoContainer from './CoverPhotoContainer';
import PhotoPicker from '@/components/PhotoPicker'; // Import PhotoPicker
import { PhotoMetadata } from '@/lib/types/photo';
import { ContentValidationError } from '@/lib/utils/contentValidation';
import styles from './EntryForm.module.css';
import { EntryFormData } from '@/lib/types/entry';

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
  const [formData, setFormData] = useState<Omit<EntryFormData, 'media'>>({ // Omit 'media' from the type
    title: '',
    content: '',
    tags: [],
    type: 'story',
    status: 'draft',
    date: new Date(),
    visibility: 'private',
    coverPhoto: null,
  });
  const editorRef = useRef<RichTextEditorRef>(null); // Use the imported Ref type
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false); // State for PhotoPicker

  useEffect(() => {
    if (initialEntry) {
      setFormData({
        title: initialEntry.title || '',
        content: initialEntry.content || '',
        tags: initialEntry.tags || [],
        type: initialEntry.type || 'story',
        status: initialEntry.status || 'draft',
        date: initialEntry.date || new Date(),
        visibility: initialEntry.visibility || 'private',
        coverPhoto: initialEntry.coverPhoto || null,
      });

      if (initialEntry.tags) {
        organizeEntryTags(initialEntry.tags).then(organizedTags => {
            setFormData(prev => ({
                ...prev,
                ...organizedTags
            }));
        });
      }
    }
  }, [initialEntry]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setValidationErrors([]);

    try {
      // Step 1: Get final HTML content from the editor ref.
      const currentContent = editorRef.current?.getContent();

      if (currentContent === undefined || currentContent === null) {
        throw new Error("Could not get content from editor. The editor might not be initialized.");
      }

      // Step 2: Assemble the entry data. Note the absence of the 'media' array.
      const entryData = {
        ...formData,
        content: currentContent,
        coverPhoto: formData.coverPhoto || null
      };

      let result: Entry;
      if (initialEntry?.id) {
        result = await updateEntry(initialEntry.id, entryData);
      } else {
        // Create requires all fields, ensure type safety.
        const finalDataForCreation = {
            ...entryData,
            // Ensure fields that might be null/undefined have defaults if needed by createEntry
            // Example:
            tags: entryData.tags || [],
            date: entryData.date || new Date(),
            // etc., for all fields in Entry but not in Omit<EntryFormData, 'media'>
        } as Omit<Entry, 'id'>;
        result = await createEntry(finalDataForCreation);
      }
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof ContentValidationError) {
        setValidationErrors([err.message]);
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
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

  // --- New Handlers for Photo Picker ---
  
  /**
   * Called by the RichTextEditor when its "Add Image" button is clicked.
   */
  const handleOpenPhotoPicker = () => {
    setIsPhotoPickerOpen(true);
  };

  /**
   * Called by the PhotoPicker when a photo is selected.
   * This function "injects" the image into the RichTextEditor.
   */
  const handlePhotoSelectedFromPicker = (photo: PhotoMetadata) => {
    if (editorRef.current) {
      editorRef.current.addImage(photo);
    }
    setIsPhotoPickerOpen(false);
  };

  /**
   * Called by the PhotoPicker when multiple photos are selected.
   */
  const handleMultiPhotoSelectedFromPicker = (photos: PhotoMetadata[]) => {
    if (editorRef.current) {
      photos.forEach(photo => {
        editorRef.current?.addImage(photo);
      });
    }
    setIsPhotoPickerOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      
      {validationErrors.length > 0 && (
        <div className={styles.validationErrors}>
          {validationErrors.map((error, index) => (
            <div key={index} className={styles.validationError}>
              {error}
            </div>
          ))}
        </div>
      )}

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
            onCoverPhotoSelect={handleCoverPhotoSelect}
            onCoverPhotoRemove={handleCoverPhotoRemove}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="content" className={styles.label}>Content</label>
          <RichTextEditor
            ref={editorRef}
            content={formData.content || ''}
            onAddImage={handleOpenPhotoPicker} // Pass the handler to the editor
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

      {isPhotoPickerOpen && (
        <PhotoPicker
          onPhotoSelect={handlePhotoSelectedFromPicker}
          onMultiPhotoSelect={handleMultiPhotoSelectedFromPicker}
          onClose={() => setIsPhotoPickerOpen(false)}
        />
      )}
    </form>
  );
};

export default EntryForm;
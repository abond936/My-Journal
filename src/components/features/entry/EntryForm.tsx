'use client';

import React, { useState } from 'react';
import { Entry } from '@/lib/types/entry';
import { createEntry, updateEntry } from '@/lib/services/entryService';
import TagSelector from './TagSelector';
import RichTextEditor from '@/components/common/editor/RichTextEditor';
import styles from '@/styles/components/features/entry/EntryForm.module.css';

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
  const [formData, setFormData] = useState<Partial<Entry>>(initialEntry || {
    title: '',
    content: '',
    type: 'story',
    status: 'draft',
    visibility: 'private',
    tags: [],
    who: [],
    what: [],
    when: [],
    where: [],
    reflection: [],
    inheritedTags: []
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let result: Entry;
      if (initialEntry?.id) {
        result = await updateEntry(initialEntry.id, formData);
      } else {
        result = await createEntry(formData as Omit<Entry, 'id'>);
      }
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
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
          <label htmlFor="content">Content</label>
          <RichTextEditor
            content={formData.content}
            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
            placeholder="Start writing your entry..."
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
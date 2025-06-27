'use client';

import React, { useRef, useCallback, useState, memo, useEffect } from 'react';
import { Card, CardUpdate } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import CoverPhotoContainer from '@/components/admin/card-admin/CoverPhotoContainer';
import GalleryManager from '@/components/admin/card-admin/GalleryManager';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import ChildCardManager from '@/components/admin/card-admin/ChildCardManager';
import RichTextEditor, { RichTextEditorRef } from '@/components/common/RichTextEditor';
import styles from './CardForm.module.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCardForm } from '@/components/providers/CardFormProvider';
import clsx from 'clsx';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import LoadingOverlay from '@/components/admin/card-admin/LoadingOverlay';

interface CardFormProps {
  onDelete?: () => Promise<void>;
}

// Memoized form sections
const TitleSection = memo(({ title, onChange, error }: { title: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, error?: string }) => (
  <div className={styles.titleSection}>
    <input
      type="text"
      name="title"
      value={title || ''}
      onChange={onChange}
      placeholder="Card Title"
      className={clsx(styles.titleInput, error && styles.inputError)}
      aria-invalid={!!error}
      aria-describedby={error ? 'title-error' : undefined}
    />
    {error && <p id="title-error" className={styles.errorText}>{error}</p>}
  </div>
));

const StatusSection = memo(({ status, onChange, error }: { status: Card['status'], onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, error?: string }) => (
  <div className={styles.statusSection}>
    <label htmlFor="status">Status</label>
    <select
      id="status"
      name="status"
      value={status || ''}
      onChange={onChange}
      className={clsx(styles.select, error && styles.inputError)}
      aria-invalid={!!error}
      aria-describedby={error ? 'status-error' : undefined}
    >
      <option value="draft">Draft</option>
      <option value="published">Published</option>
      <option value="archived">Archived</option>
    </select>
    {error && <p id="status-error" className={styles.errorText}>{error}</p>}
  </div>
));

const ErrorSummary = memo(({ errors }: { errors: Record<string, string> }) => {
  if (Object.keys(errors).length === 0) return null;

  return (
    <div className={styles.errorSummary} role="alert">
      <h4>Please fix the following errors:</h4>
      <ul>
        {Object.entries(errors).map(([field, message]) => (
          <li key={field}>
            <button
              type="button"
              onClick={() => {
                const element = document.querySelector(`[name="${field}"]`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            >
              {field}: {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

const CardForm: React.FC<CardFormProps> = ({ onDelete }) => {
  const {
    formState: { cardData, tags, coverImage, galleryMedia, mediaCache, isDirty, isSaving, errors },
    allTags,
    updateField,
    updateTags,
    updateCoverImage,
    updateGalleryMedia,
    updateContentMedia,
    handleSave,
    validateForm,
  } = useCardForm();

  const editorRef = useRef<RichTextEditorRef>(null);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Add diagnostic logging for initial data
  useEffect(() => {
    console.log('CardForm - Initial card data:', {
      id: cardData?.id,
      title: cardData?.title,
      content: cardData?.content ? 'Present' : 'Missing',
      coverImageId: cardData?.coverImageId,
      coverImage: coverImage ? 'Present' : 'Missing',
      when: cardData?.when,
      galleryMedia: galleryMedia?.length || 0
    });
  }, [cardData, coverImage, galleryMedia]);

  // Only show errors after user interaction
  const displayErrors = hasInteracted ? errors : {};

  // Memoized event handlers
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHasInteracted(true);
    updateField('title', e.target.value);
  }, [updateField]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setHasInteracted(true);
    updateField('status', e.target.value as Card['status']);
  }, [updateField]);

  const handleContentChange = useCallback((content: string) => {
    console.log('CardForm - Content changed:', { content });
    setHasInteracted(true);
    updateField('content', content);
  }, [updateField]);

  const handleContentMediaChange = useCallback((mediaIds: string[]) => {
    setHasInteracted(true);
    updateContentMedia(mediaIds);
  }, [updateContentMedia]);

  const handleTagsChange = useCallback((newIds: string[]) => {
    setHasInteracted(true);
    updateTags(allTags.filter(tag => newIds.includes(tag.id)));
  }, [updateTags, allTags]);

  const handleGalleryChange = useCallback((newMedia: Card['galleryMedia']) => {
    setHasInteracted(true);
    updateGalleryMedia(newMedia);
  }, [updateGalleryMedia]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasInteracted(true);
    
    console.log('CardForm - Attempting to save:', {
      cardData,
      isValid: validateForm(),
      errors,
      content: cardData.content
    });
    
    if (!validateForm()) {
      console.log('CardForm - Validation failed:', errors);
      const firstErrorElement = document.querySelector(`.${styles.inputError}`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      console.log('CardForm - Validation passed, saving...');
      await handleSave();
      console.log('CardForm - Save successful');
    } catch (error) {
      console.error('CardForm - Error submitting form:', error);
    }
  }, [validateForm, handleSave, cardData, errors]);

  const handleAddImage = useCallback(() => {
    setIsPhotoPickerOpen(true);
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <LoadingOverlay isVisible={isSaving} />
      <form id="card-form" onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <input
              type="text"
              value={cardData.title}
              onChange={handleTitleChange}
              placeholder="Card Title"
              className={clsx(styles.titleInput, displayErrors.title && styles.inputError)}
            />
            {displayErrors.title && <p className={styles.errorText}>{displayErrors.title}</p>}
          </div>

          <div className={styles.coverPhotoSection}>
            {console.log('Rendering CoverPhotoContainer with:', { coverImage, displayErrors })}
            <CoverPhotoContainer
              coverImage={coverImage}
              onChange={updateCoverImage}
              error={displayErrors.coverImage}
            />
          </div>

          <div className={styles.statusSection}>
            <select
              value={cardData.status}
              onChange={handleStatusChange}
              className={clsx(styles.statusSelect, displayErrors.status && styles.inputError)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            {displayErrors.status && <p className={styles.errorText}>{displayErrors.status}</p>}
          </div>

          <div className={styles.tagsSection}>
            <MacroTagSelector
              selectedTags={tags}
              allTags={allTags}
              onChange={handleTagsChange}
              error={displayErrors.tags}
              className={clsx(styles.tagSelector, displayErrors.tags && styles.inputError)}
            />
          </div>

          <div className={styles.editorSection}>
            <RichTextEditor
              ref={editorRef}
              initialContent={cardData.content}
              onChange={handleContentChange}
              onContentMediaChange={handleContentMediaChange}
              onAddImage={handleAddImage}
              error={displayErrors.content}
              className={clsx(displayErrors.content && styles.inputError)}
            />
            {displayErrors.content && <p className={styles.errorText}>{displayErrors.content}</p>}
          </div>

          <div className={styles.gallerySection}>
            <GalleryManager />
          </div>

          <div className={styles.childrenSection}>
            <ChildCardManager />
          </div>
        </div>
      </form>

      <PhotoPicker
        isOpen={isPhotoPickerOpen}
        onClose={() => setIsPhotoPickerOpen(false)}
        onSelect={(media) => {
          if (editorRef.current) {
            editorRef.current.insertImage(media);
          }
          setIsPhotoPickerOpen(false);
        }}
      />
    </DndProvider>
  );
};

export default memo(CardForm);
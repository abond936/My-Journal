'use client';

import React, { useRef, useCallback, useState } from 'react';
import { Card } from '@/lib/types/card';
import { Media } from '@/lib/types/photo';
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

const CardForm: React.FC<CardFormProps> = ({ onDelete }) => {
  const {
    formState: { cardData, tags, isSaving, errors },
    allTags,
    setField,
    updateTags,
    updateContentMedia,
    handleSave,
    validateForm,
  } = useCardForm();

  const editorRef = useRef<RichTextEditorRef>(null);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setField('title', e.target.value), [setField]);
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setField('status', e.target.value as Card['status']), [setField]);
  const handleContentChange = useCallback((content: string) => setField('content', content), [setField]);
  const handleTagsChange = useCallback((newIds: string[]) => updateTags(allTags.filter(tag => newIds.includes(tag.id))), [updateTags, allTags]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    await handleSave();
  }, [validateForm, handleSave]);

  const handleAddImageToContent = useCallback(() => {
    setIsPhotoPickerOpen(true);
  }, []);

  const handlePhotoSelectForContent = useCallback((media: Media) => {
    editorRef.current?.insertImage(media);
    setIsPhotoPickerOpen(false);
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <LoadingOverlay isVisible={isSaving} />
      {isPhotoPickerOpen && (
        <PhotoPicker
          isOpen={isPhotoPickerOpen}
          onSelect={handlePhotoSelectForContent}
          onClose={() => setIsPhotoPickerOpen(false)}
          initialMode="single"
        />
      )}
      <form id="card-form" onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <input
              type="text"
              value={cardData.title}
              onChange={handleTitleChange}
              placeholder="Card Title"
              className={clsx(styles.titleInput, errors.title && styles.inputError)}
            />
          </div>

          <div className={styles.coverPhotoSection}>
            <CoverPhotoContainer />
          </div>

          <div className={styles.statusSection}>
            <select
              value={cardData.status}
              onChange={handleStatusChange}
              className={clsx(styles.statusSelect, errors.status && styles.inputError)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div className={styles.tagsSection}>
            <MacroTagSelector
              selectedTags={tags}
              allTags={allTags}
              onChange={handleTagsChange}
              className={clsx(styles.tagSelector, errors.tags && styles.inputError)}
            />
          </div>

          <div className={styles.editorSection}>
            <RichTextEditor
              ref={editorRef}
              initialContent={cardData.content}
              onChange={handleContentChange}
              onContentMediaChange={updateContentMedia}
              onAddImage={handleAddImageToContent}
              error={errors.content}
              className={clsx(errors.content && styles.inputError)}
            />
          </div>

          <div className={styles.gallerySection}>
            <GalleryManager />
          </div>

          <div className={styles.childrenSection}>
            <ChildCardManager />
          </div>
        </div>
      </form>
    </DndProvider>
  );
};

export default CardForm;
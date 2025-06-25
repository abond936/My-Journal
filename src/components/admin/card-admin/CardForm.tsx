'use client';

import { Tag } from '@/lib/types/tag';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardUpdate } from '@/lib/types/card';
import CoverPhotoContainer from './CoverPhotoContainer';
import { Media } from '@/lib/types/photo';
import GalleryManager from './GalleryManager';
import MacroTagSelector from './MacroTagSelector';
import ChildCardManager from './ChildCardManager';
import RichTextEditor, { RichTextEditorRef } from '@/components/common/RichTextEditor';
import styles from './CardForm.module.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { debounce } from 'lodash';
import { updateMediaStatus } from '@/lib/services/images/imageService';

const EMPTY_CARD: Card = {
  id: '',
  title: '',
  content: '',
  status: 'draft',
  createdAt: 0,
  updatedAt: 0,
  tags: [],
  children: [],
  filterTags: {},
  coverImageId: null,
  coverImage: null,
};

interface CardFormProps {
  initialCard: Card | null;
  allTags: Tag[];
  onSave: (cardData: CardUpdate, tags: Tag[]) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const CardForm: React.FC<CardFormProps> = ({ initialCard, allTags, onSave, onDelete }) => {
  const cardToEdit = initialCard || EMPTY_CARD;

  const [cardData, setCardData] = useState<CardUpdate>({ ...cardToEdit });
  const [tags, setTags] = useState<Tag[]>(cardToEdit.tags || []);
  const [coverImage, setCoverImage] = useState<Media | undefined | null>(cardToEdit.coverImage);
  const [isSaving, setIsSaving] = useState(false);
  
  const originalCoverImageId = useRef<string | null | undefined>(cardToEdit.coverImageId);

  const editorRef = useRef<RichTextEditorRef>(null);

  useEffect(() => {
    const freshCardToEdit = initialCard || EMPTY_CARD;
    setCardData({ ...freshCardToEdit });
    setTags(freshCardToEdit.tags || []);
    setCoverImage(freshCardToEdit.coverImage);
    originalCoverImageId.current = freshCardToEdit.coverImageId;
  }, [initialCard]);

  const debouncedDataChange = useCallback(debounce((field: keyof CardUpdate, value: any) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  }, 300), []);

  const handleCoverPhotoUpdate = (media: Media | null) => {
    setCoverImage(media);
    setCardData(prev => ({ ...prev, coverImageId: media?.id || null }));
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave(cardData, tags);

      const newCoverImageId = coverImage?.id;
      
      // Phase 2: Finalize media status changes
      if (newCoverImageId && newCoverImageId !== originalCoverImageId.current) {
        // A new image was added, finalize it.
        await updateMediaStatus(newCoverImageId, 'active');
      }
      
      if (originalCoverImageId.current && newCoverImageId !== originalCoverImageId.current) {
        // An old image was replaced or removed, mark it as deleted.
        await updateMediaStatus(originalCoverImageId.current, 'deleted');
      }
      
      originalCoverImageId.current = newCoverImageId;

    } catch (error) {
      console.error('Error during save process:', error);
      // Optionally, show an error message to the user
    } finally {
      setIsSaving(false);
    }
  };
  
  const galleryImages: Media[] = [];

  return (
    <DndProvider backend={HTML5Backend}>
      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.mainContent}>
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>Title</label>
            <input
              type="text"
              id="title"
              value={cardData.title || ''}
              onChange={(e) => debouncedDataChange('title', e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <RichTextEditor ref={editorRef} initialContent={cardData.content} />
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.formGroup}>
            <button type="submit" className={styles.saveButton} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Card'}
            </button>
            {onDelete && (
              <button type="button" onClick={onDelete} className={styles.deleteButton}>
                Delete Card
              </button>
            )}
          </div>
          <div className={styles.formGroup}>
            <CoverPhotoContainer
              coverImage={coverImage}
              onUpdate={handleCoverPhotoUpdate}
            />
          </div>

          <GalleryManager 
            mediaItems={galleryImages} 
            onAdd={() => { /* Implement gallery logic later */ }}
            onRemove={() => { /* Implement gallery logic later */ }}
          />

          <div className={styles.formGroup}>
            <label>Tags</label>
            <MacroTagSelector
              selectedTagIds={tags ? tags.map(tag => tag.id) : []}
              onSave={newIds => setTags(allTags.filter(tag => newIds.includes(tag.id)))}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Status</label>
            <select
              value={cardData.status || 'draft'}
              onChange={(e) => debouncedDataChange('status', e.target.value)}
              className={styles.select}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </form>
    </DndProvider>
  );
};

export default CardForm;
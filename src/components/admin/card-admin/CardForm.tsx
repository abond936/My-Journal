'use client';

import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { Tag } from '@/lib/types/tag';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardUpdate } from '@/lib/types/card';
import CoverPhotoContainer from './CoverPhotoContainer';
import { Media } from '@/lib/types/photo';
import GalleryManager from './GalleryManager';
import MacroTagSelector from './MacroTagSelector';
import ChildCardManager from './ChildCardManager';
import PhotoPicker from './PhotoPicker';
import RichTextEditor, { RichTextEditorRef } from '@/components/common/RichTextEditor/RichTextEditor';
import styles from './CardForm.module.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { debounce } from 'lodash';

interface CardFormProps {
  initialCard: Card;
  allTags: Tag[];
  onSave: (cardData: CardUpdate, tags: Tag[]) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const CardForm: React.FC<CardFormProps> = ({ initialCard, allTags, onSave, onDelete }) => {
  const [cardData, setCardData] = useState<CardUpdate>({ ...initialCard });
  const [tags, setTags] = useState<Tag[]>(initialCard.tags || []);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'cover' | 'gallery' | 'content' | null>(null);
  const [mediaCache, setMediaCache] = useState<Media[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const editorRef = useRef<RichTextEditorRef>(null);

  useEffect(() => {
    setCardData({ ...initialCard });
    setTags(initialCard.tags || []);
    if (initialCard.id) {
        fetchMediaForCard(initialCard);
    }
  }, [initialCard]);

  const fetchMediaForCard = useCallback(async (card: Card) => {
    if (!card) return;
    try {
        const mediaIdSet = new Set<string>();
        if (card.coverImageId) {
            mediaIdSet.add(card.coverImageId);
        }
        card.galleryMedia?.forEach(m => mediaIdSet.add(m.id));

        if (mediaIdSet.size > 0) {
            const response = await fetch('/api/cards/by-ids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(mediaIdSet) })
            });
            if (!response.ok) throw new Error('Failed to fetch media details');
            
            const media: Media[] = await response.json();
            setMediaCache(prevCache => {
                const cacheMap = new Map(prevCache.map(item => [item.id, item]));
                media.forEach(item => cacheMap.set(item.id, item));
                return Array.from(cacheMap.values());
            });
        }
    } catch (error) {
        console.error('Error fetching media details:', error);
    }
  }, []);

  const handleDataChange = (field: keyof CardUpdate, value: any) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  const debouncedDataChange = useCallback(debounce(handleDataChange, 300), []);

  const handlePhotoSelected = useCallback((media: Media) => {
    if (!pickerTarget) return;

    if (pickerTarget === 'cover') {
        setCardData(prev => ({...prev, coverImageId: media.id}));
        setMediaCache(prev => [...prev, media]);
    } else if (pickerTarget === 'content') {
      if (editorRef.current) {
        editorRef.current.addImage(media);
      }
    }
    setPickerOpen(false);
    setPickerTarget(null);
  }, [pickerTarget, editorRef]);

  const handleGalleryPhotosSelected = useCallback((newMediaItems: Media[]) => {
    setCardData(prevData => {
      const existingMediaIds = new Set(prevData.galleryMedia?.map(m => m.id) || []);
      const uniqueNewItems = newMediaItems.filter(newItem => !existingMediaIds.has(newItem.id));
      
      return {
        ...prevData,
        galleryMedia: [...(prevData.galleryMedia || []), ...uniqueNewItems.map(m => ({ id: m.id, type: 'image' }))]
      };
    });

    setMediaCache(prevCache => {
      const existingCacheIds = new Set(prevCache.map(m => m.id));
      const uniqueNewMedia = newMediaItems.filter(m => !existingCacheIds.has(m.id));
      return [...prevCache, ...uniqueNewMedia];
    });

    setPickerOpen(false);
    setPickerTarget(null);
  }, []);

  const handleRemoveFromGallery = useCallback((mediaId: string) => {
    setCardData(prev => ({
      ...prev,
      galleryMedia: prev.galleryMedia?.filter(m => m.id !== mediaId)
    }));
  }, []);
  
  const handleCoverPhotoRemove = useCallback(() => {
    setCardData(prev => ({ ...prev, coverImageId: undefined }));
  }, []);

  const coverImage = useMemo(() => {
    if (!cardData.coverImageId) return null;
    return mediaCache.find(m => m.id === cardData.coverImageId) || null;
  }, [cardData.coverImageId, mediaCache]);

  const galleryImages = useMemo(() => {
    const galleryMediaIds = new Set(cardData.galleryMedia?.map(item => item.id) || []);
    return mediaCache.filter(m => galleryMediaIds.has(m.id));
  }, [cardData.galleryMedia, mediaCache]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(cardData, tags);
    setIsSaving(false);
  };

  const openPicker = (target: 'cover' | 'gallery' | 'content') => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <form onSubmit={handleSave} className={styles.formLayout}>
        <div className={styles.mainContent}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={cardData.title || ''}
              onChange={(e) => handleDataChange('title', e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="content">Content</label>
            <RichTextEditor
              ref={editorRef}
              initialContent={cardData.content}
              onUpdate={({ editor }) => {
                debouncedDataChange('content', editor.getHTML());
              }}
              onAddImage={() => openPicker('content')}
            />
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
                onSelect={() => openPicker('cover')}
                onRemove={handleCoverPhotoRemove}
              />
          </div>

          <GalleryManager 
            mediaItems={galleryImages} 
            onAdd={() => openPicker('gallery')}
            onRemove={handleRemoveFromGallery}
          />

          <div className={styles.formGroup}>
            <label>Tags</label>
            <MacroTagSelector allTags={allTags} selectedTags={tags} onSelectedTagsChange={setTags} />
          </div>

          <div className={styles.formGroup}>
            <label>Status</label>
            <select
              value={cardData.status || 'draft'}
              onChange={(e) => handleDataChange('status', e.target.value)}
              className={styles.select}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

           <div className={styles.formGroup}>
                <label htmlFor="sortOrder">Sort Order</label>
                <input
                    type="number"
                    id="sortOrder"
                    value={cardData.sortOrder || 0}
                    onChange={(e) => handleDataChange('sortOrder', parseInt(e.target.value, 10))}
                    className={styles.input}
                />
            </div>

          <ChildCardManager parentId={initialCard.id} />
        </div>
      </form>

      {isPickerOpen && (
        <PhotoPicker
          key={pickerTarget}
          onClose={() => setPickerOpen(false)}
          onSelect={handlePhotoSelected}
          onMultiSelect={handleGalleryPhotosSelected}
          initialMode={pickerTarget === 'gallery' ? 'multiple' : 'single'}
        />
      )}
    </DndProvider>
  );
};

export default CardForm;
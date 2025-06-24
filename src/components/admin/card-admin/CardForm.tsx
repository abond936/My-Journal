'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardType, CardDisplayMode } from '@/lib/types/card';
import { useTag } from '@/components/providers/TagProvider';
import { Tag } from '@/lib/types/tag';
import TiptapEditor from '@/components/common/TiptapEditor';
import CoverPhotoContainer from './CoverPhotoContainer';
import styles from './CardForm.module.css';
import RichTextEditor, { RichTextEditorRef } from '@/components/common/RichTextEditor';
import { PhotoMetadata } from '@/lib/types/photo';
import ChildCardManager from './ChildCardManager';
import GalleryManager from './GalleryManager';
import MacroTagSelector from './MacroTagSelector';
import PhotoPicker from './PhotoPicker';

// --- State and Reducer ---

type State = Partial<Card>;

type Action =
  | { type: 'SET_FIELD'; field: keyof State; value: any }
  | { type: 'ADD_CHILD'; cardId: string }
  | { type: 'REMOVE_CHILD'; cardId: string }
  | { type: 'REORDER_CHILDREN'; childrenIds: string[] }
  | { type: 'LOAD_CARD'; card: Card };

const initialState: State = {
  title: '',
  subtitle: '',
  excerpt: '',
  type: 'story',
  status: 'draft',
  displayMode: 'inline',
  content: '',
  coverImage: null,
  contentMedia: [],
  galleryMedia: [],
  tags: [],
  inheritedTags: [],
  tagPaths: [],
  childrenIds: [],
  who: [],
  what: [],
  when: [],
  where: [],
  reflection: [],
};

function cardReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_CARD':
      return { ...state, ...action.card };
    case 'SET_FIELD':
      // Support functional updates, e.g., for arrays
      const newValue = typeof action.value === 'function'
        ? action.value(state[action.field])
        : action.value;
      return { ...state, [action.field]: newValue };
    case 'ADD_CHILD':
      if (state.childrenIds?.includes(action.cardId)) return state;
      return { ...state, childrenIds: [...(state.childrenIds || []), action.cardId] };
    case 'REMOVE_CHILD':
      return { ...state, childrenIds: state.childrenIds?.filter(id => id !== action.cardId) };
    case 'REORDER_CHILDREN':
      return { ...state, childrenIds: action.childrenIds };
    default:
      return state;
  }
}

// --- Component ---

interface CardFormProps {
  initialCard?: Card | null;
  onSave: (cardData: Partial<Card>, deletedImageUrls?: string[]) => void;
  onCancel: () => void;
  onDelete?: (cardId: string) => void;
}

export default function CardForm({ initialCard, onSave, onCancel, onDelete }: CardFormProps) {
  const [state, dispatch] = React.useReducer(cardReducer, initialState);
  const editorRef = React.useRef<RichTextEditorRef>(null);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = React.useState(false);
  const [deletedImageUrls, setDeletedImageUrls] = React.useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingGallery, setIsImportingGallery] = useState(false);
  const [isImportingContent, setIsImportingContent] = useState(false);
  const [photoPickerMode, setPhotoPickerMode] = useState<'single' | 'multiple'>('single');
  const [photoPickerCallback, setPhotoPickerCallback] = useState<(photos: any) => void>(() => () => {});

  React.useEffect(() => {
    if (initialCard) {
      const cardToLoad = { ...initialState, ...initialCard };
      dispatch({ type: 'LOAD_CARD', card: cardToLoad });
    }
  }, [initialCard]);

  console.log('[CardForm] RENDER. Current galleryMedia state:', JSON.stringify(state.galleryMedia, null, 2));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    dispatch({
      type: 'SET_FIELD',
      field: e.target.name as keyof State,
      value: e.target.value,
    });
  };
  
  const handleTagsChange = (newTagIds: string[]) => {
    dispatch({ type: 'SET_FIELD', field: 'tags', value: newTagIds });
  };

  const handleCoverPhotoSelect = async (photo: any) => {
    // The photo object from the picker is temporary. We must import it.
    // We use `any` here because the object from the old API doesn't match our new PhotoMetadata type.
    if (!photo?.sourcePath) {
      console.error('Selected photo is invalid for import: missing sourcePath.');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/images/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath: photo.sourcePath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import cover image.');
      }

      const permanentPhoto: PhotoMetadata = await response.json();
      dispatch({ type: 'SET_FIELD', field: 'coverImage', value: permanentPhoto });
    } catch (error) {
      console.error('Cover image import failed:', error);
      // In a real app, you'd show a toast notification to the user here.
      alert(`Error importing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCoverPhotoUpload = async (file: File) => {
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/import-from-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload cover image.');
      }

      const permanentPhoto: PhotoMetadata = await response.json();
      dispatch({ type: 'SET_FIELD', field: 'coverImage', value: permanentPhoto });
    } catch (error) {
      console.error('Cover image upload failed:', error);
      alert(`Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCoverPhotoMetadataUpdate = (metadata: PhotoMetadata) => {
    dispatch({ type: 'SET_FIELD', field: 'coverImage', value: metadata });
  };

  const handleCoverPhotoRemove = () => {
    dispatch({ type: 'SET_FIELD', field: 'coverImage', value: null });
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLElement>) => {
    // Check if the paste is happening inside an input or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return; // Let the default paste behavior occur
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        handleCoverPhotoUpload(file);
      }
    }
  };

  const handleGalleryPhotosSelect = async (photos: any[]) => {
    console.log('[CardForm] handleGalleryPhotosSelect: Received photos from picker:', JSON.stringify(photos, null, 2));
    setIsImportingGallery(true);
    try {
      // A photo needs importing if its storageUrl is missing or is a local/temporary URL (doesn't start with http)
      const newPhotosToImport = photos.filter(p => !p.storageUrl || !p.storageUrl.startsWith('http'));
      const existingPhotos = photos.filter(p => p.storageUrl && p.storageUrl.startsWith('http'));

      console.log('[CardForm] Photos to import:', JSON.stringify(newPhotosToImport, null, 2));
      console.log('[CardForm] Existing photos:', JSON.stringify(existingPhotos, null, 2));

      let importedPhotos: PhotoMetadata[] = [];
      if (newPhotosToImport.length > 0) {
        const importPromises = newPhotosToImport.map(photo =>
          fetch('/api/images/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourcePath: photo.sourcePath }),
          }).then(res => {
            if (!res.ok) {
              throw new Error(`Failed to import ${photo.filename || photo.sourcePath}`);
            }
            return res.json();
          })
        );
        importedPhotos = await Promise.all(importPromises);
        console.log('[CardForm] Successfully imported photos:', JSON.stringify(importedPhotos, null, 2));
      }
      
      // The final gallery is the combination of photos that were already uploaded 
      // and the ones that were newly imported from the selection.
      const finalGallery = [...existingPhotos, ...importedPhotos];
      console.log('[CardForm] Final combined gallery:', JSON.stringify(finalGallery, null, 2));

      dispatch({ type: 'SET_FIELD', field: 'galleryMedia', value: finalGallery });

    } catch (error) {
      console.error('Gallery image import failed:', error);
      alert(`Error importing gallery images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImportingGallery(false);
    }
  };

  const handleGalleryChange = (newMedia: PhotoMetadata[]) => {
    dispatch({ type: 'SET_FIELD', field: 'galleryMedia', value: newMedia });
  };

  const handleOpenPhotoPickerForContent = () => {
    setPhotoPickerMode('single');
    setPhotoPickerCallback(() => (photo: any) => handlePhotoSelectedFromPicker(photo));
    setIsPhotoPickerOpen(true);
  };
  
  const handlePhotoSelectedFromPicker = async (photo: any) => {
    if (!photo?.sourcePath) {
      console.error('Selected photo is invalid for import: missing sourcePath.');
      return;
    }

    setIsImportingContent(true);
    try {
      const response = await fetch('/api/images/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath: photo.sourcePath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import image for content.');
      }

      const permanentPhoto: PhotoMetadata = await response.json();
      if (editorRef.current) {
        editorRef.current.addImage(permanentPhoto);
      }
    } catch (error) {
      console.error('Content image import failed:', error);
      alert(`Error importing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImportingContent(false);
      setIsPhotoPickerOpen(false);
    }
  };

  const handleImageDeletedFromRTE = (imageUrl: string) => {
    setDeletedImageUrls(prev => [...prev, imageUrl]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = editorRef.current?.getContent() || '';
    onSave({ ...state, content }, deletedImageUrls);
  };

  return (
    <div className={styles.formLayout} onPaste={handlePaste}>
      <form id="card-form" onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.mainContent}>
          <div className={styles.formGroup}>
            <CoverPhotoContainer
              coverPhoto={state.coverImage}
              isImporting={isImporting}
              onCoverPhotoSelect={handleCoverPhotoSelect}
              onCoverPhotoUpload={handleCoverPhotoUpload}
              onMetadataChange={handleCoverPhotoMetadataUpdate}
              onCoverPhotoRemove={handleCoverPhotoRemove}
            />
          </div>

          <div className={styles.formGroup}>
            <GalleryManager
              galleryMedia={state.galleryMedia || []}
              onGalleryChange={handleGalleryChange}
              onPhotosImport={handleGalleryPhotosSelect}
              isImporting={isImportingGallery}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={state.title || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="subtitle">Subtitle</label>
            <input
              type="text"
              id="subtitle"
              name="subtitle"
              value={state.subtitle || ''}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="excerpt">Excerpt</label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={state.excerpt || ''}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label htmlFor="type">Type</label>
              <select name="type" value={state.type} onChange={handleChange} className={styles.select}>
                <option value="story">Story</option>
                <option value="gallery">Gallery</option>
                <option value="qa">Q&A</option>
                <option value="quote">Quote</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="displayMode">Display Mode</label>
              <select name="displayMode" value={state.displayMode} onChange={handleChange} className={styles.select}>
                <option value="inline">Inline</option>
                <option value="navigate">Navigate</option>
                <option value="static">Static</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="status">Status</label>
              <select name="status" value={state.status} onChange={handleChange} className={styles.select}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <MacroTagSelector
            selectedTagIds={state.tags || []}
            onSave={handleTagsChange}
          />

          <div className={styles.formGroup}>
            <label>Content</label>
            <RichTextEditor
              ref={editorRef}
              content={state.content || ''}
              onAddImage={handleOpenPhotoPickerForContent}
              onImageDelete={handleImageDeletedFromRTE}
              isUploading={isImportingContent}
            />
          </div>

          <ChildCardManager
            childIds={state.childrenIds || []}
            onAddChild={(cardId) => dispatch({ type: 'ADD_CHILD', cardId })}
            onRemoveChild={(cardId) => dispatch({ type: 'REMOVE_CHILD', cardId })}
            onReorderChildren={(ids) => dispatch({ type: 'REORDER_CHILDREN', childrenIds: ids })}
          />
        </div>
        <div className={styles.sidebar}>
          {/* Sidebar content if any, can be developed here */}
        </div>

        {isPhotoPickerOpen && (
          <PhotoPicker
            onPhotoSelect={photoPickerCallback}
            onClose={() => setIsPhotoPickerOpen(false)}
            initialMode={photoPickerMode}
          />
        )}
      </form>
    </div>
  );
}
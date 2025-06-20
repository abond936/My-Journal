'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import styles from './CardForm.module.css';
import RichTextEditor, { RichTextEditorRef } from '@/components/common/RichTextEditor';
import CoverPhotoContainer from '../entry-admin/CoverPhotoContainer';
import { PhotoMetadata } from '@/lib/types/photo';
import ChildCardManager from './ChildCardManager';
import GalleryManager from './GalleryManager';
import MacroTagSelector from './MacroTagSelector';

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
      return { ...state, [action.field]: action.value };
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
  onSave: (cardData: Partial<Card>) => void;
  onCancel: () => void;
  onDelete?: (cardId: string) => void;
}

export default function CardForm({ initialCard, onSave, onCancel, onDelete }: CardFormProps) {
  const [state, dispatch] = React.useReducer(cardReducer, initialState);
  const editorRef = React.useRef<RichTextEditorRef>(null);

  React.useEffect(() => {
    if (initialCard) {
      const cardToLoad = { ...initialState, ...initialCard };
      dispatch({ type: 'LOAD_CARD', card: cardToLoad });
    }
  }, [initialCard]);

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

  const handleCoverPhotoSelect = (photo: PhotoMetadata) => {
    dispatch({ type: 'SET_FIELD', field: 'coverImage', value: photo });
  };

  const handleCoverPhotoRemove = () => {
    dispatch({ type: 'SET_FIELD', field: 'coverImage', value: null });
  };
  
  const handleGalleryChange = (newMedia: PhotoMetadata[]) => {
    dispatch({ type: 'SET_FIELD', field: 'galleryMedia', value: newMedia });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = editorRef.current?.getContent() || '';
    onSave({ ...state, content });
  };

  return (
    <form id="card-form" onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.mainContent}>
        <div className={styles.formGroup}>
          <CoverPhotoContainer
            coverPhoto={state.coverImage}
            onCoverPhotoSelect={handleCoverPhotoSelect}
            onCoverPhotoRemove={handleCoverPhotoRemove}
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
          />
        </div>

        <GalleryManager
          galleryMedia={state.galleryMedia || []}
          onGalleryChange={handleGalleryChange}
        />

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
    </form>
  );
}
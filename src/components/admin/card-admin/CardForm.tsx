'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import styles from './CardForm.module.css';
import RichTextEditor, { RichTextEditorRef } from '@/components/common/RichTextEditor';
import CoverPhotoContainer from '../entry-admin/CoverPhotoContainer';
import { PhotoMetadata } from '@/lib/types/photo';
import TagSelector from '@/components/common/TagSelector';
import { organizeCardTags } from '@/lib/utils/cardTagUtils';
import ChildCardManager from './ChildCardManager';
import GalleryManager from './GalleryManager';

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
  const [organizedTags, setOrganizedTags] = React.useState({
    who: [], what: [], when: [], where: [], reflection: []
  });
  const editorRef = React.useRef<RichTextEditorRef>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialCard) {
      const cardToLoad = { ...initialState, ...initialCard };
      dispatch({ type: 'LOAD_CARD', card: cardToLoad });

      if (initialCard.tags) {
        organizeCardTags(initialCard.tags).then(setOrganizedTags);
      }
    }
  }, [initialCard]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    dispatch({
      type: 'SET_FIELD',
      field: e.target.name as keyof State,
      value: e.target.value,
    });
  };
  
  const handleTagsChange = (dimension: keyof typeof organizedTags, tags: string[]) => {
    const newOrganizedTags = { ...organizedTags, [dimension]: tags };
    setOrganizedTags(newOrganizedTags);
    
    const allTags = Object.values(newOrganizedTags).flat();
    const uniqueTags = [...new Set(allTags)];
    
    dispatch({ type: 'SET_FIELD', field: 'tags', value: uniqueTags });
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

  const handleDelete = async () => {
    if (!initialCard?.id) return;

    setIsDeleting(true);
    setError(null);
    try {
      // Step 1: Check if this card is a child of any other cards.
      const params = new URLSearchParams({ childrenIds_contains: initialCard.id });
      const response = await fetch(`/api/cards?${params.toString()}`);
      if (!response.ok) throw new Error('Could not verify parent cards.');
      
      const parentCards: Card[] = await response.json();

      // Step 2: Build the confirmation message.
      let confirmMessage = 'Are you sure you want to delete this card? This action cannot be undone.';
      if (parentCards.length > 0) {
        const parentTitles = parentCards.map(p => p.title).join(', ');
        confirmMessage = `WARNING: This card is a child of the following cards: ${parentTitles}.\n\nDeleting it will remove it from these collections. Are you sure you want to proceed?`;
      }

      // Step 3: Show confirmation and proceed with deletion.
      if (window.confirm(confirmMessage)) {
        const deleteResponse = await fetch(`/api/cards/${initialCard.id}`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          const errorBody = await deleteResponse.text();
          throw new Error(`Failed to delete card: ${errorBody}`);
        }
        
        onDelete?.(initialCard.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.mainContent}>
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

        <div className={styles.formGroup}>
          <label>Cover Photo</label>
          <CoverPhotoContainer
            coverPhoto={state.coverImage}
            onCoverPhotoSelect={handleCoverPhotoSelect}
            onCoverPhotoRemove={handleCoverPhotoRemove}
          />
        </div>

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
          onReorderChildren={(childrenIds) => dispatch({ type: 'REORDER_CHILDREN', childrenIds })}
        />
      </div>

      <div className={styles.sidebar}>
        <div className={styles.formGroup}>
            <label>Who</label>
            <TagSelector
                selectedTags={organizedTags.who}
                onTagsChange={(tags) => handleTagsChange('who', tags)}
                dimension="who"
            />
        </div>
        <div className={styles.formGroup}>
            <label>What</label>
            <TagSelector
                selectedTags={organizedTags.what}
                onTagsChange={(tags) => handleTagsChange('what', tags)}
                dimension="what"
            />
        </div>
        <div className={styles.formGroup}>
            <label>When</label>
            <TagSelector
                selectedTags={organizedTags.when}
                onTagsChange={(tags) => handleTagsChange('when', tags)}
                dimension="when"
            />
        </div>
        <div className={styles.formGroup}>
            <label>Where</label>
            <TagSelector
                selectedTags={organizedTags.where}
                onTagsChange={(tags) => handleTagsChange('where', tags)}
                dimension="where"
            />
        </div>
        <div className={styles.formGroup}>
            <label>Reflection</label>
            <TagSelector
                selectedTags={organizedTags.reflection}
                onTagsChange={(tags) => handleTagsChange('reflection', tags)}
                dimension="reflection"
            />
        </div>
      </div>

      <div className={styles.actions}>
        {initialCard && (
          <button
            type="button"
            onClick={handleDelete}
            className={styles.deleteButton}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
        <button type="submit" className={styles.saveButton}>
          Save Card
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
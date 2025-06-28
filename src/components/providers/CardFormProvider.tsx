'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Card, CardUpdate, cardSchema } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { Media } from '@/lib/types/photo';
import { debounce } from 'lodash';
import { z } from 'zod';
import { useImageImport } from '@/lib/hooks/useImageImport';

/**
 * FormState Interface
 * Represents the complete state of the card form
 */
interface FormState {
  cardData: CardUpdate;
  tags: Tag[];
  coverImage: Media | null | undefined;
  galleryMedia: Card['galleryMedia'];
  mediaCache: Map<string, Media>;
  isSaving: boolean;
  errors: Record<string, string>;
  lastSavedState: {
    cardData: CardUpdate;
    tags: Tag[];
    coverImage: Media | null | undefined;
    galleryMedia: Card['galleryMedia'];
  };
}

/**
 * FormContextValue Interface
 * Defines the API exposed by the CardFormProvider
 */
interface FormContextValue {
  // State
  formState: FormState;
  allTags: Tag[];
  isImporting: boolean;
  
  // Field Updates
  setField: (field: keyof CardUpdate, value: any) => void;
  updateTags: (newTags: Tag[]) => void;
  updateCoverImage: (media: Media | null) => void;
  importAndSetCoverImage: (media: Media) => Promise<void>;
  updateGalleryMedia: (newMedia: Card['galleryMedia']) => void;
  updateChildIds: (newChildIds: string[]) => void;
  updateContentMedia: (mediaIds: string[]) => void;
  
  // Form Actions
  handleSave: () => Promise<void>;
  resetForm: () => void;
  
  // Validation
  validateField: (field: keyof CardUpdate) => boolean;
  validateForm: () => boolean;
}

/**
 * Empty card template used for new cards
 */
const EMPTY_CARD: Card = {
  id: '',
  title: '',
  title_lowercase: '',
  subtitle: null,
  excerpt: null,
  content: '',
  status: 'draft',
  type: 'story',
  displayMode: 'inline',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: [],
  who: [],
  what: [],
  when: [],
  where: [],
  reflection: [],
  childrenIds: [],
  filterTags: {},
  coverImageId: null,
  contentMedia: [],
  galleryMedia: [],
  inheritedTags: [],
  tagPathsMap: {},
  coverImage: null,
};

// Create the context with type safety
const FormContext = createContext<FormContextValue | undefined>(undefined);

/**
 * Props for the CardFormProvider component
 */
interface FormProviderProps {
  children: React.ReactNode;
  initialCard: Card | null;
  allTags: Tag[];
  onSave: (cardData: CardUpdate, tags: Tag[]) => Promise<void>;
}

/**
 * CardFormProvider Component
 */
export function CardFormProvider({ children, initialCard, allTags, onSave }: FormProviderProps) {
  const { importImage, isImporting, cleanup, error: importError } = useImageImport();

  const [formState, setFormState] = useState<FormState>(() => {
    const mediaCache = new Map<string, Media>();
    
    if (initialCard) {
      if (initialCard.coverImage) {
        mediaCache.set(initialCard.coverImageId!, {
          ...initialCard.coverImage,
        });
      }
      
      if (initialCard.galleryMedia) {
        initialCard.galleryMedia.forEach(item => {
          if (item.mediaId && item.media) {
            const media = {
              id: item.mediaId,
              filename: item.media.filename || '',
              width: item.media.width || 0,
              height: item.media.height || 0,
              storageUrl: item.media.storageUrl || '',
              storagePath: item.media.storagePath || '',
              source: item.media.source || 'upload',
              sourcePath: item.media.sourcePath || '',
              caption: item.media.caption || '',
              status: item.media.status || 'active',
              objectPosition: item.media.objectPosition || '50% 50%',
              createdAt: item.media.createdAt || Date.now(),
              updatedAt: item.media.updatedAt || Date.now(),
            };
            mediaCache.set(item.mediaId, media);
          }
        });
      }
    }
    
    const card = initialCard || EMPTY_CARD;
    
    return {
      cardData: { ...card },
      tags: card.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[] || [],
      coverImage: card.coverImage || null,
      galleryMedia: card.galleryMedia || [],
      mediaCache,
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: { ...card },
        tags: card.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[] || [],
        coverImage: card.coverImage || null,
        galleryMedia: card.galleryMedia || [],
      },
    };
  });

  useEffect(() => {
    if (initialCard) {
      const mediaCache = new Map<string, Media>();
      
      if (initialCard.coverImage) {
        mediaCache.set(initialCard.coverImageId!, {
          ...initialCard.coverImage,
        });
      }

      if (initialCard.galleryMedia) {
        initialCard.galleryMedia.forEach(item => {
          if (item.mediaId && item.media) {
            const media = {
              id: item.mediaId,
              filename: item.media.filename || '',
              width: item.media.width || 0,
              height: item.media.height || 0,
              storageUrl: item.media.storageUrl || '',
              storagePath: item.media.storagePath || '',
              source: item.media.source || 'upload',
              sourcePath: item.media.sourcePath || '',
              caption: item.media.caption || '',
              status: item.media.status || 'active',
              objectPosition: item.media.objectPosition || '50% 50%',
              createdAt: item.media.createdAt || Date.now(),
              updatedAt: item.media.updatedAt || Date.now(),
            };
            mediaCache.set(item.mediaId, media);
          }
        });
      }

      setFormState(prev => ({
        ...prev,
        cardData: { ...initialCard },
        tags: initialCard.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[] || [],
        coverImage: initialCard.coverImage || null,
        galleryMedia: initialCard.galleryMedia || [],
        mediaCache,
        lastSavedState: {
          cardData: { ...initialCard },
          tags: initialCard.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[] || [],
          coverImage: initialCard.coverImage || null,
          galleryMedia: initialCard.galleryMedia || [],
        },
      }));
    }
  }, [initialCard, allTags]);

  const prevCoverImageRef = useRef<Media | null | undefined>(formState.coverImage);
  useEffect(() => {
    const prevCoverImage = prevCoverImageRef.current;
    const currentCoverImage = formState.coverImage;

    if (prevCoverImage && prevCoverImage.status === 'temporary' && prevCoverImage.id !== currentCoverImage?.id) {
      cleanup(prevCoverImage.id);
    }

    prevCoverImageRef.current = currentCoverImage;
  }, [formState.coverImage, cleanup]);
  
  useEffect(() => {
    return () => {
      if (prevCoverImageRef.current?.status === 'temporary') {
        cleanup(prevCoverImageRef.current.id);
      }
    };
  }, [cleanup]);

  useEffect(() => {
    if (importError) {
      batchStateUpdate({
        errors: { ...formState.errors, coverImage: importError },
      });
    }
  }, [importError, formState.errors]);

  const batchStateUpdate = useCallback((updates: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateCoverImage = useCallback((media: Media | null) => {
    const updatedCache = new Map(formState.mediaCache);
    if (media) {
      updatedCache.set(media.id, media);
    }
    
    batchStateUpdate({
      coverImage: media,
      cardData: { 
        ...formState.cardData, 
        coverImageId: media?.id || null,
        coverImageObjectPosition: null
      },
      mediaCache: updatedCache,
      errors: { ...formState.errors, coverImage: undefined },
    });
  }, [batchStateUpdate, formState.cardData, formState.errors, formState.mediaCache]);
  
  const importAndSetCoverImage = useCallback(async (selectedMedia: Media) => {
    // The PhotoPicker has already handled the import process.
    // This function's sole responsibility is to update the form state.
    updateCoverImage(selectedMedia);
  }, [updateCoverImage]);

  const setField = useCallback((field: keyof CardUpdate, value: any) => {
    batchStateUpdate({
      cardData: { ...formState.cardData, [field]: value },
    });
  }, [batchStateUpdate, formState.cardData]);

  const updateTags = useCallback((newTags: Tag[]) => {
    const tagIds = newTags.map(t => t.id);
    batchStateUpdate({
      tags: newTags,
      cardData: { ...formState.cardData, tags: tagIds },
    });
  }, [batchStateUpdate, formState.cardData]);

  const updateGalleryMedia = useCallback((newMedia: Card['galleryMedia']) => {
    batchStateUpdate({
      galleryMedia: newMedia,
    });
  }, [batchStateUpdate]);

  const updateChildIds = useCallback((newChildIds: string[]) => {
    batchStateUpdate({
      cardData: { ...formState.cardData, childrenIds: newChildIds },
    });
  }, [batchStateUpdate, formState.cardData]);

  const updateContentMedia = useCallback((mediaIds: string[]) => {
    batchStateUpdate({
      cardData: { ...formState.cardData, contentMedia: mediaIds },
    });
  }, [batchStateUpdate, formState.cardData]);
  
  const validateField = useCallback((field: keyof CardUpdate) => {
    // Basic validation logic
    return true;
  }, []);

  const validateForm = useCallback(() => {
    // Form-level validation
    return true;
  }, []);

  const handleSave = useCallback(async () => {
    batchStateUpdate({ isSaving: true });
    await onSave(formState.cardData, formState.tags);
    batchStateUpdate({ isSaving: false });
  }, [onSave, formState.cardData, formState.tags, batchStateUpdate]);

  const resetForm = useCallback(() => {
    const card = initialCard || EMPTY_CARD;
    setFormState({
      cardData: { ...card },
      tags: card.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[] || [],
      coverImage: card.coverImage || null,
      galleryMedia: card.galleryMedia || [],
      mediaCache: new Map(),
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: { ...card },
        tags: card.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) as Tag[] || [],
        coverImage: card.coverImage || null,
        galleryMedia: card.galleryMedia || [],
      },
    });
  }, [initialCard, allTags]);

  const contextValue = useMemo(() => ({
    formState,
    allTags,
    isImporting,
    setField,
    updateTags,
    updateCoverImage,
    importAndSetCoverImage,
    updateGalleryMedia,
    updateChildIds,
    updateContentMedia,
    handleSave,
    resetForm,
    validateField,
    validateForm,
  }), [
    formState, 
    allTags, 
    isImporting,
    setField,
    updateTags,
    updateCoverImage,
    importAndSetCoverImage,
    updateGalleryMedia,
    updateChildIds,
    updateContentMedia,
    handleSave,
    resetForm,
    validateField,
    validateForm,
  ]);

  return <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>;
}

export function useCardForm() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useCardForm must be used within a CardFormProvider');
  }
  return context;
}

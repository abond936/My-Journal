'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Card, CardUpdate, cardSchema } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { Media } from '@/lib/types/photo';
import { debounce } from 'lodash';
import { z } from 'zod';

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

interface FormContextValue {
  // State
  formState: FormState;
  
  // Field Updates
  updateField: (field: keyof CardUpdate, value: any) => void;
  updateTags: (newTags: Tag[]) => void;
  updateCoverImage: (media: Media | null) => void;
  updateGalleryMedia: (newMedia: Card['galleryMedia']) => void;
  updateChildIds: (newChildIds: string[]) => void;
  
  // Form Actions
  handleSave: () => Promise<void>;
  resetForm: () => void;
  
  // Validation
  validateField: (field: keyof CardUpdate) => boolean;
  validateForm: () => boolean;
}

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

const FormContext = createContext<FormContextValue | undefined>(undefined);

interface FormProviderProps {
  children: React.ReactNode;
  initialCard: Card | null;
  allTags: Tag[];
  onSave: (cardData: CardUpdate, tags: Tag[]) => Promise<void>;
}

export function CardFormProvider({ children, initialCard, allTags, onSave }: FormProviderProps) {
  const cardToEdit = useMemo(() => initialCard || EMPTY_CARD, [initialCard]);
  
  // State
  const [formState, setFormState] = useState<FormState>(() => {
    // Initialize media cache with cover image if it exists
    const mediaCache = new Map<string, Media>();
    if (cardToEdit.coverImage) {
      mediaCache.set(cardToEdit.coverImageId!, cardToEdit.coverImage);
    }
    
    return {
      cardData: { ...cardToEdit },
      tags: cardToEdit.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
      coverImage: cardToEdit.coverImage || null,
      galleryMedia: cardToEdit.galleryMedia || [],
      mediaCache,
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: { ...cardToEdit },
        tags: cardToEdit.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
        coverImage: cardToEdit.coverImage || null,
        galleryMedia: cardToEdit.galleryMedia || [],
      },
    };
  });

  // Track whether the form has been submitted
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Track original values for dirty checking
  const originalValues = useRef({
    cardData: { ...cardToEdit },
    tags: cardToEdit.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
    coverImage: cardToEdit.coverImage,
    galleryMedia: cardToEdit.galleryMedia || [],
  });

  // Memoize validation schema
  const validationSchema = useMemo(() => cardSchema.partial(), []);

  // Debounced save handler with memoized delay
  const SAVE_DELAY = 500;
  const debouncedSave = useMemo(
    () => debounce(async (data: CardUpdate, tags: Tag[]) => {
      try {
        await onSave(data, tags);
        setFormState(prev => ({
          ...prev,
          lastSavedState: {
            cardData: { ...data },
            tags: [...tags],
            coverImage: prev.coverImage,
            galleryMedia: prev.galleryMedia,
          },
          errors: {},
        }));
      } catch (error) {
        // Revert to last saved state on error
        setFormState(prev => ({
          ...prev,
          cardData: prev.lastSavedState?.cardData || prev.cardData,
          tags: prev.lastSavedState?.tags || prev.tags,
          coverImage: prev.lastSavedState?.coverImage || prev.coverImage,
          galleryMedia: prev.lastSavedState?.galleryMedia || prev.galleryMedia,
          errors: {
            ...prev.errors,
            submit: error instanceof Error ? error.message : 'Failed to save changes',
          },
        }));
      } finally {
        setFormState(prev => ({ ...prev, isSaving: false }));
      }
    }, SAVE_DELAY),
    [onSave]
  );

  // Cleanup debounced save on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const validateSingleField = useCallback((field: keyof CardUpdate, value: any): string => {
    try {
      const fieldSchema = cardSchema.shape[field];
      if (!fieldSchema) return ''; // Skip validation for fields not in schema
      fieldSchema.parse(value);
      return '';
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return 'Invalid value';
    }
  }, []);

  // Batch state updates for better performance
  const batchStateUpdate = useCallback((updates: Partial<FormState>) => {
    setFormState(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Update handlers with optimistic updates and batched state
  const updateField = useCallback((field: keyof CardUpdate, value: any) => {
    console.log('Updating field:', field, 'with value:', value);
    const error = validateSingleField(field, value);
    batchStateUpdate({
      cardData: { ...formState.cardData, [field]: value },
      errors: { ...formState.errors, [field]: error, submit: undefined },
    });
  }, [validateSingleField, batchStateUpdate, formState.cardData, formState.errors]);

  const updateTags = useCallback((newTags: Tag[]) => {
    const error = validateSingleField('tags', newTags.map(t => t.id));
    batchStateUpdate({
      tags: newTags,
      errors: { ...formState.errors, tags: error, submit: undefined },
    });
  }, [validateSingleField, batchStateUpdate, formState.errors]);

  const updateCoverImage = useCallback(async (media: Media | null) => {
    console.log('Updating cover image:', media);
    
    // If we're replacing a temporary image, delete it
    if (formState.coverImage?.id && 
        formState.coverImage.status === 'temporary' && 
        formState.coverImage.id !== media?.id) {
      try {
        await fetch(`/api/images/${formState.coverImage.id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error cleaning up temporary cover image:', error);
      }
    }

    batchStateUpdate({
      coverImage: media,
      cardData: { ...formState.cardData, coverImageId: media?.id || null },
      errors: { ...formState.errors, submit: undefined },
    });
  }, [batchStateUpdate, formState.cardData, formState.errors, formState.coverImage]);

  const updateGalleryMedia = useCallback((newMedia: Card['galleryMedia']) => {
    batchStateUpdate({
      galleryMedia: newMedia,
      errors: { ...formState.errors, submit: undefined },
    });
  }, [batchStateUpdate, formState.errors]);

  const updateChildIds = useCallback((newChildIds: string[]) => {
    if (!Array.isArray(newChildIds)) {
      batchStateUpdate({
        errors: { ...formState.errors, childrenIds: 'Child IDs must be an array' },
      });
      return;
    }

    if (formState.cardData.id && newChildIds.includes(formState.cardData.id)) {
      batchStateUpdate({
        errors: { ...formState.errors, childrenIds: 'A card cannot be its own child' },
      });
      return;
    }

    batchStateUpdate({
      cardData: { ...formState.cardData, childrenIds: newChildIds },
      errors: { ...formState.errors, submit: undefined },
    });
  }, [batchStateUpdate, formState.cardData, formState.errors]);

  // Form actions with optimistic updates
  const handleSave = useCallback(async () => {
    try {
      setFormState(prev => ({ ...prev, isSaving: true, errors: {} }));
      
      const cardDataWithCoverImage = {
        ...formState.cardData,
        coverImageId: formState.coverImage?.id || null
      };

      await onSave(cardDataWithCoverImage, formState.tags);
      
      setFormState(prev => ({
        ...prev,
        isSaving: false,
        errors: {}
      }));

      return true;
    } catch (error) {
      console.error('Error saving card:', error);
      setFormState(prev => ({
        ...prev,
        errors: {
          submit: error instanceof Error ? error.message : 'Failed to save changes',
        },
        isSaving: false
      }));
      throw error;
    }
  }, [formState.cardData, formState.tags, formState.coverImage, onSave]);

  const resetForm = useCallback(() => {
    setFormState({
      cardData: { ...cardToEdit },
      tags: cardToEdit.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
      coverImage: cardToEdit.coverImage || null,
      galleryMedia: cardToEdit.galleryMedia || [],
      mediaCache: new Map(),
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: { ...cardToEdit },
        tags: cardToEdit.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
        coverImage: cardToEdit.coverImage || null,
        galleryMedia: cardToEdit.galleryMedia || [],
      },
    });
    originalValues.current = {
      cardData: { ...cardToEdit },
      tags: cardToEdit.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
      coverImage: cardToEdit.coverImage,
      galleryMedia: cardToEdit.galleryMedia || [],
    };
  }, [cardToEdit, allTags]);

  // Validation with memoized schema
  const validateField = useCallback((field: keyof CardUpdate): boolean => {
    const error = validateSingleField(field, formState.cardData[field]);
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
    }));
    return !error;
  }, [formState.cardData, validateSingleField]);

  const validateForm = useCallback((): boolean => {
    const validationObject = {
      ...formState.cardData,
      tags: formState.tags.map(t => t.id),
      coverImage: formState.coverImage,
      galleryMedia: formState.galleryMedia,
    };

    const result = validationSchema.safeParse(validationObject);

    if (!result.success) {
      const errors = result.error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {} as Record<string, string>);

      setFormState(prev => ({
        ...prev,
        errors,
      }));
      return false;
    }

    return true;
  }, [validationSchema, formState.cardData, formState.tags, formState.coverImage, formState.galleryMedia]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      formState,
      updateField,
      updateTags,
      updateCoverImage,
      updateGalleryMedia,
      updateChildIds,
      handleSave,
      resetForm,
      validateField,
      validateForm,
    }),
    [
      formState,
      updateField,
      updateTags,
      updateCoverImage,
      updateGalleryMedia,
      updateChildIds,
      handleSave,
      resetForm,
      validateField,
      validateForm,
    ]
  );

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
}

export function useCardForm() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useCardForm must be used within a CardFormProvider');
  }
  return context;
} 
'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardUpdate, cardSchema, GalleryMediaItem, HydratedGalleryMediaItem } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { Media } from '@/lib/types/photo';
import { ZodError } from 'zod';
import { extractMediaFromContent } from '@/lib/utils/cardUtils';

/**
 * FormState Interface
 * Represents the complete state of the card form
 */
interface FormState {
  // The cardData object is now the single source of truth for all form fields.
  // It holds the complete state of the card being edited, including transient/populated fields
  // like the full coverImage object, which won't be saved directly to Firestore.
  cardData: CardUpdate;

  isSaving: boolean;
  errors: Record<string, string>;

  // A snapshot of the last successfully saved state. Used for 'reset' or 'cancel' logic.
  lastSavedState: {
    cardData: CardUpdate;
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
  
  // Field Updates
  setField: (field: keyof CardUpdate, value: any) => void;
  updateTags: (newTags: Tag[]) => void;
  updateChildIds: (newChildIds: string[]) => void;
  
  // Form Actions
  handleSave: () => Promise<void>;
  resetForm: () => void;
  
  // Validation
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
  onSave: (cardData: CardUpdate) => Promise<void>;
}

/**
 * CardFormProvider Component
 */
export function CardFormProvider({ children, initialCard, allTags, onSave }: FormProviderProps) {
  const [formState, setFormState] = useState<FormState>(() => {
    const card = initialCard ? { ...EMPTY_CARD, ...initialCard } : EMPTY_CARD;
    return {
      cardData: card,
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: card,
      },
    };
  });

  useEffect(() => {
    if (initialCard) {
      setFormState(prevState => ({
        ...prevState,
        cardData: { ...EMPTY_CARD, ...initialCard },
        errors: {},
      }));
    }
  }, [initialCard]);

  const batchStateUpdate = useCallback((updates: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  }, []);

  const setField = useCallback((field: keyof CardUpdate, value: any) => {
    batchStateUpdate({
      cardData: { ...formState.cardData, [field]: value },
    });
  }, [batchStateUpdate, formState.cardData]);

  const updateTags = useCallback((newTags: Tag[]) => {
    const tagIds = newTags.map(t => t.id);
    batchStateUpdate({
      cardData: { ...formState.cardData, tags: tagIds },
    });
  }, [batchStateUpdate, formState.cardData]);

  const updateChildIds = useCallback((newChildIds: string[]) => {
    batchStateUpdate({
      cardData: { ...formState.cardData, childrenIds: newChildIds },
    });
  }, [batchStateUpdate, formState.cardData]);

  const validateForm = useCallback(() => {
    const result = cardSchema.safeParse(formState.cardData);

    if (!result.success) {
      const formattedErrors = result.error.flatten().fieldErrors;
      const newErrors: Record<string, string> = {};
      for (const key in formattedErrors) {
        if (formattedErrors[key]) {
          newErrors[key] = formattedErrors[key]![0];
        }
      }
      batchStateUpdate({ errors: newErrors });
      console.error("Validation Errors:", newErrors);
      return false;
    }

    batchStateUpdate({ errors: {} });
    return true;
  }, [formState.cardData, batchStateUpdate]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      console.log("Form validation failed. Save aborted.");
      return;
    }
    batchStateUpdate({ isSaving: true });
    await onSave(formState.cardData);
    batchStateUpdate({ isSaving: false });
  }, [onSave, formState.cardData, batchStateUpdate, validateForm]);

  const resetForm = useCallback(() => {
    setFormState({
      cardData: initialCard || EMPTY_CARD,
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: initialCard || EMPTY_CARD,
      },
    });
  }, [initialCard]);

  const contextValue = useMemo(() => ({
    formState,
    allTags,
    setField,
    updateTags,
    updateChildIds,
    handleSave,
    resetForm,
    validateForm,
  }), [
    formState, 
    allTags, 
    setField,
    updateTags,
    updateChildIds,
    handleSave,
    resetForm,
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

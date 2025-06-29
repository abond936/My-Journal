'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardUpdate, cardSchema, GalleryMediaItem, HydratedGalleryMediaItem } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { Media } from '@/lib/types/photo';
import { ZodError } from 'zod';
import { extractMediaFromContent, dehydrateCardForSave } from '@/lib/utils/cardUtils';

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

  // Content Media
  updateContentMedia: (mediaIds: string[]) => void;
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
      // Only update if this is the first load or if the initialCard.id has changed
      setFormState(prevState => {
        if (!prevState.cardData.id || prevState.cardData.id !== initialCard.id) {
          console.log('[CardFormProvider] Updating form state with new initialCard', {
            prevId: prevState.cardData.id,
            newId: initialCard.id,
            prevContentLength: prevState.cardData.content?.length,
            newContentLength: initialCard.content?.length
          });
          return {
            ...prevState,
            cardData: { ...EMPTY_CARD, ...initialCard },
            errors: {},
            lastSavedState: {
              cardData: { ...EMPTY_CARD, ...initialCard }
            }
          };
        }
        return prevState;
      });
    }
  }, [initialCard]);

  const batchStateUpdate = useCallback((updates: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  }, []);

  const setField = useCallback((field: keyof CardUpdate, value: any) => {
    if (!formState.cardData) return;

    // Only update if the value has actually changed
    if (value !== formState.cardData[field]) {
      // Only log content length changes that are significant
      if (field === 'content' && Math.abs((value?.length || 0) - (formState.cardData.content?.length || 0)) > 10) {
        console.log('[CardFormProvider] Content length changed:', {
          from: formState.cardData.content?.length || 0,
          to: value?.length || 0,
          field
        });
      }

      setFormState(prev => {
        const newState = {
          ...prev,
          cardData: {
            ...prev.cardData,
            [field]: value
          }
        };

        // Log the state update
        if (field === 'content') {
          console.log('[CardFormProvider] State updated', {
            contentLength: newState.cardData.content?.length,
            mediaCount: newState.cardData.contentMedia?.length
          });
        }

        return newState;
      });
    }
  }, [formState.cardData]);

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

  const updateContentMedia = useCallback((mediaIds: string[]) => {
    // Only update if the media IDs have actually changed
    const currentMediaIds = formState.cardData.contentMedia || [];
    const hasChanged = mediaIds.length !== currentMediaIds.length ||
      mediaIds.some(id => !currentMediaIds.includes(id));

    if (hasChanged) {
      console.log('[CardFormProvider] Updating content media', {
        currentContentLength: formState.cardData.content?.length,
        from: currentMediaIds,
        to: mediaIds
      });

      setFormState(prev => ({
        ...prev,
        cardData: {
          ...prev.cardData,
          contentMedia: mediaIds
        }
      }));
    }
  }, [formState.cardData]);

  const validateForm = useCallback(() => {
    // Strip transient, client-only fields before validating.
    const dataForValidation = dehydrateCardForSave(formState.cardData);

    const result = cardSchema.safeParse(dataForValidation);

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

    console.log('[handleSave] Starting save process', {
      currentContentLength: formState.cardData.content?.length
    });

    batchStateUpdate({ isSaving: true });

    try {
      // Prepare payload identical to what passed validation
      const payload = dehydrateCardForSave(formState.cardData);

      console.log('[handleSave] Prepared payload', {
        contentLength: payload.content?.length
      });

      // Save to backend
      await onSave(payload);

      // Update last saved state
      batchStateUpdate({
        isSaving: false,
        lastSavedState: {
          cardData: formState.cardData
        }
      });

      console.log('[handleSave] Save completed successfully');
    } catch (error) {
      console.error('[handleSave] Error during save:', error);
      batchStateUpdate({ isSaving: false });
    }
  }, [formState.cardData, validateForm, batchStateUpdate, onSave]);

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
    updateContentMedia,
    handleSave,
    resetForm,
    validateForm,
  }), [
    formState, 
    allTags, 
    setField,
    updateTags,
    updateChildIds,
    updateContentMedia,
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

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  updateCoverImage: (media: Media | null, focalPoint?: { x: number; y: number }) => void;
  updateTags: (newTags: Tag[]) => void;
  updateChildIds: (newChildIds: string[]) => void;
  
  // Form Actions
  handleSave: (overrides?: Partial<CardUpdate>) => Promise<void>;
  resetForm: () => void;
  
  // Validation
  validateForm: (dataToValidate?: CardUpdate) => boolean;

  // Content Media
  updateContentMedia: (mediaIds: string[]) => void;
}

/**
 * Empty card template used for new cards
 */
const EMPTY_CARD: Card = {
  docId: '',
  title: '',
  title_lowercase: '',
  subtitle: null,
  excerpt: null,
  content: '',
  status: 'draft',
  type: 'story',
  displayMode: 'navigate',
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
    const card = initialCard
      ? {
          ...EMPTY_CARD,
          ...initialCard,
          coverImageId: initialCard.coverImageId ?? null,
          coverImage: initialCard.coverImage ?? null,
        }
      : EMPTY_CARD;
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
      // Only update if this is the first load or if the initialCard.docId has changed
      setFormState(prevState => {
        if (!prevState.cardData.docId || prevState.cardData.docId !== initialCard.docId) {
          const mergedCard = {
            ...EMPTY_CARD,
            ...initialCard,
            coverImageId: initialCard.coverImageId ?? null,
            coverImage: initialCard.coverImage ?? null,
          };
          return {
            ...prevState,
            cardData: mergedCard,
            errors: {},
            lastSavedState: {
              cardData: mergedCard
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

  // Ref ensures handleSave always reads latest cardData (avoids stale closure if user clicks Remove then Save quickly)
  const cardDataRef = useRef<CardUpdate>(formState.cardData);
  cardDataRef.current = formState.cardData;

  const setField = useCallback((field: keyof CardUpdate, value: any) => {
    if (!formState.cardData) return;

    // Only update if the value has actually changed
    if (value !== formState.cardData[field]) {


      setFormState(prev => {
        const newState = {
          ...prev,
          cardData: {
            ...prev.cardData,
            [field]: value
          }
        };



        return newState;
      });
    }
  }, [formState.cardData]);

  const updateCoverImage = useCallback((media: Media | null, focalPoint?: { x: number; y: number }) => {
    setFormState(prev => ({
      ...prev,
      cardData: {
        ...prev.cardData,
        coverImage: media,
        coverImageId: media ? media.docId : null,
        coverImageFocalPoint: media && focalPoint ? focalPoint : undefined,
      },
    }));
  }, []);

  const updateTags = useCallback((newTags: Tag[]) => {
    const tagIds = newTags.map(t => t.docId);
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

  const validateForm = useCallback((dataToValidate?: CardUpdate) => {
    const sourceData = dataToValidate ?? formState.cardData;
    // Determine new vs existing BEFORE dehydrate—dehydrate strips docId
    const docId = sourceData.docId ?? (sourceData as { id?: string }).id;
    const isNewCard = !docId || docId === '';

    // Strip transient, client-only fields before validating.
    const dataForValidation = dehydrateCardForSave(sourceData);
    const validationData = isNewCard
      ? { ...dataForValidation, docId: undefined }
      : dataForValidation;

    // Use partial schema for updates; omit server-generated fields for new cards
    const schemaToUse = isNewCard
      ? cardSchema.partial().omit({ docId: true, createdAt: true, updatedAt: true })
      : cardSchema.partial();
    const result = schemaToUse.safeParse(validationData);

    if (!result.success) {
      const formattedErrors = result.error.flatten().fieldErrors;
      const newErrors: Record<string, string> = {};
      for (const key in formattedErrors) {
        if (formattedErrors[key]) {
          // Provide user-friendly error messages
          const errorMessage = formattedErrors[key]![0];
          if (key === 'title' && errorMessage.includes('required')) {
            newErrors[key] = 'Please enter a title for your card';
          } else {
            newErrors[key] = errorMessage;
          }
        }
      }
      batchStateUpdate({ errors: newErrors });
      console.error("Validation Errors:", newErrors);
      return false;
    }

    batchStateUpdate({ errors: {} });
    return true;
  }, [formState.cardData, batchStateUpdate]);

  const handleSave = useCallback(async (overrides?: Partial<CardUpdate>) => {
    const dataToSave = overrides ? { ...formState.cardData, ...overrides } : formState.cardData;

    if (!validateForm(dataToSave)) {
      return;
    }

    batchStateUpdate({ isSaving: true });

    try {
      let payload = dehydrateCardForSave(dataToSave);

      // Remove derived fields – server will regenerate
      delete (payload as any).filterTags;

      // Save to backend
      await onSave(payload);

      // Update last saved state
      batchStateUpdate({
        isSaving: false,
        lastSavedState: {
          cardData: dataToSave
        }
      });
    } catch (error) {
      console.error('[handleSave] Error during save:', error);
      batchStateUpdate({ isSaving: false });
    }
  }, [validateForm, batchStateUpdate, onSave]);

  const resetForm = useCallback(() => {
    const card = initialCard
      ? {
          ...EMPTY_CARD,
          ...initialCard,
          coverImageId: initialCard.coverImageId ?? null,
          coverImage: initialCard.coverImage ?? null,
        }
      : EMPTY_CARD;
    setFormState({
      cardData: card,
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: card,
      },
    });
  }, [initialCard]);

  const contextValue = useMemo(() => ({
    formState,
    allTags,
    setField,
    updateCoverImage,
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
    updateCoverImage,
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

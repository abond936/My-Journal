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
  // The cardData object is now the single source of truth for all form fields.
  // It holds the complete state of the card being edited, including transient/populated fields
  // like the full coverImage object, which won't be saved directly to Firestore.
  cardData: CardUpdate;

  // The mediaCache holds full Media objects, keyed by their ID.
  // This is used to display images and manage their lifecycle (e.g., cleaning up temporary uploads).
  mediaCache: Map<string, Media>;

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
  isImporting: boolean;
  
  // Field Updates
  setField: (field: keyof CardUpdate, value: any) => void;
  updateTags: (newTags: Tag[]) => void;
  updateCoverImage: (media: Media | null) => void;
  importAndSetCoverImage: (media: Media) => Promise<void>;
  updateGalleryMedia: (newMedia: Card['galleryMedia']) => void;
  updateChildIds: (newChildIds: string[]) => void;
  updateContentMedia: (mediaIds: string[]) => void;
  
  // New functions to manage the gallery state robustly.
  addGalleryItems: (newMedia: Media[]) => void;
  removeGalleryItem: (mediaIdToRemove: string) => void;
  updateGalleryItem: (mediaId: string, updates: Partial<GalleryMediaItem>) => void;
  reorderGalleryItems: (reorderedItems: Card['galleryMedia']) => void;
  
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
  onSave: (cardData: CardUpdate) => Promise<void>;
}

/**
 * CardFormProvider Component
 */
export function CardFormProvider({ children, initialCard, allTags, onSave }: FormProviderProps) {
  const { importImage, isImporting, cleanup, error: importError } = useImageImport();

  const [formState, setFormState] = useState<FormState>(() => {
    // The media cache will store full Media objects for display and management.
    const mediaCache = new Map<string, Media>();
    const card = initialCard || EMPTY_CARD;

    // Populate the media cache from the initial card data.
    // This is crucial for displaying existing images when editing a card.
    if (card.coverImage) {
      mediaCache.set(card.coverImageId!, { ...card.coverImage });
    }
    if (card.galleryMedia) {
      card.galleryMedia.forEach(item => {
        if (item.mediaId && item.media) {
          mediaCache.set(item.mediaId, {
            id: item.mediaId,
            ...item.media
          });
        }
      });
    }

    // The initial form state. cardData is the single source of truth.
    return {
      cardData: { ...card },
      mediaCache,
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: { ...card },
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
            mediaCache.set(item.mediaId, {
              id: item.mediaId,
              ...item.media,
            });
          }
        });
      }

      setFormState(prev => ({
        ...prev,
        cardData: { ...initialCard },
        mediaCache,
        lastSavedState: {
          cardData: { ...initialCard },
        },
      }));
    }
  }, [initialCard]);

  const prevCoverImageRef = useRef<Media | null | undefined>(formState.cardData.coverImage);
  useEffect(() => {
    const prevCoverImage = prevCoverImageRef.current;
    const currentCoverImage = formState.cardData.coverImage;

    if (prevCoverImage && prevCoverImage.status === 'temporary' && prevCoverImage.id !== currentCoverImage?.id) {
      cleanup(prevCoverImage.id);
    }

    prevCoverImageRef.current = currentCoverImage;
  }, [formState.cardData.coverImage, cleanup]);
  
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
      cardData: { 
        ...formState.cardData, 
        coverImage: media,
        coverImageId: media?.id || null,
        coverImageObjectPosition: media?.objectPosition || null
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
      cardData: { ...formState.cardData, galleryMedia: newMedia },
    });
  }, [batchStateUpdate, formState.cardData]);

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
  
  /**
   * Adds one or more new images to the gallery.
   * @param newMedia An array of Media objects, typically from the PhotoPicker.
   */
  const addGalleryItems = useCallback((newMedia: Media[]) => {
    // First, update the central media cache with the new media objects.
    const updatedCache = new Map(formState.mediaCache);
    newMedia.forEach(media => updatedCache.set(media.id, media));

    // Create the GalleryMediaItem objects that will be stored in the cardData.
    const newGalleryItems = newMedia.map((media, index) => ({
      mediaId: media.id,
      caption: media.caption || '',
      // The order is appended to the end of the existing gallery.
      order: (formState.cardData.galleryMedia?.length || 0) + index,
      objectPosition: media.objectPosition || '50% 50%',
    }));

    // Update the state with the new gallery items and the updated cache.
    batchStateUpdate({
      cardData: {
        ...formState.cardData,
        galleryMedia: [...(formState.cardData.galleryMedia || []), ...newGalleryItems],
      },
      mediaCache: updatedCache,
    });
  }, [batchStateUpdate, formState.cardData, formState.mediaCache]);

  /**
   * Removes an image from the gallery.
   * Critically, it also cleans up any temporary images from storage.
   * @param mediaIdToRemove The ID of the media item to remove.
   */
  const removeGalleryItem = useCallback((mediaIdToRemove: string) => {
    // Find the media object in the cache to check its status.
    const mediaInCache = formState.mediaCache.get(mediaIdToRemove);

    // If the image was a temporary upload that hasn't been saved, clean it up.
    if (mediaInCache?.status === 'temporary') {
      cleanup(mediaIdToRemove);
    }
    
    // Filter the galleryMedia array to remove the item.
    const newGalleryMedia = formState.cardData.galleryMedia?.filter(item => item.mediaId !== mediaIdToRemove) || [];
    // Re-apply the order property to ensure the sequence is correct.
    const reorderedMedia = newGalleryMedia.map((item, i) => ({ ...item, order: i }));

    batchStateUpdate({
      cardData: {
        ...formState.cardData,
        galleryMedia: reorderedMedia,
      },
    });
  }, [batchStateUpdate, formState.cardData, formState.mediaCache, cleanup]);

  /**
   * Updates a single item in the gallery (e.g., its caption or objectPosition).
   * @param mediaId The ID of the media item to update.
   * @param updates A partial object of GalleryMediaItem properties to update.
   */
  const updateGalleryItem = useCallback((mediaId: string, updates: Partial<Card['galleryMedia'][number]>) => {
    const newGalleryMedia = formState.cardData.galleryMedia?.map(item =>
      item.mediaId === mediaId ? { ...item, ...updates } : item
    ) || [];

    batchStateUpdate({
      cardData: { ...formState.cardData, galleryMedia: newGalleryMedia },
    });
  }, [batchStateUpdate, formState.cardData]);

  /**
   * Replaces the entire gallery order, typically after a drag-and-drop operation.
   * @param reorderedItems The full, reordered array of gallery items.
   */
  const reorderGalleryItems = useCallback((reorderedItems: Card['galleryMedia']) => {
    // Ensure the 'order' property is correctly set based on the new sequence.
    const finalOrder = reorderedItems.map((item, index) => ({ ...item, order: index }));
    batchStateUpdate({
      cardData: { ...formState.cardData, galleryMedia: finalOrder },
    });
  }, [batchStateUpdate, formState.cardData]);

  const validateField = useCallback((field: keyof CardUpdate) => {
    // Basic validation logic
    return true;
  }, []);

  const validateForm = useCallback(() => {
    // We use safeParse to check the data against the Zod schema without throwing an error.
    const result = cardSchema.safeParse(formState.cardData);

    // If validation fails, we format the errors and update the state.
    if (!result.success) {
      const formattedErrors = result.error.flatten().fieldErrors;
      const newErrors: Record<string, string> = {};
      for (const key in formattedErrors) {
        // We only take the first error message for each field.
        if (formattedErrors[key]) {
          newErrors[key] = formattedErrors[key]![0];
        }
      }
      batchStateUpdate({ errors: newErrors });
      console.error("Validation Errors:", newErrors);
      return false; // Indicates validation failure
    }

    // If validation succeeds, we clear any existing errors.
    batchStateUpdate({ errors: {} });
    return true; // Indicates validation success
  }, [formState.cardData, batchStateUpdate]);

  const handleSave = useCallback(async () => {
    batchStateUpdate({ isSaving: true });
    // We now pass the entire cardData object, which is our single source of truth.
    await onSave(formState.cardData);
    batchStateUpdate({ isSaving: false });
  }, [onSave, formState.cardData, batchStateUpdate]);

  const resetForm = useCallback(() => {
    const card = initialCard || EMPTY_CARD;
    // We also need to rebuild the media cache on reset.
    const mediaCache = new Map<string, Media>();
    if (card.coverImage) {
      mediaCache.set(card.coverImageId!, { ...card.coverImage });
    }
    if (card.galleryMedia) {
      card.galleryMedia.forEach(item => {
        if (item.mediaId && item.media) {
          mediaCache.set(item.mediaId, { id: item.mediaId, ...item.media });
        }
      });
    }

    setFormState({
      cardData: { ...card },
      mediaCache,
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: { ...card },
      },
    });
  }, [initialCard]);

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
    addGalleryItems,
    removeGalleryItem,
    updateGalleryItem,
    reorderGalleryItems,
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
    addGalleryItems,
    removeGalleryItem,
    updateGalleryItem,
    reorderGalleryItems,
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

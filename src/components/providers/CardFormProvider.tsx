/**
 * CardFormProvider
 * 
 * A context provider that manages the state and operations for a card editing form.
 * Handles all aspects of card data, including:
 * - Basic card fields (title, content, etc.)
 * - Tags and tag relationships
 * - Media management (cover image, gallery, content media)
 * - Form validation
 * - Save state tracking
 * 
 * Key Features:
 * 1. Media Cache Management
 *    - Maintains a central cache of all media used in the card
 *    - Handles media transformations and URL normalization
 *    - Provides consistent media access across components
 * 
 * 2. State Management
 *    - Tracks current and last saved state
 *    - Manages loading and saving states
 *    - Handles validation errors
 * 
 * 3. Form Operations
 *    - Field updates with validation
 *    - Media updates (cover, gallery, content)
 *    - Tag management
 *    - Save operations with optimistic updates
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Card, CardUpdate, cardSchema } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { Media } from '@/lib/types/photo';
import { debounce } from 'lodash';
import { z } from 'zod';

/**
 * FormState Interface
 * Represents the complete state of the card form
 * 
 * @property cardData - The current card data being edited
 * @property tags - Currently selected tags
 * @property coverImage - Selected cover image
 * @property galleryMedia - Media items in the gallery
 * @property mediaCache - Central cache for all media objects
 * @property isSaving - Whether a save operation is in progress
 * @property errors - Validation errors by field
 * @property lastSavedState - Snapshot of last successfully saved state
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
 * 
 * State Access:
 * - formState: Complete form state
 * - allTags: All available tags
 * 
 * Update Operations:
 * - updateField: Update a single card field
 * - updateTags: Update selected tags
 * - updateCoverImage: Set/update cover image
 * - updateGalleryMedia: Update gallery media list
 * - updateChildIds: Update child card relationships
 * - updateContentMedia: Update media used in content
 * 
 * Form Actions:
 * - handleSave: Save the current state
 * - resetForm: Reset to last saved state
 * 
 * Validation:
 * - validateField: Validate a single field
 * - validateForm: Validate entire form
 */
interface FormContextValue {
  // State
  formState: FormState;
  allTags: Tag[];
  
  // Field Updates
  updateField: (field: keyof CardUpdate, value: any) => void;
  updateTags: (newTags: Tag[]) => void;
  updateCoverImage: (media: Media | null) => void;
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
 * Provides default values for all required fields
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
 * 
 * @property children - Child components that will have access to the form context
 * @property initialCard - Initial card data (null for new cards)
 * @property allTags - Complete list of available tags
 * @property onSave - Callback to handle saving card data
 */
interface FormProviderProps {
  children: React.ReactNode;
  initialCard: Card | null;
  allTags: Tag[];
  onSave: (cardData: CardUpdate, tags: Tag[]) => Promise<void>;
}

/**
 * CardFormProvider Component
 * 
 * Provides form state and operations to child components through React Context.
 * Handles initialization and updates of the form state, including:
 * - Setting up initial state from provided card data
 * - Initializing and maintaining the media cache
 * - Processing and normalizing media objects
 * - Managing form state updates
 */
export function CardFormProvider({ children, initialCard, allTags, onSave }: FormProviderProps) {
  // Initialize form state with media cache setup
  const [formState, setFormState] = useState<FormState>(() => {
    // Create new media cache
    const mediaCache = new Map<string, Media>();
    
    if (initialCard) {
      console.log('CardFormProvider - Initializing with card:', {
        id: initialCard.id,
        hasCoverImage: !!initialCard.coverImage,
        galleryMediaLength: initialCard.galleryMedia?.length || 0
      });

      // Cache cover image if it exists
      if (initialCard.coverImage) {
        mediaCache.set(initialCard.coverImageId!, {
          ...initialCard.coverImage,
          url: initialCard.coverImage.storageUrl || initialCard.coverImage.url
        });
      }
      
      // Process and cache gallery media
      if (initialCard.galleryMedia) {
        console.log('CardFormProvider - Processing gallery media:', {
          galleryMediaLength: initialCard.galleryMedia.length,
          items: initialCard.galleryMedia.map(item => ({
            mediaId: item.mediaId,
            hasMedia: !!item.media,
            mediaUrl: item.media?.url || 'missing'
          }))
        });

        initialCard.galleryMedia.forEach(item => {
          if (item.mediaId && item.media) {
            console.log('CardFormProvider - Adding gallery media to cache:', {
              mediaId: item.mediaId,
              hasStorageUrl: !!item.media.storageUrl,
              hasUrl: !!item.media.url,
              media: item.media
            });
            
            // Transform media object to consistent format
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
              // Ensure consistent URL access
              url: item.media.storageUrl || item.media.url || ''
            };
            
            mediaCache.set(item.mediaId, media);
          } else {
            console.warn('CardFormProvider - Missing media data for gallery item:', {
              mediaId: item.mediaId,
              hasMedia: !!item.media
            });
          }
        });
      }
    }
    
    const card = initialCard || EMPTY_CARD;
    
    // Return initial state with populated media cache
    return {
      cardData: { ...card },
      tags: card.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
      coverImage: card.coverImage || null,
      galleryMedia: card.galleryMedia || [],
      mediaCache,
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: { ...card },
        tags: card.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
        coverImage: card.coverImage || null,
        galleryMedia: card.galleryMedia || [],
      },
    };
  });

  /**
   * Effect to update form state when initialCard changes
   * Rebuilds the entire form state, including:
   * - Reconstructing the media cache
   * - Processing all media objects
   * - Updating the form state with new data
   */
  useEffect(() => {
    if (initialCard) {
      console.log('CardFormProvider - Updating form state with new card:', {
        id: initialCard.id,
        hasCoverImage: !!initialCard.coverImage,
        galleryMediaLength: initialCard.galleryMedia?.length || 0
      });

      const mediaCache = new Map<string, Media>();
      
      // Rebuild media cache with cover image
      if (initialCard.coverImage) {
        mediaCache.set(initialCard.coverImageId!, {
          ...initialCard.coverImage,
          url: initialCard.coverImage.storageUrl || initialCard.coverImage.url
        });
      }

      // Rebuild media cache with gallery media
      if (initialCard.galleryMedia) {
        console.log('CardFormProvider - Processing gallery media:', {
          galleryMediaLength: initialCard.galleryMedia.length,
          items: initialCard.galleryMedia.map(item => ({
            mediaId: item.mediaId,
            hasMedia: !!item.media,
            mediaUrl: item.media?.url || 'missing'
          }))
        });

        initialCard.galleryMedia.forEach(item => {
          if (item.mediaId && item.media) {
            console.log('CardFormProvider - Adding gallery media to cache:', {
              mediaId: item.mediaId,
              hasStorageUrl: !!item.media.storageUrl,
              hasUrl: !!item.media.url,
              media: item.media
            });
            
            // Transform media to consistent format
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
              // For backward compatibility with components expecting url
              url: item.media.storageUrl || item.media.url || ''
            };
            
            mediaCache.set(item.mediaId, media);
          } else {
            console.warn('CardFormProvider - Missing media data for gallery item:', {
              mediaId: item.mediaId,
              hasMedia: !!item.media
            });
          }
        });
      }

      // Update form state with new data and cache
      setFormState(prev => ({
        ...prev,
        cardData: { ...initialCard },
        tags: initialCard.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
        coverImage: initialCard.coverImage || null,
        galleryMedia: initialCard.galleryMedia || [],
        mediaCache,
        lastSavedState: {
          cardData: { ...initialCard },
          tags: initialCard.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
          coverImage: initialCard.coverImage || null,
          galleryMedia: initialCard.galleryMedia || [],
        },
      }));
    }
  }, [initialCard, allTags]);

  // Track whether the form has been submitted
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Track original values for dirty checking
  const originalValues = useRef({
    cardData: { ...initialCard },
    tags: initialCard?.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
    coverImage: initialCard?.coverImage,
    galleryMedia: initialCard?.galleryMedia || [],
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

  // Validation functions should be defined before they are used
  const validateField = useCallback((field: keyof CardUpdate): boolean => {
    const errors: Record<string, string> = {};
    
    switch (field) {
      case 'title':
        if (!formState.cardData.title?.trim()) {
          errors.title = 'Title is required';
        }
        break;
      // Add other field validations as needed
    }
    
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, ...errors }
    }));
    
    return Object.keys(errors).length === 0;
  }, [formState.cardData.title]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    // Required fields
    if (!formState.cardData.title?.trim()) {
      errors.title = 'Title is required';
    }
    
    // Add other validations as needed
    
    setFormState(prev => ({
      ...prev,
      errors
    }));
    
    return Object.keys(errors).length === 0;
  }, [formState.cardData.title]);

  // Field update functions
  const updateField = useCallback((field: keyof CardUpdate, value: any) => {
    batchStateUpdate({
      cardData: {
        ...formState.cardData,
        [field]: value
      }
    });
  }, [batchStateUpdate, formState.cardData]);

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

    // Update the media cache with the new image
    if (media) {
      const updatedCache = new Map(formState.mediaCache);
      updatedCache.set(media.id, media);
      
      batchStateUpdate({
        coverImage: media,
        cardData: {
          ...formState.cardData,
          coverImageId: media.id,
          coverImage: media
        },
        mediaCache: updatedCache,
        errors: { ...formState.errors, coverImage: undefined, submit: undefined },
      });
    } else {
      batchStateUpdate({
        coverImage: null,
        cardData: {
          ...formState.cardData,
          coverImageId: null,
          coverImage: null
        },
        errors: { ...formState.errors, coverImage: undefined, submit: undefined },
      });
    }
  }, [batchStateUpdate, formState.cardData, formState.coverImage?.id, formState.errors, formState.mediaCache]);

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

  const updateContentMedia = useCallback(async (mediaIds: string[]) => {
    console.log('CardFormProvider - Updating content media:', { mediaIds });

    // First, update the media cache with any new media
    const updatedCache = new Map(formState.mediaCache);
    const contentMediaPromises = mediaIds.map(async id => {
      // If we don't have this media in the cache yet, we need to fetch it
      if (!updatedCache.has(id)) {
        try {
          const response = await fetch(`/api/images/${id}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch media ${id}`);
          }
          const media = await response.json();
          updatedCache.set(id, {
            ...media,
            url: media.storageUrl || media.url
          });
        } catch (error) {
          console.error('Error fetching media:', error);
          return null;
        }
      }

      const media = updatedCache.get(id);
      if (!media) {
        console.warn(`Media ${id} not found in cache`);
        return null;
      }

      return {
        id,
        status: 'active',
        updatedAt: Date.now(),
        media: {
          id: media.id,
          filename: media.filename || '',
          width: media.width || 0,
          height: media.height || 0,
          storageUrl: media.storageUrl || '',
          storagePath: media.storagePath || '',
          source: media.source || 'upload',
          sourcePath: media.sourcePath || '',
          caption: media.caption || '',
          status: 'active',
          objectPosition: media.objectPosition || 'center',
          createdAt: media.createdAt || Date.now(),
          updatedAt: Date.now(),
          url: media.storageUrl || media.url || ''
        }
      };
    });

    const contentMedia = (await Promise.all(contentMediaPromises)).filter(Boolean);
    console.log('CardFormProvider - New content media array:', { contentMedia });

    batchStateUpdate({
      cardData: {
        ...formState.cardData,
        contentMedia
      },
      mediaCache: updatedCache
    });
  }, [batchStateUpdate, formState.cardData, formState.mediaCache]);

  // Form actions
  const handleSave = useCallback(async () => {
    console.log('CardFormProvider - Saving card:', {
      cardData: formState.cardData,
      contentMedia: formState.cardData.contentMedia,
      content: formState.cardData.content
    });

    if (!validateForm()) {
      return;
    }

    setFormState(prev => ({ ...prev, isSaving: true }));

    try {
      // Prepare card data for saving
      const cardUpdate: CardUpdate = {
        ...formState.cardData,
        title_lowercase: formState.cardData.title?.toLowerCase() || '',
        updatedAt: Date.now(),
      };

      // Add full media objects to gallery media
      if (formState.galleryMedia?.length) {
        cardUpdate.galleryMedia = formState.galleryMedia.map(item => ({
          ...item,
          media: formState.mediaCache.get(item.mediaId)
        }));
      }

      // Add full media objects to content media
      if (cardUpdate.contentMedia?.length) {
        cardUpdate.contentMedia = cardUpdate.contentMedia.map(item => ({
          ...item,
          media: formState.mediaCache.get(item.id)
        }));
      }

      console.log('CardFormProvider - Prepared card update:', {
        cardUpdate,
        contentMedia: cardUpdate.contentMedia,
        content: cardUpdate.content,
        galleryMedia: cardUpdate.galleryMedia
      });

      await onSave(cardUpdate, formState.tags);

      console.log('CardFormProvider - Card saved successfully');
    } catch (error) {
      console.error('CardFormProvider - Error saving card:', error);
      throw error;
    } finally {
      setFormState(prev => ({ ...prev, isSaving: false }));
    }
  }, [formState.cardData, formState.tags, formState.galleryMedia, formState.mediaCache, validateForm, onSave]);

  const resetForm = useCallback(() => {
    setFormState({
      cardData: { ...initialCard },
      tags: initialCard?.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
      coverImage: initialCard?.coverImage || null,
      galleryMedia: initialCard?.galleryMedia || [],
      mediaCache: new Map(),
      isSaving: false,
      errors: {},
      lastSavedState: {
        cardData: { ...initialCard },
        tags: initialCard?.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
        coverImage: initialCard?.coverImage || null,
        galleryMedia: initialCard?.galleryMedia || [],
      },
    });
    originalValues.current = {
      cardData: { ...initialCard },
      tags: initialCard?.tags?.map(tagId => allTags.find(t => t.id === tagId)).filter(Boolean) || [],
      coverImage: initialCard?.coverImage,
      galleryMedia: initialCard?.galleryMedia || [],
    };
  }, [initialCard, allTags]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<FormContextValue>(() => ({
    formState,
    allTags,
    updateField,
    updateTags,
    updateCoverImage,
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
    updateField,
    updateTags,
    updateCoverImage,
    updateGalleryMedia,
    updateChildIds,
    updateContentMedia,
    handleSave,
    resetForm,
    validateField,
    validateForm,
  ]);

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

const handleImageUpload = async (file: File) => {
  if (isDisabled || isProcessingImage) return;

  setIsProcessingImage(true);
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/images/browser/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload image');
    }

    const media: Media = await response.json();
    console.log('Image uploaded successfully:', { media });
    
    // Update the media cache with the new image
    const updatedCache = new Map(formState.mediaCache);
    updatedCache.set(media.id, {
      ...media,
      url: media.storageUrl || media.url
    });
    
    batchStateUpdate({
      mediaCache: updatedCache
    });
    
    if (editor) {
      const displayUrl = getDisplayUrl(media);
      console.log('Inserting image into editor:', { displayUrl, mediaId: media.id });
      editor.chain().focus().setFigureWithImage({
        src: displayUrl,
        alt: media.filename,
        width: media.width,
        height: media.height,
        caption: media.caption || media.filename,
        mediaId: media.id,
        'data-media-id': media.id,
        'data-media-type': 'content'
      }).run();

      // Extract and notify about media IDs
      const mediaIds = extractMediaIds(editor.getHTML());
      console.log('Notifying about content media change after upload:', { mediaIds });
      onContentMediaChange?.(mediaIds);
    }
  } catch (error) {
    console.error('Error uploading image:', error);
  } finally {
    setIsProcessingImage(false);
  }
}; 
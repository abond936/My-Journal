import { z } from 'zod';
import { mediaSchema, Media } from './photo';

/**
 * Schema for an item within a gallery card.
 * It references a media asset and allows for context-specific overrides.
 */
const galleryMediaItemSchema = z.object({
  mediaId: z.string(),
  caption: z.string().optional(),
  order: z.number(),
  objectPosition: z.string().optional(),
  media: mediaSchema.optional(),
});

/**
 * Schema for a card in the system.
 * A card is the primary content unit, representing a story, Q&A, quote, etc.
 */
export const cardSchema = z.object({
  // Document identifier - Firestore's immutable docId
  docId: z.string().min(1, "Document ID is required"),
  
  // Basic card identification and metadata
  title: z.string().default(''),
  title_lowercase: z.string().default(''),
  subtitle: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),     //default to first 100 characters
  
  // The content field stores HTML with embedded media references.
  content: z.string().default(''),
  
  // Card type and status controls visibility and behavior
  type: z.enum(['story', 'qa', 'quote', 'callout', 'gallery', 'collection']).default('story'),
  status: z.enum(['draft', 'published']).default('draft'),
  displayMode: z.enum(['inline', 'navigate', 'static']).default('navigate'),
  
  // Cover image reference with position information
  coverImageId: z.string().nullable().optional(),
  coverImageFocalPoint: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(), // e.g., { x: 500, y: 375 } - pixel coordinates relative to original image

  // References to media assets embedded within the 'content' field.
  contentMedia: z.array(z.string()).optional(),

  // An array of objects defining the gallery's content and structure.
  galleryMedia: z.array(galleryMediaItemSchema).optional(),
  
  // The 5 tag dimensions
  who: z.array(z.string()).optional(),
  what: z.array(z.string()).optional(),
  when: z.array(z.string()).optional(),
  where: z.array(z.string()).optional(),
  reflection: z.array(z.string()).optional(),

  // Direct tag assignments and optimized query structure
  tags: z.array(z.string()).optional(),
  filterTags: z.record(z.boolean()).optional(),
  
  // For 'collection' type cards, this lists the IDs of child cards.
  childrenIds: z.array(z.string()).optional(),

  // Timestamps
  createdAt: z.number(),
  updatedAt: z.number(),

  // --- Transient/Populated Fields ---
  // These fields are not stored in Firestore but can be populated by services.
  
  // The populated cover image Media object.
  coverImage: z.any().optional().nullable(),
});

export type Card = z.infer<typeof cardSchema>;
export type CardUpdate = Partial<Card>;
export type GalleryMediaItem = z.infer<typeof galleryMediaItemSchema>;

/**
 * Centralized validation schema for card updates in API routes.
 * This ensures consistent validation across all endpoints.
 * Excludes server-generated fields that should not be updated via API.
 */
export const cardUpdateValidationSchema = cardSchema.partial().omit({
  docId: true,
  createdAt: true,
  updatedAt: true,
  filterTags: true,
  who: true,
  what: true,
  when: true,
  where: true,
  reflection: true,
  title_lowercase: true, // Server-generated
});

/**
 * Represents a gallery item that has been "hydrated" with the full Media object.
 * This is used on the client-side for rendering and state management.
 */
export type HydratedGalleryMediaItem = GalleryMediaItem & {
  media: Media;
};

import { z } from 'zod';

/**
 * Schema for an item within a gallery card.
 * It references a media asset and allows for context-specific overrides.
 */
const galleryMediaItemSchema = z.object({
  mediaId: z.string(),
  caption: z.string().optional(),
  order: z.number(),
  objectPosition: z.string().optional(),
});

/**
 * Schema for a card in the system.
 * A card is the primary content unit, representing a story, Q&A, quote, etc.
 */
export const cardSchema = z.object({
  // Basic card identification and metadata
  id: z.string(),
  title: z.string().default(''),
  title_lowercase: z.string().default(''),
  subtitle: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  
  // The content field stores HTML with embedded media references.
  content: z.string().default(''),
  
  // Card type and status controls visibility and behavior
  type: z.enum(['story', 'qa', 'quote', 'callout', 'gallery', 'collection']).default('story'),
  status: z.enum(['draft', 'published']).default('draft'),
  displayMode: z.enum(['inline', 'navigate', 'static']).default('navigate'),
  
  // Cover image reference with position information
  coverImageId: z.string().nullable().optional(),
  coverImageObjectPosition: z.string().optional(), // e.g., '50% 50%'

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

  // Combined and calculated tags for querying
  tags: z.array(z.string()).optional(),
  inheritedTags: z.array(z.string()).optional(),
  tagPathsMap: z.record(z.boolean()).optional(),
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

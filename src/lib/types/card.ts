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
 * A card is the primary content unit (story, gallery, Q&A, etc.).
 *
 * **Parent / child (structural “collection”):** Any card may have `childrenIds`. A card with
 * at least one child id is a structural collection parent. Studio tree structure keys off
 * `childrenIds`, not type.
 */
export const cardSchema = z.object({
  // Document identifier - Firestore's immutable docId
  docId: z.string().min(1, "Document ID is required"),
  
  // Basic card identification and metadata
  title: z.string().default(''),
  title_lowercase: z.string().default(''),
  subtitle: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  excerptAuto: z.boolean().optional(),
  
  // The content field stores HTML with embedded media references.
  content: z.string().default(''),
  
  // Card type: drives feed/view rendering. Any type may have childrenIds for structural collections.
  type: z.enum(['story', 'qa', 'quote', 'callout', 'gallery']).default('story'),
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
  
  // Dimensional tag ids (derived from assigned tags + ancestors)
  who: z.array(z.string()).optional(),
  what: z.array(z.string()).optional(),
  when: z.array(z.string()).optional(),
  where: z.array(z.string()).optional(),
  // Media-derived dimensional helper signals (derived from attached media tags).
  mediaWho: z.array(z.string()).optional(),
  mediaWhat: z.array(z.string()).optional(),
  mediaWhen: z.array(z.string()).optional(),
  mediaWhere: z.array(z.string()).optional(),
  whoSortKey: z.string().optional(),
  whatSortKey: z.string().optional(),
  whereSortKey: z.string().optional(),

  // Direct tag assignments and optimized query structure
  tags: z.array(z.string()).optional(),
  filterTags: z.record(z.boolean()).optional(),
  
  // Ordered child card doc ids. Any card type may have children; order defines narrative/TOC sequence.
  childrenIds: z.array(z.string()).optional(),
  /** Explicit top-level collection root marker. A card may be both a root and a child elsewhere. */
  isCollectionRoot: z.boolean().optional(),
  /** Explicit ordering among collection roots. Lower values appear first. */
  collectionRootOrder: z.number().optional(),
  // Legacy curated-root compatibility fields retained for stored data migration/cleanup.
  curatedRoot: z.boolean().optional(),
  /** Legacy ordering field for pre-master curated roots. */
  curatedRootOrder: z.number().optional(),

  /**
   * Denormalized: true when `childrenIds?.length > 0`. Maintained only on the
   * server so `getCollectionCards` can query Firestore; do not set via API (omitted from update schema).
   */
  curatedNavEligible: z.boolean().optional(),

  /** When set, this card was created by folder import; used to detect duplicates. */
  importedFromFolder: z.string().optional(),

  /**
   * Denormalized journal-time sort keys from When tags (packed YYYYMMDD-style; 00 = unknown parts).
   * `journalWhenSortAsc`: oldest-first; undated uses a large sentinel so they sort last.
   * `journalWhenSortDesc`: newest-first; undated uses -1 so they sort last.
   */
  journalWhenSortAsc: z.number().optional(),
  journalWhenSortDesc: z.number().optional(),

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
  mediaWho: true,
  mediaWhat: true,
  mediaWhen: true,
  mediaWhere: true,
  isCollectionRoot: true,
  collectionRootOrder: true,
  curatedRoot: true,
  curatedRootOrder: true,
  title_lowercase: true, // Server-generated
  curatedNavEligible: true,
  journalWhenSortAsc: true,
  journalWhenSortDesc: true,
  whoSortKey: true,
  whatSortKey: true,
  whereSortKey: true,
});

/**
 * Represents a gallery item that has been "hydrated" with the full Media object.
 * This is used on the client-side for rendering and state management.
 */
export type HydratedGalleryMediaItem = GalleryMediaItem & {
  media: Media;
};

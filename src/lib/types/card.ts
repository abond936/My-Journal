import { z } from 'zod';

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
  // Media is embedded using figure elements with data attributes:
  // <figure data-figure-with-image data-media-id="123" data-size="medium" data-alignment="left">
  //   <img src="..." alt="..." width="..." height="...">
  //   <figcaption>Optional caption specific to this usage</figcaption>
  // </figure>
  content: z.string().default(''),
  
  // Card type and status controls visibility and behavior
  type: z.enum(['story', 'qa', 'quote', 'callout', 'gallery', 'collection']).default('story'),
  status: z.enum(['draft', 'published']).default('draft'),
  displayMode: z.enum(['inline', 'navigate', 'static']).default('navigate'),
  
  // Cover image reference with position information
  coverImageId: z.string().optional().nullable(),
  coverImage: z.any().optional().nullable(),

  // The 'content' field may contain embedded images, which will be handled
  // by the Tiptap implementation (storing data-media-id).
  contentMedia: z.array(z.any()).default([]),

  // An array of objects defining the gallery's content and structure.
  // Each object references a Media document and can override its caption.
  galleryMedia: z.array(z.object({
    mediaId: z.string(),
    caption: z.string().optional(),
    order: z.number(),
    objectPosition: z.string().optional(),
  })).default([]),
  
  // The 5 tag dimensions
  who: z.array(z.string()).default([]),
  what: z.array(z.string()).default([]),
  when: z.array(z.string()).default([]),
  where: z.array(z.string()).default([]),
  reflection: z.array(z.string()).default([]),

  // Combined and calculated tags for querying
  tags: z.array(z.string()).default([]),
  inheritedTags: z.array(z.string()).default([]),
  tagPathsMap: z.record(z.boolean()).default({}),
  filterTags: z.record(z.boolean()).optional(),
  
  childrenIds: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Card = z.infer<typeof cardSchema>;
export type CardUpdate = Partial<Card>;

export type Card = z.infer<typeof cardSchema>; 
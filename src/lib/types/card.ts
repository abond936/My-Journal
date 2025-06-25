import { z } from 'zod';
import { mediaSchema } from './photo';

export const cardSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  title_lowercase: z.string().default(''),
  subtitle: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  
  // Flexible content to handle both rich text (object) and simple strings
  content: z.union([z.string(), z.record(z.any())]).optional().nullable(),
  
  type: z.enum(['story', 'qa', 'quote', 'callout', 'gallery', 'collection']),
  status: z.enum(['draft', 'published']),
  displayMode: z.enum(['inline', 'navigate', 'static']),
  
  // A reference to a single Media document's ID.
  coverImageId: z.string().optional().nullable(),

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
import { z } from 'zod';
import { photoMetadataSchema } from './photo';

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
  
  // Future-proof media objects
  coverImage: photoMetadataSchema.optional().nullable(),
  contentMedia: z.array(photoMetadataSchema).default([]),
  galleryMedia: z.array(photoMetadataSchema).default([]),
  
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
  
  childrenIds: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Card = z.infer<typeof cardSchema>; 
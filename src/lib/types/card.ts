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
  coverImage: z.preprocess(
    (arg) => {
      // If the arg is an object but doesn't have the required properties,
      // treat it as null. This handles legacy data where coverImage might be `{}`.
      if (typeof arg === 'object' && arg !== null && !('storageUrl' in arg)) {
        return null;
      }
      return arg;
    },
    photoMetadataSchema.nullable()
  ),
  contentMedia: z.array(z.any()).default([]),
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
  filterTags: z.record(z.boolean()).optional(),
  
  childrenIds: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Card = z.infer<typeof cardSchema>; 
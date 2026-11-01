import { z } from 'zod';
import { audienceSelectionSchema } from '@/lib/types/audience';

export const sharedMediaCollectionSchema = z.object({
  docId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  mediaIds: z.array(z.string().min(1)).max(250),
  audience: audienceSelectionSchema.optional(),
  lifecycle: z.enum(['draft', 'published']).default('draft'),
  revision: z.number().int().nonnegative().default(0),
  order: z.number().finite(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type SharedMediaCollection = z.infer<typeof sharedMediaCollectionSchema>;

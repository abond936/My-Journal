import { z } from 'zod';

export const mediaStackKindSchema = z.enum(['manual', 'burst', 'motion_pair']);
export type MediaStackKind = z.infer<typeof mediaStackKindSchema>;

export const mediaStackStatusSchema = z.enum(['active', 'dissolved']);
export type MediaStackStatus = z.infer<typeof mediaStackStatusSchema>;

export const mediaStackSchema = z.object({
  docId: z.string().optional(),
  kind: mediaStackKindSchema,
  status: mediaStackStatusSchema,
  heroMediaId: z.string(),
  memberMediaIds: z.array(z.string()).min(2),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type MediaStack = z.infer<typeof mediaStackSchema>;

export const createMediaStackInputSchema = z.object({
  mediaIds: z.array(z.string()).min(2),
  heroMediaId: z.string().optional(),
  kind: mediaStackKindSchema.optional(),
});

export type CreateMediaStackInput = z.infer<typeof createMediaStackInputSchema>;

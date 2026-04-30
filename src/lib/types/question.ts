import { z } from 'zod';

export const questionSchema = z.object({
  docId: z.string().min(1),
  prompt: z.string().min(1),
  prompt_lowercase: z.string().min(1),
  tagIds: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string()).default([]),
  usedByCardIds: z.array(z.string()).default([]),
  usageCount: z.number().int().nonnegative().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const createQuestionSchema = z.object({
  prompt: z.string().min(1).max(500),
  tagIds: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1).max(80)).optional(),
});

export const updateQuestionSchema = z
  .object({
    prompt: z.string().min(1).max(500).optional(),
    tagIds: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1).max(80)).optional(),
  })
  .refine(data =>
    data.prompt !== undefined ||
    data.tagIds !== undefined ||
    data.tags !== undefined, {
    message: 'At least one field is required',
  });

export type Question = z.infer<typeof questionSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;


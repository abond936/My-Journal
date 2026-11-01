import { z } from 'zod';

export const promptLibraryKindSchema = z.enum(['primary', 'followup']);
export const promptLibraryMoveDirectionSchema = z.enum(['up', 'down']);

const promptLibraryFields = {
  category: z.string().trim().max(120).default(''),
  topic: z.string().trim().max(120).default(''),
  promptKind: promptLibraryKindSchema.default('primary'),
  parentQuestionId: z.string().min(1).nullable().default(null),
  promptOrder: z.number().int().nonnegative().default(0),
};

export const questionSchema = z.object({
  docId: z.string().min(1),
  prompt: z.string().min(1),
  prompt_lowercase: z.string().min(1),
  tagIds: z.array(z.string().min(1)).default([]),
  subjectTagId: z.string().min(1).nullable().optional(),
  subjectTagIds: z.array(z.string().min(1)).default([]),
  subjectFilterTags: z.record(z.boolean()).default({}),
  tags: z.array(z.string()).default([]),
  usedByCardIds: z.array(z.string()).default([]),
  usageCount: z.number().int().nonnegative().default(0),
  ...promptLibraryFields,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const createQuestionSchema = z.object({
  prompt: z.string().min(1).max(500),
  tagIds: z.array(z.string().min(1)).default([]),
  subjectTagIds: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1).max(80)).optional(),
  ...promptLibraryFields,
});

export const updateQuestionSchema = z
  .object({
    prompt: z.string().min(1).max(500).optional(),
    tagIds: z.array(z.string().min(1)).optional(),
    subjectTagIds: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1).max(80)).optional(),
    category: promptLibraryFields.category.optional(),
    topic: promptLibraryFields.topic.optional(),
    promptKind: promptLibraryFields.promptKind.optional(),
    parentQuestionId: promptLibraryFields.parentQuestionId.optional(),
    promptOrder: promptLibraryFields.promptOrder.optional(),
  })
  .refine(data =>
    data.prompt !== undefined ||
    data.tagIds !== undefined ||
    data.subjectTagIds !== undefined ||
    data.tags !== undefined ||
    data.category !== undefined ||
    data.topic !== undefined ||
    data.promptKind !== undefined ||
    data.parentQuestionId !== undefined ||
    data.promptOrder !== undefined, {
    message: 'At least one field is required',
  });

export const reorderQuestionSchema = z.object({
  questionId: z.string().min(1),
  direction: promptLibraryMoveDirectionSchema,
});

export type Question = z.infer<typeof questionSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type PromptLibraryKind = z.infer<typeof promptLibraryKindSchema>;
export type PromptLibraryMoveDirection = z.infer<typeof promptLibraryMoveDirectionSchema>;


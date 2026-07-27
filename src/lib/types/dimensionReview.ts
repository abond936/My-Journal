import { z } from 'zod';

export const dimensionResolutionSchema = z.enum(['unknown', 'not_applicable']);

export const dimensionReviewEntrySchema = z.object({
  reviewed: z.boolean(),
  reviewedAt: z.number().optional(),
  reviewedBy: z.string().optional(),
  resolution: dimensionResolutionSchema.nullable().optional(),
});

export const dimensionReviewMapSchema = z.object({
  who: dimensionReviewEntrySchema.optional(),
  what: dimensionReviewEntrySchema.optional(),
  when: dimensionReviewEntrySchema.optional(),
  where: dimensionReviewEntrySchema.optional(),
}).optional();

export type DimensionResolution = z.infer<typeof dimensionResolutionSchema>;
export type DimensionReviewEntry = z.infer<typeof dimensionReviewEntrySchema>;
export type DimensionReviewMap = z.infer<typeof dimensionReviewMapSchema>;

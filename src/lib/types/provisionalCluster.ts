import { z } from 'zod';

export const reviewLensSchema = z.enum(['suggested', 'when', 'where', 'who', 'what']);
export type ReviewLens = z.infer<typeof reviewLensSchema>;

export const provisionalClusterStatusSchema = z.enum(['pending', 'accepted', 'dismissed']);
export type ProvisionalClusterStatus = z.infer<typeof provisionalClusterStatusSchema>;

export const suggestedTagIdsByDimensionSchema = z.object({
  who: z.array(z.string()).optional(),
  what: z.array(z.string()).optional(),
  when: z.array(z.string()).optional(),
  where: z.array(z.string()).optional(),
});

export type SuggestedTagIdsByDimension = z.infer<typeof suggestedTagIdsByDimensionSchema>;

export const provisionalClusterSchema = z.object({
  docId: z.string().optional(),
  lens: reviewLensSchema,
  status: provisionalClusterStatusSchema,
  title: z.string(),
  reason: z.string(),
  occasionLabel: z.string().optional(),
  memberMediaIds: z.array(z.string()),
  suggestedTagIds: suggestedTagIdsByDimensionSchema,
  coverageNote: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ProvisionalCluster = z.infer<typeof provisionalClusterSchema>;

export function flattenSuggestedTagIds(suggested: SuggestedTagIdsByDimension): string[] {
  const ids = new Set<string>();
  for (const dimension of ['who', 'what', 'when', 'where'] as const) {
    for (const id of suggested[dimension] ?? []) {
      if (id.trim()) ids.add(id);
    }
  }
  return Array.from(ids);
}

export function mergeSuggestedTagIds(
  current: SuggestedTagIdsByDimension,
  next: SuggestedTagIdsByDimension
): SuggestedTagIdsByDimension {
  return {
    who: next.who ?? current.who,
    what: next.what ?? current.what,
    when: next.when ?? current.when,
    where: next.where ?? current.where,
  };
}

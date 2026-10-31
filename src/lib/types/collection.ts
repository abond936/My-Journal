import { z } from 'zod';
import { audienceSelectionSchema } from './audience';

export const collectionLifecycleSchema = z.enum(['draft', 'published']);
export const collectionRecordStateSchema = z.enum(['shadow', 'active']);
export const collectionPlacementRoleSchema = z.enum(['part', 'chapter', 'section', 'card']);

export const collectionSchema = z.object({
  docId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  introductionCardId: z.string().min(1).optional().nullable(),
  lifecycle: collectionLifecycleSchema.default('draft'),
  /** Collection-route audience. Missing legacy values allow all enabled readers. */
  audience: audienceSelectionSchema.optional(),
  recordState: collectionRecordStateSchema.default('active'),
  structureRevision: z.number().int().nonnegative().default(0),
  authorityRevision: z.number().int().nonnegative().default(0),
  authorityEstablishedAt: z.number().optional(),
  order: z.number().finite(),
  legacySourceRootId: z.string().min(1).optional(),
  migrationSourceFingerprint: z.string().length(64).optional(),
  migrationTargetFingerprint: z.string().length(64).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const collectionPlacementSchema = z.object({
  docId: z.string().min(1),
  collectionId: z.string().min(1),
  cardId: z.string().min(1),
  parentPlacementId: z.string().min(1).optional().nullable(),
  role: collectionPlacementRoleSchema,
  order: z.number().finite(),
  migrationSourcePathIds: z.array(z.string().min(1)).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type CollectionLifecycle = z.infer<typeof collectionLifecycleSchema>;
export type CollectionRecordState = z.infer<typeof collectionRecordStateSchema>;
export type CollectionPlacementRole = z.infer<typeof collectionPlacementRoleSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type CollectionPlacement = z.infer<typeof collectionPlacementSchema>;

export const collectionPlacementStructureInputSchema = z.object({
  docId: z.string().min(1),
  cardId: z.string().min(1),
  parentPlacementId: z.string().min(1).nullable().optional(),
  role: collectionPlacementRoleSchema,
  order: z.number().finite().nonnegative(),
});

export type CollectionPlacementStructureInput = z.infer<typeof collectionPlacementStructureInputSchema>;

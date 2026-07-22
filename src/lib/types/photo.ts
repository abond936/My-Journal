// src/lib/types/photo.ts

import { z } from 'zod';

const mediaRenditionSchema = z.object({
  storagePath: z.string(),
  storageUrl: z.string().optional(),
  width: z.number(),
  height: z.number(),
  contentType: z.string(),
});

const mediaRenditionsSchema = z.object({
  studio: mediaRenditionSchema.optional(),
  reader: mediaRenditionSchema.optional(),
});

const mediaContentIdentitySchema = z.object({
  algorithm: z.literal('sha256'),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  basis: z.literal('source-bytes'),
});

const mediaContentIdentityAssessmentSchema = z.object({
  status: z.enum(['local-original-not-found', 'source-original-not-retained']),
  basis: z.literal('source-audit'),
  assessmentVersion: z.literal(1),
  assessedAt: z.number(),
});

const mediaSourceIdentitySchema = z.object({
  provider: z.enum(['local', 'upload', 'apple_photos']),
  assetId: z.string().min(1),
  sourcePath: z.string().optional(),
  importedAt: z.number(),
  observedFilename: z.string().optional(),
  caption: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  importBatchId: z.string().optional(),
});

const mediaReadinessStageStatusSchema = z.enum(['pending', 'ready', 'failed']);
const mediaReadinessStageSchema = z.object({
  status: mediaReadinessStageStatusSchema,
  attemptedAt: z.number(),
  code: z.string().min(1).optional(),
  retryable: z.boolean().optional(),
  detail: z.string().max(240).optional(),
});
const mediaReadinessSchema = z.object({
  overall: mediaReadinessStageStatusSchema,
  stages: z.object({
    source: mediaReadinessStageSchema,
    metadata: mediaReadinessStageSchema,
    studioRendition: mediaReadinessStageSchema,
    readerRendition: mediaReadinessStageSchema,
    searchIndex: mediaReadinessStageSchema,
  }),
  updatedAt: z.number(),
});

// Defines the canonical metadata for a single media asset in the system.
// This is the single source of truth, stored in the top-level 'media' collection.
export const mediaSchema = z.object({
  // Document identifier - Firestore's immutable docId
  docId: z.string().min(1, "Document ID is required"),
  
  // The original filename from the source.
  filename: z.string(),
  
  // Image dimensions
  width: z.number(),
  height: z.number(),
  
  // File metadata
  size: z.number(), // File size in bytes
  contentType: z.string(), // MIME type (e.g., 'image/jpeg', 'image/png')
  
  // Firebase Storage details. The URL is the primary way to access the image.
  storageUrl: z.string(), // Public, permanent URL from Firebase Storage.
  storagePath: z.string(), // The path to the file within the Storage bucket (e.g., 'images/uuid-filename.jpg').
  renditions: mediaRenditionsSchema.optional(),
  /** Durable stage outcomes for new imports. Absence means a legacy record is unassessed. */
  readiness: mediaReadinessSchema.optional(),
  
  // Details about the original source of the file.
  source: z.enum(['local', 'paste']),
  sourcePath: z.string(), // The original path/identifier from the source (e.g., '/2023/Vacation/IMG_1234.jpg').
  /** Exact identity of source bytes before normalization or rendition generation. */
  contentIdentity: mediaContentIdentitySchema.optional(),
  /** Explicit reason exact source-byte evidence cannot currently be established. */
  contentIdentityAssessment: mediaContentIdentityAssessmentSchema.optional(),
  /** Every known source identity for this canonical asset, including repeat imports. */
  sourceIdentities: z.array(mediaSourceIdentitySchema).optional(),
  
  // The default caption for the image, potentially from file metadata.
  // This serves as the base caption that can be overridden in specific contexts.
  caption: z.string().optional(),

  /** @deprecated Legacy field; no longer written. Omitted on new docs. */
  status: z.enum(['temporary', 'active']).optional(),

  // The focal point position for the image, in CSS object-position format (e.g., '50% 50%')
  objectPosition: z.string().optional().default('50% 50%'),

  // Timestamps for creation and last update.
  createdAt: z.number(),
  updatedAt: z.number(),

  /** Card IDs that reference this media (cover, gallery, or content). Denormalized for fast delete and unassigned filter. */
  referencedByCardIds: z.array(z.string()).optional(),

  /**
   * Tags assigned to this media only (same tag library as cards). Derived `filterTags` + dimensional arrays
   * are computed on write; they do not merge onto parent cards.
   */
  tags: z.array(z.string()).optional(),
  subjectTagId: z.string().min(1).nullable().optional(),
  subjectTagIds: z.array(z.string().min(1)).optional(),
  subjectFilterTags: z.record(z.boolean()).optional(),
  filterTags: z.record(z.boolean()).optional(),
  who: z.array(z.string()).optional(),
  what: z.array(z.string()).optional(),
  when: z.array(z.string()).optional(),
  where: z.array(z.string()).optional(),
  hasTags: z.boolean().optional(),
  hasWho: z.boolean().optional(),
  hasWhat: z.boolean().optional(),
  hasWhen: z.boolean().optional(),
  hasWhere: z.boolean().optional(),

  /** Set on import batch requests so Browse can filter recent uploads. */
  importBatchId: z.string().optional(),

  /** Truth about the embedded-metadata request and what the importer actually found. */
  metadataImport: z.object({
    attempted: z.boolean(),
    outcome: z.enum(['found', 'none', 'error', 'not_requested']),
    foundFields: z.array(z.enum(['caption', 'keywords'])).optional(),
  }).optional(),

  /** Canonical burst/manual stack membership (hero + alternates). */
  stackId: z.string().optional().nullable(),
  stackRole: z.enum(['hero', 'member']).optional().nullable(),

});

export type Media = z.infer<typeof mediaSchema>;
export type MediaContentIdentity = z.infer<typeof mediaContentIdentitySchema>;
export type MediaSourceIdentity = z.infer<typeof mediaSourceIdentitySchema>;
export type MediaReadiness = z.infer<typeof mediaReadinessSchema>;
export type MediaReadinessStage = z.infer<typeof mediaReadinessStageSchema>;
export type MediaReadinessStageName = keyof MediaReadiness['stages'];

/** Local folder browser / picker preview item (not persisted as Media until import). */
export interface PickerMedia {
  id: string;
  filename: string;
  width: number;
  height: number;
  sourcePath: string;
  storageUrl: string;
}

/** Directory tree node for local image folder browser API. */
export interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[];
}

// Obsolete, replaced by Media
// export type PhotoMetadata = Media & {
//   objectPosition?: string;
// }; 

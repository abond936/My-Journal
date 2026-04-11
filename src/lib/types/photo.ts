// src/lib/types/photo.ts

import { z } from 'zod';

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
  
  // Details about the original source of the file.
  source: z.enum(['local', 'paste']),
  sourcePath: z.string(), // The original path/identifier from the source (e.g., '/2023/Vacation/IMG_1234.jpg').
  
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

});

export type Media = z.infer<typeof mediaSchema>;

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
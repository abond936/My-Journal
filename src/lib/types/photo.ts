// src/lib/types/photo.ts

import { z } from 'zod';

// Defines the canonical metadata for a single media asset in the system.
// This is the single source of truth, stored in the top-level 'media' collection.
export const mediaSchema = z.object({
  // A unique identifier for the media asset, generated on creation.
  id: z.string(), 
  
  // The original filename from the source.
  filename: z.string(),
  
  // Image dimensions
  width: z.number(),
  height: z.number(),
  
  // Firebase Storage details. The URL is the primary way to access the image.
  storageUrl: z.string(), // Public, permanent URL from Firebase Storage.
  storagePath: z.string(), // The path to the file within the Storage bucket (e.g., 'images/uuid-filename.jpg').
  
  // Details about the original source of the file.
  source: z.enum(['local', 'paste']),
  sourcePath: z.string(), // The original path/identifier from the source (e.g., '/2023/Vacation/IMG_1234.jpg').
  
  // The default caption for the image, potentially from file metadata.
  // This serves as the base caption that can be overridden in specific contexts.
  caption: z.string().optional(),

  // The status of the media asset in its processing lifecycle.
  status: z.enum(['temporary', 'active']).default('temporary'),

  // The focal point position for the image, in CSS object-position format (e.g., '50% 50%')
  objectPosition: z.string().optional().default('50% 50%'),

  // Timestamps for creation and last update.
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Media = z.infer<typeof mediaSchema>;

// No longer needed
/*
export const pickerMediaSchema = z.object({
  // In the context of the picker, the ID is a temporary identifier, usually the sourcePath.
  id: z.string(),
  filename: z.string(),
  width: z.number(),
  height: z.number(),
  // The key piece of information needed to perform the actual import.
  sourcePath: z.string(),
  // A temporary URL for rendering the image preview in the picker.
  storageUrl: z.string(),
});

export type PickerMedia = z.infer<typeof pickerMediaSchema>; 
*/

// Obsolete, replaced by Media
// export type PhotoMetadata = Media & {
//   objectPosition?: string;
// }; 
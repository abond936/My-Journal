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
  source: z.enum(['local-drive', 'upload', 'paste', 'onedrive', 'google-photos']),
  sourcePath: z.string(), // The original path/identifier from the source (e.g., '/2023/Vacation/IMG_1234.jpg').
  
  // The default caption for the image. Can be overridden at the point of use (e.g., in a card gallery).
  caption: z.string().optional(),

  // The status of the media asset in its processing lifecycle.
  status: z.enum(['raw', 'processed', 'archived']).default('raw'),

  // Timestamps for creation and last update.
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Media = z.infer<typeof mediaSchema>; 
// src/lib/types/photo.ts

import { z } from 'zod';

// Defines the core metadata for a single photo.
// This model is storage-centric, not file-system-centric.
export const photoMetadataSchema = z.object({
  id: z.string(), // The ID of the photo in our system (could be the Card ID or a unique ID)
  filename: z.string(),
  width: z.number(),
  height: z.number(),
  
  // Storage-related fields
  storageUrl: z.string(), // The public, permanent URL of the image in Firebase Storage
  storagePath: z.string(), // The path to the file within the Firebase Storage bucket
  
  // Source-related fields
  sourcePath: z.string(), // The original path from the source (e.g., local drive)
  
  // Optional fields
  objectPosition: z.string().optional(),
  caption: z.string().optional(),
  status: z.enum(['raw', 'edited']).default('raw'),
});

export type PhotoMetadata = z.infer<typeof photoMetadataSchema>;

// Defines a node in the folder tree structure for the PhotoPicker.
// This remains unchanged as it's used for browsing the original source.
export interface TreeNode {
  id: string; // The full system path to the folder
  name: string;
  children?: TreeNode[];
} 
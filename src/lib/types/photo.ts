// src/lib/types/photo.ts

import { z } from 'zod';

// Defines the core metadata for a single photo.
export const photoMetadataSchema = z.object({
  id: z.string(),
  filename: z.string(),
  path: z.string(),
  width: z.number(),
  height: z.number(),
  lastModified: z.string(),
  size: z.number(),
  objectPosition: z.string().optional(),
  thumbnailUrl: z.string(),
  previewUrl: z.string(),
  webUrl: z.string(),
  caption: z.string().optional(),
});

export type PhotoMetadata = z.infer<typeof photoMetadataSchema>;

// Defines a node in the folder tree structure for the PhotoPicker.
export interface TreeNode {
  id: string; // The full system path to the folder
  name: string;
  children?: TreeNode[];
} 
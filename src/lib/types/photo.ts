// src/lib/types/photo.ts

// Defines the core metadata for a single photo.
export interface PhotoMetadata {
  id: string;
  filename: string;
  path: string; // This will be the web-accessible path (e.g., /images/local/...)
  width: number;
  height: number;
  lastModified: string;
  size: number;
  thumbnailUrl: string; 
  previewUrl: string;
  webUrl: string; 
  caption?: string;
}

// Defines a node in the folder tree structure for the PhotoPicker.
export interface TreeNode {
  id: string; // The full system path to the folder
  name: string;
  children?: TreeNode[];
} 
// src/lib/types/album.ts
import { PhotoMetadata } from './photo';

// Represents a collection of photos from an external source (e.g., a folder).
export interface SourceCollection {
  id:string;
  name: string;
  description: string;
  path: string;
  photoCount: number;
  photos: PhotoMetadata[];
  tags: string[];
  isEnabled: boolean;
  sourceProvider: 'onedrive' | 'google-photos' | 'local-drive' | 'file-system';
}

// Represents an image that has been selected and associated with an Album in our app.
export interface AlbumPhoto extends PhotoMetadata {
  albumId: string;
}

// Represents a curated Album within the application.
export interface Album {
  id:string;
  title: string;
  caption: string;
  description: string;
  coverPhoto?: PhotoMetadata;
  tags: string[];
  media: PhotoMetadata[];
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
  mediaCount: number;
  images: AlbumImage[];
  sourceId?: string;
  styleId?: string;
  [key: string]: any;
}

export interface AlbumImage {
  displayUrl: string;
  lastModified?: string;
}

export interface AlbumStyle {
  id: string;
  name: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  backgroundImage?: string;
  photoFrameStyle?: string; // e.g., 'polaroid', 'shadow'
}
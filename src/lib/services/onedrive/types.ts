/**
 * OneDrive Integration Types
 * 
 * This file contains type definitions for OneDrive integration,
 * including folder structure, photo metadata, and service responses.
 */

export interface OneDriveFolder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  childFolders: OneDriveFolder[];
  photos: OneDrivePhoto[];
  lastSync: Date;
}

export interface OneDrivePhoto {
  id: string;
  name: string;
  path: string;
  folderId: string;
  size: number;
  width: number;
  height: number;
  takenAt?: Date;
  modifiedAt: Date;
  metadata: {
    camera?: string;
    exposure?: string;
    fNumber?: number;
    iso?: number;
    focalLength?: string;
    tags?: string[];
    caption?: string;
  };
}

export interface OneDriveSyncStatus {
  lastSync: Date;
  totalFolders: number;
  totalPhotos: number;
  syncErrors: {
    path: string;
    error: string;
    timestamp: Date;
  }[];
}

export interface OneDriveConfig {
  rootPath: string;
  photoExtensions: string[];
  maxFileSize: number;
  syncInterval: number;
  thumbnailSize: {
    width: number;
    height: number;
  };
  previewSize: {
    width: number;
    height: number;
  };
} 
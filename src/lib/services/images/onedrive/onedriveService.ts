/**
 * OneDrive Service
 * 
 * Handles integration with OneDrive for photo access and management.
 * Uses the local OneDrive folder structure as the source of truth.
 */

import fs from 'fs';
import path from 'path';
import { OneDriveFolder, OneDrivePhoto, OneDriveConfig, OneDriveSyncStatus } from './types';
import { getConfig } from './config';

class OneDriveService {
  private config: OneDriveConfig;
  private syncStatus: OneDriveSyncStatus;

  constructor() {
    this.config = getConfig();
    this.syncStatus = {
      lastSync: new Date(0),
      totalFolders: 0,
      totalPhotos: 0,
      syncErrors: []
    };
  }

  /**
   * Scans the OneDrive folder structure and returns the folder hierarchy
   */
  async scanFolderStructure(rootPath: string = this.config.rootPath): Promise<OneDriveFolder> {
    try {
      const stats = await fs.promises.stat(rootPath);
      if (!stats.isDirectory()) {
        throw new Error(`${rootPath} is not a directory`);
      }

      const folder: OneDriveFolder = {
        id: path.basename(rootPath),
        name: path.basename(rootPath),
        path: rootPath,
        parentId: path.dirname(rootPath) === rootPath ? null : path.basename(path.dirname(rootPath)),
        childFolders: [],
        photos: [],
        lastSync: new Date()
      };

      const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(rootPath, entry.name);
        
        if (entry.isDirectory()) {
          const childFolder = await this.scanFolderStructure(fullPath);
          folder.childFolders.push(childFolder);
        } else if (entry.isFile() && this.isPhotoFile(entry.name)) {
          const photo = await this.getPhotoMetadata(fullPath, folder.id);
          folder.photos.push(photo);
        }
      }

      return folder;
    } catch (error) {
      this.syncStatus.syncErrors.push({
        path: rootPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Checks if a file is a photo based on its extension
   */
  private isPhotoFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.config.photoExtensions.includes(ext);
  }

  /**
   * Gets metadata for a photo file
   */
  private async getPhotoMetadata(filePath: string, folderId: string): Promise<OneDrivePhoto> {
    const stats = await fs.promises.stat(filePath);
    
    // TODO: Implement proper photo metadata extraction
    // For now, return basic file information
    return {
      id: path.basename(filePath),
      name: path.basename(filePath),
      path: filePath,
      folderId,
      size: stats.size,
      width: 0, // TODO: Extract from image
      height: 0, // TODO: Extract from image
      modifiedAt: stats.mtime,
      metadata: {}
    };
  }

  /**
   * Gets the current sync status
   */
  getSyncStatus(): OneDriveSyncStatus {
    return this.syncStatus;
  }
}

// Export a singleton instance
export const onedriveService = new OneDriveService(); 
/**
 * OneDrive Configuration
 * 
 * Contains configuration settings for OneDrive integration.
 */

import { OneDriveConfig } from './types';

const defaultConfig: OneDriveConfig = {
  rootPath: 'C:\\Users\\alanb\\OneDrive\\Pictures',
  photoExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic'],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  syncInterval: 1000 * 60 * 60, // 1 hour
  thumbnailSize: {
    width: 200,
    height: 200
  },
  previewSize: {
    width: 800,
    height: 800
  }
};

let config: OneDriveConfig = { ...defaultConfig };

export function getConfig(): OneDriveConfig {
  return config;
}

export function updateConfig(newConfig: Partial<OneDriveConfig>): void {
  config = { ...config, ...newConfig };
} 
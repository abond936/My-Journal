import { getConfig } from '@/lib/services/onedrive/config';
import { AlbumMapping } from '@/lib/services/onedrive/albumConfig';

export interface PhotoMetadata {
  id: string;
  filename: string;
  path: string;
  albumId: string;
  albumName: string;
  tags: string[];
  size: number;
  lastModified: Date;
  thumbnailUrl: string;
  previewUrl: string;
  caption?: string;
}

export interface Album {
  id: string;
  name: string;
  description: string;
  path: string;
  photoCount: number;
  photos: PhotoMetadata[];
  tags: string[];
  isEnabled: boolean;
}

export class PhotoService {
  async loadAlbum(albumId: string): Promise<Album> {
    console.log('Loading album:', albumId);
    const response = await fetch(`/api/photos/album?id=${encodeURIComponent(albumId)}`);
    if (!response.ok) {
      console.error('Failed to load album:', response.status, response.statusText);
      throw new Error('Failed to load album');
    }
    const data = await response.json();
    console.log('Album data:', data);
    return data;
  }

  async getAllAlbums(): Promise<Album[]> {
    console.log('Loading all albums...');
    const response = await fetch('/api/photos/albums');
    if (!response.ok) {
      console.error('Failed to load albums:', response.status, response.statusText);
      throw new Error('Failed to load albums');
    }
    const data = await response.json();
    console.log('All albums data:', data);
    return data;
  }

  async updatePhotoMetadata(photoId: string, metadata: Partial<PhotoMetadata>): Promise<PhotoMetadata> {
    console.log('Updating photo metadata:', photoId, metadata);
    const response = await fetch(`/api/photos/${photoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    if (!response.ok) {
      console.error('Failed to update photo metadata:', response.status, response.statusText);
      throw new Error('Failed to update photo metadata');
    }
    const data = await response.json();
    console.log('Updated photo data:', data);
    return data;
  }

  async addTagsToPhoto(photoId: string, tags: string[]): Promise<PhotoMetadata> {
    console.log('Adding tags to photo:', photoId, tags);
    const response = await fetch(`/api/photos/${photoId}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags }),
    });
    if (!response.ok) {
      console.error('Failed to add tags to photo:', response.status, response.statusText);
      throw new Error('Failed to add tags to photo');
    }
    const data = await response.json();
    console.log('Updated photo data:', data);
    return data;
  }

  async setPhotoCaption(photoId: string, caption: string): Promise<PhotoMetadata> {
    console.log('Setting photo caption:', photoId, caption);
    const response = await fetch(`/api/photos/${photoId}/caption`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caption }),
    });
    if (!response.ok) {
      console.error('Failed to set photo caption:', response.status, response.statusText);
      throw new Error('Failed to set photo caption');
    }
    const data = await response.json();
    console.log('Updated photo data:', data);
    return data;
  }
} 
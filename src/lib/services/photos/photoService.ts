import { Album, PhotoMetadata, SourceCollection, TreeNode } from '@/lib/types/album';

// Re-exporting types for easy access from components
export { PhotoMetadata, Album, SourceCollection, TreeNode };

export class PhotoService {

  // =================================================================
  // NEW METHODS FOR PHOTOPICKER REFACTOR
  // =================================================================

  /**
   * Fetches the hierarchical folder structure from the backend.
   * This is used to build the navigation tree in the PhotoPicker.
   */
  async getFolderTree(): Promise<TreeNode[]> {
    console.log('Loading folder tree...');
    const response = await fetch('/api/photos/folder-tree');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load folder tree:', response.status, errorText);
      throw new Error(`Failed to load folder tree: ${errorText}`);
    }
    const data = await response.json();
    console.log('Folder tree data:', data);
    return data;
  }

  /**
   * Fetches the contents (photos) of a specific folder.
   * @param folderPath - The identifier for the folder (in this case, its path or ID).
   */
  async getFolderContents(folderPath: string): Promise<PhotoMetadata[]> {
    console.log(`Loading contents for folder: ${folderPath}`);
    const response = await fetch('/api/photos/folder-contents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ folderPath }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load folder contents:', response.status, errorText);
      throw new Error(`Failed to load folder contents for ${folderPath}: ${errorText}`);
    }
    const data = await response.json();
    console.log(`Contents for folder ${folderPath}:`, data);
    return data;
  }

  // =================================================================
  // EXISTING METHODS (PRESERVED)
  // =================================================================

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
  
  async getSourceCollections(): Promise<SourceCollection[]> {
    console.log('Loading all source collections...');
    const response = await fetch('/api/photos/source-collections');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load source collections:', response.status, errorText);
      throw new Error(`Failed to load source collections: ${errorText}`);
    }
    const data = await response.json();
    console.log('All source collections data:', data);
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
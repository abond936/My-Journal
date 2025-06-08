import { PhotoMetadata, TreeNode } from '@/lib/types/photo';
import { SourceCollection } from '@/lib/types/album';

export class PhotoService {
  async getFolderTree(): Promise<TreeNode[]> {
    const response = await fetch('/api/photos/folder-tree');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load folder tree:', response.status, errorText);
      throw new Error(`Failed to load folder tree: ${errorText}`);
    }
    const data = await response.json();
    return data;
  }

  async getFolderContents(folderPath: string): Promise<PhotoMetadata[]> {
    const response = await fetch('/api/photos/folder-contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load folder contents:', response.status, errorText);
      throw new Error(`Failed to load folder contents for ${folderPath}: ${errorText}`);
    }
    const data = await response.json();
    return data;
  }
  
  async getSourceCollections(): Promise<SourceCollection[]> {
    const response = await fetch('/api/photos/source-collections');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load source collections:', response.status, errorText);
      throw new Error(`Failed to load source collections: ${errorText}`);
    }
    const data = await response.json();
    return data;
  }
}
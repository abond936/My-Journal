import { PickerMedia, TreeNode } from '@/lib/types/photo';

/** Legacy OneDrive collections shape (no dedicated types module yet). */
export type SourceCollection = Record<string, unknown>;

export const getFolderTree = async (): Promise<TreeNode[]> => {
  const response = await fetch('/api/images/local/folder-tree');
  if (!response.ok) {
    throw new Error('Failed to fetch folder tree');
  }
  return response.json();
};

export const getFolderContents = async (folderPath: string): Promise<PickerMedia[]> => {
  const response = await fetch('/api/images/local/folder-contents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to load folder contents:', response.status, errorText);
    throw new Error(`Failed to load folder contents for ${folderPath}: ${errorText}`);
  }
  return response.json();
};
  
export const getSourceCollections = async (): Promise<SourceCollection[]> => {
  const response = await fetch('/api/images/onedrive');
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to load source collections:', response.status, errorText);
    throw new Error(`Failed to load source collections: ${errorText}`);
  }
  const data = await response.json();
  return data;
};
import fs from 'fs';
import path from 'path';
import { TreeNode } from '@/lib/types/album';

const ONEDRIVE_ROOT = process.env.ONEDRIVE_ROOT_FOLDER || '';

if (!ONEDRIVE_ROOT || !fs.existsSync(ONEDRIVE_ROOT)) {
  console.error(`Error: The root OneDrive folder was not found.`);
  console.error(`Please set ONEDRIVE_ROOT_FOLDER in your .env.local file to a valid path.`);
}

function buildTree(dirPath: string): TreeNode[] {
  const tree: TreeNode[] = [];
  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        const children = buildTree(fullPath);
        // Only include folders that contain other folders or image files.
        if (children.length > 0 || fs.readdirSync(fullPath).some(f => /\.(jpg|jpeg|png|gif)$/i.test(f))) {
          tree.push({
            id: fullPath,
            name: item,
            children: children.length > 0 ? children : undefined,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Could not read directory: ${dirPath}`, error);
  }
  return tree;
}

export function getFolderTree(): TreeNode[] {
  if (!ONEDRIVE_ROOT || !fs.existsSync(ONEDRIVE_ROOT)) {
    return [];
  }
  return buildTree(ONEDRIVE_ROOT);
}

export function getFolderContents(folderPath: string): { id: string, name: string, path: string, type: 'file' | 'folder' }[] {
  if (!fs.existsSync(folderPath)) {
    console.error(`Directory not found: ${folderPath}`);
    return [];
  }
  
  try {
    const items = fs.readdirSync(folderPath);
    return items.map(item => {
      const fullPath = path.join(folderPath, item);
      const stats = fs.statSync(fullPath);
      return {
        id: fullPath,
        name: item,
        path: fullPath,
        type: stats.isDirectory() ? 'folder' : 'file',
      };
    }).filter(item => item.type === 'file' && /\.(jpg|jpeg|png|gif)$/i.test(item.name));
  } catch (error) {
    console.error(`Could not read directory contents: ${folderPath}`, error);
    return [];
  }
} 
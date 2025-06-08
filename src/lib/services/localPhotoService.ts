import fs from 'fs';
import path from 'path';
import { TreeNode } from '@/lib/types/album';
// 1. Import the new library
import sizeOf from 'image-size';

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

// 2. Update the getFolderContents function

export function getFolderContents(folderPath: string) {
  // Add detailed logging to debug the file discovery process.
  console.log(`[DEBUG] getFolderContents called with path: "${folderPath}"`);
  
  if (!fs.existsSync(folderPath)) {
    console.error(`[DEBUG] Directory not found, path does not exist: "${folderPath}"`);
    return [];
  }
  
  try {
    const items = fs.readdirSync(folderPath);
    console.log(`[DEBUG] Found ${items.length} items in directory:`, items);

    if (items.length === 0) {
      console.log('[DEBUG] Directory is empty. Returning.');
      return [];
    }

    const processedItems = items.map(item => {
      console.log(`\n[DEBUG] Processing item: "${item}"`);
      const fullPath = path.join(folderPath, item);
      console.log(`[DEBUG]   > Full path constructed: "${fullPath}"`);
      
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        console.log(`[DEBUG]   > SKIPPED: Item is a directory.`);
        return null;
      }
      
      const lowercasedItem = item.toLowerCase();
      const isImage = /\.(jpg|jpeg|png|gif)$/.test(lowercasedItem);
      
      if (!isImage) {
        console.log(`[DEBUG]   > SKIPPED: File extension does not match image types.`);
        return null;
      }
      
      console.log(`[DEBUG]   > PASSED: Item is an image file.`);
      
      try {
        const dimensions = sizeOf(fullPath);
        console.log(`[DEBUG]   > SUCCESS: Got dimensions W:${dimensions.width}, H:${dimensions.height}`);
        
        return {
          id: fullPath,
          name: item,
          path: fullPath,
          type: 'file',
          width: dimensions.width,
          height: dimensions.height,
          lastModified: stats.mtime,
          size: stats.size,
          thumbnailUrl: `/api/photos/image?path=${encodeURIComponent(fullPath)}&size=thumbnail`,
          webUrl: `/api/photos/image?path=${encodeURIComponent(fullPath)}`,
        };
      } catch (e) {
        // This block will run if the image-size library fails on a file.
        console.error(`[DEBUG]   > ERROR: The 'image-size' library failed for "${fullPath}"`, e);
        return null;
      }
    });

    const filteredItems = processedItems.filter(item => item !== null);
    console.log(`\n[DEBUG] Finished processing. Returning ${filteredItems.length} items to the client.`);
    return filteredItems;

  } catch (error) {
    // This block will run if reading the directory fails for permission reasons, etc.
    console.error(`[DEBUG] FATAL ERROR: Could not read directory contents for "${folderPath}"`, error);
    return [];
  }
}
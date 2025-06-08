import fs from 'fs';
import path from 'path';
import { TreeNode, PhotoMetadata } from '@/lib/types/photo'; // IMPORT FROM NEW FILE
import sharp from 'sharp'; 

const ONEDRIVE_ROOT = process.env.ONEDRIVE_ROOT_FOLDER || '';

function createWebPath(fullPath: string): string {
  const relativePath = path.relative(ONEDRIVE_ROOT, fullPath);
  return path.join('/images/local', relativePath).replace(/\\/g, '/');
}

export function getFolderTree(): TreeNode[] {
    if (!process.env.ONEDRIVE_ROOT_FOLDER) return [];
    const buildTree = (dir: string): TreeNode[] => {
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const fullPath = path.join(dir, dirent.name);
                const children = buildTree(fullPath);
                const hasImages = (d: string): boolean => {
                    const contents = fs.readdirSync(d, { withFileTypes: true });
                    return contents.some(c => 
                        (c.isDirectory() && hasImages(path.join(d, c.name))) ||
                        (/\.(jpg|jpeg|png|gif)$/i.test(c.name))
                    );
                };
                if (children.length > 0 || hasImages(fullPath)) {
                    return { id: fullPath, name: dirent.name, children };
                }
                return null;
            }).filter((node): node is TreeNode => node !== null);
    };
    return buildTree(process.env.ONEDRIVE_ROOT_FOLDER);
}

export async function getFolderContents(folderPath: string): Promise<PhotoMetadata[]> {
  if (!fs.existsSync(folderPath)) { return []; }
  
  const items = fs.readdirSync(folderPath);
  
  const photoPromises = items.map(async (item): Promise<PhotoMetadata | null> => {
    const fullPath = path.join(folderPath, item);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory() || !/\.(jpg|jpeg|png|gif)$/i.test(item)) { return null; }
      
      const metadata = await sharp(fullPath).metadata();
      const webPath = createWebPath(fullPath);

      return {
        id: webPath,
        filename: item,
        path: webPath,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        lastModified: stats.mtime.toISOString(),
        size: stats.size,
        thumbnailUrl: webPath, 
        previewUrl: webPath,
        webUrl: webPath, 
      };
    } catch (e) {
      console.error(`[SHARP ERROR] Failed to process file "${fullPath}":`, e);
      return null;
    }
  });

  return (await Promise.all(photoPromises)).filter((p): p is PhotoMetadata => p !== null);
}
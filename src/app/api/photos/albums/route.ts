import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { AlbumMapping } from '@/lib/services/onedrive/albumConfig';
import { PhotoMetadata } from '@/lib/services/photos/photoService';
import { getConfig } from '@/lib/services/onedrive/config';

async function countPhotosInDirectory(directoryPath: string): Promise<number> {
    try {
        const entries = await fs.readdir(directoryPath, { withFileTypes: true });
        let count = 0;
        for (const entry of entries) {
            const ext = path.extname(entry.name).toLowerCase();
            if (entry.isFile() && ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic'].includes(ext)) {
                count++;
            }
        }
        return count;
    } catch (error) {
        console.error(`Could not read directory: ${directoryPath}`, error);
        return 0;
    }
}

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'temp', 'navy-config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const albumMappings = JSON.parse(configContent) as AlbumMapping[];
    
    const albums = await Promise.all(
        albumMappings.map(async (mapping) => {
            const fullPath = path.join(getConfig().rootPath, mapping.folderPath);
            const photoCount = await countPhotosInDirectory(fullPath);

            return {
                id: Buffer.from(mapping.folderPath).toString('base64'),
                name: mapping.albumName,
                description: mapping.description,
                path: mapping.folderPath,
                photoCount: photoCount,
                photos: [], // Photos will be loaded on demand when an album is selected
                tags: [],
                isEnabled: mapping.isEnabled
            };
        })
    );

    return NextResponse.json(albums);
  } catch (error) {
    console.error('Error loading albums:', error);
    return NextResponse.json(
      { error: 'Failed to load albums', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
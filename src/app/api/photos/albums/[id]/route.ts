import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/services/onedrive/config';
import { AlbumMapping } from '@/lib/services/onedrive/albumConfig';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const configPath = path.join(process.cwd(), 'temp', 'navy-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    const albumMapping = config.find((mapping: AlbumMapping) => 
      Buffer.from(mapping.folderPath).toString('base64') === params.id
    );

    if (!albumMapping) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    const fullPath = path.join(getConfig().rootPath, albumMapping.folderPath);
    const photos = await scanPhotos(fullPath);
    
    const album = {
      id: params.id,
      name: albumMapping.albumName,
      description: albumMapping.description,
      path: albumMapping.folderPath,
      photoCount: photos.length,
      photos,
      tags: [],
      isEnabled: albumMapping.isEnabled
    };

    return NextResponse.json(album);
  } catch (error) {
    console.error('Error loading album:', error);
    return NextResponse.json(
      { error: 'Failed to load album' },
      { status: 500 }
    );
  }
}

async function scanPhotos(folderPath: string) {
  const photos = [];
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic'].includes(ext)) {
        const fullPath = path.join(folderPath, entry.name);
        const stats = fs.statSync(fullPath);
        
        photos.push({
          id: Buffer.from(fullPath).toString('base64'),
          filename: entry.name,
          path: fullPath,
          albumId: Buffer.from(folderPath).toString('base64'),
          albumName: path.basename(folderPath),
          tags: [],
          size: stats.size,
          lastModified: stats.mtime,
          thumbnailUrl: `/api/photos/thumbnail/${Buffer.from(fullPath).toString('base64')}`,
          previewUrl: `/api/photos/preview/${Buffer.from(fullPath).toString('base64')}`
        });
      }
    } else if (entry.isDirectory()) {
      const subPhotos = await scanPhotos(path.join(folderPath, entry.name));
      photos.push(...subPhotos);
    }
  }

  return photos;
} 
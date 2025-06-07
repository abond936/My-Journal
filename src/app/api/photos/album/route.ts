import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { AlbumMapping } from '@/lib/services/onedrive/albumConfig';
import { getConfig } from '@/lib/services/onedrive/config';

async function scanPhotos(folderPath: string) {
  const photos = [];
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic'].includes(ext)) {
        const fullPath = path.join(folderPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        const photoId = Buffer.from(fullPath).toString('base64');
        photos.push({
          id: photoId,
          filename: entry.name,
          path: fullPath,
          albumId: Buffer.from(folderPath).toString('base64'),
          albumName: path.basename(folderPath),
          tags: [],
          size: stats.size,
          lastModified: stats.mtime,
          thumbnailUrl: `/api/photos/thumbnail/${encodeURIComponent(photoId)}`,
          previewUrl: `/api/photos/preview/${encodeURIComponent(photoId)}`
        });
      }
    }
  }
  return photos;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const albumId = searchParams.get('id');

    if (!albumId) {
        return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
    }

    const configPath = path.join(process.cwd(), 'temp', 'navy-config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const albumMappings = JSON.parse(configContent) as AlbumMapping[];
    
    const albumMapping = albumMappings.find(mapping => 
        Buffer.from(mapping.folderPath).toString('base64') === albumId
    );

    if (!albumMapping) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const fullPath = path.join(getConfig().rootPath, albumMapping.folderPath);
    const photos = await scanPhotos(fullPath);
    
    const album = {
      id: albumId,
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
    return NextResponse.json({ error: 'Failed to load album' }, { status: 500 });
  }
} 
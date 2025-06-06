import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { AlbumMapping } from '@/lib/services/onedrive/albumConfig';
import { PhotoMetadata } from '@/lib/services/photos/photoService';

export async function GET() {
  try {
    console.log('Loading albums...');
    const configPath = path.join(process.cwd(), 'temp', 'navy-config.json');
    console.log('Config path:', configPath);
    
    // Read the config file
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent) as AlbumMapping[];
    console.log('Loaded config:', config);
    
    // For now, return a mock album since we don't have the actual photo data
    const mockAlbum = {
      id: Buffer.from(config[0].folderPath).toString('base64'),
      name: config[0].albumName,
      description: config[0].description,
      path: config[0].folderPath,
      photoCount: 0,
      photos: [],
      tags: [],
      isEnabled: config[0].isEnabled
    };

    console.log('Returning mock album:', mockAlbum);
    return NextResponse.json([mockAlbum]);
  } catch (error) {
    console.error('Error loading albums:', error);
    return NextResponse.json(
      { error: 'Failed to load albums', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
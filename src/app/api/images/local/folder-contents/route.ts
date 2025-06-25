import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import sizeOf from 'image-size';
import { PickerMedia } from '@/lib/types/photo';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];

// Utility functions for consistent path handling
const toSystemPath = (p: string) => p.split('/').join(path.sep);
const toDatabasePath = (p: string) => p.split(path.sep).join('/');

export async function POST(request: NextRequest) {
  if (!ONEDRIVE_ROOT_FOLDER) {
    return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const folderPath = body.folderPath;

    if (!folderPath) {
      return NextResponse.json({ message: 'Folder path is required.' }, { status: 400 });
    }

    // Convert client path (with forward slashes) to system path
    const normalizedFolderPath = toSystemPath(folderPath);
    const fullFolderPath = path.join(ONEDRIVE_ROOT_FOLDER, normalizedFolderPath);
    const entries = await fs.readdir(fullFolderPath, { withFileTypes: true });

    const photos: PickerMedia[] = [];

    for (const entry of entries) {
      const extension = path.extname(entry.name).toLowerCase();
      if (entry.isFile() && SUPPORTED_EXTENSIONS.includes(extension)) {
        const fullPath = path.join(fullFolderPath, entry.name);
        try {
          const relativePath = toDatabasePath(path.relative(ONEDRIVE_ROOT_FOLDER, fullPath));
          const fileBuffer = await fs.readFile(fullPath);
          const stats = await fs.stat(fullPath);
          const dimensions = sizeOf(fileBuffer);

          const photo: PickerMedia = {
            id: relativePath,
            filename: entry.name,
            width: dimensions.width || 0,
            height: dimensions.height || 0,
            sourcePath: relativePath,
            storageUrl: `/api/images/local/file?path=${encodeURIComponent(relativePath)}`,
          };
          photos.push(photo);
        } catch (fileError) {
          console.error(`Skipping problematic file: ${entry.name} in folder ${folderPath}. Error:`, fileError);
          continue;
        }
      }
    }

    photos.sort((a, b) => a.filename.localeCompare(b.filename));
    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error getting folder contents:', error);
    return NextResponse.json({ message: 'Error getting folder contents.' }, { status: 500 });
  }
} 
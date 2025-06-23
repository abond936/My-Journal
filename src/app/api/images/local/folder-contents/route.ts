import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import sizeOf from 'image-size';
import { PhotoMetadata } from '@/lib/types/photo';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];

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

    const fullFolderPath = path.join(ONEDRIVE_ROOT_FOLDER, folderPath);
    const entries = await fs.readdir(fullFolderPath, { withFileTypes: true });

    const photos: PhotoMetadata[] = [];

    for (const entry of entries) {
      const extension = path.extname(entry.name).toLowerCase();
      if (entry.isFile() && SUPPORTED_EXTENSIONS.includes(extension)) {
        const fullPath = path.join(fullFolderPath, entry.name);
        try {
          const relativePath = path.relative(ONEDRIVE_ROOT_FOLDER, fullPath).replace(/\\/g, '/');
          
          const fileBuffer = await fs.readFile(fullPath);
          const stats = await fs.stat(fullPath);
          const dimensions = sizeOf(fileBuffer);

          // This is a temporary object for the picker. It's not a complete, permanent PhotoMetadata object.
          // We provide just enough information for the picker to display it and for the form to import it.
          const photo: any = {
            id: relativePath,
            filename: entry.name,
            width: dimensions.width || 0,
            height: dimensions.height || 0,
            sourcePath: relativePath, // The key piece of info the CardForm needs to start the import
            storageUrl: `/api/images/local/file?path=${encodeURIComponent(relativePath)}`, // For temp display
          };
          photos.push(photo);
        } catch (fileError) {
          console.error(`Skipping problematic file: ${entry.name} in folder ${folderPath}. Error:`, fileError);
          continue; // Skip this file and continue with the next one
        }
      }
    }

    // Sort photos alphabetically by filename
    photos.sort((a, b) => a.filename.localeCompare(b.filename));

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error getting folder contents:', error);
    return NextResponse.json({ message: 'Error getting folder contents.' }, { status: 500 });
  }
} 
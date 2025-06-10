import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

// This is the root directory where your images are stored.
// IMPORTANT: Ensure this environment variable is set in your .env file.
const PHOTOS_ROOT_DIR = process.env.PHOTOS_ROOT_DIR;

export async function GET(request: NextRequest) {
  if (!PHOTOS_ROOT_DIR) {
    console.error('PHOTOS_ROOT_DIR environment variable is not set.');
    return new NextResponse('Server configuration error.', { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const filePathParam = searchParams.get('path');

  if (!filePathParam) {
    return new NextResponse('File path is required.', { status: 400 });
  }

  try {
    // Decode the file path and resolve it against the root directory.
    const decodedPath = decodeURIComponent(filePathParam);
    const safeFilePath = path.join(PHOTOS_ROOT_DIR, decodedPath);

    // Security Check: Ensure the resolved path is still within the root directory.
    // This prevents directory traversal attacks (e.g., trying to access '../../...').
    const resolvedPath = path.resolve(safeFilePath);
    const rootPath = path.resolve(PHOTOS_ROOT_DIR);
    if (!resolvedPath.startsWith(rootPath)) {
        return new NextResponse('Access denied. Invalid file path.', { status: 403 });
    }

    // Read the file from the disk.
    const fileBuffer = await fs.readFile(resolvedPath);

    // Determine the content type from the file extension.
    const contentType = mime.lookup(resolvedPath) || 'application/octet-stream';

    // Return the image file as the response.
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    // If the file doesn't exist (ENOENT), return a 404.
    if (error.code === 'ENOENT') {
      console.error(`File not found: ${filePathParam}`);
      return new NextResponse('File not found.', { status: 404 });
    }
    // For any other errors, return a generic 500.
    console.error(`Error processing file request for ${filePathParam}:`, error);
    return new NextResponse('Internal server error.', { status: 500 });
  }
} 
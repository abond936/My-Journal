import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

// This is the root directory where your images are stored.
// IMPORTANT: Ensure this environment variable is set in your .env.local file.
const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!ONEDRIVE_ROOT_FOLDER) {
    console.error('ONEDRIVE_ROOT_FOLDER environment variable is not set.');
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
    const safeFilePath = path.join(ONEDRIVE_ROOT_FOLDER, decodedPath);

    // Security Check: Ensure the resolved path is still within the root directory.
    // This prevents directory traversal attacks (e.g., trying to access '../../...').
    const resolvedPath = path.resolve(safeFilePath);
    const rootPath = path.resolve(ONEDRIVE_ROOT_FOLDER);
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
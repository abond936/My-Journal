import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { lookup } from 'mime-types';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;

export async function GET(request: NextRequest) {
  if (!ONEDRIVE_ROOT_FOLDER) {
    return new NextResponse('Server configuration error: Root folder not specified.', { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse('File path is required.', { status: 400 });
  }

  try {
    const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, filePath);

    // Basic security check to prevent path traversal
    if (!fullPath.startsWith(ONEDRIVE_ROOT_FOLDER)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const fileBuffer = await fs.readFile(fullPath);
    const contentType = lookup(fullPath) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return new NextResponse('File not found.', { status: 404 });
    }
    console.error('Error serving local file:', error);
    return new NextResponse('Internal server error.', { status: 500 });
  }
} 
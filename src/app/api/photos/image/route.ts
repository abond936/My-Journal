import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse('File path is required', { status: 400 });
  }

  // Basic security check: prevent directory traversal
  const root = process.env.ONEDRIVE_ROOT_FOLDER || '';
  const safeRoot = path.resolve(root);
  const requestedPath = path.resolve(filePath);

  if (!requestedPath.startsWith(safeRoot)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const fileBuffer = fs.readFileSync(requestedPath);
    const mimeType = mime.lookup(requestedPath) || 'application/octet-stream';
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: { 'Content-Type': mimeType },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse('File not found', { status: 404 });
    }
    console.error('Error reading file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 
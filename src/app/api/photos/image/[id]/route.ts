import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/services/onedrive/config';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const relativePath = Buffer.from(params.id, 'base64').toString();
    const fullPath = path.join(getConfig().rootPath, relativePath);

    if (!fs.existsSync(fullPath)) {
      console.error('Photo not found:', fullPath);
      return new NextResponse('Photo not found', { status: 404 });
    }

    // Read the image file
    const imageBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    // Determine content type based on file extension
    let contentType = 'image/jpeg';
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.bmp':
        contentType = 'image/bmp';
        break;
      case '.heic':
        contentType = 'image/heic';
        break;
    }

    // Return the image
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('Error serving photo:', error);
    return new NextResponse('Error serving photo', { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/services/onedrive/config';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

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

    // Process the image with sharp
    const processedImage = await sharp(imageBuffer)
      .resize(300, 300, { // Thumbnail size
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 60 })
      .toBuffer();

    // Return the processed image
    return new NextResponse(processedImage, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('Error serving photo thumbnail:', error);
    return new NextResponse('Error serving photo', { status: 500 });
  }
} 
import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const photoId = params.id;
        const decodedPath = Buffer.from(decodeURIComponent(photoId), 'base64').toString('utf-8');

        // Basic security check to prevent directory traversal
        if (decodedPath.includes('..')) {
            return new NextResponse('Invalid path', { status: 400 });
        }

        const imageBuffer = await fs.readFile(decodedPath);

        // Determine content type from file extension
        const ext = path.extname(decodedPath).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.bmp') contentType = 'image/bmp';
        else if (ext === '.heic') contentType = 'image/heic';


        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });

    } catch (error) {
        console.error(`Failed to serve preview image: ${error}`);
        return new NextResponse('Image not found', { status: 404 });
    }
} 
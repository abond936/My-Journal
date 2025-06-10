import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const app = getAdminApp();
    const storage = getStorage(app);
    const bucket = storage.bucket();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split('.').pop();
    
    // Generate a unique filename using UUID to prevent collisions
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const destination = `uploads/${uniqueFilename}`;

    const fileUpload = bucket.file(destination);

    await fileUpload.save(fileBuffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make the file public and get its URL
    await fileUpload.makePublic();
    const publicUrl = fileUpload.publicUrl();

    // Use sharp to get the dimensions from the buffer
    const metadata = await sharp(fileBuffer).metadata();

    return NextResponse.json({
      url: publicUrl,
      width: metadata.width,
      height: metadata.height,
      name: file.name,
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to upload file: ${errorMessage}` }, { status: 500 });
  }
} 
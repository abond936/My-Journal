import { getAdminApp } from '@/lib/config/firebase/admin';
import { PhotoMetadata } from '@/lib/types/photo';
import * as admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;

/**
 * Imports an image from the local filesystem to Firebase Storage.
 *
 * @param sourcePath - The relative path of the image from the local drive root.
 * @returns A promise that resolves with the photo's metadata after upload.
 */
export async function importFromLocalDrive(sourcePath: string): Promise<PhotoMetadata> {
  console.log(`[importFromLocalDrive] Starting import for sourcePath: ${sourcePath}`);
  
  if (!ONEDRIVE_ROOT_FOLDER) {
    console.error('[importFromLocalDrive] Server configuration error: ONEDRIVE_ROOT_FOLDER is not set.');
    throw new Error('Server configuration error: ONEDRIVE_ROOT_FOLDER is not set.');
  }

  const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, sourcePath);
  console.log(`[importFromLocalDrive] Full path to local file: ${fullPath}`);

  try {
    // 1. Read the file into a buffer
    console.log('[importFromLocalDrive] Reading file into buffer...');
    const fileBuffer = await fs.readFile(fullPath);
    console.log('[importFromLocalDrive] File read success. Analyzing with sharp...');
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();
    console.log('[importFromLocalDrive] Sharp analysis success.');

    // 2. Generate a unique filename
    const uniqueId = uuidv4();
    const originalFilename = path.basename(sourcePath);
    const storageFilename = `${uniqueId}-${originalFilename}`;
    console.log(`[importFromLocalDrive] Generated unique storage filename: ${storageFilename}`);

    // 3. Upload to Firebase Storage
    console.log('[importFromLocalDrive] Initializing Firebase and getting bucket...');
    const app = getAdminApp();
    const bucket = app.storage().bucket();
    const storagePath = `images/${storageFilename}`;
    const file = bucket.file(storagePath);
    console.log(`[importFromLocalDrive] Attempting to save to storage path: ${storagePath}`);

    await file.save(fileBuffer, {
      metadata: {
        contentType: metadata.format ? `image/${metadata.format}` : 'application/octet-stream',
      },
    });
    console.log('[importFromLocalDrive] File saved to storage successfully.');

    // 4. Get the public URL
    console.log('[importFromLocalDrive] Getting signed URL...');
    const [publicUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // A very long expiration date
    });
    console.log(`[importFromLocalDrive] Successfully got signed URL: ${publicUrl}`);

    // 5. Construct and return the PhotoMetadata object
    const photoMetadata: PhotoMetadata = {
      id: uniqueId,
      filename: originalFilename,
      width: metadata.width || 0,
      height: metadata.height || 0,
      storageUrl: publicUrl,
      storagePath: storagePath,
      sourcePath: sourcePath,
    };
    console.log('[importFromLocalDrive] Constructed PhotoMetadata object:', photoMetadata);

    return photoMetadata;
  } catch (error) {
    console.error(`[importFromLocalDrive] CRITICAL ERROR during import for ${fullPath}:`, error);
    // Re-throwing the error is important so the calling API route catches it and sends a 500 response.
    throw error;
  }
}

/**
 * Imports an image from a buffer to Firebase Storage.
 *
 * @param fileBuffer - The buffer containing the image data.
 * @param originalFilename - The original name of the file.
 * @returns A promise that resolves with the photo's metadata after upload.
 */
export async function importFromBuffer(fileBuffer: Buffer, originalFilename: string): Promise<PhotoMetadata> {
  try {
    // 1. Analyze the buffer with sharp
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    // 2. Generate a unique filename
    const uniqueId = uuidv4();
    const storageFilename = `${uniqueId}-${originalFilename}`;

    // 3. Upload to Firebase Storage
    const app = getAdminApp();
    const bucket = app.storage().bucket();
    const storagePath = `images/${storageFilename}`;
    const file = bucket.file(storagePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: metadata.format ? `image/${metadata.format}` : 'application/octet-stream',
      },
    });

    // 4. Get the public URL
    const [publicUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // A very long expiration date
    });

    // 5. Construct and return the PhotoMetadata object
    const photoMetadata: PhotoMetadata = {
      id: uniqueId,
      filename: originalFilename,
      width: metadata.width || 0,
      height: metadata.height || 0,
      storageUrl: publicUrl,
      storagePath: storagePath,
      sourcePath: `upload://${originalFilename}`, // Indicate the source was an upload
    };

    return photoMetadata;
  } catch (error) {
    console.error(`Failed to import image from buffer (${originalFilename}):`, error);
    throw new Error(`Failed to import uploaded image. See server logs for details.`);
  }
} 
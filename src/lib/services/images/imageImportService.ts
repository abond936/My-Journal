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
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('Server configuration error: ONEDRIVE_ROOT_FOLDER is not set.');
  }

  const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, sourcePath);

  try {
    // 1. Read the file into a buffer
    const fileBuffer = await fs.readFile(fullPath);
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    // 2. Generate a unique filename
    const uniqueId = uuidv4();
    const originalFilename = path.basename(sourcePath);
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
      sourcePath: sourcePath,
      status: 'raw',
    };

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
      status: 'raw',
    };

    return photoMetadata;
  } catch (error) {
    console.error(`Failed to import image from buffer (${originalFilename}):`, error);
    throw new Error(`Failed to import uploaded image. See server logs for details.`);
  }
}

/**
 * Deletes an image from Firebase Storage using its public URL.
 * @param imageUrl The full gs:// or https:// URL of the image.
 */
export async function deleteImageByUrl(imageUrl: string): Promise<void> {
    if (!imageUrl) {
        throw new Error('Image URL must be provided for deletion.');
    }

    try {
        const app = getAdminApp();
        const bucket = app.storage().bucket();
        let filePath: string;

        if (imageUrl.startsWith('gs://')) {
            const url = new URL(imageUrl);
            if (url.hostname !== bucket.name) {
                throw new Error(`URL does not belong to the configured bucket.`);
            }
            filePath = url.pathname.substring(1); 
        } else if (imageUrl.startsWith('https://storage.googleapis.com/')) {
            const url = new URL(imageUrl);
            const pathParts = url.pathname.split('/');
            if (pathParts[1] !== bucket.name) {
                 throw new Error(`URL does not belong to the configured bucket.`);
            }
            filePath = pathParts.slice(2).join('/');
        } else {
            throw new Error('Unsupported image URL format for deletion.');
        }

        if (!filePath) {
            throw new Error('Could not determine file path from URL.');
        }

        const file = bucket.file(filePath);
        const [exists] = await file.exists();

        if (exists) {
            await file.delete();
            console.log(`Successfully deleted ${filePath} from storage.`);
        } else {
            console.warn(`File not found, skipping deletion: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error deleting image from URL "${imageUrl}":`, error);
        throw new Error(`Failed to delete image. Reason: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
} 
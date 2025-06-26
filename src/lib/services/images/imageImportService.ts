import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';
import * as admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import sizeOf from 'image-size';
import { uploadFile } from '@/lib/config/firebase/admin';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;

// Utility functions for consistent path handling
const toSystemPath = (p: string) => p.split('/').join(path.sep);
const toDatabasePath = (p: string) => p.split(path.sep).join('/');

/**
 * Creates a new media asset in the system. This is the central function for all image imports.
 * It handles file processing, uploading to Storage, and creating the canonical document in Firestore.
 *
 * @param fileBuffer - The buffer containing the image data.
 * @param originalFilename - The original name of the file.
 * @param source - The source of the image (e.g., 'local-drive', 'upload').
 * @param sourcePath - The original path or identifier from the source.
 * @returns A promise that resolves with the new Media object.
 */
async function createMediaAsset(
  fileBuffer: Buffer, 
  originalFilename: string, 
  source: Media['source'], 
  sourcePath: string,
  status: Media['status'] = 'temporary'
): Promise<Media> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();

  // 1. Analyze the image and generate a unique ID
  const image = sharp(fileBuffer);
  const metadata = await image.metadata();
  const mediaId = uuidv4();
  const storageFilename = `${mediaId}-${originalFilename}`;

  // 2. Upload to Firebase Storage
  const storagePath = `images/${storageFilename}`;
  const file = bucket.file(storagePath);
  await file.save(fileBuffer, {
    metadata: {
      contentType: metadata.format ? `image/${metadata.format}` : 'application/octet-stream',
    },
  });

  // 3. Get the permanent public URL
  const [publicUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '03-09-2491', // A very long expiration date
  });

  // 4. Construct the canonical Media object
  const now = Date.now();
  const newMedia: Media = {
    id: mediaId,
    filename: originalFilename,
    width: metadata.width || 0,
    height: metadata.height || 0,
    storageUrl: publicUrl,
    storagePath,
    source,
    sourcePath,
    status,
    createdAt: now,
    updatedAt: now,
  };

  // 5. Save the document to the top-level 'media' collection in Firestore
  await firestore.collection('media').doc(mediaId).set(newMedia);

  return newMedia;
}

/**
 * Imports an image from the local filesystem. Reads the file and passes it to the central creator function.
 *
 * @param sourcePath - The relative path of the image from the local drive root.
 * @returns A promise that resolves with the new Media object.
 */
export async function importFromLocalDrive(sourcePath: string): Promise<Media> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  try {
    // Convert database path (with forward slashes) to system path
    const normalizedSourcePath = toSystemPath(sourcePath);
    const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, normalizedSourcePath);
    
    // Read and process the file
    const fileBuffer = await fs.readFile(fullPath);
    const filename = path.basename(fullPath);

    // Create as temporary by default
    return await createMediaAsset(fileBuffer, filename, 'local-drive', sourcePath, 'temporary');
  } catch (error) {
    console.error('[importFromLocalDrive] Error importing file:', {
      sourcePath,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    throw error;
  }
}

/**
 * Imports an image from a buffer (e.g., from an upload or paste).
 *
 * @param fileBuffer - The buffer containing the image data.
 * @param originalFilename - The original name of the file.
 * @returns A promise that resolves with the new Media object.
 */
export async function importFromBuffer(
  fileBuffer: Buffer, 
  originalFilename: string
): Promise<Media> {
  try {
    // For uploads/pastes, the sourcePath is just a representation of where it came from.
    const sourcePath = `upload://${originalFilename}`;
    return await createMediaAsset(fileBuffer, originalFilename, 'upload', sourcePath, 'temporary');
  } catch (error) {
    console.error(`Failed to import image from buffer (${originalFilename}):`, error);
    throw new Error(`Failed to import uploaded image. See server logs for details.`);
  }
}

/**
 * Updates the status of a media asset in Firestore.
 *
 * @param mediaId - The ID of the media asset to update.
 * @param status - The new status to set.
 */
export async function updateMediaStatus(mediaId: string, status: Media['status']): Promise<void> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const mediaRef = firestore.collection('media').doc(mediaId);

  try {
    const doc = await mediaRef.get();
    if (!doc.exists) {
      throw new Error(`Media document with ID ${mediaId} not found.`);
    }

    await mediaRef.update({
      status: status,
      updatedAt: Date.now(),
    });
    console.log(`[updateMediaStatus] Successfully updated status for media ID ${mediaId} to "${status}".`);
  } catch (error) {
    console.error(`[updateMediaStatus] CRITICAL ERROR during status update for media ID ${mediaId}:`, error);
    throw new Error(`Failed to update status for media asset ${mediaId}. See server logs for details.`);
  }
}

/**
 * Deletes a media asset from both Firestore and Firebase Storage.
 *
 * @param mediaId - The ID of the media asset to delete.
 */
export async function deleteMediaAsset(mediaId: string): Promise<void> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();
  const mediaRef = firestore.collection('media').doc(mediaId);

  try {
    // 1. Get the media document to find the storage path
    const doc = await mediaRef.get();
    if (!doc.exists) {
      console.warn(`[deleteMediaAsset] Media document with ID ${mediaId} not found. Skipping deletion.`);
      return;
    }
    const mediaData = doc.data() as Media;
    const storagePath = mediaData.storagePath;

    // 2. Delete the file from Firebase Storage
    if (storagePath) {
      try {
        await bucket.file(storagePath).delete();
        console.log(`[deleteMediaAsset] Successfully deleted file ${storagePath} from Storage.`);
      } catch (storageError: any) {
        // If the file doesn't exist, GCS throws code 404. We can ignore this.
        if (storageError.code === 404) {
          console.warn(`[deleteMediaAsset] File ${storagePath} not found in Storage. It might have been deleted already.`);
        } else {
          // For other errors, we should log them but still proceed to delete the Firestore doc.
          console.error(`[deleteMediaAsset] Error deleting file ${storagePath} from Storage:`, storageError);
        }
      }
    }

    // 3. Delete the Firestore document
    await mediaRef.delete();
    console.log(`[deleteMediaAsset] Successfully deleted media document with ID ${mediaId}.`);

  } catch (error) {
    console.error(`[deleteMediaAsset] CRITICAL ERROR during deletion for media ID ${mediaId}:`, error);
    throw new Error(`Failed to delete media asset ${mediaId}. See server logs for details.`);
  }
} 
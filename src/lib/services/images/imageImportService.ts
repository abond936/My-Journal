import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';
import * as admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import sizeOf from 'image-size';
import { uploadFile } from '@/lib/config/firebase/admin';
import { FirebaseFirestore } from 'firebase-admin';

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

  // 1. Analyze the image and get dimensions
  const image = sharp(fileBuffer);
  const metadata = await image.metadata();

  // Always derive reliable dimensions using image-size
  let { width, height } = metadata as { width?: number; height?: number };
  if (!width || !height) {
    const dims = sizeOf(fileBuffer);
    width = dims.width;
    height = dims.height;
  }

  if (!width || !height) {
    throw new Error('Could not determine image dimensions.');
  }

  // 2. Create Firestore document reference to get docId
  const mediaRef = firestore.collection('media').doc();
  const docId = mediaRef.id;
  const storageFilename = `${docId}-${originalFilename}`;

  // 3. Upload to Firebase Storage
  const storagePath = `images/${storageFilename}`;
  const file = bucket.file(storagePath);
  await file.save(fileBuffer, {
    metadata: {
      contentType: metadata.format ? `image/${metadata.format}` : 'application/octet-stream',
    },
  });

  // 4. Get the permanent public URL
  const [publicUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '03-09-2491', // A very long expiration date
  });

  // 5. Construct the canonical Media object
  const now = Date.now();
  const newMedia: Media = {
    docId: docId,
    filename: originalFilename,
    width,
    height,
    size: fileBuffer.length, // File size in bytes
    contentType: metadata.format ? `image/${metadata.format}` : 'application/octet-stream',
    storageUrl: publicUrl,
    storagePath,
    source,
    sourcePath,
    status,
    objectPosition: '50% 50%',
    caption: '', 
    createdAt: now,
    updatedAt: now,
  };

  // 6. Save the document to the top-level 'media' collection in Firestore
  await mediaRef.set(newMedia);

  return newMedia;
}

/**
 * Imports an image from the local filesystem. Reads the file and passes it to the central creator function.
 *
 * @param sourcePath - The relative path of the image from the local drive root.
 * @returns A promise that resolves with the new Media object, structured for client-side use.
 */
export async function importFromLocalDrive(sourcePath: string): Promise<{ mediaId: string; media: Media }> {
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

    // Create the raw media asset
    const newMedia = await createMediaAsset(fileBuffer, filename, 'local', sourcePath, 'temporary');
    
    // Return the hydrated object that the client expects
    return {
      mediaId: newMedia.docId,
      media: newMedia,
    };
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
 * @returns A promise that resolves with the new Media object, structured for client-side use.
 */
export async function importFromBuffer(
  fileBuffer: Buffer, 
  originalFilename: string
): Promise<{ mediaId: string; media: Media }> {
  try {
    // For uploads/pastes, the sourcePath is just a representation of where it came from.
    const sourcePath = `upload://${originalFilename}`;
    const newMedia = await createMediaAsset(fileBuffer, originalFilename, 'paste', sourcePath, 'temporary');

    // Return the hydrated object that the client expects
    return {
      mediaId: newMedia.docId,
      media: newMedia,
    };
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

// Add retry mechanism
async function deleteFromStorageWithRetry(storagePath: string, maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const bucket = admin.storage().bucket();
      await bucket.file(storagePath).delete();
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Failed to delete storage ${storagePath} after ${maxRetries} attempts:`, error);
        return false;
      }
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Mark storage file for later deletion
async function markStorageForLaterDeletion(storagePath: string): Promise<void> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  
  try {
    await file.setMetadata({
      metadata: {
        markedForDeletion: 'true',
        markedAt: Date.now().toString()
      }
    });
  } catch (error) {
    console.error(`Failed to mark storage file ${storagePath}:`, error);
  }
}

/**
 * Deletes a media asset from both Firestore and Firebase Storage.
 *
 * @param mediaId - The ID of the media asset to delete.
 * @param transaction - Optional Firestore transaction for atomic operations.
 */
export async function deleteMediaAsset(
  mediaId: string, 
  transaction?: FirebaseFirestore.Transaction
): Promise<void> {
  const app = getAdminApp();
  const firestore = app.firestore();
  
  if (transaction) {
    // Transaction mode: Only delete Firestore document
    const mediaRef = firestore.collection('media').doc(mediaId);
    transaction.delete(mediaRef);
  } else {
    // Standalone mode: Try immediate deletion, fallback to marking
    const mediaRef = firestore.collection('media').doc(mediaId);

    try {
      const doc = await mediaRef.get();
      if (!doc.exists) {
        console.warn(`[deleteMediaAsset] Media document with ID ${mediaId} not found. Skipping deletion.`);
        return;
      }
      
      const mediaData = doc.data() as Media;
      const storagePath = mediaData.storagePath;

      if (storagePath) {
        const success = await deleteFromStorageWithRetry(storagePath);
        if (!success) {
          await markStorageForLaterDeletion(storagePath);
        }
      }

      await mediaRef.delete();
      console.log(`[deleteMediaAsset] Successfully deleted media document with ID ${mediaId}.`);

    } catch (error) {
      console.error(`[deleteMediaAsset] CRITICAL ERROR during deletion for media ID ${mediaId}:`, error);
      throw new Error(`Failed to delete media asset ${mediaId}. See server logs for details.`);
    }
  }
}
import { getAdminApp } from '@/lib/config/firebase/admin';
import { calculateDerivedTagData, updateTagCountsForMedia } from '@/lib/firebase/tagService';
import { Media } from '@/lib/types/photo';
import {
  removeMediaFromTypesense,
  syncMediaToTypesense,
  syncMediaToTypesenseById,
} from '@/lib/services/typesenseMediaService';
import { getPublicStorageUrl } from '@/lib/utils/storageUrl';
import { normalizeBufferToWebp } from '@/lib/services/images/inMemoryWebpNormalize';
import * as admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import sizeOf from 'image-size';
import type { Transaction } from 'firebase-admin/firestore';

const ONEDRIVE_ROOT_FOLDER = process.env.ONEDRIVE_ROOT_FOLDER;

// Utility functions for consistent path handling
const toSystemPath = (p: string) => p.split('/').join(path.sep);
const toDatabasePath = (p: string) => p.split(path.sep).join('/');

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];

/**
 * Finds an existing media document by sourcePath (for duplicate detection).
 * @param sourcePath - The relative path used when importing (database format, forward slashes)
 * @returns The existing Media doc if found, null otherwise
 */
export async function findMediaBySourcePath(sourcePath: string): Promise<Media | null> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const snapshot = await firestore
    .collection('media')
    .where('sourcePath', '==', sourcePath)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { ...doc.data(), docId: doc.id } as Media;
}

/**
 * Reads caption from metadata, if available.
 * 1. Looks for sidecar .json (normalize-images or extract-metadata output)
 * 2. Otherwise attempts to read from embedded EXIF/IPTC via Sharp
 * @param fullPath - Absolute path to the image file
 * @returns Caption string or empty string if none found
 */
export async function readMetadataCaption(fullPath: string): Promise<string> {
  try {
    // 1. Check for sidecar JSON (same base name, .json extension)
    const ext = path.extname(fullPath);
    const basePath = fullPath.slice(0, -ext.length);
    const jsonPath = `${basePath}.json`;

    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const data = JSON.parse(jsonContent) as Record<string, unknown>;

      // normalize-images: flat { description, title, subject, comments }
      // extract-image-metadata: { extracted: { Title, Subject, Comments } }
      const extracted = data.extracted as Record<string, unknown> | undefined;
      const flat = data as Record<string, unknown>;

      const candidates = [
        flat.description,
        flat.title,
        flat.subject,
        flat.comments,
        extracted?.Title,
        extracted?.Subject,
        extracted?.Comments,
      ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

      if (candidates.length > 0) {
        return candidates[0].trim();
      }
    } catch {
      // No JSON or invalid - continue to embedded metadata
    }

    // 2. Try embedded metadata via Sharp
    const fileBuffer = await fs.readFile(fullPath);
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    if (metadata.exif) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ExifReader = require('exif-reader');
        const exif = ExifReader(metadata.exif);
        const desc = exif?.ImageDescription?.description || exif?.Exif?.UserComment?.description;
        if (typeof desc === 'string' && desc.trim()) return desc.trim();
      } catch {
        // exif-reader parse failed
      }
    }

    return '';
  } catch {
    return '';
  }
}

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
  status: Media['status'] = 'temporary',
  captionOverride?: string
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

  // 4. Build permanent public URL (no expiration; requires Storage rules for public read)
  const storageUrl = getPublicStorageUrl(storagePath);

  // 5. Construct the canonical Media object
  const now = Date.now();
  const newMedia: Media = {
    docId: docId,
    filename: originalFilename,
    width,
    height,
    size: fileBuffer.length, // File size in bytes
    contentType: metadata.format ? `image/${metadata.format}` : 'application/octet-stream',
    storageUrl,
    storagePath,
    source,
    sourcePath,
    status,
    objectPosition: '50% 50%',
    caption: captionOverride ?? '', 
    createdAt: now,
    updatedAt: now,
    hasTags: false,
    hasWho: false,
    hasWhat: false,
    hasWhen: false,
    hasWhere: false,
  };

  // 6. Save the document to the top-level 'media' collection in Firestore
  await mediaRef.set(newMedia);

  void syncMediaToTypesense(newMedia);

  return newMedia;
}

export interface ImportFromLocalOptions {
  /** If true, reads caption from sidecar .json or embedded metadata */
  readMetadata?: boolean;
  /** If true, skip import when a media doc with same sourcePath already exists; return existing */
  skipIfExists?: boolean;
  /**
   * If true, WebP-optimize in memory (rotate, resize cap, quality) then upload—no xNormalized folder on disk.
   * Used for folder import workflows; `sourcePath` still points at the original file for dedup.
   */
  normalizeInMemory?: boolean;
}

export interface ImportFromLocalResult {
  mediaId: string;
  media: Media;
  /** True when an existing media doc was returned (duplicate skipped) */
  skipped?: boolean;
}

/**
 * Imports an image from the local filesystem. Reads the file and passes it to the central creator function.
 *
 * @param sourcePath - The relative path of the image from the local drive root.
 * @param options - Optional: readMetadata, skipIfExists (skip duplicate by sourcePath)
 * @returns A promise that resolves with the new or existing Media object.
 */
export async function importFromLocalDrive(
  sourcePath: string,
  options?: ImportFromLocalOptions
): Promise<ImportFromLocalResult> {
  if (!ONEDRIVE_ROOT_FOLDER) {
    throw new Error('ONEDRIVE_ROOT_FOLDER environment variable not set');
  }

  try {
    if (options?.skipIfExists) {
      const existing = await findMediaBySourcePath(sourcePath);
      if (existing) {
        return {
          mediaId: existing.docId,
          media: existing,
          skipped: true,
        };
      }
    }

    // Convert database path (with forward slashes) to system path
    const normalizedSourcePath = toSystemPath(sourcePath);
    const fullPath = path.join(ONEDRIVE_ROOT_FOLDER, normalizedSourcePath);

    // Read and process the file
    let fileBuffer = await fs.readFile(fullPath);
    let filename = path.basename(fullPath);

    let caption: string | undefined;
    if (options?.readMetadata) {
      caption = await readMetadataCaption(fullPath);
    }

    if (options?.normalizeInMemory) {
      const { webpBuffer } = await normalizeBufferToWebp(fileBuffer);
      fileBuffer = webpBuffer;
      filename = `${path.parse(filename).name}.webp`;
    }

    // Create the raw media asset
    const newMedia = await createMediaAsset(
      fileBuffer,
      filename,
      'local',
      sourcePath,
      'temporary',
      caption || undefined
    );

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
    void syncMediaToTypesenseById(mediaId);
    console.log(`[updateMediaStatus] Successfully updated status for media ID ${mediaId} to "${status}".`);
  } catch (error) {
    console.error(`[updateMediaStatus] CRITICAL ERROR during status update for media ID ${mediaId}:`, error);
    throw new Error(`Failed to update status for media asset ${mediaId}. See server logs for details.`);
  }
}

type MediaPatchFields = Partial<Pick<Media, 'status' | 'caption' | 'objectPosition' | 'tags'>>;

async function applyTagFieldsToPayload(
  payload: Record<string, unknown>,
  tagIds: string[]
): Promise<void> {
  const raw = tagIds.filter((id): id is string => typeof id === 'string');
  const { filterTags, dimensionalTags } = await calculateDerivedTagData(raw);
  payload.tags = raw;
  payload.filterTags = filterTags;
  payload.who = dimensionalTags.who ?? [];
  payload.what = dimensionalTags.what ?? [];
  payload.when = dimensionalTags.when ?? [];
  payload.where = dimensionalTags.where ?? [];
  payload.hasTags = raw.length > 0;
  payload.hasWho = (dimensionalTags.who ?? []).length > 0;
  payload.hasWhat = (dimensionalTags.what ?? []).length > 0;
  payload.hasWhen = (dimensionalTags.when ?? []).length > 0;
  payload.hasWhere = (dimensionalTags.where ?? []).length > 0;
}

/**
 * Partial update for media metadata (admin). At least one supported field must be provided.
 */
export async function patchMediaDocument(mediaId: string, updates: MediaPatchFields): Promise<void> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const mediaRef = firestore.collection('media').doc(mediaId);

  const doc = await mediaRef.get();
  if (!doc.exists) {
    throw new Error(`Media document with ID ${mediaId} not found.`);
  }

  const hasField =
    updates.status !== undefined ||
    updates.caption !== undefined ||
    updates.objectPosition !== undefined ||
    updates.tags !== undefined;
  if (!hasField) {
    throw new Error('No valid fields to update.');
  }

  if (updates.tags !== undefined) {
    if (!Array.isArray(updates.tags)) {
      throw new Error('tags must be an array of tag IDs.');
    }
    const newTags = updates.tags.filter((id): id is string => typeof id === 'string');

    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(mediaRef);
      if (!snap.exists) {
        throw new Error(`Media document with ID ${mediaId} not found.`);
      }
      const oldTags = (snap.data() as Media).tags || [];
      await updateTagCountsForMedia(oldTags, newTags, tx);

      const payload: Record<string, unknown> = { updatedAt: Date.now() };
      if (updates.status !== undefined) {
        payload.status = updates.status;
      }
      if (updates.caption !== undefined) {
        payload.caption = updates.caption;
      }
      if (updates.objectPosition !== undefined) {
        const trimmed = updates.objectPosition.trim();
        if (!trimmed) {
          throw new Error('objectPosition cannot be empty.');
        }
        payload.objectPosition = trimmed;
      }
      await applyTagFieldsToPayload(payload, newTags);
      tx.update(mediaRef, payload);
    });
    void syncMediaToTypesenseById(mediaId);
    return;
  }

  const payload: Record<string, unknown> = { updatedAt: Date.now() };

  if (updates.status !== undefined) {
    payload.status = updates.status;
  }
  if (updates.caption !== undefined) {
    payload.caption = updates.caption;
  }
  if (updates.objectPosition !== undefined) {
    const trimmed = updates.objectPosition.trim();
    if (!trimmed) {
      throw new Error('objectPosition cannot be empty.');
    }
    payload.objectPosition = trimmed;
  }

  await mediaRef.update(payload);
  void syncMediaToTypesenseById(mediaId);
}

/**
 * Replaces the binary content of an existing media asset in place.
 * Keeps media doc ID and references stable while refreshing metadata fields.
 */
export async function replaceMediaAssetContent(
  mediaId: string,
  fileBuffer: Buffer,
  originalFilename: string
): Promise<void> {
  const app = getAdminApp();
  const firestore = app.firestore();
  const bucket = app.storage().bucket();
  const mediaRef = firestore.collection('media').doc(mediaId);

  const mediaSnap = await mediaRef.get();
  if (!mediaSnap.exists) {
    throw new Error(`Media document with ID ${mediaId} not found.`);
  }

  const existing = mediaSnap.data() as Media;
  if (!existing.storagePath) {
    throw new Error(`Media document with ID ${mediaId} has no storagePath.`);
  }

  const image = sharp(fileBuffer);
  const metadata = await image.metadata();
  let { width, height } = metadata as { width?: number; height?: number };
  if (!width || !height) {
    const dims = sizeOf(fileBuffer);
    width = dims.width;
    height = dims.height;
  }
  if (!width || !height) {
    throw new Error('Could not determine replacement image dimensions.');
  }

  const contentType = metadata.format ? `image/${metadata.format}` : 'application/octet-stream';
  const storageFile = bucket.file(existing.storagePath);
  await storageFile.save(fileBuffer, {
    metadata: { contentType },
  });

  await mediaRef.update({
    filename: originalFilename || existing.filename,
    width,
    height,
    size: fileBuffer.length,
    contentType,
    updatedAt: Date.now(),
  });
  void syncMediaToTypesenseById(mediaId);
}

// Add retry mechanism (exported for post-transaction storage cleanup, e.g. deleteCard)
export async function deleteFromStorageWithRetry(storagePath: string, maxRetries = 3): Promise<boolean> {
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
export async function markStorageForLaterDeletion(storagePath: string): Promise<void> {
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
  transaction?: Transaction
): Promise<void> {
  const app = getAdminApp();
  const firestore = app.firestore();
  
  const mediaRef = firestore.collection('media').doc(mediaId);

  if (transaction) {
    const snap = await transaction.get(mediaRef);
    if (snap.exists) {
      const tags = (snap.data() as Media).tags || [];
      if (tags.length > 0) {
        await updateTagCountsForMedia(tags, [], transaction);
      }
    }
    transaction.delete(mediaRef);
  } else {
    try {
      const doc = await mediaRef.get();
      if (!doc.exists) {
        console.warn(`[deleteMediaAsset] Media document with ID ${mediaId} not found. Skipping deletion.`);
        return;
      }

      const mediaData = doc.data() as Media;
      const storagePath = mediaData.storagePath;

      await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(mediaRef);
        if (!snap.exists) return;
        const tags = (snap.data() as Media).tags || [];
        if (tags.length > 0) {
          await updateTagCountsForMedia(tags, [], tx);
        }
        tx.delete(mediaRef);
      });

      if (storagePath) {
        const success = await deleteFromStorageWithRetry(storagePath);
        if (!success) {
          await markStorageForLaterDeletion(storagePath);
        }
      }

      void removeMediaFromTypesense(mediaId);
      console.log(`[deleteMediaAsset] Successfully deleted media document with ID ${mediaId}.`);
    } catch (error) {
      console.error(`[deleteMediaAsset] CRITICAL ERROR during deletion for media ID ${mediaId}:`, error);
      throw new Error(`Failed to delete media asset ${mediaId}. See server logs for details.`);
    }
  }
}
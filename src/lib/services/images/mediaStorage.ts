/**
 * Storage-only helpers extracted from `imageImportService.ts` to keep card/media
 * read paths off of the ExifTool import graph (`embeddedMetadataForImport.ts` →
 * `exiftool-vendored`). Read routes (`/api/cards/*`, `/api/media`) reach these
 * via `cardService` for delete orchestration; import routes still use
 * `imageImportService.ts` (which re-exports these names).
 */
import * as admin from 'firebase-admin';
import type { Transaction } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';
import { updateTagCountsForMedia } from '@/lib/firebase/tagService';
import { removeMediaFromTypesense } from '@/lib/services/typesenseMediaService';

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

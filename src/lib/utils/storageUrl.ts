/**
 * Firebase Storage public URL utilities.
 * Use when the storage bucket/path is configured for public read access.
 * Permanent URLs—no expiration, no refresh overhead.
 *
 * Requires Firebase Storage rules to allow read for the images path.
 */

import { getAdminApp } from '@/lib/config/firebase/admin';

type StorageUrlLike = {
  storagePath?: string;
  storageUrl?: string;
};

type MediaWithRenditions = StorageUrlLike & {
  renditions?: {
    studio?: StorageUrlLike & Record<string, unknown>;
    reader?: StorageUrlLike & Record<string, unknown>;
  };
};

/**
 * Builds the permanent public URL for a file in Firebase Storage.
 * Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
 *
 * @param storagePath - Path within the bucket (e.g. 'images/abc123-photo.jpg')
 * @param bucketName - Optional. Defaults to the app's storage bucket.
 */
export function getPublicStorageUrl(storagePath: string, bucketName?: string): string {
  if (!storagePath || !storagePath.trim()) {
    return '';
  }
  const bucket = bucketName ?? getAdminApp().storage().bucket().name;
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}

export function applyPublicStorageUrl<T extends StorageUrlLike>(item: T): T {
  if (!item.storagePath) return item;
  return {
    ...item,
    storageUrl: getPublicStorageUrl(item.storagePath),
  };
}

export function applyPublicStorageUrlsToMedia<T extends MediaWithRenditions>(item: T): T {
  const withOriginal = applyPublicStorageUrl(item);
  const studio = withOriginal.renditions?.studio;
  const reader = withOriginal.renditions?.reader;
  if (!studio && !reader) return withOriginal;
  return {
    ...withOriginal,
    renditions: {
      ...withOriginal.renditions,
      ...(studio ? { studio: applyPublicStorageUrl(studio) } : {}),
      ...(reader ? { reader: applyPublicStorageUrl(reader) } : {}),
    },
  };
}

/**
 * Sets storageUrl on each media object using the public URL format (derived from storagePath).
 * Use instead of signed URL refresh when the bucket is configured for public read.
 */
export function applyPublicStorageUrls<T extends { storagePath?: string; storageUrl?: string }>(
  items: T[]
): T[] {
  return items.map((item) => applyPublicStorageUrlsToMedia(item as T & MediaWithRenditions) as T);
}

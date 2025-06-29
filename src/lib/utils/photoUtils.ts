import { PhotoMetadata } from '@/lib/types/photo';

/**
 * Generates the correct display URL for a photo based on its metadata.
 * This centralizes the logic for handling different photo sources in the future.
 * @param photo - An object containing photo metadata, must have a `storageUrl`.
 * @returns A string representing the web-accessible URL for the image.
 */
export function getDisplayUrl(photo: { storageUrl?: string | null; url?: string | null } | null | undefined): string {
  // Prefer the canonical storage URL when it exists.
  if (photo?.storageUrl) return photo.storageUrl;

  // Fallback: local-drive or legacy objects may expose `url` instead.
  if (photo?.url) return photo.url;

  // Transparent pixel placeholder to avoid broken-image icons.
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
} 
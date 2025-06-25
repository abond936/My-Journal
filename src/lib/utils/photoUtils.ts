import { PhotoMetadata } from '@/lib/types/photo';

/**
 * Generates the correct display URL for a photo based on its metadata.
 * This centralizes the logic for handling different photo sources in the future.
 * @param photo - An object containing photo metadata, must have a `storageUrl`.
 * @returns A string representing the web-accessible URL for the image.
 */
export function getDisplayUrl(photo: { storageUrl?: string | null } | null | undefined): string {
  // After the import process, the photo object contains the direct public URL.
  if (photo?.storageUrl) {
    return photo.storageUrl;
  }
  
  // Return a placeholder or a transparent pixel if the URL is missing, to avoid broken image icons.
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
} 
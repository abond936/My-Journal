import { PhotoMetadata } from '@/lib/types/photo';

/**
 * Generates the correct display URL for a photo based on its metadata.
 * This centralizes the logic for handling different photo sources in the future.
 * @param photo - The photo metadata object.
 * @returns A string representing the web-accessible URL for the image.
 */
export function getDisplayUrl(photo: PhotoMetadata): string {
  // Currently, the only photo source is the local file system.
  // The 'path' property contains the necessary information to construct a URL
  // that hits our internal API route for serving local images.
  if (!photo || !photo.path) {
    // Return a placeholder or a transparent pixel to avoid broken image icons
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
  return `/api/images/local/file?path=${encodeURIComponent(photo.path)}`;
} 
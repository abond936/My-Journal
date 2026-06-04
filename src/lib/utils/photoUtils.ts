type PhotoLike = {
  storageUrl?: string | null;
  url?: string | null;
  renditions?: {
    studio?: {
      storageUrl?: string | null;
    } | null;
  } | null;
};

function transparentPixel(): string {
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}

/**
 * Generates the correct display URL for a photo based on its metadata.
 * This centralizes the logic for handling different photo sources in the future.
 * @param photo - An object containing photo metadata, must have a `storageUrl`.
 * @returns A string representing the web-accessible URL for the image.
 */
export function getDisplayUrl(photo: PhotoLike | null | undefined): string {
  // Prefer the canonical storage URL when it exists.
  if (photo?.storageUrl) return photo.storageUrl;

  // Fallback: local-drive or legacy objects may expose `url` instead.
  if (photo?.url) return photo.url;

  // Transparent pixel placeholder to avoid broken-image icons.
  return transparentPixel();
}

export function getStudioDisplayUrl(photo: PhotoLike | null | undefined): string {
  const studioUrl = photo?.renditions?.studio?.storageUrl;
  if (studioUrl) return studioUrl;
  return getDisplayUrl(photo);
}

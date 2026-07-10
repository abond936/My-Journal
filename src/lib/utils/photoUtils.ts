type PhotoLike = {
  storageUrl?: string | null;
  url?: string | null;
  renditions?: {
    studio?: {
      storageUrl?: string | null;
    } | null;
    reader?: {
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

function getStudioRenditionUrl(photo: PhotoLike | null | undefined): string | null {
  const studioUrl = photo?.renditions?.studio?.storageUrl;
  return studioUrl?.trim() ? studioUrl : null;
}

function getReaderRenditionUrl(photo: PhotoLike | null | undefined): string | null {
  const readerUrl = photo?.renditions?.reader?.storageUrl;
  return readerUrl?.trim() ? readerUrl : null;
}

/** Admin/Studio surfaces: prefer the optional studio WebP rendition, else original. */
export function getStudioDisplayUrl(photo: PhotoLike | null | undefined): string {
  return getStudioRenditionUrl(photo) ?? getDisplayUrl(photo);
}

/**
 * Reader feed/detail tiles: prefer the dedicated reader WebP rendition (640px max),
 * then the studio rendition, else the original. Lightbox/zoom surfaces should keep using `getDisplayUrl`.
 */
export function getReaderDisplayUrl(photo: PhotoLike | null | undefined): string {
  return getReaderRenditionUrl(photo) ?? getStudioRenditionUrl(photo) ?? getDisplayUrl(photo);
}

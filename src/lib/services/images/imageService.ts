import { Media } from '@/lib/types/photo';

/**
 * Uploads a file from the user's browser (e.g., via drag/drop or file input).
 * @param file The file object to upload.
 * @returns A promise that resolves with the newly created Media object.
 */
export async function uploadBrowserFile(file: File): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/images/browser', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred during upload.' }));
    throw new Error(errorData.error || 'Failed to upload file.');
  }

  return response.json();
}

/**
 * Imports a file that already exists on the server's local file system.
 * @param sourcePath The relative path of the file on the server.
 * @returns A promise that resolves with the newly created Media object.
 */
export async function importLocalFile(sourcePath: string): Promise<Media> {
  const response = await fetch('/api/images/local/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcePath }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred during import.' }));
    throw new Error(errorData.message || 'Failed to import file.');
  }

  return response.json();
}

/**
 * Updates the status of a media asset.
 * @param id The ID of the media asset to update.
 * @param status The new status to set.
 */
export async function updateMediaStatus(id: string, status: 'temporary' | 'active' | 'deleted'): Promise<void> {
  const response = await fetch(`/api/images/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred while updating status.' }));
    throw new Error(errorData.message || 'Failed to update media status.');
  }
}

/**
 * Fetches multiple media objects by their IDs.
 * @param ids An array of media IDs.
 * @returns A promise that resolves with an array of Media objects.
 */
export async function getMediaByIds(ids: string[]): Promise<Media[]> {
  if (ids.length === 0) {
    return [];
  }

  const response = await fetch('/api/media/by-ids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch media by IDs.' }));
    throw new Error(errorData.message || 'An unknown error occurred while fetching media.');
  }

  return response.json();
}
/**
 * Returns the first image file from a DataTransfer (drop or paste), checking both
 * `files` and `items` (screenshots and some browsers only populate `items`).
 */
export function getImageFileFromDataTransfer(data: DataTransfer | null | undefined): File | null {
  if (!data) return null;
  const fromFiles = data.files?.[0];
  if (fromFiles?.type?.startsWith('image/')) {
    return fromFiles;
  }
  for (const item of data.items ?? []) {
    if (item.kind === 'file' && item.type?.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
